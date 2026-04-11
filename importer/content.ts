/**
 * Content script — injected into facebook.com, messenger.com, google.com, maps.google.com, business.google.com
 *
 * AI Lead Engine Flow:
 * 
 * Flow A — Per-lead inline button (automatic, on page load):
 *  1. On load and on new inquiries (MutationObserver), inject a small
 *     "Capture Lead" button on each service request/inquiry.
 *  2. Clicking it extracts the lead data, runs AI classification
 *     (service type, urgency, budget), and opens the review modal.
 *
 * Flow B — Bulk scan (floating action buttons):
 *  1. User clicks "Scan Leads on This Page" or "Scroll & Scan".
 *  2. All leads are collected, classified, and shown in a selection panel.
 *  3. User selects leads → sequential review modals with provider recommendations.
 */

import { classifyLead } from "./utils/leadClassifier";
import {
  injectFloatingScanButton,
  injectPerPostImportButton,
  showJobSelectionPanel,
  showJobModal,
} from "./utils/domHelpers";
import type {
  LeadDefaults,
  ClassifyLeadMessage,
  ClassifyLeadResponse,
  GetLeadHistoryMessage,
  GetLeadHistoryResponse,
  Lead,
  ClassifiedLead,
  Platform,
} from "./types";

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(): Platform | null {
  const host = window.location.hostname;
  
  if (host.includes("facebook.com")) {
    // Check if it's Facebook Marketplace
    const path = window.location.pathname;
    if (path.includes("/marketplace") || path.includes("/marketplace/")) {
      return "marketplace";
    }
    // Otherwise standard Facebook for groups
    return "facebook";
  }
  
  if (host.includes("messenger.com")) return "messenger";
  
  if (
    host.includes("google.com") ||
    host.includes("maps.google.com") ||
    host.includes("business.google.com")
  ) {
    return "google-business";
  }
  
  return null;
}

const PLATFORM = detectPlatform();

if (!PLATFORM) {
  throw new Error("[LocalPro] Unsupported platform — content script exiting.");
}

// ── Lead cache ────────────────────────────────────────────────────────────────

let cachedLeads: ClassifiedLead[] = [];

// ── Lead container selectors ──────────────────────────────────────────────────

/**
 * Get containers for service requests/leads based on platform
 */
function getLeadContainers(): Element[] {
  switch (PLATFORM) {
    case "marketplace": {
      // Facebook Marketplace listing cards
      return Array.from(
        document.querySelectorAll(
          '[role="article"], [data-testid*="listing"], [class*="listing"], ' +
          '.x1lliihq[role="article"], ' +
          '[data-pagelet*="FeedUnit"]'
        )
      ).filter((el) => el.parentElement?.closest('[role="article"]') === null);
    }

    case "facebook": {
      // Facebook Groups - service request posts
      return Array.from(
        document.querySelectorAll('[role="article"]')
      ).filter((el) => el.parentElement?.closest('[role="article"]') === null);
    }

    case "messenger": {
      // Messenger inquiries/requests in chats
      return Array.from(
        document.querySelectorAll(
          '[data-convid], .x6bnwqk, ' +
          '[class*="message"], ' +
          '[class*="inquiry"]'
        )
      );
    }

    case "google-business": {
      // Google Business reviews and inquiries
      return Array.from(
        document.querySelectorAll(
          '[data-review-id], ' +
          '[class*="review"], ' +
          '[class*="inquiry"], ' +
          '[role="option"]'
        )
      );
    }

    default:
      return [];
  }
}

// ── Already-captured lead URLs ─────────────────────────────────────────────

async function getCapturedLeadUrls(): Promise<Set<string>> {
  try {
    const msg: GetLeadHistoryMessage = { type: "GET_LEAD_HISTORY" };
    const res = await chrome.runtime.sendMessage<GetLeadHistoryMessage, GetLeadHistoryResponse>(msg);
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
 * Different platforms require different scroll containers
 */
function getScrollContainer(): Element | null {
  if (PLATFORM === "messenger") {
    return document.querySelector("[dir='ltr']") ?? null;
  }
  if (PLATFORM === "google-business") {
    return document.querySelector(".scrollable") ?? null;
  }
  return null;
}

async function autoScrollPage(): Promise<void> {
  const container = getScrollContainer();
  const totalScrolls = 8;
  const stepHeight   = window.innerHeight * 0.85;
  const pauseMs      = 700;

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

// ── Per-lead inline capture buttons ────────────────────────────────────────────

/** Set of URLs that have already been captured (loaded once on init). */
let capturedLeadUrlCache: Set<string> = new Set();

/**
 * Extracts basic lead data from a container element
 * This is a simplified extraction - actual extraction would depend on platform
 */
function extractLeadFromContainer(container: Element, platform: Platform): Lead {
  const title = container.querySelector("h1, h2, h3, [class*='title']")?.textContent?.trim() ?? "Service Request";
  const description = container.textContent?.substring(0, 500).trim() ?? "";
  const link = container.querySelector("a")?.href ?? "";
  const poster = container.querySelector("[class*='author'], [class*='poster']")?.textContent?.trim() ?? "Unknown";
  
  // Extract location if available
  const locationEl = container.querySelector("[class*='location'], [class*='address']");
  const location = locationEl?.textContent?.trim() ?? "Unknown";

  return {
    title,
    description,
    source: platform,
    source_url: link || window.location.href,
    posted_by: poster,
    timestamp: new Date().toISOString(),
    location
  };
}

/**
 * Captures a single lead, classifies it, and opens the review modal
 */
async function captureSingleLead(container: Element, markDone: () => void): Promise<void> {
  const lead = extractLeadFromContainer(container, PLATFORM!);
  
  // Classify the lead (service type, urgency, budget)
  const classifiedLead = classifyLead(lead);

  // TODO: Open lead review modal instead of job modal
  // For now, we'll reuse the job modal interface but it should show lead-specific UI
  showJobModal(classifiedLead as any, [], undefined, undefined, {});

  markDone();
}

/**
 * Returns true only for genuine top-level lead containers
 */
function isTopLevelLeadContainer(el: Element): boolean {
  switch (PLATFORM) {
    case "marketplace":
    case "facebook": {
      return el.parentElement?.closest('[role="article"]') === null;
    }

    case "messenger": {
      // Don't nest messages inside other messages
      return !el.closest('[data-convid]') || el.hasAttribute('data-convid');
    }

    case "google-business": {
      // Avoid nested review containers
      return !el.closest('[class*="review"], [class*="inquiry"]');
    }

    default:
      return true;
  }
}

/**
 * Inject (or update) the "Capture Lead" inline button on a single lead container
 */
function injectButtonOnLead(container: Element): void {
  if (!isTopLevelLeadContainer(container)) return;

  const text = container.textContent?.trim() ?? "";
  if (text.length < 20) return;
  if (container.hasAttribute("data-lp-injected")) return;

  // Best-effort duplicate detection
  const firstLink = container.querySelector<HTMLAnchorElement>("a[href]");
  const isDup = firstLink ? capturedLeadUrlCache.has(firstLink.href) : false;

  injectPerPostImportButton(container, isDup, (markDone) => {
    void captureSingleLead(container, markDone);
  });
}

let _injectDebounce: ReturnType<typeof setTimeout> | null = null;

/** Scans all current lead containers and injects buttons on any new ones. */
function injectAllLeadButtons(): void {
  if (_injectDebounce) clearTimeout(_injectDebounce);
  _injectDebounce = setTimeout(() => {
    getLeadContainers().forEach(injectButtonOnLead);
  }, 400);
}

/** Watch for new leads appearing and inject buttons automatically. */
function observeAndInjectLeadButtons(): void {
  injectAllLeadButtons(); // initial pass

  const observer = new MutationObserver(() => injectAllLeadButtons());
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

  const containers = getLeadContainers();
  const unique = [...new Set(containers)].filter(
    (el) => el.textContent && el.textContent.trim().length > 20
  );

  // Extract raw leads
  const leads: Lead[] = unique.map((c) => extractLeadFromContainer(c, PLATFORM!));
  
  // Classify all leads
  const classifiedLeads: ClassifiedLead[] = leads.map(lead => classifyLead(lead));

  const [capturedUrls] = await Promise.all([getCapturedLeadUrls()]);

  setScanningState(false);

  if (classifiedLeads.length === 0) {
    alert("[LocalPro] No service requests found on this page. Try scrolling to load more content first, or use 'Scroll & Scan'.");
    return;
  }

  // TODO: Show lead selection panel with classified leads and provider recommendations
  // For now, fall back to job selection panel interface
  showJobSelectionPanel(classifiedLeads as any, capturedUrls, (selected, bulkDefaults) => {
    void processLeadQueue(selected as ClassifiedLead[], 0, bulkDefaults);
  });
}

// ── Lead capture queue (sequential modals) ─────────────────────────────────────

async function processLeadQueue(
  leads: ClassifiedLead[],
  index: number,
  bulkDefaults?: LeadDefaults
): Promise<void> {
  if (index >= leads.length) return;

  const lead = leads[index];
  const remaining = leads.length - index;

  // TODO: Show lead capture modal with provider recommendations
  // For now, reuse job modal
  showJobModal(
    lead as any,
    [],
    undefined,
    remaining > 1
      ? {
          current: index + 1,
          total: leads.length,
          onNext: () => void processLeadQueue(leads, index + 1, bulkDefaults),
        }
      : undefined,
    {}
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
  // Pre-load captured lead URLs
  await getCapturedLeadUrls().then((urls) => { capturedLeadUrlCache = urls; });

  // Start per-lead button injection (auto-watches for new leads via MutationObserver)
  observeAndInjectLeadButtons();

  // Floating bulk-scan buttons
  injectFloatingScanButton(
    (setState) => void handleScanPage(setState, false),
    (setState) => void handleScanPage(setState, true)
  );

  console.log(`[LocalPro] Lead Engine content script active on ${PLATFORM}`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { void init(); });
} else {
  void init();
}
