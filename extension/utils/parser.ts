import type { JobPost, Platform } from "../types";

// ── Keyword scoring ───────────────────────────────────────────────────────────

const JOB_KEYWORDS: Record<string, number> = {
  // ── Strong signals ──
  hiring: 3,
  "we're hiring": 4,
  "we are hiring": 4,
  "now hiring": 4,
  "job opening": 4,
  "job opportunity": 3,
  "job vacancy": 4,
  "job offer": 3,
  "open position": 3,
  "immediate hiring": 4,
  "urgently hiring": 4,
  "job available": 3,
  "jobs available": 3,
  "accepting applications": 3,
  "looking for": 2,
  "need a": 2,
  "needed urgently": 3,
  urgent: 2,
  vacancy: 3,
  vacancies: 3,
  "apply now": 3,
  "apply here": 3,
  "send cv": 3,
  "send resume": 3,
  "drop your cv": 3,
  "drop cv": 3,
  "submit cv": 3,
  "send application": 3,
  "job description": 3,

  // ── Work type ──
  "full-time": 2,
  fulltime: 2,
  "part-time": 2,
  parttime: 2,
  "work from home": 2,
  "work from office": 2,
  wfh: 2,
  "remote work": 2,
  onsite: 2,
  "on-site": 2,
  freelance: 2,
  contractor: 2,
  "project-based": 2,

  // ── Compensation ──
  salary: 2,
  "per month": 2,
  "per day": 2,
  "per hour": 1,
  budget: 2,
  compensation: 2,
  "basic pay": 2,
  allowance: 1,
  benefits: 1,
  "with benefits": 2,

  // ── Contact / apply ──
  "dm for": 2,
  "dm us": 2,
  "inbox us": 2,
  "message us": 1,
  "contact us": 1,
  "interested applicants": 3,
  "interested candidates": 3,
  applicants: 2,
  candidates: 1,

  // ── Requirements / qualifications ──
  "experience required": 2,
  "years experience": 2,
  "years of experience": 2,
  "minimum experience": 2,
  "at least": 1,
  skills: 1,
  qualifications: 2,
  requirements: 1,
  responsibilities: 2,
  "must have": 1,
  "must be": 1,
  "must know": 1,

  // ── Position / role ──
  position: 1,
  role: 1,
  "job title": 2,
  post: 1,

  // ── Trade & service keywords ──
  plumber: 3,
  electrician: 3,
  carpenter: 3,
  painter: 3,
  cleaner: 3,
  driver: 2,
  technician: 2,
  mechanic: 2,
  welder: 3,
  mason: 3,
  laborer: 3,
  helper: 2,
  assistant: 1,
  manager: 1,
  engineer: 1,
  developer: 1,
  designer: 1,
  staff: 1,
  worker: 2,
  operator: 2,
  supervisor: 2,
  "service crew": 3,
  cashier: 3,
  "sales representative": 3,
  "sales agent": 3,
  "virtual assistant": 3,
  "data entry": 3,
  encoder: 3,
  "customer service": 2,
  "customer care": 2,
  receptionist: 3,
  "call center": 3,
  agent: 1,

  // ── Filipino / regional phrases ──
  "naghahanap ng": 3,   // "looking for" in Tagalog
  "nag-aanyaya": 3,     // "inviting" applicants
  "may bakante": 4,     // "has vacancy" in Tagalog
  "kailangan ng": 3,    // "need a" in Tagalog
  "puwede mag-apply": 3,
  "pwede mag-apply": 3,
  "mag-apply na": 3,
  "walang experience": 2,
  "training provided": 2,
  "open for": 2,
  "qualified applicants": 3,
  ofw: 2,
  "male or female": 2,
  "male/female": 2,
  "accepting walk-in": 3,
};

const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,15}\d)/g;
const CURRENCY_REGEX = /(?:PHP|AED|USD|\$|₱|€|£)\s*[\d,]+|[\d,]+\s*(?:PHP|AED|USD)/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Minimum score for a post to be considered a job post */
const DETECTION_THRESHOLD = 4;

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

// ── Scoring ───────────────────────────────────────────────────────────────────

interface ScoringResult {
  score: number;
  confidence: number;
  hasPhone: boolean;
  hasCurrency: boolean;
  hasEmail: boolean;
}

function scoreText(text: string): ScoringResult {
  const lower = text.toLowerCase();
  let score = 0;

  for (const [keyword, weight] of Object.entries(JOB_KEYWORDS)) {
    if (lower.includes(keyword)) {
      score += weight;
    }
  }

  const hasPhone = PHONE_REGEX.test(text);
  const hasCurrency = CURRENCY_REGEX.test(text);
  const hasEmail = EMAIL_REGEX.test(text);

  // Reset regex lastIndex after test()
  PHONE_REGEX.lastIndex = 0;
  CURRENCY_REGEX.lastIndex = 0;
  EMAIL_REGEX.lastIndex = 0;

  if (hasPhone) score += 2;
  if (hasCurrency) score += 3;
  if (hasEmail) score += 1;

  // Normalize to a 0–1 confidence score; cap input at 20 for normalization
  const confidence = Math.min(score / 20, 1);

  return { score, confidence, hasPhone, hasCurrency, hasEmail };
}

// ── Public detection API ──────────────────────────────────────────────────────

/**
 * Returns true if the given element looks like a job post.
 * Exported for use in the content script scanner.
 */
export function detectJobPost(element: Element): boolean {
  const text = element.textContent ?? "";
  const { score } = scoreText(text);
  return score >= DETECTION_THRESHOLD;
}

/**
 * Extracts structured job data from a post element.
 * Handles platform-specific DOM structure.
 */
export function extractJobData(element: Element, platform: Platform): JobPost {
  const text = element.textContent ?? "";
  const { confidence, hasCurrency } = scoreText(text);

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
  } else {
    title = extractLinkedInTitle(element, text);
    description = extractLinkedInDescription(element, text);
    postedBy = extractLinkedInPoster(element);
    timestamp = extractLinkedInTimestamp(element);
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
    confidence,
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
  } else {
    const links = element.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (const link of links) {
      const href = link.href;
      if (href.includes("/feed/update/") || href.includes("/posts/") || href.includes("ugcPost")) {
        return href;
      }
    }
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
