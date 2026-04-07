/**
 * Content script — injected into facebook.com, linkedin.com, jobstreet.com, indeed.com.
 *
 * Flow:
 *  1. Detect platform from hostname.
 *  2. Inject a floating "Scan Jobs" button + "Scroll & Scan" button.
 *  3. When scan is triggered (button click or SCAN_TAB message from popup):
 *     a. Optionally auto-scroll to load more posts.
 *     b. Collect all post containers from the DOM.
 *     c. Extract job data from each.
 *     d. Load already-imported URLs for duplicate marking.
 *     e. Show selection panel.
 *  4. User selects posts + sets bulk defaults → clicks Import Selected.
 *  5. Review modal opens for each selected post in sequence.
 */

import { extractJobData } from "./utils/parser";
import {
  injectFloatingScanButton,
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
      return Array.from(
        document.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]')
      );

    case "linkedin":
      return Array.from(
        document.querySelectorAll(
          [
            ".feed-shared-update-v2",
            ".occludable-update",
            '[class*="occludable-update"]',
            '[class*="feed-shared-update"]',
            "li.fie-impression-container",
            '[class*="fie-impression-container"]',
            "[data-id]",
            "[data-urn]",
          ].join(", ")
        )
      );

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

async function autoScrollPage(): Promise<void> {
  const totalScrolls = 6;
  for (let i = 0; i < totalScrolls; i++) {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
    await new Promise((r) => setTimeout(r, 700));
  }
  // Pause briefly so dynamically loaded content settles
  await new Promise((r) => setTimeout(r, 500));
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
  preloadCategories();

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
