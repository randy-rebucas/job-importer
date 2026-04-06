/**
 * Content script — injected into facebook.com and linkedin.com.
 *
 * Flow:
 *  1. Detect platform from hostname.
 *  2. Pre-load categories + start MutationObserver in parallel.
 *  3. For each detected job post:
 *     a. Run local keyword detection (fast, synchronous).
 *     b. Inject "Import to LocalPro" button via Shadow DOM.
 *  4. On button click:
 *     a. Extract job data.
 *     b. Ask background to AI-classify the category (non-blocking).
 *     c. Open modal with real categories + AI suggestion pre-selected.
 */

import { detectJobPost, extractJobData } from "./utils/parser";
import { injectImportButton, showJobModal } from "./utils/domHelpers";
import type {
  Category,
  ClassifyCategoryMessage,
  ClassifyCategoryResponse,
  GetCategoriesMessage,
  GetCategoriesResponse,
  JobPost,
  Platform,
} from "./types";

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(): Platform | null {
  const host = window.location.hostname;
  if (host.includes("facebook.com")) return "facebook";
  if (host.includes("linkedin.com")) return "linkedin";
  return null;
}

const PLATFORM = detectPlatform();

if (!PLATFORM) {
  throw new Error("[LocalPro] Unsupported platform — content script exiting.");
}

// ── Category cache (populated once on init) ───────────────────────────────────

let cachedCategories: Category[] = [];

async function preloadCategories(): Promise<void> {
  try {
    const msg: GetCategoriesMessage = { type: "GET_CATEGORIES" };
    const res = await chrome.runtime.sendMessage<GetCategoriesMessage, GetCategoriesResponse>(msg);
    if (res?.success && res.categories.length > 0) {
      cachedCategories = res.categories;
    }
  } catch {
    // Background may not be ready on cold start; modal will show empty dropdown
  }
}

// ── Post container selectors ──────────────────────────────────────────────────

function getPostContainers(root: Element | Document): Element[] {
  if (PLATFORM === "facebook") {
    // [role="article"] covers the news feed, groups, and pages in modern FB.
    // [data-pagelet^="FeedUnit"] catches FB's internal feed unit wrappers as a backup.
    return Array.from(
      root.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]')
    );
  }
  // LinkedIn cycles through several class names and data-* attributes across UI versions.
  // We cast a wide net and rely on deduplication + detectJobPost to filter noise.
  return Array.from(
    root.querySelectorAll(
      [
        ".feed-shared-update-v2",          // classic feed post wrapper
        ".occludable-update",               // impression-tracked wrapper
        '[class*="occludable-update"]',     // variations of occludable class
        '[class*="feed-shared-update"]',    // broader class match
        "li.fie-impression-container",      // newer LinkedIn feed item
        '[class*="fie-impression-container"]',
        "[data-id]",                        // posts with a data-id attribute
        "[data-urn]",                       // posts with a data-urn attribute
      ].join(", ")
    )
  );
}

// ── Dedup tracking ────────────────────────────────────────────────────────────

/**
 * Containers that have been fully processed (button injected or confirmed not
 * a job post). These are never revisited.
 */
const processedPosts = new WeakSet<Element>();

/**
 * Containers that were seen but were off-screen at scan time.
 * They are re-checked on scroll until they enter the viewport.
 */
const offScreenPosts = new WeakSet<Element>();

// ── Core scan ─────────────────────────────────────────────────────────────────

function scanForJobPosts(root: Element | Document = document): void {
  const containers = getPostContainers(root);

  for (const container of containers) {
    // Already fully handled — skip immediately.
    if (processedPosts.has(container)) continue;

    // Skip off-screen elements, but do NOT mark them as processed so the
    // scroll handler can retry them once they enter the viewport.
    if (!isNearViewport(container)) {
      offScreenPosts.add(container);
      continue;
    }

    // In viewport — mark fully processed regardless of whether it is a job post,
    // so we don't re-score it on every scroll event.
    processedPosts.add(container);
    offScreenPosts.delete(container);

    if (!detectJobPost(container)) continue;

    const job: JobPost = extractJobData(container, PLATFORM!);

    injectImportButton(container, job, (clickedJob) => {
      handleImportClick(clickedJob);
    });
  }
}

/** Opens the modal after optionally fetching an AI category suggestion. */
async function handleImportClick(job: JobPost): Promise<void> {
  // Show modal immediately with whatever categories we have
  // Attempt AI classification in parallel
  let aiCategory: string | undefined;

  if (cachedCategories.length > 0) {
    try {
      const msg: ClassifyCategoryMessage = {
        type: "CLASSIFY_CATEGORY",
        title: job.title,
        description: job.description,
        availableCategories: cachedCategories.map((c) => c.name),
      };
      const res = await Promise.race([
        chrome.runtime.sendMessage<ClassifyCategoryMessage, ClassifyCategoryResponse>(msg),
        // Timeout after 4 s so we don't block the modal
        new Promise<ClassifyCategoryResponse>((resolve) =>
          setTimeout(() => resolve({ success: false }), 4000)
        ),
      ]);
      if (res?.success && res.category) {
        aiCategory = res.category;
      }
    } catch {
      // Non-fatal — fall back to local detection
    }
  }

  showJobModal(job, cachedCategories, aiCategory);
}

// ── Viewport check ────────────────────────────────────────────────────────────

function isNearViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight + 1200 &&
    rect.bottom > -400 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

// ── Debounce ──────────────────────────────────────────────────────────────────

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

// ── MutationObserver ──────────────────────────────────────────────────────────

const debouncedScan = debounce((nodes: Element[]) => {
  for (const node of nodes) {
    scanForJobPosts(node);
  }
  scanForJobPosts(document);
}, 300);

const observer = new MutationObserver((mutations) => {
  const added: Element[] = [];
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        added.push(node as Element);
      }
    }
  }
  if (added.length > 0) debouncedScan(added);
});

// Scroll triggers re-scan so near-viewport posts get processed when scrolled to
const debouncedScrollScan = debounce(() => scanForJobPosts(document), 500);
window.addEventListener("scroll", debouncedScrollScan, { passive: true });

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Pre-load categories in background; UI scan proceeds in parallel
  preloadCategories(); // intentionally not awaited — fire and forget

  scanForJobPosts(document);

  observer.observe(document.body, { childList: true, subtree: true });

  console.log(`[LocalPro] Content script active on ${PLATFORM}`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { void init(); });
} else {
  void init();
}
