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
  phone?: string;
  email?: string;
}

function extractSignals(text: string): PostSignals {
  const phoneMatches = text.match(PHONE_REGEX);
  const currencyMatches = text.match(CURRENCY_REGEX);
  const emailMatches = text.match(EMAIL_REGEX);

  return {
    hasPhone: phoneMatches !== null,
    hasCurrency: currencyMatches !== null,
    hasEmail: emailMatches !== null,
    phone: phoneMatches?.[0]?.trim(),
    email: emailMatches?.[0]?.trim(),
  };
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
 * Returns post-body-only text by cloning the element and aggressively removing
 * comment sections, engagement bars, and reaction counts.
 *
 * KEY INSIGHT: Facebook renders comment threads as nested [role="article"]
 * elements inside the post article. Removing those nested articles eliminates
 * virtually all comment text in one step.
 */
function getPostBodyText(element: Element, platform: Platform): string {
  const clone = element.cloneNode(true) as Element;

  if (platform === "facebook") {
    // 1. Remove ALL nested [role="article"] — these are comment articles
    clone.querySelectorAll('[role="article"]').forEach((el) => el.remove());

    // 2. Remove comment forms, reaction/engagement bars, action buttons
    [
      'form',
      '[role="form"]',
      '[data-commentid]',
      '[data-testid*="comment"]',
      '[data-testid*="Comment"]',
      '[data-testid*="ufi"]',
      '[data-testid*="UFI"]',
      '[aria-label*="eaction"]',   // "reaction", "Reaction"
      '[aria-label*="omment"]',    // "comment", "Comment"
      '[aria-label*="hare"]',      // "share", "Share"
    ].forEach((sel) => clone.querySelectorAll(sel).forEach((el) => el.remove()));

  } else if (platform === "linkedin") {
    // Remove comment list, individual comments, engagement bars
    [
      '.comments-comments-list',
      '.comments-comment-list',
      '.comments-comment-item',
      '.comments-comment-texteditor',
      '.comments-reply-compose-box',
      '.social-details-social-counts',
      '.social-details-social-activity',
      '.feed-shared-social-action-bar',
      '.feed-shared-footer',
      '.social-actions-bar',
      '.update-components-footer',
      '.update-components-social-activity',
      '[class*="comment-"]',
      '[class*="-comment"]',
    ].forEach((sel) => clone.querySelectorAll(sel).forEach((el) => el.remove()));
  }

  return clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Extracts structured job data from a post element.
 * Handles platform-specific DOM structure.
 */
export function extractJobData(element: Element, platform: Platform): JobPost {
  // postText has comments/engagement stripped — use this for all content extraction
  const postText = getPostBodyText(element, platform);
  const { hasCurrency, phone, email } = extractSignals(postText);

  let title = "";
  let description = "";
  let postedBy = "";
  let timestamp = "";
  const url = window.location.href;

  if (platform === "facebook") {
    title = extractFacebookTitle(element, postText);
    description = extractFacebookDescription(element, postText);
    postedBy = extractFacebookPoster(element);
    timestamp = extractFacebookTimestamp(element);
  } else if (platform === "linkedin") {
    title = extractLinkedInTitle(element, postText);
    description = extractLinkedInDescription(element, postText);
    postedBy = extractLinkedInPoster(element);
    timestamp = extractLinkedInTimestamp(element);
  } else if (platform === "jobstreet") {
    title = extractJobStreetTitle(element, postText);
    description = extractJobStreetDescription(element, postText);
    postedBy = extractJobStreetCompany(element);
    timestamp = extractGenericTimestamp(element);
  } else {
    // indeed
    title = extractIndeedTitle(element, postText);
    description = extractIndeedDescription(element, postText);
    postedBy = extractIndeedCompany(element);
    timestamp = extractGenericTimestamp(element);
  }

  // Fallback title: first meaningful line from the cleaned post text only
  if (!title) {
    const lines = postText
      .split(/[\n.!?]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && l.length < 120);
    title = lines[0] ?? "Job Opportunity";
  }

  const budget = hasCurrency ? parseBudget(postText) : undefined;
  const location = extractLocation(postText);
  const category = autoTagCategory(postText);

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
    phone: phone ? sanitize(phone) : undefined,
    email: email ? sanitize(email) : undefined,
  };
}

// ── Facebook-specific extractors ──────────────────────────────────────────────

function extractFacebookTitle(element: Element, postText: string): string {
  // Only look for <strong> tags that are NOT inside a nested article (comment)
  const strongs = Array.from(element.querySelectorAll("strong"));
  for (const s of strongs) {
    if (s.closest('[role="article"]') !== element) continue; // inside a comment
    const t = s.textContent?.trim() ?? "";
    if (t.length > 3) return t;
  }

  // h1/h2/h3 not inside a comment
  for (const tag of ["h1", "h2", "h3"]) {
    const heading = element.querySelector(tag);
    if (!heading) continue;
    if (heading.closest('[role="article"]') !== element) continue;
    if (heading.textContent?.trim()) return heading.textContent.trim();
  }

  // Extract first hiring-keyword sentence from post-body text only
  const match = postText.match(/(?:hiring|looking for|need(?:ed)?|vacancy|open(?:ing)?)[^.!?\n]{5,80}/i);
  if (match) return match[0].trim();

  return "";
}

function extractFacebookDescription(element: Element, postText: string): string {
  // Most reliable: dedicated post-body data attributes (never inside comments)
  const postBody =
    element.querySelector('[data-ad-preview="message"]') ??
    element.querySelector('[data-testid="post_message"]') ??
    element.querySelector('[data-testid="story-message"]');

  if (postBody?.textContent?.trim()) return postBody.textContent.trim();

  // Walk [dir="auto"] elements but ONLY accept ones whose closest [role="article"]
  // is the root post element — not a nested comment article
  const dirAutos = Array.from(element.querySelectorAll('[dir="auto"]'));
  for (const el of dirAutos) {
    const closestArticle = el.closest('[role="article"]');
    // If there's no article ancestor, or the closest one IS our root element → post body
    if (closestArticle && closestArticle !== element) continue;
    const text = el.textContent?.trim() ?? "";
    if (text.length > 30) return text;
  }

  // Safe fallback: cleaned text from getPostBodyText (comments already stripped)
  return postText;
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

function extractLinkedInDescription(element: Element, postText: string): string {
  // These selectors are scoped to post body — they never include the comments list
  const textNode =
    element.querySelector(".feed-shared-text") ??
    element.querySelector(".update-components-text") ??
    element.querySelector(".feed-shared-update-v2__description") ??
    element.querySelector("[data-test-id='main-feed-activity-card__commentary']");

  if (textNode?.textContent) return textNode.textContent.trim();

  // Fall back to already-cleaned text (comments stripped by getPostBodyText)
  return postText;
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
