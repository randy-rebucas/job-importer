import type { JobPost, Platform } from "../types";

const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,15}\d)/g;
const CURRENCY_REGEX = /(?:PHP|AED|USD|\$|₱|€|£)\s*[\d,]+|[\d,]+\s*(?:PHP|AED|USD)/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ── Category auto-tagging ─────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Plumbing: ["plumber", "plumbing", "pipe", "drain", "faucet", "toilet", "water leak"],
  Electrical: ["electrician", "electrical", "wiring", "circuit", "panel", "outlet", "voltage"],
  Carpentry: ["carpenter", "carpentry", "wood", "furniture", "cabinet", "flooring"],
  Painting: ["painter", "painting", "paint", "coating", "wallpaper", "finishing"],
  Cleaning: ["cleaner", "cleaning", "housekeeping", "janitorial", "sanitation", "maid"],
  Driving: ["driver", "driving", "delivery", "courier", "transport", "logistics", "grab"],
  HVAC: ["hvac", "aircon", "air conditioning", "airconditioning", "refrigeration", "cooling", "heating"],
  Welding: ["welder", "welding", "fabrication", "steel", "metal"],
  Construction: ["mason", "masonry", "construction", "laborer", "concrete", "builder", "scaffolding"],
  Mechanical: ["mechanic", "mechanical", "engine", "motor", "automotive", "vehicle", "repair"],
  IT: ["developer", "programmer", "software", "coding", "web", "app", "it support", "network"],
  Design: ["designer", "graphic", "ui", "ux", "creative", "illustrator", "photoshop"],
  Healthcare: ["nurse", "caregiver", "medical", "healthcare", "doctor", "therapist"],
  Education: ["teacher", "tutor", "instructor", "educator", "trainer", "teaching"],
  Security: ["security guard", "security officer", "bodyguard", "cctv", "patrol"],
};

function autoTagCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  let bestCategory: string | undefined;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : undefined;
}

// ── Signal extraction (phone / currency / email) ──────────────────────────────

interface PostSignals {
  hasPhone: boolean;
  hasCurrency: boolean;
  hasEmail: boolean;
}

function extractSignals(text: string): PostSignals {
  const hasPhone = PHONE_REGEX.test(text);
  const hasCurrency = CURRENCY_REGEX.test(text);
  const hasEmail = EMAIL_REGEX.test(text);

  PHONE_REGEX.lastIndex = 0;
  CURRENCY_REGEX.lastIndex = 0;
  EMAIL_REGEX.lastIndex = 0;

  return { hasPhone, hasCurrency, hasEmail };
}

// ── Public detection API ──────────────────────────────────────────────────────

/**
 * Always returns true — the Import button is shown on every post.
 * Exported for use in the content script scanner.
 */
export function detectJobPost(_element: Element): boolean {
  return true;
}

/**
 * Extracts structured job data from a post element.
 * Handles platform-specific DOM structure.
 */
export function extractJobData(element: Element, platform: Platform): JobPost {
  const text = element.textContent ?? "";
  const { hasCurrency } = extractSignals(text);

  let title = "";
  let description = "";
  let postedBy = "";
  let timestamp = "";
  const url = window.location.href;

  if (platform === "facebook") {
    title = extractFacebookTitle(element, text);
    description = extractFacebookDescription(element, text);
    postedBy = extractFacebookPoster(element);
    timestamp = extractFacebookTimestamp(element);
  } else if (platform === "linkedin") {
    title = extractLinkedInTitle(element, text);
    description = extractLinkedInDescription(element, text);
    postedBy = extractLinkedInPoster(element);
    timestamp = extractLinkedInTimestamp(element);
  } else if (platform === "jobstreet") {
    title = extractJobStreetTitle(element, text);
    description = extractJobStreetDescription(element, text);
    postedBy = extractJobStreetCompany(element);
    timestamp = extractGenericTimestamp(element);
  } else {
    // indeed
    title = extractIndeedTitle(element, text);
    description = extractIndeedDescription(element, text);
    postedBy = extractIndeedCompany(element);
    timestamp = extractGenericTimestamp(element);
  }

  // Fallback title from first meaningful line of text
  if (!title) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && l.length < 120);
    title = lines[0] ?? "Job Opportunity";
  }

  const budget = hasCurrency ? parseBudget(text) : undefined;
  const location = extractLocation(text);
  const category = autoTagCategory(text);

  return {
    title: sanitize(title.slice(0, 150)),
    description: sanitize(description.slice(0, 2000)),
    source: platform,
    source_url: extractPostUrl(element, platform) || url,
    posted_by: sanitize(postedBy.slice(0, 100)),
    timestamp: timestamp || new Date().toISOString(),
    location: location ? sanitize(location) : undefined,
    budget,
    category,
  };
}

// ── Facebook-specific extractors ──────────────────────────────────────────────

function extractFacebookTitle(element: Element, fullText: string): string {
  // Try strong/bold tags that often contain job title
  const strong = element.querySelector("strong");
  if (strong?.textContent) return strong.textContent.trim();

  // Try h1/h2/h3
  for (const tag of ["h1", "h2", "h3"]) {
    const heading = element.querySelector(tag);
    if (heading?.textContent) return heading.textContent.trim();
  }

  // Use the first capitalized sentence that matches a job pattern
  const match = fullText.match(/(?:hiring|looking for|need)[^.!?\n]{5,80}/i);
  if (match) return match[0].trim();

  return "";
}

function extractFacebookDescription(element: Element, fullText: string): string {
  // Facebook post text lives in div[data-ad-preview="message"] or [dir="auto"] spans
  const textNode =
    element.querySelector('[data-ad-preview="message"]') ??
    element.querySelector('[data-testid="post_message"]') ??
    element.querySelector(".xdj266r") ?? // FB class for post body (changes often)
    element.querySelector('[dir="auto"]');

  if (textNode?.textContent) return textNode.textContent.trim();

  return fullText.trim();
}

function extractFacebookPoster(element: Element): string {
  // Actor name typically in a link with aria-label or profile link
  const actorLink =
    element.querySelector('a[role="link"][tabindex="0"] strong') ??
    element.querySelector('[data-testid="story-subtitle"] a') ??
    element.querySelector("h3 a") ??
    element.querySelector("h4 a");

  return actorLink?.textContent?.trim() ?? "";
}

function extractFacebookTimestamp(element: Element): string {
  const timeEl = element.querySelector("abbr[data-utime]");
  if (timeEl) {
    const utime = timeEl.getAttribute("data-utime");
    if (utime) return new Date(parseInt(utime) * 1000).toISOString();
  }

  const timeTag = element.querySelector("time");
  if (timeTag) {
    const dt = timeTag.getAttribute("datetime");
    if (dt) return new Date(dt).toISOString();
    if (timeTag.textContent) return timeTag.textContent.trim();
  }

  return new Date().toISOString();
}

function extractPostUrl(element: Element, platform: Platform): string {
  if (platform === "facebook") {
    const links = element.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (const link of links) {
      const href = link.href;
      if (href.includes("/posts/") || href.includes("story_fbid") || href.includes("permalink")) {
        return href;
      }
    }
  } else if (platform === "linkedin") {
    const links = element.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (const link of links) {
      const href = link.href;
      if (href.includes("/feed/update/") || href.includes("/posts/") || href.includes("ugcPost")) {
        return href;
      }
    }
  } else if (platform === "jobstreet") {
    const link = element.querySelector<HTMLAnchorElement>("a[href*='/job/'], a[data-automation='job-list-item-link-overlay']");
    if (link?.href) return link.href;
    const jobId = element.getAttribute("data-job-id") ?? element.getAttribute("data-automation-id");
    if (jobId) return `https://www.jobstreet.com.ph/job/${jobId}`;
  } else if (platform === "indeed") {
    const link = element.querySelector<HTMLAnchorElement>("a[href*='/rc/clk'], a[href*='/viewjob'], h2 a");
    if (link?.href) return link.href;
    const jk = element.getAttribute("data-jk");
    if (jk) return `https://ph.indeed.com/viewjob?jk=${jk}`;
  }
  return window.location.href;
}

// ── LinkedIn-specific extractors ──────────────────────────────────────────────

function extractLinkedInTitle(element: Element, fullText: string): string {
  // LinkedIn job update title often in .feed-shared-text strong or .update-components-text
  const strong =
    element.querySelector(".feed-shared-text strong") ??
    element.querySelector(".update-components-text strong");
  if (strong?.textContent) return strong.textContent.trim();

  // Inline job listing title
  const jobTitle = element.querySelector(
    ".job-card-container__link, .jobs-unified-top-card__job-title"
  );
  if (jobTitle?.textContent) return jobTitle.textContent.trim();

  const match = fullText.match(/(?:hiring|looking for|need)[^.!?\n]{5,80}/i);
  if (match) return match[0].trim();

  return "";
}

function extractLinkedInDescription(element: Element, fullText: string): string {
  const textNode =
    element.querySelector(".feed-shared-text") ??
    element.querySelector(".update-components-text") ??
    element.querySelector(".feed-shared-update-v2__description");

  if (textNode?.textContent) return textNode.textContent.trim();

  return fullText.trim();
}

function extractLinkedInPoster(element: Element): string {
  const actor =
    element.querySelector(".update-components-actor__name span[aria-hidden='true']") ??
    element.querySelector(".feed-shared-actor__name") ??
    element.querySelector(".update-components-actor__name");

  return actor?.textContent?.trim() ?? "";
}

function extractLinkedInTimestamp(element: Element): string {
  const timeEl = element.querySelector("time");
  if (timeEl) {
    const dt = timeEl.getAttribute("datetime");
    if (dt) return new Date(dt).toISOString();
  }

  const relativeTime = element.querySelector(
    ".feed-shared-actor__sub-description, .update-components-actor__sub-description"
  );
  if (relativeTime?.textContent) return relativeTime.textContent.trim();

  return new Date().toISOString();
}

// ── JobStreet-specific extractors ─────────────────────────────────────────────

function extractJobStreetTitle(element: Element, fullText: string): string {
  const title =
    element.querySelector('[data-automation="job-card-title"] span') ??
    element.querySelector('[data-automation="job-card-title"]') ??
    element.querySelector("h1, h2, h3");
  if (title?.textContent) return title.textContent.trim();
  const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 120);
  return lines[0] ?? "Job Opening";
}

function extractJobStreetDescription(element: Element, fullText: string): string {
  const desc =
    element.querySelector('[data-automation="job-card-teaser"]') ??
    element.querySelector('[class*="teaser"]') ??
    element.querySelector('[class*="description"]');
  if (desc?.textContent) return desc.textContent.trim();
  return fullText.trim();
}

function extractJobStreetCompany(element: Element): string {
  const company =
    element.querySelector('[data-automation="job-card-company"]') ??
    element.querySelector('[class*="company"]') ??
    element.querySelector('[class*="advertiser"]');
  return company?.textContent?.trim() ?? "";
}

// ── Indeed-specific extractors ────────────────────────────────────────────────

function extractIndeedTitle(element: Element, fullText: string): string {
  const title =
    element.querySelector("h2.jobTitle span[title]") ??
    element.querySelector("h2.jobTitle span:not([class])") ??
    element.querySelector(".jobTitle a span") ??
    element.querySelector("h2, h3");
  if (title?.textContent) return title.textContent.trim();
  const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 120);
  return lines[0] ?? "Job Opening";
}

function extractIndeedDescription(element: Element, fullText: string): string {
  const desc =
    element.querySelector(".job-snippet") ??
    element.querySelector('[class*="snippet"]') ??
    element.querySelector('[class*="description"]');
  if (desc?.textContent) return desc.textContent.trim();
  return fullText.trim();
}

function extractIndeedCompany(element: Element): string {
  const company =
    element.querySelector(".companyName") ??
    element.querySelector('[data-testid="company-name"]') ??
    element.querySelector('[class*="company"]');
  return company?.textContent?.trim() ?? "";
}

// ── Generic timestamp fallback ────────────────────────────────────────────────

function extractGenericTimestamp(element: Element): string {
  const timeEl = element.querySelector("time");
  if (timeEl) {
    const dt = timeEl.getAttribute("datetime");
    if (dt) return new Date(dt).toISOString();
  }
  return new Date().toISOString();
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function parseBudget(text: string): number | undefined {
  CURRENCY_REGEX.lastIndex = 0;
  const match = CURRENCY_REGEX.exec(text);
  if (!match) return undefined;

  const numStr = match[0].replace(/[^0-9]/g, "");
  const num = parseInt(numStr, 10);
  return isNaN(num) ? undefined : num;
}

const LOCATION_PATTERNS = [
  /\blocation[:\s]+([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,
  /\b(?:based in|located in|work in|working in|site[:\s]+)\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,
  /\b(?:in|at)\s+([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)(?=\s*[\.\,\n])/,
  /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(?:Metro\s)?(?:Manila|Cebu|Davao|Quezon City|Makati|Pasig|Taguig|Mandaluyong|Parañaque|Las Piñas|Muntinlupa|Caloocan|Marikina|Pasay|Dubai|Abu Dhabi|Sharjah|Singapore|Riyadh|Qatar)/,
];

function extractLocation(text: string): string | undefined {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

/** Strip HTML tags and trim whitespace */
function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
