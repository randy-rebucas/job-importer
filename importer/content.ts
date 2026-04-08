/**
 * Content script — injected into facebook.com, linkedin.com, jobstreet.com, indeed.com.
 *
 * Flow A — Per-post inline button (automatic, on page load):
 *  1. On load and on new posts (MutationObserver), inject a small
 *     "Import to LocalPro" button at the bottom of each post container.
 *  2. Clicking it extracts that post's data, runs AI category classification,
 *     and opens the review modal immediately.
 *
 * Flow B — Bulk scan (floating action buttons):
 *  1. User clicks "Scan Jobs on This Page" or "Scroll & Scan".
 *  2. All posts are collected, extracted, and shown in a selection panel.
 *  3. User selects posts → sequential review modals.
 */

import { extractJobData } from "./utils/parser";
import {
  injectFloatingScanButton,
  injectPerPostImportButton,
  showJobSelectionPanel,
  showJobModal,
} from "./utils/domHelpers";
import type {
  BulkDefaults,
  Category,
  ClassifyCategoryMessage,
  ClassifyCategoryResponse,
  GetCategoriesMessage,
  GetCategoriesResponse,
  GetImportHistoryMessage,
  GetImportHistoryResponse,
  JobPost,
  Platform,
} from "./types";

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(): Platform | null {
  const host = window.location.hostname;
  if (host.includes("facebook.com"))  return "facebook";
  if (host.includes("linkedin.com"))  return "linkedin";
  if (host.includes("jobstreet.com")) return "jobstreet";
  if (host.includes("indeed.com"))    return "indeed";
  return null;
}

const PLATFORM = detectPlatform();

if (!PLATFORM) {
  throw new Error("[LocalPro] Unsupported platform — content script exiting.");
}

// ── Category cache ────────────────────────────────────────────────────────────

let cachedCategories: Category[] = [];

async function preloadCategories(): Promise<void> {
  try {
    const msg: GetCategoriesMessage = { type: "GET_CATEGORIES" };
    const res = await chrome.runtime.sendMessage<GetCategoriesMessage, GetCategoriesResponse>(msg);
    if (res?.success && res.categories.length > 0) {
      cachedCategories = res.categories;
    }
  } catch {
    // Background may not be ready on cold start
  }
}

// ── Post container selectors ──────────────────────────────────────────────────

function getPostContainers(): Element[] {
  switch (PLATFORM) {
    case "facebook":
      // Filter to top-level articles only — comments are [role="article"] nested
      // inside a parent [role="article"], so we reject anything with an ancestor article.
      return Array.from(
        document.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]')
      ).filter((el) => el.parentElement?.closest('[role="article"]') === null);

    case "linkedin": {
      const feedSelector = [
        ".feed-shared-update-v2",           // classic feed post wrapper
        ".occludable-update",               // impression-tracked wrapper
        "li.fie-impression-container",      // newer feed list item
        '[data-urn^="urn:li:activity"]',    // post activity
        '[data-urn^="urn:li:share"]',       // shared post
        '[data-urn^="urn:li:ugcPost"]',     // user-generated content post
      ].join(", ");
      const commentContainers =
        ".comments-comment-item, .comments-comments-list, .comments-comment-list, " +
        ".comments-reply-item, .social-details-social-activity";
      return Array.from(document.querySelectorAll(feedSelector)).filter(
        (el) =>
          !el.closest(commentContainers) &&
          el.parentElement?.closest(feedSelector) === null
      );
    }

    case "jobstreet":
      return Array.from(
        document.querySelectorAll(
          [
            '[data-automation="normalJob"]',
            '[data-automation="featuredJob"]',
            "article[data-job-id]",
            '[class*="job-item"]',
            '[class*="JobCard"]',
          ].join(", ")
        )
      );

    case "indeed":
      return Array.from(
        document.querySelectorAll(
          [
            "[data-jk]",
            ".job_seen_beacon",
            ".resultContent",
            '[class*="jobCard"]',
            ".jobsearch-ResultsList > li",
          ].join(", ")
        )
      );

    default:
      return [];
  }
}

// ── Already-imported URL set ──────────────────────────────────────────────────

async function getImportedUrls(): Promise<Set<string>> {
  try {
    const msg: GetImportHistoryMessage = { type: "GET_IMPORT_HISTORY" };
    const res = await chrome.runtime.sendMessage<GetImportHistoryMessage, GetImportHistoryResponse>(msg);
    if (res?.success) {
      return new Set(res.history.map((h) => h.source_url));
    }
  } catch {
    // Non-fatal
  }
  return new Set();
}

// ── Auto-scroll ───────────────────────────────────────────────────────────────

/**
 * LinkedIn renders its feed inside a scrollable container, not the window.
 * We find that container and scroll it directly; window.scrollBy alone does nothing.
 */
function getScrollContainer(): Element | null {
  if (PLATFORM === "linkedin") {
    return (
      document.querySelector(".scaffold-layout__main") ??
      document.querySelector("main.scaffold-layout__main") ??
      document.querySelector('[class*="scaffold-layout__main"]') ??
      document.querySelector("main[role='main']") ??
      null
    );
  }
  return null;
}

async function autoScrollPage(): Promise<void> {
  const container = getScrollContainer();
  const totalScrolls = 8;
  const stepHeight   = window.innerHeight * 0.85;

  // LinkedIn needs longer pauses for its lazy-load to fire
  const pauseMs = PLATFORM === "linkedin" ? 1100 : 700;

  for (let i = 0; i < totalScrolls; i++) {
    if (container) {
      container.scrollBy({ top: stepHeight, behavior: "smooth" });
    }
    // Always also scroll window — handles pages that use window scroll
    window.scrollBy({ top: stepHeight, behavior: "smooth" });
    await new Promise((r) => setTimeout(r, pauseMs));
  }

  // Final pause so lazy-loaded content settles before we scan
  await new Promise((r) => setTimeout(r, 800));
}

// ── Per-post inline import buttons ───────────────────────────────────────────

/** Set of URLs that have already been imported (loaded once on init). */
let importedUrlCache: Set<string> = new Set();

/**
 * Runs AI category classification then opens the review modal for a single post.
 * Re-uses the same processImportQueue path so the user gets the same experience.
 */
async function importSinglePost(container: Element, markDone: () => void): Promise<void> {
  const job = extractJobData(container, PLATFORM!);

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
        new Promise<ClassifyCategoryResponse>((resolve) =>
          setTimeout(() => resolve({ success: false }), 4000)
        ),
      ]);
      if (res?.success && res.category) aiCategory = res.category;
    } catch {
      // Non-fatal
    }
  }

  // Wrap onNext to mark the inline button as done after the modal closes / submits
  showJobModal(job, cachedCategories, aiCategory, undefined, {});

  // Mark done once the modal is shown (the user may still cancel — that's fine)
  markDone();
}

/**
 * Returns true only for genuine top-level post containers.
 *
 * Facebook and LinkedIn both render comment threads using the same element
 * types as post containers ([role="article"], .feed-shared-update-v2, etc.).
 * This guard ensures we only inject buttons on real posts.
 */
function isTopLevelContainer(el: Element): boolean {
  switch (PLATFORM) {
    case "facebook": {
      // Comments are [role="article"] NESTED inside the parent feed article.
      // A top-level post has no ancestor [role="article"].
      return el.parentElement?.closest('[role="article"]') === null;
    }

    case "linkedin": {
      // Replies live inside .comments-comment-item / .comments-comments-list.
      if (
        el.closest(
          ".comments-comment-item, .comments-comments-list, .comments-comment-list, " +
          ".comments-reply-item, .social-details-social-activity"
        )
      ) return false;

      // Reject feed elements that are themselves nested inside another feed update.
      const feedSelector =
        ".feed-shared-update-v2, .occludable-update, li.fie-impression-container";
      return el.parentElement?.closest(feedSelector) === null;
    }

    default:
      // JobStreet / Indeed use card elements that don't nest in comments.
      return true;
  }
}

/**
 * Inject (or update) the "Import to LocalPro" inline button on a single post container.
 * Skips containers that are comment sections, too short, or already injected.
 */
function injectButtonOnPost(container: Element): void {
  // Skip comment sections and non-top-level nested elements
  if (!isTopLevelContainer(container)) return;

  const text = container.textContent?.trim() ?? "";
  if (text.length < 20) return;
  if (container.hasAttribute("data-lp-injected")) return;

  // Best-effort duplicate detection using the first post-link in the container
  const firstLink = container.querySelector<HTMLAnchorElement>(
    'a[href*="/posts/"], a[href*="story_fbid="], a[href*="?p="], a[href*="/jobs/view/"], a[href*="jk="]'
  );
  const isDup = firstLink ? importedUrlCache.has(firstLink.href) : false;

  injectPerPostImportButton(container, isDup, (markDone) => {
    void importSinglePost(container, markDone);
  });
}

let _injectDebounce: ReturnType<typeof setTimeout> | null = null;

/** Scans all current post containers and injects buttons on any new ones. */
function injectAllPostButtons(): void {
  if (_injectDebounce) clearTimeout(_injectDebounce);
  _injectDebounce = setTimeout(() => {
    getPostContainers().forEach(injectButtonOnPost);
  }, 400);
}

/** Watch for new posts appearing in the feed and inject buttons automatically. */
function observeAndInjectButtons(): void {
  injectAllPostButtons(); // initial pass

  const observer = new MutationObserver(() => injectAllPostButtons());
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── Scan page ─────────────────────────────────────────────────────────────────

async function handleScanPage(
  setScanningState: (scanning: boolean) => void,
  withAutoScroll = false
): Promise<void> {
  setScanningState(true);
  await new Promise((r) => setTimeout(r, 50));

  if (withAutoScroll) {
    await autoScrollPage();
  }

  const containers = getPostContainers();
  const unique = [...new Set(containers)].filter(
    (el) => el.textContent && el.textContent.trim().length > 20
  );

  const jobs: JobPost[] = unique.map((c) => extractJobData(c, PLATFORM!));

  const [importedUrls] = await Promise.all([getImportedUrls()]);

  setScanningState(false);

  if (jobs.length === 0) {
    alert("[LocalPro] No posts found on this page. Try scrolling to load more content first, or use 'Scroll & Scan'.");
    return;
  }

  showJobSelectionPanel(jobs, importedUrls, (selected, bulkDefaults) => {
    void processImportQueue(selected, 0, bulkDefaults);
  });
}

// ── Import queue (sequential modals) ─────────────────────────────────────────

async function processImportQueue(
  jobs: JobPost[],
  index: number,
  bulkDefaults?: BulkDefaults
): Promise<void> {
  if (index >= jobs.length) return;

  const job = jobs[index];

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
        new Promise<ClassifyCategoryResponse>((resolve) =>
          setTimeout(() => resolve({ success: false }), 4000)
        ),
      ]);
      if (res?.success && res.category) {
        aiCategory = res.category;
      }
    } catch {
      // Non-fatal
    }
  }

  const remaining = jobs.length - index;

  showJobModal(
    job,
    cachedCategories,
    aiCategory,
    remaining > 1
      ? {
          current: index + 1,
          total: jobs.length,
          onNext: () => void processImportQueue(jobs, index + 1, bulkDefaults),
        }
      : undefined,
    bulkDefaults
  );
}

// ── Message listener (SCAN_TAB + PING from popup) ────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender: { id?: string }, sendResponse: (response: unknown) => void) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg.type === "PING") {
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "SCAN_TAB") {
    void handleScanPage(() => {}, (msg as { autoScroll?: boolean }).autoScroll ?? false);
    sendResponse({ ok: true });
    return true;
  }
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Pre-load categories and imported URL cache in parallel
  await Promise.allSettled([
    preloadCategories(),
    getImportedUrls().then((urls) => { importedUrlCache = urls; }),
  ]);

  // Start per-post button injection (auto-watches for new posts via MutationObserver)
  observeAndInjectButtons();

  // Floating bulk-scan buttons
  injectFloatingScanButton(
    (setState) => void handleScanPage(setState, false),
    (setState) => void handleScanPage(setState, true)
  );

  console.log(`[LocalPro] Content script active on ${PLATFORM}`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { void init(); });
} else {
  void init();
}
