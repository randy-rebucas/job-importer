"use strict";
(() => {
  // extension/utils/parser.ts
  var PHONE_REGEX = /(\+?\d[\d\s\-().]{7,15}\d)/g;
  var CURRENCY_REGEX = /(?:PHP|AED|USD|\$|₱|€|£)\s*[\d,]+|[\d,]+\s*(?:PHP|AED|USD)/gi;
  var EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  var CATEGORY_KEYWORDS = {
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
    Security: ["security guard", "security officer", "bodyguard", "cctv", "patrol"]
  };
  function autoTagCategory(text) {
    const lower = text.toLowerCase();
    let bestCategory;
    let bestScore = 0;
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const score = keywords.filter((kw) => lower.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
    return bestScore > 0 ? bestCategory : void 0;
  }
  function extractSignals(text) {
    const phoneMatches = text.match(PHONE_REGEX);
    const currencyMatches = text.match(CURRENCY_REGEX);
    const emailMatches = text.match(EMAIL_REGEX);
    return {
      hasPhone: phoneMatches !== null,
      hasCurrency: currencyMatches !== null,
      hasEmail: emailMatches !== null,
      phone: phoneMatches?.[0]?.trim(),
      email: emailMatches?.[0]?.trim()
    };
  }
  function getPostBodyText(element, platform) {
    const clone = element.cloneNode(true);
    if (platform === "facebook") {
      clone.querySelectorAll('[role="article"]').forEach((el) => el.remove());
      [
        "form",
        '[role="form"]',
        "[data-commentid]",
        '[data-testid*="comment"]',
        '[data-testid*="Comment"]',
        '[data-testid*="ufi"]',
        '[data-testid*="UFI"]',
        '[aria-label*="eaction"]',
        // "reaction", "Reaction"
        '[aria-label*="omment"]',
        // "comment", "Comment"
        '[aria-label*="hare"]'
        // "share", "Share"
      ].forEach((sel) => clone.querySelectorAll(sel).forEach((el) => el.remove()));
    } else if (platform === "linkedin") {
      [
        ".comments-comments-list",
        ".comments-comment-list",
        ".comments-comment-item",
        ".comments-comment-texteditor",
        ".comments-reply-compose-box",
        ".social-details-social-counts",
        ".social-details-social-activity",
        ".feed-shared-social-action-bar",
        ".feed-shared-footer",
        ".social-actions-bar",
        ".update-components-footer",
        ".update-components-social-activity",
        '[class*="comment-"]',
        '[class*="-comment"]'
      ].forEach((sel) => clone.querySelectorAll(sel).forEach((el) => el.remove()));
    }
    return clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }
  function extractJobData(element, platform) {
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
      title = extractIndeedTitle(element, postText);
      description = extractIndeedDescription(element, postText);
      postedBy = extractIndeedCompany(element);
      timestamp = extractGenericTimestamp(element);
    }
    if (!title) {
      const lines = postText.split(/[\n.!?]/).map((l) => l.trim()).filter((l) => l.length > 10 && l.length < 120);
      title = lines[0] ?? "Job Opportunity";
    }
    const budget = hasCurrency ? parseBudget(postText) : void 0;
    const location = extractLocation(postText);
    const category = autoTagCategory(postText);
    return {
      title: sanitize(title.slice(0, 150)),
      description: sanitize(description.slice(0, 2e3)),
      source: platform,
      source_url: extractPostUrl(element, platform) || url,
      posted_by: sanitize(postedBy.slice(0, 100)),
      timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      location: location ? sanitize(location) : void 0,
      budget,
      category,
      phone: phone ? sanitize(phone) : void 0,
      email: email ? sanitize(email) : void 0
    };
  }
  function extractFacebookTitle(element, postText) {
    const strongs = Array.from(element.querySelectorAll("strong"));
    for (const s of strongs) {
      if (s.closest('[role="article"]') !== element)
        continue;
      const t = s.textContent?.trim() ?? "";
      if (t.length > 3)
        return t;
    }
    for (const tag of ["h1", "h2", "h3"]) {
      const heading = element.querySelector(tag);
      if (!heading)
        continue;
      if (heading.closest('[role="article"]') !== element)
        continue;
      if (heading.textContent?.trim())
        return heading.textContent.trim();
    }
    const match = postText.match(/(?:hiring|looking for|need(?:ed)?|vacancy|open(?:ing)?)[^.!?\n]{5,80}/i);
    if (match)
      return match[0].trim();
    return "";
  }
  function extractFacebookDescription(element, postText) {
    const postBody = element.querySelector('[data-ad-preview="message"]') ?? element.querySelector('[data-testid="post_message"]') ?? element.querySelector('[data-testid="story-message"]');
    if (postBody?.textContent?.trim())
      return postBody.textContent.trim();
    const dirAutos = Array.from(element.querySelectorAll('[dir="auto"]'));
    for (const el of dirAutos) {
      const closestArticle = el.closest('[role="article"]');
      if (closestArticle && closestArticle !== element)
        continue;
      const text = el.textContent?.trim() ?? "";
      if (text.length > 30)
        return text;
    }
    return postText;
  }
  function extractFacebookPoster(element) {
    const actorLink = element.querySelector('a[role="link"][tabindex="0"] strong') ?? element.querySelector('[data-testid="story-subtitle"] a') ?? element.querySelector("h3 a") ?? element.querySelector("h4 a");
    return actorLink?.textContent?.trim() ?? "";
  }
  function extractFacebookTimestamp(element) {
    const timeEl = element.querySelector("abbr[data-utime]");
    if (timeEl) {
      const utime = timeEl.getAttribute("data-utime");
      if (utime)
        return new Date(parseInt(utime) * 1e3).toISOString();
    }
    const timeTag = element.querySelector("time");
    if (timeTag) {
      const dt = timeTag.getAttribute("datetime");
      if (dt)
        return new Date(dt).toISOString();
      if (timeTag.textContent)
        return timeTag.textContent.trim();
    }
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  function extractPostUrl(element, platform) {
    if (platform === "facebook") {
      const links = element.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href;
        if (href.includes("/posts/") || href.includes("story_fbid") || href.includes("permalink")) {
          return href;
        }
      }
    } else if (platform === "linkedin") {
      const links = element.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href;
        if (href.includes("/feed/update/") || href.includes("/posts/") || href.includes("ugcPost")) {
          return href;
        }
      }
    } else if (platform === "jobstreet") {
      const link = element.querySelector("a[href*='/job/'], a[data-automation='job-list-item-link-overlay']");
      if (link?.href)
        return link.href;
      const jobId = element.getAttribute("data-job-id") ?? element.getAttribute("data-automation-id");
      if (jobId)
        return `https://www.jobstreet.com.ph/job/${jobId}`;
    } else if (platform === "indeed") {
      const link = element.querySelector("a[href*='/rc/clk'], a[href*='/viewjob'], h2 a");
      if (link?.href)
        return link.href;
      const jk = element.getAttribute("data-jk");
      if (jk)
        return `https://ph.indeed.com/viewjob?jk=${jk}`;
    }
    return window.location.href;
  }
  function extractLinkedInTitle(element, fullText) {
    const strong = element.querySelector(".feed-shared-text strong") ?? element.querySelector(".update-components-text strong");
    if (strong?.textContent)
      return strong.textContent.trim();
    const jobTitle = element.querySelector(
      ".job-card-container__link, .jobs-unified-top-card__job-title"
    );
    if (jobTitle?.textContent)
      return jobTitle.textContent.trim();
    const match = fullText.match(/(?:hiring|looking for|need)[^.!?\n]{5,80}/i);
    if (match)
      return match[0].trim();
    return "";
  }
  function extractLinkedInDescription(element, postText) {
    const textNode = element.querySelector(".feed-shared-text") ?? element.querySelector(".update-components-text") ?? element.querySelector(".feed-shared-update-v2__description") ?? element.querySelector("[data-test-id='main-feed-activity-card__commentary']");
    if (textNode?.textContent)
      return textNode.textContent.trim();
    return postText;
  }
  function extractLinkedInPoster(element) {
    const actor = element.querySelector(".update-components-actor__name span[aria-hidden='true']") ?? element.querySelector(".feed-shared-actor__name") ?? element.querySelector(".update-components-actor__name");
    return actor?.textContent?.trim() ?? "";
  }
  function extractLinkedInTimestamp(element) {
    const timeEl = element.querySelector("time");
    if (timeEl) {
      const dt = timeEl.getAttribute("datetime");
      if (dt)
        return new Date(dt).toISOString();
    }
    const relativeTime = element.querySelector(
      ".feed-shared-actor__sub-description, .update-components-actor__sub-description"
    );
    if (relativeTime?.textContent)
      return relativeTime.textContent.trim();
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  function extractJobStreetTitle(element, fullText) {
    const title = element.querySelector('[data-automation="job-card-title"] span') ?? element.querySelector('[data-automation="job-card-title"]') ?? element.querySelector("h1, h2, h3");
    if (title?.textContent)
      return title.textContent.trim();
    const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 120);
    return lines[0] ?? "Job Opening";
  }
  function extractJobStreetDescription(element, fullText) {
    const desc = element.querySelector('[data-automation="job-card-teaser"]') ?? element.querySelector('[class*="teaser"]') ?? element.querySelector('[class*="description"]');
    if (desc?.textContent)
      return desc.textContent.trim();
    return fullText.trim();
  }
  function extractJobStreetCompany(element) {
    const company = element.querySelector('[data-automation="job-card-company"]') ?? element.querySelector('[class*="company"]') ?? element.querySelector('[class*="advertiser"]');
    return company?.textContent?.trim() ?? "";
  }
  function extractIndeedTitle(element, fullText) {
    const title = element.querySelector("h2.jobTitle span[title]") ?? element.querySelector("h2.jobTitle span:not([class])") ?? element.querySelector(".jobTitle a span") ?? element.querySelector("h2, h3");
    if (title?.textContent)
      return title.textContent.trim();
    const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 120);
    return lines[0] ?? "Job Opening";
  }
  function extractIndeedDescription(element, fullText) {
    const desc = element.querySelector(".job-snippet") ?? element.querySelector('[class*="snippet"]') ?? element.querySelector('[class*="description"]');
    if (desc?.textContent)
      return desc.textContent.trim();
    return fullText.trim();
  }
  function extractIndeedCompany(element) {
    const company = element.querySelector(".companyName") ?? element.querySelector('[data-testid="company-name"]') ?? element.querySelector('[class*="company"]');
    return company?.textContent?.trim() ?? "";
  }
  function extractGenericTimestamp(element) {
    const timeEl = element.querySelector("time");
    if (timeEl) {
      const dt = timeEl.getAttribute("datetime");
      if (dt)
        return new Date(dt).toISOString();
    }
    return (/* @__PURE__ */ new Date()).toISOString();
  }
  function parseBudget(text) {
    CURRENCY_REGEX.lastIndex = 0;
    const match = CURRENCY_REGEX.exec(text);
    if (!match)
      return void 0;
    const numStr = match[0].replace(/[^0-9]/g, "");
    const num = parseInt(numStr, 10);
    return isNaN(num) ? void 0 : num;
  }
  var LOCATION_PATTERNS = [
    /\blocation[:\s]+([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,
    /\b(?:based in|located in|work in|working in|site[:\s]+)\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,
    /\b(?:in|at)\s+([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)(?=\s*[\.\,\n])/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(?:Metro\s)?(?:Manila|Cebu|Davao|Quezon City|Makati|Pasig|Taguig|Mandaluyong|Parañaque|Las Piñas|Muntinlupa|Caloocan|Marikina|Pasay|Dubai|Abu Dhabi|Sharjah|Singapore|Riyadh|Qatar)/
  ];
  function extractLocation(text) {
    for (const pattern of LOCATION_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1])
        return match[1].trim();
    }
    return void 0;
  }
  function sanitize(input) {
    return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  // extension/utils/domHelpers.ts
  var SCAN_BTN_ID = "localpro-scan-host";
  var PANEL_HOST_ID = "localpro-panel-host";
  var MODAL_HOST_ID = "localpro-modal-host";
  var LP_URL = "https://www.localpro.asia";
  var BASE_STYLES = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  /* \u2500\u2500 Floating scan buttons \u2500\u2500 */
  .lp-fab-wrap {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 2147483646;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .lp-fab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 18px;
    background: #1a56db;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(26,86,219,.45);
    transition: background .2s, transform .15s, box-shadow .2s;
    line-height: 1;
    white-space: nowrap;
  }
  .lp-fab:hover  { background: #1e429f; box-shadow: 0 6px 20px rgba(26,86,219,.55); transform: translateY(-1px); }
  .lp-fab:active { transform: scale(0.96); }
  .lp-fab:disabled { background: #6b7280; cursor: not-allowed; box-shadow: none; transform: none; }
  .lp-fab.secondary { background: #0f766e; box-shadow: 0 4px 16px rgba(15,118,110,.4); font-size: 12px; padding: 9px 14px; }
  .lp-fab.secondary:hover { background: #0d5e58; }
  .lp-fab svg { flex-shrink: 0; }

  /* \u2500\u2500 Selection panel (side drawer) \u2500\u2500 */
  .lp-panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.35);
    z-index: 2147483646;
    display: flex;
    justify-content: flex-end;
    animation: lp-fade-in .15s ease;
  }
  @keyframes lp-fade-in { from { opacity: 0 } to { opacity: 1 } }

  .lp-panel {
    width: 440px;
    max-width: 100vw;
    height: 100%;
    background: #fff;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0,0,0,.15);
    animation: lp-slide-left .2s ease;
  }
  @keyframes lp-slide-left { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }

  .lp-panel-header {
    padding: 16px 18px 12px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .lp-panel-title {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lp-panel-count {
    display: inline-block;
    background: #eff6ff;
    color: #1e40af;
    border-radius: 20px;
    padding: 2px 9px;
    font-size: 12px;
    font-weight: 700;
  }
  .lp-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }
  .lp-close-btn:hover { background: #f3f4f6; color: #111827; }

  /* Search bar */
  .lp-search-wrap {
    padding: 10px 18px;
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
  }
  .lp-search-input {
    width: 100%;
    padding: 8px 12px 8px 34px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    color: #111827;
    background: #f9fafb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z'/%3E%3C/svg%3E") no-repeat 10px center;
    box-sizing: border-box;
    outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  .lp-search-input:focus { border-color: #1a56db; background-color: #fff; }

  /* Bulk pre-fill */
  .lp-bulk-section {
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
  }
  .lp-bulk-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: .4px;
    font-family: inherit;
  }
  .lp-bulk-toggle:hover { background: #f9fafb; }
  .lp-bulk-toggle svg { transition: transform .2s; }
  .lp-bulk-toggle.open svg { transform: rotate(180deg); }

  .lp-bulk-body {
    display: none;
    padding: 4px 18px 14px;
    background: #fafafa;
  }
  .lp-bulk-body.open { display: block; }
  .lp-bulk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .lp-bulk-label { display: block; font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 3px; text-transform: uppercase; letter-spacing: .4px; }
  .lp-bulk-input, .lp-bulk-select {
    width: 100%;
    padding: 7px 10px;
    border: 1.5px solid #d1d5db;
    border-radius: 7px;
    font-size: 13px;
    color: #111827;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    font-family: inherit;
    transition: border-color .15s;
  }
  .lp-bulk-input:focus, .lp-bulk-select:focus { border-color: #1a56db; }
  .lp-bulk-apply {
    width: 100%;
    padding: 8px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background .15s;
  }
  .lp-bulk-apply:hover { background: #1e429f; }

  /* Toolbar (select-all + count + CSV) */
  .lp-panel-toolbar {
    padding: 8px 18px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    background: #fafafa;
  }
  .lp-select-all-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    user-select: none;
  }
  .lp-select-all-label input { cursor: pointer; width: 15px; height: 15px; accent-color: #1a56db; }
  .lp-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .lp-selected-count { font-size: 12px; color: #6b7280; font-weight: 500; }
  .lp-csv-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    background: #fff;
    border: 1.5px solid #d1d5db;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    font-family: inherit;
    transition: background .1s;
  }
  .lp-csv-btn:hover { background: #f3f4f6; }

  /* Job list */
  .lp-panel-list { flex: 1; overflow-y: auto; padding: 6px 0; }

  .lp-job-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 18px;
    border-bottom: 1px solid #f9fafb;
    cursor: pointer;
    transition: background .1s;
  }
  .lp-job-item:hover   { background: #f9fafb; }
  .lp-job-item.selected { background: #eff6ff; }
  .lp-job-item.hidden   { display: none; }

  .lp-job-checkbox {
    margin-top: 3px;
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    accent-color: #1a56db;
    cursor: pointer;
  }
  .lp-job-info { flex: 1; min-width: 0; }
  .lp-job-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lp-job-meta {
    font-size: 11px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .lp-dup-badge {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
  }

  .lp-source-chip {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .lp-source-chip.facebook  { background: #dbeafe; color: #1d4ed8; }
  .lp-source-chip.linkedin  { background: #cffafe; color: #0e7490; }
  .lp-source-chip.jobstreet { background: #d1fae5; color: #065f46; }
  .lp-source-chip.indeed    { background: #fce7f3; color: #9d174d; }

  .lp-no-results {
    text-align: center;
    padding: 32px 18px;
    color: #9ca3af;
    font-size: 13px;
    display: none;
  }
  .lp-no-results.visible { display: block; }

  /* Footer */
  .lp-panel-footer { padding: 12px 18px; border-top: 1px solid #e5e7eb; flex-shrink: 0; background: #fff; }
  .lp-import-btn {
    width: 100%;
    padding: 11px 20px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: inherit;
  }
  .lp-import-btn:hover { background: #1e429f; }
  .lp-import-btn:disabled { background: #9ca3af; cursor: not-allowed; }

  /* \u2500\u2500 Modal overlay \u2500\u2500 */
  .lp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.5);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: lp-fade-in .15s ease;
  }
  .lp-modal {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
    animation: lp-slide-up .2s ease;
  }
  @keyframes lp-slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .lp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e5e7eb;
  }
  .lp-modal-title { font-size: 16px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }
  .lp-modal-progress { font-size: 12px; font-weight: 600; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 20px; }
  .lp-modal-header-right { display: flex; align-items: center; gap: 8px; }
  .lp-modal-body { padding: 18px 22px; }

  .lp-field { margin-bottom: 13px; }
  .lp-label { display: block; font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
  .lp-label .lp-required { color: #ef4444; margin-left: 2px; }
  .lp-input, .lp-textarea, .lp-select {
    width: 100%;
    padding: 9px 12px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  .lp-input:focus, .lp-textarea:focus, .lp-select:focus { border-color: #1a56db; }
  .lp-textarea { resize: vertical; min-height: 90px; }
  .lp-select:disabled { background: #f3f4f6; color: #9ca3af; }
  .lp-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  input[type="date"].lp-input { color-scheme: light; }

  .lp-hint { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .lp-hint.ai { color: #7c3aed; }
  .lp-hint.success { color: #059669; }

  /* AI estimate button */
  .lp-estimate-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    padding: 4px 10px;
    background: #f5f3ff;
    color: #6d28d9;
    border: 1.5px solid #ddd6fe;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-estimate-btn:hover { background: #ede9fe; }
  .lp-estimate-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* AI clean description button */
  .lp-ai-clean-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    padding: 4px 10px;
    background: #f0fdf4;
    color: #15803d;
    border: 1.5px solid #bbf7d0;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-ai-clean-btn:hover { background: #dcfce7; }
  .lp-ai-clean-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* AI Smart Fill bar */
  .lp-ai-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    background: linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%);
    border: 1.5px solid #ddd6fe;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .lp-ai-bar-label {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    color: #5b21b6;
  }
  .lp-ai-bar-label span { font-weight: 400; color: #7c3aed; }
  .lp-smart-fill-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 13px;
    background: #7c3aed;
    color: #fff;
    border: none;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
    white-space: nowrap;
  }
  .lp-smart-fill-btn:hover { background: #6d28d9; }
  .lp-smart-fill-btn:disabled { background: #a78bfa; cursor: not-allowed; }

  /* \u2500\u2500 Per-post inline import button \u2500\u2500 */
  .lp-post-btn-wrap {
    display: flex;
    align-items: center;
    padding: 6px 0 2px 0;
  }
  .lp-post-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1.5px solid #bfdbfe;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: background .15s, border-color .15s, box-shadow .15s;
    white-space: nowrap;
    line-height: 1;
  }
  .lp-post-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(29,78,216,.15);
  }
  .lp-post-btn:active { transform: scale(0.97); }
  .lp-post-btn.importing {
    background: #f3f4f6;
    color: #6b7280;
    border-color: #e5e7eb;
    cursor: not-allowed;
  }
  .lp-post-btn.done {
    background: #d1fae5;
    color: #065f46;
    border-color: #6ee7b7;
    cursor: default;
  }

  /* Contact info pill */
  .lp-contact-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 13px;
    flex-wrap: wrap;
  }
  .lp-contact-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .5px;
    flex-shrink: 0;
  }
  .lp-contact-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    font-size: 12px;
    color: #334155;
    font-weight: 500;
    user-select: text;
  }

  /* Modal footer */
  .lp-modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 22px; border-top: 1px solid #e5e7eb; }
  .lp-cancel-btn {
    padding: 9px 18px;
    border: 1.5px solid #d1d5db;
    background: #fff;
    color: #374151;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-cancel-btn:hover { background: #f9fafb; }
  .lp-skip-btn {
    padding: 9px 18px;
    border: 1.5px solid #d1d5db;
    background: #fff;
    color: #6b7280;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-skip-btn:hover { background: #f9fafb; color: #374151; }
  .lp-submit-btn {
    padding: 9px 20px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
  }
  .lp-submit-btn:hover { background: #1e429f; }
  .lp-submit-btn:disabled { background: #9ca3af; cursor: not-allowed; }

  /* Status */
  .lp-status { margin: 0 22px 14px; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; display: none; line-height: 1.5; }
  .lp-status.success { display: block; background: #d1fae5; color: #065f46; }
  .lp-status.error   { display: block; background: #fee2e2; color: #991b1b; }
  .lp-status.loading { display: block; background: #eff6ff; color: #1e40af; }
  .lp-status a { color: inherit; font-weight: 700; }
  .lp-status a:hover { text-decoration: underline; }
`;
  function injectFloatingScanButton(onScan, onScrollScan) {
    document.getElementById(SCAN_BTN_ID)?.remove();
    const host = document.createElement("div");
    host.id = SCAN_BTN_ID;
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = BASE_STYLES;
    shadow.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "lp-fab-wrap";
    const makeBtn = (label, secondary) => {
      const btn = document.createElement("button");
      btn.className = secondary ? "lp-fab secondary" : "lp-fab";
      btn.innerHTML = secondary ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> ${label}` : `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> ${label}`;
      return btn;
    };
    const scanBtn = makeBtn("Scan Jobs on This Page", false);
    const scrollScanBtn = makeBtn("Scroll & Scan", true);
    const buildSetter = (btn, isScrollScan) => (scanning) => {
      scanBtn.disabled = scanning;
      scrollScanBtn.disabled = scanning;
      btn.innerHTML = scanning ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.4-5.4M20 15a9 9 0 01-14.4 5.4"/></svg> ${isScrollScan ? "Scrolling\u2026" : "Scanning\u2026"}` : isScrollScan ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> Scroll & Scan` : `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> Scan Jobs on This Page`;
    };
    scanBtn.addEventListener("click", () => onScan(buildSetter(scanBtn, false)));
    scrollScanBtn.addEventListener("click", () => onScrollScan(buildSetter(scrollScanBtn, true)));
    wrap.appendChild(scanBtn);
    wrap.appendChild(scrollScanBtn);
    shadow.appendChild(wrap);
  }
  var PER_POST_ATTR = "data-lp-injected";
  var PER_POST_STYLES = `
  :host { display: block; }
  .lp-post-btn-wrap {
    display: flex;
    align-items: center;
    padding: 6px 0 2px 0;
  }
  .lp-post-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1.5px solid #bfdbfe;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: background .15s, border-color .15s, box-shadow .15s;
    white-space: nowrap;
    line-height: 1;
  }
  .lp-post-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(29,78,216,.15);
  }
  .lp-post-btn:active { transform: scale(0.97); }
  .lp-post-btn.importing { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; cursor: not-allowed; }
  .lp-post-btn.done { background: #d1fae5; color: #065f46; border-color: #6ee7b7; cursor: default; }
`;
  var IMPORT_ICON = `<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>`;
  function injectPerPostImportButton(container, isDup, onClick) {
    if (container.hasAttribute(PER_POST_ATTR))
      return;
    container.setAttribute(PER_POST_ATTR, "1");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = PER_POST_STYLES;
    const wrap = document.createElement("div");
    wrap.className = "lp-post-btn-wrap";
    const btn = document.createElement("button");
    btn.className = "lp-post-btn" + (isDup ? " done" : "");
    btn.innerHTML = isDup ? `${IMPORT_ICON} Already imported` : `${IMPORT_ICON} Import to LocalPro`;
    const markDone = () => {
      btn.className = "lp-post-btn done";
      btn.innerHTML = `${IMPORT_ICON} Imported!`;
    };
    if (!isDup) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (btn.classList.contains("importing") || btn.classList.contains("done"))
          return;
        btn.className = "lp-post-btn importing";
        btn.innerHTML = `${IMPORT_ICON} Opening\u2026`;
        onClick(markDone);
      });
    }
    wrap.appendChild(btn);
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    container.appendChild(host);
  }
  function showJobSelectionPanel(jobs, importedUrls, onImport) {
    document.getElementById(PANEL_HOST_ID)?.remove();
    const host = document.createElement("div");
    host.id = PANEL_HOST_ID;
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = BASE_STYLES;
    shadow.appendChild(style);
    const selected = new Set(jobs.map((_, i) => i));
    let bulkDefaults = {};
    let filterText = "";
    const overlay = document.createElement("div");
    overlay.className = "lp-panel-overlay";
    const panel = document.createElement("div");
    panel.className = "lp-panel";
    const header = document.createElement("div");
    header.className = "lp-panel-header";
    const titleWrap = document.createElement("div");
    titleWrap.className = "lp-panel-title";
    titleWrap.innerHTML = `
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
    Jobs Found <span class="lp-panel-count">${jobs.length}</span>
  `;
    const closeBtn = document.createElement("button");
    closeBtn.className = "lp-close-btn";
    closeBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    closeBtn.addEventListener("click", () => host.remove());
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);
    const searchWrap = document.createElement("div");
    searchWrap.className = "lp-search-wrap";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "lp-search-input";
    searchInput.placeholder = "Filter posts\u2026";
    searchInput.addEventListener("input", () => {
      filterText = searchInput.value.toLowerCase();
      let visibleCount = 0;
      items.forEach((item, i) => {
        const job = jobs[i];
        const matches = !filterText || job.title.toLowerCase().includes(filterText) || job.description.toLowerCase().includes(filterText) || (job.posted_by ?? "").toLowerCase().includes(filterText);
        item.classList.toggle("hidden", !matches);
        if (matches)
          visibleCount++;
      });
      noResults.classList.toggle("visible", visibleCount === 0);
      updateCount();
    });
    searchWrap.appendChild(searchInput);
    const bulkSection = document.createElement("div");
    bulkSection.className = "lp-bulk-section";
    const bulkToggle = document.createElement("button");
    bulkToggle.type = "button";
    bulkToggle.className = "lp-bulk-toggle";
    bulkToggle.innerHTML = `
    Apply Defaults to All
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  `;
    const bulkBody = document.createElement("div");
    bulkBody.className = "lp-bulk-body";
    const tomorrowStr = new Date(Date.now() + 864e5).toISOString().split("T")[0];
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    bulkBody.innerHTML = `
    <div class="lp-bulk-grid">
      <div>
        <label class="lp-bulk-label">Location</label>
        <input class="lp-bulk-input" id="lp-bulk-location" type="text" placeholder="e.g. Makati City" />
      </div>
      <div>
        <label class="lp-bulk-label">Budget (PHP)</label>
        <input class="lp-bulk-input" id="lp-bulk-budget" type="number" min="1" placeholder="e.g. 1500" />
      </div>
      <div>
        <label class="lp-bulk-label">Schedule Date</label>
        <input class="lp-bulk-input" id="lp-bulk-date" type="date" value="${tomorrowStr}" min="${todayStr}" />
      </div>
      <div>
        <label class="lp-bulk-label">Urgency</label>
        <select class="lp-bulk-select" id="lp-bulk-urgency">
          <option value="standard">Standard</option>
          <option value="same_day">Same Day</option>
          <option value="rush">Rush</option>
        </select>
      </div>
    </div>
    <button class="lp-bulk-apply" id="lp-bulk-apply">Apply to All Selected</button>
  `;
    bulkToggle.addEventListener("click", () => {
      const open = bulkBody.classList.toggle("open");
      bulkToggle.classList.toggle("open", open);
    });
    bulkBody.querySelector("#lp-bulk-apply").addEventListener("click", () => {
      const locationEl = bulkBody.querySelector("#lp-bulk-location");
      const budgetEl = bulkBody.querySelector("#lp-bulk-budget");
      const dateEl = bulkBody.querySelector("#lp-bulk-date");
      const urgencyEl = bulkBody.querySelector("#lp-bulk-urgency");
      bulkDefaults = {
        location: locationEl.value.trim() || void 0,
        budget: parseFloat(budgetEl.value) || void 0,
        scheduleDate: dateEl.value || void 0,
        urgency: urgencyEl.value || void 0
      };
      bulkBody.classList.remove("open");
      bulkToggle.classList.remove("open");
      bulkToggle.textContent = "\u2713 Defaults set \u2014 Apply Defaults to All";
      setTimeout(() => {
        bulkToggle.innerHTML = `Apply Defaults to All <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
      }, 2e3);
    });
    bulkSection.appendChild(bulkToggle);
    bulkSection.appendChild(bulkBody);
    const toolbar = document.createElement("div");
    toolbar.className = "lp-panel-toolbar";
    const selectAllLabel = document.createElement("label");
    selectAllLabel.className = "lp-select-all-label";
    const selectAllCb = document.createElement("input");
    selectAllCb.type = "checkbox";
    selectAllCb.checked = true;
    selectAllLabel.appendChild(selectAllCb);
    selectAllLabel.appendChild(document.createTextNode("Select All"));
    const toolbarRight = document.createElement("div");
    toolbarRight.className = "lp-toolbar-right";
    const countLabel = document.createElement("span");
    countLabel.className = "lp-selected-count";
    const csvBtn = document.createElement("button");
    csvBtn.className = "lp-csv-btn";
    csvBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV`;
    csvBtn.title = "Export all scraped posts to CSV";
    csvBtn.addEventListener("click", () => exportToCSV(jobs));
    toolbarRight.appendChild(countLabel);
    toolbarRight.appendChild(csvBtn);
    toolbar.appendChild(selectAllLabel);
    toolbar.appendChild(toolbarRight);
    const list = document.createElement("div");
    list.className = "lp-panel-list";
    const noResults = document.createElement("div");
    noResults.className = "lp-no-results";
    noResults.textContent = "No posts match your filter.";
    const checkboxes = [];
    const items = [];
    const updateCount = () => {
      const visibleSelected = jobs.filter(
        (_, i) => selected.has(i) && !items[i].classList.contains("hidden")
      ).length;
      const visibleTotal = jobs.filter((_, i) => !items[i].classList.contains("hidden")).length;
      countLabel.textContent = `${selected.size} of ${jobs.length} selected`;
      importBtn.disabled = selected.size === 0;
      importBtn.textContent = selected.size === 0 ? "Select posts to import" : `Import Selected (${selected.size})`;
      selectAllCb.checked = visibleSelected > 0 && visibleSelected === visibleTotal;
      selectAllCb.indeterminate = visibleSelected > 0 && visibleSelected < visibleTotal;
    };
    jobs.forEach((job, i) => {
      const isDup = importedUrls.has(job.source_url);
      const item = document.createElement("div");
      item.className = "lp-job-item selected";
      items.push(item);
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "lp-job-checkbox";
      cb.checked = true;
      checkboxes.push(cb);
      const info = document.createElement("div");
      info.className = "lp-job-info";
      const displayTitle = job.title || job.description.slice(0, 70) + "\u2026";
      info.innerHTML = `
      <div class="lp-job-title">${escapeText(displayTitle)}</div>
      <div class="lp-job-meta">
        <span class="lp-source-chip ${job.source}">${job.source}</span>
        ${isDup ? `<span class="lp-dup-badge">Already imported</span>` : ""}
        ${job.posted_by ? `<span>${escapeText(job.posted_by)}</span>` : ""}
        ${job.location ? `<span>\u{1F4CD} ${escapeText(job.location)}</span>` : ""}
      </div>
    `;
      const toggle = (checked) => {
        cb.checked = checked;
        item.classList.toggle("selected", checked);
        if (checked)
          selected.add(i);
        else
          selected.delete(i);
        updateCount();
      };
      cb.addEventListener("change", () => toggle(cb.checked));
      item.addEventListener("click", (e) => {
        if (e.target !== cb)
          toggle(!cb.checked);
      });
      item.appendChild(cb);
      item.appendChild(info);
      list.appendChild(item);
    });
    list.appendChild(noResults);
    selectAllCb.addEventListener("change", () => {
      const checked = selectAllCb.checked;
      jobs.forEach((_, i) => {
        if (items[i].classList.contains("hidden"))
          return;
        checkboxes[i].checked = checked;
        items[i].classList.toggle("selected", checked);
        if (checked)
          selected.add(i);
        else
          selected.delete(i);
      });
      selectAllCb.indeterminate = false;
      updateCount();
    });
    const footer = document.createElement("div");
    footer.className = "lp-panel-footer";
    const importBtn = document.createElement("button");
    importBtn.className = "lp-import-btn";
    importBtn.addEventListener("click", () => {
      const selectedJobs = jobs.filter((_, i) => selected.has(i));
      host.remove();
      onImport(selectedJobs, bulkDefaults);
    });
    footer.appendChild(importBtn);
    panel.appendChild(header);
    panel.appendChild(searchWrap);
    panel.appendChild(bulkSection);
    panel.appendChild(toolbar);
    panel.appendChild(list);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    shadow.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay)
        host.remove();
    });
    updateCount();
  }
  function exportToCSV(jobs) {
    const headers = ["Title", "Description", "Source", "Posted By", "Location", "Budget", "Timestamp", "Source URL"];
    const rows = jobs.map((j) => [
      j.title,
      j.description.replace(/\n/g, " "),
      j.source,
      j.posted_by,
      j.location ?? "",
      j.budget != null ? String(j.budget) : "",
      j.timestamp,
      j.source_url
    ].map(csvCell).join(","));
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `localpro-jobs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function csvCell(val) {
    const escaped = val.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }
  function showJobModal(initialJob, categories, aiCategory, batch, bulkDefaults) {
    document.getElementById(MODAL_HOST_ID)?.remove();
    const host = document.createElement("div");
    host.id = MODAL_HOST_ID;
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = BASE_STYLES;
    shadow.appendChild(style);
    const overlay = buildModalOverlay(initialJob, categories, aiCategory ?? null, batch ?? null, bulkDefaults ?? {}, shadow, host);
    shadow.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(host);
        if (batch)
          batch.onNext();
      }
    });
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal(host);
        document.removeEventListener("keydown", escHandler);
        if (batch)
          batch.onNext();
      }
    };
    document.addEventListener("keydown", escHandler);
  }
  function closeModal(host) {
    host.remove();
  }
  function buildModalOverlay(job, categories, aiCategory, batch, bulkDefaults, shadow, host) {
    const overlay = document.createElement("div");
    overlay.className = "lp-overlay";
    const modal = document.createElement("div");
    modal.className = "lp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    const header = document.createElement("div");
    header.className = "lp-modal-header";
    const titleWrap = document.createElement("div");
    titleWrap.className = "lp-modal-title";
    titleWrap.innerHTML = `
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
    </svg>
    Import Job
    <span class="lp-source-chip ${job.source}">${job.source}</span>
  `;
    const headerRight = document.createElement("div");
    headerRight.className = "lp-modal-header-right";
    if (batch) {
      const prog = document.createElement("span");
      prog.className = "lp-modal-progress";
      prog.textContent = `${batch.current} / ${batch.total}`;
      headerRight.appendChild(prog);
    }
    const closeBtn = document.createElement("button");
    closeBtn.className = "lp-close-btn";
    closeBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    closeBtn.addEventListener("click", () => {
      closeModal(host);
      if (batch)
        batch.onNext();
    });
    headerRight.appendChild(closeBtn);
    header.appendChild(titleWrap);
    header.appendChild(headerRight);
    const body = document.createElement("div");
    body.className = "lp-modal-body";
    const form = document.createElement("form");
    form.noValidate = true;
    const effectiveCategory = aiCategory ?? job.category ?? "";
    const findCatByName = (name) => categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const matchedCat = findCatByName(effectiveCategory);
    const catOptions = categories.length ? [
      `<option value="">-- Select category --</option>`,
      ...categories.map((c) => {
        const sel = matchedCat?._id === c._id ? "selected" : "";
        return `<option value="${escapeAttr(c._id)}" data-name="${escapeAttr(c.name)}" ${sel}>${escapeText(c.icon ?? "")} ${escapeText(c.name)}</option>`;
      })
    ].join("") : `<option value="">Loading categories\u2026</option>`;
    const catHint = aiCategory ? `<div class="lp-hint ai">\u2726 AI: "${escapeText(aiCategory)}"</div>` : effectiveCategory && matchedCat ? `<div class="lp-hint">Auto: "${escapeText(effectiveCategory)}"</div>` : "";
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const tomorrowStr = new Date(Date.now() + 864e5).toISOString().split("T")[0];
    const preLocation = bulkDefaults.location ?? job.location ?? "";
    const preBudget = bulkDefaults.budget ?? job.budget ?? "";
    const preSchedule = bulkDefaults.scheduleDate ?? job.scheduleDate ?? tomorrowStr;
    const preUrgency = bulkDefaults.urgency ?? "standard";
    form.innerHTML = `
    <div class="lp-field">
      <label class="lp-label" for="lp-title">Job Title <span class="lp-required">*</span></label>
      <input class="lp-input" id="lp-title" type="text" value="${escapeAttr(job.title)}" required maxlength="150" />
    </div>
    <div class="lp-field">
      <label class="lp-label" for="lp-description">Description <span class="lp-required">*</span></label>
      <textarea class="lp-textarea" id="lp-description" maxlength="2000" required>${escapeText(job.description)}</textarea>
      <button type="button" class="lp-ai-clean-btn" id="lp-clean-btn">\u2726 Clean with AI</button>
      <div class="lp-hint" id="lp-clean-hint"></div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-category">Category <span class="lp-required">*</span></label>
        <select class="lp-select" id="lp-category" ${categories.length === 0 ? "disabled" : ""}>${catOptions}</select>
        ${catHint}
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-poster">Posted By</label>
        <input class="lp-input" id="lp-poster" type="text" value="${escapeAttr(job.posted_by)}" maxlength="100" />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-location">Location <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-location" type="text" value="${escapeAttr(preLocation)}" maxlength="100" placeholder="e.g. Makati City" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${preBudget}" min="1" step="1" placeholder="e.g. 1500" required />
        <button type="button" class="lp-estimate-btn" id="lp-estimate-btn">\u2726 Estimate with AI</button>
        <div class="lp-hint" id="lp-estimate-hint"></div>
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${escapeAttr(preSchedule)}" min="${todayStr}" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" ${preUrgency === "standard" ? "selected" : ""}>Standard</option>
          <option value="same_day" ${preUrgency === "same_day" ? "selected" : ""}>Same Day</option>
          <option value="rush"     ${preUrgency === "rush" ? "selected" : ""}>Rush</option>
        </select>
      </div>
    </div>
  `;
    const aiBar = document.createElement("div");
    aiBar.className = "lp-ai-bar";
    const aiBarLabel = document.createElement("div");
    aiBarLabel.className = "lp-ai-bar-label";
    aiBarLabel.innerHTML = `\u2726 AI Smart Fill <span>\u2014 clean description + category + budget in one click</span>`;
    const smartFillBtn = document.createElement("button");
    smartFillBtn.type = "button";
    smartFillBtn.className = "lp-smart-fill-btn";
    smartFillBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill`;
    aiBar.appendChild(aiBarLabel);
    aiBar.appendChild(smartFillBtn);
    body.insertBefore(aiBar, form);
    body.appendChild(form);
    if (job.phone || job.email) {
      const contactDiv = document.createElement("div");
      contactDiv.className = "lp-contact-info";
      const contactLabel = document.createElement("span");
      contactLabel.className = "lp-contact-label";
      contactLabel.textContent = "Contact";
      contactDiv.appendChild(contactLabel);
      if (job.phone) {
        const chip = document.createElement("span");
        chip.className = "lp-contact-chip";
        chip.innerHTML = `\u{1F4DE} ${escapeText(job.phone)}`;
        chip.title = "Click to copy";
        chip.style.cursor = "pointer";
        chip.addEventListener("click", () => {
          void navigator.clipboard.writeText(job.phone);
          chip.innerHTML = "\u2713 Copied!";
          setTimeout(() => {
            chip.innerHTML = `\u{1F4DE} ${escapeText(job.phone)}`;
          }, 1500);
        });
        contactDiv.appendChild(chip);
      }
      if (job.email) {
        const chip = document.createElement("span");
        chip.className = "lp-contact-chip";
        chip.innerHTML = `\u2709\uFE0F ${escapeText(job.email)}`;
        chip.title = "Click to copy";
        chip.style.cursor = "pointer";
        chip.addEventListener("click", () => {
          void navigator.clipboard.writeText(job.email);
          chip.innerHTML = "\u2713 Copied!";
          setTimeout(() => {
            chip.innerHTML = `\u2709\uFE0F ${escapeText(job.email)}`;
          }, 1500);
        });
        contactDiv.appendChild(chip);
      }
      body.appendChild(contactDiv);
    }
    const estimateBtn = shadow.getElementById("lp-estimate-btn");
    const estimateHint = shadow.getElementById("lp-estimate-hint");
    if (estimateBtn && estimateHint) {
      estimateBtn.addEventListener("click", async () => {
        const categoryEl = shadow.getElementById("lp-category");
        const titleEl = shadow.getElementById("lp-title");
        const budgetEl = shadow.getElementById("lp-budget");
        const catName = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";
        if (!catName) {
          estimateHint.textContent = "Select a category first.";
          estimateHint.className = "lp-hint";
          return;
        }
        estimateBtn.disabled = true;
        estimateBtn.textContent = "Estimating\u2026";
        estimateHint.textContent = "";
        try {
          const msg = {
            type: "ESTIMATE_BUDGET",
            title: titleEl.value.trim() || job.title,
            category: catName,
            description: job.description.slice(0, 300)
          };
          const res = await chrome.runtime.sendMessage(msg);
          if (res?.success && res.midpoint) {
            budgetEl.value = String(res.midpoint);
            const range = res.min != null && res.max != null ? `PHP ${res.min.toLocaleString()} \u2013 ${res.max.toLocaleString()}` : "";
            estimateHint.textContent = `\u2726 AI estimate: ${range}${res.note ? ` \xB7 ${res.note}` : ""}`;
            estimateHint.className = "lp-hint ai";
          } else {
            estimateHint.textContent = res?.error ?? "Estimate unavailable.";
            estimateHint.className = "lp-hint";
          }
        } catch {
          estimateHint.textContent = "Could not fetch estimate.";
          estimateHint.className = "lp-hint";
        } finally {
          estimateBtn.disabled = false;
          estimateBtn.textContent = "\u2726 Estimate with AI";
        }
      });
    }
    const cleanBtn = shadow.getElementById("lp-clean-btn");
    const cleanHint = shadow.getElementById("lp-clean-hint");
    if (cleanBtn && cleanHint) {
      cleanBtn.addEventListener("click", async () => {
        const categoryEl = shadow.getElementById("lp-category");
        const titleEl = shadow.getElementById("lp-title");
        const descEl = shadow.getElementById("lp-description");
        const catName = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";
        cleanBtn.disabled = true;
        cleanBtn.textContent = "Generating\u2026";
        cleanHint.textContent = "";
        try {
          const msg = {
            type: "GENERATE_DESCRIPTION",
            title: titleEl.value.trim() || job.title,
            category: catName || void 0
          };
          const res = await chrome.runtime.sendMessage(msg);
          if (res?.success && res.description) {
            descEl.value = res.description;
            cleanHint.textContent = "\u2726 AI-generated \u2014 review before submitting";
            cleanHint.className = "lp-hint ai";
          } else {
            cleanHint.textContent = res?.error ?? "Could not generate description.";
            cleanHint.className = "lp-hint";
          }
        } catch {
          cleanHint.textContent = "Could not reach AI service.";
          cleanHint.className = "lp-hint";
        } finally {
          cleanBtn.disabled = false;
          cleanBtn.textContent = "\u2726 Clean with AI";
        }
      });
    }
    smartFillBtn.addEventListener("click", async () => {
      const categoryEl = shadow.getElementById("lp-category");
      const titleEl = shadow.getElementById("lp-title");
      const descEl = shadow.getElementById("lp-description");
      const budgetEl = shadow.getElementById("lp-budget");
      const catName = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";
      if (!catName) {
        smartFillBtn.textContent = "Select a category first";
        setTimeout(() => {
          smartFillBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill`;
        }, 2e3);
        return;
      }
      smartFillBtn.disabled = true;
      smartFillBtn.textContent = "Working\u2026";
      const titleVal = titleEl.value.trim() || job.title;
      const [descRes, budgetRes] = await Promise.allSettled([
        chrome.runtime.sendMessage({
          type: "GENERATE_DESCRIPTION",
          title: titleVal,
          category: catName
        }),
        chrome.runtime.sendMessage({
          type: "ESTIMATE_BUDGET",
          title: titleVal,
          category: catName,
          description: job.description.slice(0, 300)
        })
      ]);
      if (descRes.status === "fulfilled" && descRes.value?.success && descRes.value.description) {
        descEl.value = descRes.value.description;
        if (cleanHint) {
          cleanHint.textContent = "\u2726 AI-generated \u2014 review before submitting";
          cleanHint.className = "lp-hint ai";
        }
      }
      if (budgetRes.status === "fulfilled" && budgetRes.value?.success && budgetRes.value.midpoint) {
        budgetEl.value = String(budgetRes.value.midpoint);
        if (estimateHint) {
          const r = budgetRes.value;
          const range = r.min != null && r.max != null ? `PHP ${r.min.toLocaleString()} \u2013 ${r.max.toLocaleString()}` : "";
          estimateHint.textContent = `\u2726 AI estimate: ${range}${r.note ? ` \xB7 ${r.note}` : ""}`;
          estimateHint.className = "lp-hint ai";
        }
      }
      smartFillBtn.disabled = false;
      smartFillBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill`;
    });
    const status = document.createElement("div");
    status.className = "lp-status";
    const footer = document.createElement("div");
    footer.className = "lp-modal-footer";
    if (batch) {
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "lp-skip-btn";
      skipBtn.textContent = "Skip";
      skipBtn.addEventListener("click", () => {
        closeModal(host);
        batch.onNext();
      });
      footer.appendChild(skipBtn);
    } else {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "lp-cancel-btn";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => closeModal(host));
      footer.appendChild(cancelBtn);
    }
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "lp-submit-btn";
    submitBtn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    ${batch ? "Submit & Next" : "Submit to LocalPro"}
  `;
    footer.appendChild(submitBtn);
    submitBtn.addEventListener("click", async () => {
      const titleEl = shadow.getElementById("lp-title");
      const descEl = shadow.getElementById("lp-description");
      const categoryEl = shadow.getElementById("lp-category");
      const posterEl = shadow.getElementById("lp-poster");
      const locationEl = shadow.getElementById("lp-location");
      const budgetEl = shadow.getElementById("lp-budget");
      const scheduleEl = shadow.getElementById("lp-schedule");
      const urgencyEl = shadow.getElementById("lp-urgency");
      const title = titleEl.value.trim();
      const description = descEl.value.trim();
      const categoryId = categoryEl.value;
      const categoryName = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";
      const location = locationEl.value.trim();
      const budget = parseFloat(budgetEl.value);
      const scheduleDate = scheduleEl.value;
      const urgency = urgencyEl.value;
      if (!title) {
        showStatus(status, "error", "Job title is required.");
        titleEl.focus();
        return;
      }
      if (!description) {
        showStatus(status, "error", "Description is required.");
        descEl.focus();
        return;
      }
      if (!categoryId) {
        showStatus(status, "error", "Please select a category.");
        categoryEl.focus();
        return;
      }
      if (!location) {
        showStatus(status, "error", "Location is required.");
        locationEl.focus();
        return;
      }
      if (!budget || budget <= 0 || isNaN(budget)) {
        showStatus(status, "error", "Budget must be greater than 0 (PHP).");
        budgetEl.focus();
        return;
      }
      if (!scheduleDate) {
        showStatus(status, "error", "Schedule date is required.");
        scheduleEl.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting\u2026";
      showStatus(status, "loading", "Sending to LocalPro\u2026");
      const updatedJob = {
        ...job,
        title,
        description,
        posted_by: posterEl.value.trim(),
        location,
        budget,
        scheduleDate,
        category: categoryName,
        categoryId
      };
      const msg = { type: "IMPORT_JOB", payload: updatedJob };
      try {
        const response = await chrome.runtime.sendMessage(msg);
        if (response?.success) {
          const jobId = response.job_id ?? "";
          const viewUrl = `${LP_URL}/jobs/${jobId}`;
          status.className = "lp-status success";
          status.innerHTML = `Imported! <a href="${escapeAttr(viewUrl)}" target="_blank" rel="noopener">View on LocalPro \u2192</a>`;
          status.style.display = "block";
          submitBtn.textContent = "Submitted!";
          setTimeout(() => {
            closeModal(host);
            if (batch)
              batch.onNext();
          }, 2e3);
        } else {
          const errText = response?.error ?? "Import failed. Please try again.";
          const isAuthErr = errText.toLowerCase().includes("session") || errText.toLowerCase().includes("sign in");
          showStatus(status, "error", isAuthErr ? "Session expired. Please sign in again via the extension icon." : errText);
          submitBtn.disabled = false;
          submitBtn.innerHTML = batch ? "Submit & Next" : "Submit to LocalPro";
        }
      } catch (err) {
        showStatus(status, "error", `Extension error: ${String(err)}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = batch ? "Submit & Next" : "Submit to LocalPro";
      }
    });
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(status);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    return overlay;
  }
  function showStatus(el, type, msg) {
    el.className = `lp-status ${type}`;
    el.textContent = msg;
  }
  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeText(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // extension/content.ts
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("facebook.com"))
      return "facebook";
    if (host.includes("linkedin.com"))
      return "linkedin";
    if (host.includes("jobstreet.com"))
      return "jobstreet";
    if (host.includes("indeed.com"))
      return "indeed";
    return null;
  }
  var PLATFORM = detectPlatform();
  if (!PLATFORM) {
    throw new Error("[LocalPro] Unsupported platform \u2014 content script exiting.");
  }
  var cachedCategories = [];
  async function preloadCategories() {
    try {
      const msg = { type: "GET_CATEGORIES" };
      const res = await chrome.runtime.sendMessage(msg);
      if (res?.success && res.categories.length > 0) {
        cachedCategories = res.categories;
      }
    } catch {
    }
  }
  function getPostContainers() {
    switch (PLATFORM) {
      case "facebook":
        return Array.from(
          document.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]')
        ).filter((el) => el.parentElement?.closest('[role="article"]') === null);
      case "linkedin": {
        const feedSelector = [
          ".feed-shared-update-v2",
          // classic feed post wrapper
          ".occludable-update",
          // impression-tracked wrapper
          "li.fie-impression-container",
          // newer feed list item
          '[data-urn^="urn:li:activity"]',
          // post activity
          '[data-urn^="urn:li:share"]',
          // shared post
          '[data-urn^="urn:li:ugcPost"]'
          // user-generated content post
        ].join(", ");
        const commentContainers = ".comments-comment-item, .comments-comments-list, .comments-comment-list, .comments-reply-item, .social-details-social-activity";
        return Array.from(document.querySelectorAll(feedSelector)).filter(
          (el) => !el.closest(commentContainers) && el.parentElement?.closest(feedSelector) === null
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
              '[class*="JobCard"]'
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
              ".jobsearch-ResultsList > li"
            ].join(", ")
          )
        );
      default:
        return [];
    }
  }
  async function getImportedUrls() {
    try {
      const msg = { type: "GET_IMPORT_HISTORY" };
      const res = await chrome.runtime.sendMessage(msg);
      if (res?.success) {
        return new Set(res.history.map((h) => h.source_url));
      }
    } catch {
    }
    return /* @__PURE__ */ new Set();
  }
  function getScrollContainer() {
    if (PLATFORM === "linkedin") {
      return document.querySelector(".scaffold-layout__main") ?? document.querySelector("main.scaffold-layout__main") ?? document.querySelector('[class*="scaffold-layout__main"]') ?? document.querySelector("main[role='main']") ?? null;
    }
    return null;
  }
  async function autoScrollPage() {
    const container = getScrollContainer();
    const totalScrolls = 8;
    const stepHeight = window.innerHeight * 0.85;
    const pauseMs = PLATFORM === "linkedin" ? 1100 : 700;
    for (let i = 0; i < totalScrolls; i++) {
      if (container) {
        container.scrollBy({ top: stepHeight, behavior: "smooth" });
      }
      window.scrollBy({ top: stepHeight, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, pauseMs));
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  var importedUrlCache = /* @__PURE__ */ new Set();
  async function importSinglePost(container, markDone) {
    const job = extractJobData(container, PLATFORM);
    let aiCategory;
    if (cachedCategories.length > 0) {
      try {
        const msg = {
          type: "CLASSIFY_CATEGORY",
          title: job.title,
          description: job.description,
          availableCategories: cachedCategories.map((c) => c.name)
        };
        const res = await Promise.race([
          chrome.runtime.sendMessage(msg),
          new Promise(
            (resolve) => setTimeout(() => resolve({ success: false }), 4e3)
          )
        ]);
        if (res?.success && res.category)
          aiCategory = res.category;
      } catch {
      }
    }
    showJobModal(job, cachedCategories, aiCategory, void 0, {});
    markDone();
  }
  function isTopLevelContainer(el) {
    switch (PLATFORM) {
      case "facebook": {
        return el.parentElement?.closest('[role="article"]') === null;
      }
      case "linkedin": {
        if (el.closest(
          ".comments-comment-item, .comments-comments-list, .comments-comment-list, .comments-reply-item, .social-details-social-activity"
        ))
          return false;
        const feedSelector = ".feed-shared-update-v2, .occludable-update, li.fie-impression-container";
        return el.parentElement?.closest(feedSelector) === null;
      }
      default:
        return true;
    }
  }
  function injectButtonOnPost(container) {
    if (!isTopLevelContainer(container))
      return;
    const text = container.textContent?.trim() ?? "";
    if (text.length < 20)
      return;
    if (container.hasAttribute("data-lp-injected"))
      return;
    const firstLink = container.querySelector(
      'a[href*="/posts/"], a[href*="story_fbid="], a[href*="?p="], a[href*="/jobs/view/"], a[href*="jk="]'
    );
    const isDup = firstLink ? importedUrlCache.has(firstLink.href) : false;
    injectPerPostImportButton(container, isDup, (markDone) => {
      void importSinglePost(container, markDone);
    });
  }
  var _injectDebounce = null;
  function injectAllPostButtons() {
    if (_injectDebounce)
      clearTimeout(_injectDebounce);
    _injectDebounce = setTimeout(() => {
      getPostContainers().forEach(injectButtonOnPost);
    }, 400);
  }
  function observeAndInjectButtons() {
    injectAllPostButtons();
    const observer = new MutationObserver(() => injectAllPostButtons());
    observer.observe(document.body, { childList: true, subtree: true });
  }
  async function handleScanPage(setScanningState, withAutoScroll = false) {
    setScanningState(true);
    await new Promise((r) => setTimeout(r, 50));
    if (withAutoScroll) {
      await autoScrollPage();
    }
    const containers = getPostContainers();
    const unique = [...new Set(containers)].filter(
      (el) => el.textContent && el.textContent.trim().length > 20
    );
    const jobs = unique.map((c) => extractJobData(c, PLATFORM));
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
  async function processImportQueue(jobs, index, bulkDefaults) {
    if (index >= jobs.length)
      return;
    const job = jobs[index];
    let aiCategory;
    if (cachedCategories.length > 0) {
      try {
        const msg = {
          type: "CLASSIFY_CATEGORY",
          title: job.title,
          description: job.description,
          availableCategories: cachedCategories.map((c) => c.name)
        };
        const res = await Promise.race([
          chrome.runtime.sendMessage(msg),
          new Promise(
            (resolve) => setTimeout(() => resolve({ success: false }), 4e3)
          )
        ]);
        if (res?.success && res.category) {
          aiCategory = res.category;
        }
      } catch {
      }
    }
    const remaining = jobs.length - index;
    showJobModal(
      job,
      cachedCategories,
      aiCategory,
      remaining > 1 ? {
        current: index + 1,
        total: jobs.length,
        onNext: () => void processImportQueue(jobs, index + 1, bulkDefaults)
      } : void 0,
      bulkDefaults
    );
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id)
      return;
    if (msg.type === "PING") {
      sendResponse({ ok: true });
      return true;
    }
    if (msg.type === "SCAN_TAB") {
      void handleScanPage(() => {
      }, msg.autoScroll ?? false);
      sendResponse({ ok: true });
      return true;
    }
  });
  async function init() {
    await Promise.allSettled([
      preloadCategories(),
      getImportedUrls().then((urls) => {
        importedUrlCache = urls;
      })
    ]);
    observeAndInjectButtons();
    injectFloatingScanButton(
      (setState) => void handleScanPage(setState, false),
      (setState) => void handleScanPage(setState, true)
    );
    console.log(`[LocalPro] Content script active on ${PLATFORM}`);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void init();
    });
  } else {
    void init();
  }
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdXRpbHMvcGFyc2VyLnRzIiwgIi4uL3V0aWxzL2RvbUhlbHBlcnMudHMiLCAiLi4vY29udGVudC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHR5cGUgeyBKb2JQb3N0LCBQbGF0Zm9ybSB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5cclxuY29uc3QgUEhPTkVfUkVHRVggPSAvKFxcKz9cXGRbXFxkXFxzXFwtKCkuXXs3LDE1fVxcZCkvZztcclxuY29uc3QgQ1VSUkVOQ1lfUkVHRVggPSAvKD86UEhQfEFFRHxVU0R8XFwkfFx1MjBCMXxcdTIwQUN8XHUwMEEzKVxccypbXFxkLF0rfFtcXGQsXStcXHMqKD86UEhQfEFFRHxVU0QpL2dpO1xyXG5jb25zdCBFTUFJTF9SRUdFWCA9IC9bYS16QS1aMC05Ll8lKy1dK0BbYS16QS1aMC05Li1dK1xcLlthLXpBLVpdezIsfS9nO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENhdGVnb3J5IGF1dG8tdGFnZ2luZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IENBVEVHT1JZX0tFWVdPUkRTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgUGx1bWJpbmc6IFtcInBsdW1iZXJcIiwgXCJwbHVtYmluZ1wiLCBcInBpcGVcIiwgXCJkcmFpblwiLCBcImZhdWNldFwiLCBcInRvaWxldFwiLCBcIndhdGVyIGxlYWtcIl0sXHJcbiAgRWxlY3RyaWNhbDogW1wiZWxlY3RyaWNpYW5cIiwgXCJlbGVjdHJpY2FsXCIsIFwid2lyaW5nXCIsIFwiY2lyY3VpdFwiLCBcInBhbmVsXCIsIFwib3V0bGV0XCIsIFwidm9sdGFnZVwiXSxcclxuICBDYXJwZW50cnk6IFtcImNhcnBlbnRlclwiLCBcImNhcnBlbnRyeVwiLCBcIndvb2RcIiwgXCJmdXJuaXR1cmVcIiwgXCJjYWJpbmV0XCIsIFwiZmxvb3JpbmdcIl0sXHJcbiAgUGFpbnRpbmc6IFtcInBhaW50ZXJcIiwgXCJwYWludGluZ1wiLCBcInBhaW50XCIsIFwiY29hdGluZ1wiLCBcIndhbGxwYXBlclwiLCBcImZpbmlzaGluZ1wiXSxcclxuICBDbGVhbmluZzogW1wiY2xlYW5lclwiLCBcImNsZWFuaW5nXCIsIFwiaG91c2VrZWVwaW5nXCIsIFwiamFuaXRvcmlhbFwiLCBcInNhbml0YXRpb25cIiwgXCJtYWlkXCJdLFxyXG4gIERyaXZpbmc6IFtcImRyaXZlclwiLCBcImRyaXZpbmdcIiwgXCJkZWxpdmVyeVwiLCBcImNvdXJpZXJcIiwgXCJ0cmFuc3BvcnRcIiwgXCJsb2dpc3RpY3NcIiwgXCJncmFiXCJdLFxyXG4gIEhWQUM6IFtcImh2YWNcIiwgXCJhaXJjb25cIiwgXCJhaXIgY29uZGl0aW9uaW5nXCIsIFwiYWlyY29uZGl0aW9uaW5nXCIsIFwicmVmcmlnZXJhdGlvblwiLCBcImNvb2xpbmdcIiwgXCJoZWF0aW5nXCJdLFxyXG4gIFdlbGRpbmc6IFtcIndlbGRlclwiLCBcIndlbGRpbmdcIiwgXCJmYWJyaWNhdGlvblwiLCBcInN0ZWVsXCIsIFwibWV0YWxcIl0sXHJcbiAgQ29uc3RydWN0aW9uOiBbXCJtYXNvblwiLCBcIm1hc29ucnlcIiwgXCJjb25zdHJ1Y3Rpb25cIiwgXCJsYWJvcmVyXCIsIFwiY29uY3JldGVcIiwgXCJidWlsZGVyXCIsIFwic2NhZmZvbGRpbmdcIl0sXHJcbiAgTWVjaGFuaWNhbDogW1wibWVjaGFuaWNcIiwgXCJtZWNoYW5pY2FsXCIsIFwiZW5naW5lXCIsIFwibW90b3JcIiwgXCJhdXRvbW90aXZlXCIsIFwidmVoaWNsZVwiLCBcInJlcGFpclwiXSxcclxuICBJVDogW1wiZGV2ZWxvcGVyXCIsIFwicHJvZ3JhbW1lclwiLCBcInNvZnR3YXJlXCIsIFwiY29kaW5nXCIsIFwid2ViXCIsIFwiYXBwXCIsIFwiaXQgc3VwcG9ydFwiLCBcIm5ldHdvcmtcIl0sXHJcbiAgRGVzaWduOiBbXCJkZXNpZ25lclwiLCBcImdyYXBoaWNcIiwgXCJ1aVwiLCBcInV4XCIsIFwiY3JlYXRpdmVcIiwgXCJpbGx1c3RyYXRvclwiLCBcInBob3Rvc2hvcFwiXSxcclxuICBIZWFsdGhjYXJlOiBbXCJudXJzZVwiLCBcImNhcmVnaXZlclwiLCBcIm1lZGljYWxcIiwgXCJoZWFsdGhjYXJlXCIsIFwiZG9jdG9yXCIsIFwidGhlcmFwaXN0XCJdLFxyXG4gIEVkdWNhdGlvbjogW1widGVhY2hlclwiLCBcInR1dG9yXCIsIFwiaW5zdHJ1Y3RvclwiLCBcImVkdWNhdG9yXCIsIFwidHJhaW5lclwiLCBcInRlYWNoaW5nXCJdLFxyXG4gIFNlY3VyaXR5OiBbXCJzZWN1cml0eSBndWFyZFwiLCBcInNlY3VyaXR5IG9mZmljZXJcIiwgXCJib2R5Z3VhcmRcIiwgXCJjY3R2XCIsIFwicGF0cm9sXCJdLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gYXV0b1RhZ0NhdGVnb3J5KHRleHQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgY29uc3QgbG93ZXIgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XHJcbiAgbGV0IGJlc3RDYXRlZ29yeTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIGxldCBiZXN0U2NvcmUgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwga2V5d29yZHNdIG9mIE9iamVjdC5lbnRyaWVzKENBVEVHT1JZX0tFWVdPUkRTKSkge1xyXG4gICAgY29uc3Qgc2NvcmUgPSBrZXl3b3Jkcy5maWx0ZXIoKGt3KSA9PiBsb3dlci5pbmNsdWRlcyhrdykpLmxlbmd0aDtcclxuICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xyXG4gICAgICBiZXN0U2NvcmUgPSBzY29yZTtcclxuICAgICAgYmVzdENhdGVnb3J5ID0gY2F0ZWdvcnk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYmVzdFNjb3JlID4gMCA/IGJlc3RDYXRlZ29yeSA6IHVuZGVmaW5lZDtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFNpZ25hbCBleHRyYWN0aW9uIChwaG9uZSAvIGN1cnJlbmN5IC8gZW1haWwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuaW50ZXJmYWNlIFBvc3RTaWduYWxzIHtcclxuICBoYXNQaG9uZTogYm9vbGVhbjtcclxuICBoYXNDdXJyZW5jeTogYm9vbGVhbjtcclxuICBoYXNFbWFpbDogYm9vbGVhbjtcclxuICBwaG9uZT86IHN0cmluZztcclxuICBlbWFpbD86IHN0cmluZztcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFNpZ25hbHModGV4dDogc3RyaW5nKTogUG9zdFNpZ25hbHMge1xyXG4gIGNvbnN0IHBob25lTWF0Y2hlcyA9IHRleHQubWF0Y2goUEhPTkVfUkVHRVgpO1xyXG4gIGNvbnN0IGN1cnJlbmN5TWF0Y2hlcyA9IHRleHQubWF0Y2goQ1VSUkVOQ1lfUkVHRVgpO1xyXG4gIGNvbnN0IGVtYWlsTWF0Y2hlcyA9IHRleHQubWF0Y2goRU1BSUxfUkVHRVgpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgaGFzUGhvbmU6IHBob25lTWF0Y2hlcyAhPT0gbnVsbCxcclxuICAgIGhhc0N1cnJlbmN5OiBjdXJyZW5jeU1hdGNoZXMgIT09IG51bGwsXHJcbiAgICBoYXNFbWFpbDogZW1haWxNYXRjaGVzICE9PSBudWxsLFxyXG4gICAgcGhvbmU6IHBob25lTWF0Y2hlcz8uWzBdPy50cmltKCksXHJcbiAgICBlbWFpbDogZW1haWxNYXRjaGVzPy5bMF0/LnRyaW0oKSxcclxuICB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgUHVibGljIGRldGVjdGlvbiBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4vKipcclxuICogQWx3YXlzIHJldHVybnMgdHJ1ZSBcdTIwMTQgdGhlIEltcG9ydCBidXR0b24gaXMgc2hvd24gb24gZXZlcnkgcG9zdC5cclxuICogRXhwb3J0ZWQgZm9yIHVzZSBpbiB0aGUgY29udGVudCBzY3JpcHQgc2Nhbm5lci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RKb2JQb3N0KF9lbGVtZW50OiBFbGVtZW50KTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHBvc3QtYm9keS1vbmx5IHRleHQgYnkgY2xvbmluZyB0aGUgZWxlbWVudCBhbmQgYWdncmVzc2l2ZWx5IHJlbW92aW5nXHJcbiAqIGNvbW1lbnQgc2VjdGlvbnMsIGVuZ2FnZW1lbnQgYmFycywgYW5kIHJlYWN0aW9uIGNvdW50cy5cclxuICpcclxuICogS0VZIElOU0lHSFQ6IEZhY2Vib29rIHJlbmRlcnMgY29tbWVudCB0aHJlYWRzIGFzIG5lc3RlZCBbcm9sZT1cImFydGljbGVcIl1cclxuICogZWxlbWVudHMgaW5zaWRlIHRoZSBwb3N0IGFydGljbGUuIFJlbW92aW5nIHRob3NlIG5lc3RlZCBhcnRpY2xlcyBlbGltaW5hdGVzXHJcbiAqIHZpcnR1YWxseSBhbGwgY29tbWVudCB0ZXh0IGluIG9uZSBzdGVwLlxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0UG9zdEJvZHlUZXh0KGVsZW1lbnQ6IEVsZW1lbnQsIHBsYXRmb3JtOiBQbGF0Zm9ybSk6IHN0cmluZyB7XHJcbiAgY29uc3QgY2xvbmUgPSBlbGVtZW50LmNsb25lTm9kZSh0cnVlKSBhcyBFbGVtZW50O1xyXG5cclxuICBpZiAocGxhdGZvcm0gPT09IFwiZmFjZWJvb2tcIikge1xyXG4gICAgLy8gMS4gUmVtb3ZlIEFMTCBuZXN0ZWQgW3JvbGU9XCJhcnRpY2xlXCJdIFx1MjAxNCB0aGVzZSBhcmUgY29tbWVudCBhcnRpY2xlc1xyXG4gICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnW3JvbGU9XCJhcnRpY2xlXCJdJykuZm9yRWFjaCgoZWwpID0+IGVsLnJlbW92ZSgpKTtcclxuXHJcbiAgICAvLyAyLiBSZW1vdmUgY29tbWVudCBmb3JtcywgcmVhY3Rpb24vZW5nYWdlbWVudCBiYXJzLCBhY3Rpb24gYnV0dG9uc1xyXG4gICAgW1xyXG4gICAgICAnZm9ybScsXHJcbiAgICAgICdbcm9sZT1cImZvcm1cIl0nLFxyXG4gICAgICAnW2RhdGEtY29tbWVudGlkXScsXHJcbiAgICAgICdbZGF0YS10ZXN0aWQqPVwiY29tbWVudFwiXScsXHJcbiAgICAgICdbZGF0YS10ZXN0aWQqPVwiQ29tbWVudFwiXScsXHJcbiAgICAgICdbZGF0YS10ZXN0aWQqPVwidWZpXCJdJyxcclxuICAgICAgJ1tkYXRhLXRlc3RpZCo9XCJVRklcIl0nLFxyXG4gICAgICAnW2FyaWEtbGFiZWwqPVwiZWFjdGlvblwiXScsICAgLy8gXCJyZWFjdGlvblwiLCBcIlJlYWN0aW9uXCJcclxuICAgICAgJ1thcmlhLWxhYmVsKj1cIm9tbWVudFwiXScsICAgIC8vIFwiY29tbWVudFwiLCBcIkNvbW1lbnRcIlxyXG4gICAgICAnW2FyaWEtbGFiZWwqPVwiaGFyZVwiXScsICAgICAgLy8gXCJzaGFyZVwiLCBcIlNoYXJlXCJcclxuICAgIF0uZm9yRWFjaCgoc2VsKSA9PiBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKHNlbCkuZm9yRWFjaCgoZWwpID0+IGVsLnJlbW92ZSgpKSk7XHJcblxyXG4gIH0gZWxzZSBpZiAocGxhdGZvcm0gPT09IFwibGlua2VkaW5cIikge1xyXG4gICAgLy8gUmVtb3ZlIGNvbW1lbnQgbGlzdCwgaW5kaXZpZHVhbCBjb21tZW50cywgZW5nYWdlbWVudCBiYXJzXHJcbiAgICBbXHJcbiAgICAgICcuY29tbWVudHMtY29tbWVudHMtbGlzdCcsXHJcbiAgICAgICcuY29tbWVudHMtY29tbWVudC1saXN0JyxcclxuICAgICAgJy5jb21tZW50cy1jb21tZW50LWl0ZW0nLFxyXG4gICAgICAnLmNvbW1lbnRzLWNvbW1lbnQtdGV4dGVkaXRvcicsXHJcbiAgICAgICcuY29tbWVudHMtcmVwbHktY29tcG9zZS1ib3gnLFxyXG4gICAgICAnLnNvY2lhbC1kZXRhaWxzLXNvY2lhbC1jb3VudHMnLFxyXG4gICAgICAnLnNvY2lhbC1kZXRhaWxzLXNvY2lhbC1hY3Rpdml0eScsXHJcbiAgICAgICcuZmVlZC1zaGFyZWQtc29jaWFsLWFjdGlvbi1iYXInLFxyXG4gICAgICAnLmZlZWQtc2hhcmVkLWZvb3RlcicsXHJcbiAgICAgICcuc29jaWFsLWFjdGlvbnMtYmFyJyxcclxuICAgICAgJy51cGRhdGUtY29tcG9uZW50cy1mb290ZXInLFxyXG4gICAgICAnLnVwZGF0ZS1jb21wb25lbnRzLXNvY2lhbC1hY3Rpdml0eScsXHJcbiAgICAgICdbY2xhc3MqPVwiY29tbWVudC1cIl0nLFxyXG4gICAgICAnW2NsYXNzKj1cIi1jb21tZW50XCJdJyxcclxuICAgIF0uZm9yRWFjaCgoc2VsKSA9PiBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKHNlbCkuZm9yRWFjaCgoZWwpID0+IGVsLnJlbW92ZSgpKSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gY2xvbmUudGV4dENvbnRlbnQ/LnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKSA/PyBcIlwiO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdHMgc3RydWN0dXJlZCBqb2IgZGF0YSBmcm9tIGEgcG9zdCBlbGVtZW50LlxyXG4gKiBIYW5kbGVzIHBsYXRmb3JtLXNwZWNpZmljIERPTSBzdHJ1Y3R1cmUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEpvYkRhdGEoZWxlbWVudDogRWxlbWVudCwgcGxhdGZvcm06IFBsYXRmb3JtKTogSm9iUG9zdCB7XHJcbiAgLy8gcG9zdFRleHQgaGFzIGNvbW1lbnRzL2VuZ2FnZW1lbnQgc3RyaXBwZWQgXHUyMDE0IHVzZSB0aGlzIGZvciBhbGwgY29udGVudCBleHRyYWN0aW9uXHJcbiAgY29uc3QgcG9zdFRleHQgPSBnZXRQb3N0Qm9keVRleHQoZWxlbWVudCwgcGxhdGZvcm0pO1xyXG4gIGNvbnN0IHsgaGFzQ3VycmVuY3ksIHBob25lLCBlbWFpbCB9ID0gZXh0cmFjdFNpZ25hbHMocG9zdFRleHQpO1xyXG5cclxuICBsZXQgdGl0bGUgPSBcIlwiO1xyXG4gIGxldCBkZXNjcmlwdGlvbiA9IFwiXCI7XHJcbiAgbGV0IHBvc3RlZEJ5ID0gXCJcIjtcclxuICBsZXQgdGltZXN0YW1wID0gXCJcIjtcclxuICBjb25zdCB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcclxuXHJcbiAgaWYgKHBsYXRmb3JtID09PSBcImZhY2Vib29rXCIpIHtcclxuICAgIHRpdGxlID0gZXh0cmFjdEZhY2Vib29rVGl0bGUoZWxlbWVudCwgcG9zdFRleHQpO1xyXG4gICAgZGVzY3JpcHRpb24gPSBleHRyYWN0RmFjZWJvb2tEZXNjcmlwdGlvbihlbGVtZW50LCBwb3N0VGV4dCk7XHJcbiAgICBwb3N0ZWRCeSA9IGV4dHJhY3RGYWNlYm9va1Bvc3RlcihlbGVtZW50KTtcclxuICAgIHRpbWVzdGFtcCA9IGV4dHJhY3RGYWNlYm9va1RpbWVzdGFtcChlbGVtZW50KTtcclxuICB9IGVsc2UgaWYgKHBsYXRmb3JtID09PSBcImxpbmtlZGluXCIpIHtcclxuICAgIHRpdGxlID0gZXh0cmFjdExpbmtlZEluVGl0bGUoZWxlbWVudCwgcG9zdFRleHQpO1xyXG4gICAgZGVzY3JpcHRpb24gPSBleHRyYWN0TGlua2VkSW5EZXNjcmlwdGlvbihlbGVtZW50LCBwb3N0VGV4dCk7XHJcbiAgICBwb3N0ZWRCeSA9IGV4dHJhY3RMaW5rZWRJblBvc3RlcihlbGVtZW50KTtcclxuICAgIHRpbWVzdGFtcCA9IGV4dHJhY3RMaW5rZWRJblRpbWVzdGFtcChlbGVtZW50KTtcclxuICB9IGVsc2UgaWYgKHBsYXRmb3JtID09PSBcImpvYnN0cmVldFwiKSB7XHJcbiAgICB0aXRsZSA9IGV4dHJhY3RKb2JTdHJlZXRUaXRsZShlbGVtZW50LCBwb3N0VGV4dCk7XHJcbiAgICBkZXNjcmlwdGlvbiA9IGV4dHJhY3RKb2JTdHJlZXREZXNjcmlwdGlvbihlbGVtZW50LCBwb3N0VGV4dCk7XHJcbiAgICBwb3N0ZWRCeSA9IGV4dHJhY3RKb2JTdHJlZXRDb21wYW55KGVsZW1lbnQpO1xyXG4gICAgdGltZXN0YW1wID0gZXh0cmFjdEdlbmVyaWNUaW1lc3RhbXAoZWxlbWVudCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGluZGVlZFxyXG4gICAgdGl0bGUgPSBleHRyYWN0SW5kZWVkVGl0bGUoZWxlbWVudCwgcG9zdFRleHQpO1xyXG4gICAgZGVzY3JpcHRpb24gPSBleHRyYWN0SW5kZWVkRGVzY3JpcHRpb24oZWxlbWVudCwgcG9zdFRleHQpO1xyXG4gICAgcG9zdGVkQnkgPSBleHRyYWN0SW5kZWVkQ29tcGFueShlbGVtZW50KTtcclxuICAgIHRpbWVzdGFtcCA9IGV4dHJhY3RHZW5lcmljVGltZXN0YW1wKGVsZW1lbnQpO1xyXG4gIH1cclxuXHJcbiAgLy8gRmFsbGJhY2sgdGl0bGU6IGZpcnN0IG1lYW5pbmdmdWwgbGluZSBmcm9tIHRoZSBjbGVhbmVkIHBvc3QgdGV4dCBvbmx5XHJcbiAgaWYgKCF0aXRsZSkge1xyXG4gICAgY29uc3QgbGluZXMgPSBwb3N0VGV4dFxyXG4gICAgICAuc3BsaXQoL1tcXG4uIT9dLylcclxuICAgICAgLm1hcCgobCkgPT4gbC50cmltKCkpXHJcbiAgICAgIC5maWx0ZXIoKGwpID0+IGwubGVuZ3RoID4gMTAgJiYgbC5sZW5ndGggPCAxMjApO1xyXG4gICAgdGl0bGUgPSBsaW5lc1swXSA/PyBcIkpvYiBPcHBvcnR1bml0eVwiO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgYnVkZ2V0ID0gaGFzQ3VycmVuY3kgPyBwYXJzZUJ1ZGdldChwb3N0VGV4dCkgOiB1bmRlZmluZWQ7XHJcbiAgY29uc3QgbG9jYXRpb24gPSBleHRyYWN0TG9jYXRpb24ocG9zdFRleHQpO1xyXG4gIGNvbnN0IGNhdGVnb3J5ID0gYXV0b1RhZ0NhdGVnb3J5KHBvc3RUZXh0KTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHRpdGxlOiBzYW5pdGl6ZSh0aXRsZS5zbGljZSgwLCAxNTApKSxcclxuICAgIGRlc2NyaXB0aW9uOiBzYW5pdGl6ZShkZXNjcmlwdGlvbi5zbGljZSgwLCAyMDAwKSksXHJcbiAgICBzb3VyY2U6IHBsYXRmb3JtLFxyXG4gICAgc291cmNlX3VybDogZXh0cmFjdFBvc3RVcmwoZWxlbWVudCwgcGxhdGZvcm0pIHx8IHVybCxcclxuICAgIHBvc3RlZF9ieTogc2FuaXRpemUocG9zdGVkQnkuc2xpY2UoMCwgMTAwKSksXHJcbiAgICB0aW1lc3RhbXA6IHRpbWVzdGFtcCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICBsb2NhdGlvbjogbG9jYXRpb24gPyBzYW5pdGl6ZShsb2NhdGlvbikgOiB1bmRlZmluZWQsXHJcbiAgICBidWRnZXQsXHJcbiAgICBjYXRlZ29yeSxcclxuICAgIHBob25lOiBwaG9uZSA/IHNhbml0aXplKHBob25lKSA6IHVuZGVmaW5lZCxcclxuICAgIGVtYWlsOiBlbWFpbCA/IHNhbml0aXplKGVtYWlsKSA6IHVuZGVmaW5lZCxcclxuICB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgRmFjZWJvb2stc3BlY2lmaWMgZXh0cmFjdG9ycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RGYWNlYm9va1RpdGxlKGVsZW1lbnQ6IEVsZW1lbnQsIHBvc3RUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIC8vIE9ubHkgbG9vayBmb3IgPHN0cm9uZz4gdGFncyB0aGF0IGFyZSBOT1QgaW5zaWRlIGEgbmVzdGVkIGFydGljbGUgKGNvbW1lbnQpXHJcbiAgY29uc3Qgc3Ryb25ncyA9IEFycmF5LmZyb20oZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKFwic3Ryb25nXCIpKTtcclxuICBmb3IgKGNvbnN0IHMgb2Ygc3Ryb25ncykge1xyXG4gICAgaWYgKHMuY2xvc2VzdCgnW3JvbGU9XCJhcnRpY2xlXCJdJykgIT09IGVsZW1lbnQpIGNvbnRpbnVlOyAvLyBpbnNpZGUgYSBjb21tZW50XHJcbiAgICBjb25zdCB0ID0gcy50ZXh0Q29udGVudD8udHJpbSgpID8/IFwiXCI7XHJcbiAgICBpZiAodC5sZW5ndGggPiAzKSByZXR1cm4gdDtcclxuICB9XHJcblxyXG4gIC8vIGgxL2gyL2gzIG5vdCBpbnNpZGUgYSBjb21tZW50XHJcbiAgZm9yIChjb25zdCB0YWcgb2YgW1wiaDFcIiwgXCJoMlwiLCBcImgzXCJdKSB7XHJcbiAgICBjb25zdCBoZWFkaW5nID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKHRhZyk7XHJcbiAgICBpZiAoIWhlYWRpbmcpIGNvbnRpbnVlO1xyXG4gICAgaWYgKGhlYWRpbmcuY2xvc2VzdCgnW3JvbGU9XCJhcnRpY2xlXCJdJykgIT09IGVsZW1lbnQpIGNvbnRpbnVlO1xyXG4gICAgaWYgKGhlYWRpbmcudGV4dENvbnRlbnQ/LnRyaW0oKSkgcmV0dXJuIGhlYWRpbmcudGV4dENvbnRlbnQudHJpbSgpO1xyXG4gIH1cclxuXHJcbiAgLy8gRXh0cmFjdCBmaXJzdCBoaXJpbmcta2V5d29yZCBzZW50ZW5jZSBmcm9tIHBvc3QtYm9keSB0ZXh0IG9ubHlcclxuICBjb25zdCBtYXRjaCA9IHBvc3RUZXh0Lm1hdGNoKC8oPzpoaXJpbmd8bG9va2luZyBmb3J8bmVlZCg/OmVkKT98dmFjYW5jeXxvcGVuKD86aW5nKT8pW14uIT9cXG5dezUsODB9L2kpO1xyXG4gIGlmIChtYXRjaCkgcmV0dXJuIG1hdGNoWzBdLnRyaW0oKTtcclxuXHJcbiAgcmV0dXJuIFwiXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RGYWNlYm9va0Rlc2NyaXB0aW9uKGVsZW1lbnQ6IEVsZW1lbnQsIHBvc3RUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIC8vIE1vc3QgcmVsaWFibGU6IGRlZGljYXRlZCBwb3N0LWJvZHkgZGF0YSBhdHRyaWJ1dGVzIChuZXZlciBpbnNpZGUgY29tbWVudHMpXHJcbiAgY29uc3QgcG9zdEJvZHkgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hZC1wcmV2aWV3PVwibWVzc2FnZVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInBvc3RfbWVzc2FnZVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInN0b3J5LW1lc3NhZ2VcIl0nKTtcclxuXHJcbiAgaWYgKHBvc3RCb2R5Py50ZXh0Q29udGVudD8udHJpbSgpKSByZXR1cm4gcG9zdEJvZHkudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICAvLyBXYWxrIFtkaXI9XCJhdXRvXCJdIGVsZW1lbnRzIGJ1dCBPTkxZIGFjY2VwdCBvbmVzIHdob3NlIGNsb3Nlc3QgW3JvbGU9XCJhcnRpY2xlXCJdXHJcbiAgLy8gaXMgdGhlIHJvb3QgcG9zdCBlbGVtZW50IFx1MjAxNCBub3QgYSBuZXN0ZWQgY29tbWVudCBhcnRpY2xlXHJcbiAgY29uc3QgZGlyQXV0b3MgPSBBcnJheS5mcm9tKGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2Rpcj1cImF1dG9cIl0nKSk7XHJcbiAgZm9yIChjb25zdCBlbCBvZiBkaXJBdXRvcykge1xyXG4gICAgY29uc3QgY2xvc2VzdEFydGljbGUgPSBlbC5jbG9zZXN0KCdbcm9sZT1cImFydGljbGVcIl0nKTtcclxuICAgIC8vIElmIHRoZXJlJ3Mgbm8gYXJ0aWNsZSBhbmNlc3Rvciwgb3IgdGhlIGNsb3Nlc3Qgb25lIElTIG91ciByb290IGVsZW1lbnQgXHUyMTkyIHBvc3QgYm9keVxyXG4gICAgaWYgKGNsb3Nlc3RBcnRpY2xlICYmIGNsb3Nlc3RBcnRpY2xlICE9PSBlbGVtZW50KSBjb250aW51ZTtcclxuICAgIGNvbnN0IHRleHQgPSBlbC50ZXh0Q29udGVudD8udHJpbSgpID8/IFwiXCI7XHJcbiAgICBpZiAodGV4dC5sZW5ndGggPiAzMCkgcmV0dXJuIHRleHQ7XHJcbiAgfVxyXG5cclxuICAvLyBTYWZlIGZhbGxiYWNrOiBjbGVhbmVkIHRleHQgZnJvbSBnZXRQb3N0Qm9keVRleHQgKGNvbW1lbnRzIGFscmVhZHkgc3RyaXBwZWQpXHJcbiAgcmV0dXJuIHBvc3RUZXh0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0RmFjZWJvb2tQb3N0ZXIoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgLy8gQWN0b3IgbmFtZSB0eXBpY2FsbHkgaW4gYSBsaW5rIHdpdGggYXJpYS1sYWJlbCBvciBwcm9maWxlIGxpbmtcclxuICBjb25zdCBhY3RvckxpbmsgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdhW3JvbGU9XCJsaW5rXCJdW3RhYmluZGV4PVwiMFwiXSBzdHJvbmcnKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJzdG9yeS1zdWJ0aXRsZVwiXSBhJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImgzIGFcIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImg0IGFcIik7XHJcblxyXG4gIHJldHVybiBhY3Rvckxpbms/LnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEZhY2Vib29rVGltZXN0YW1wKGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpbWVFbCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImFiYnJbZGF0YS11dGltZV1cIik7XHJcbiAgaWYgKHRpbWVFbCkge1xyXG4gICAgY29uc3QgdXRpbWUgPSB0aW1lRWwuZ2V0QXR0cmlidXRlKFwiZGF0YS11dGltZVwiKTtcclxuICAgIGlmICh1dGltZSkgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHV0aW1lKSAqIDEwMDApLnRvSVNPU3RyaW5nKCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCB0aW1lVGFnID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwidGltZVwiKTtcclxuICBpZiAodGltZVRhZykge1xyXG4gICAgY29uc3QgZHQgPSB0aW1lVGFnLmdldEF0dHJpYnV0ZShcImRhdGV0aW1lXCIpO1xyXG4gICAgaWYgKGR0KSByZXR1cm4gbmV3IERhdGUoZHQpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBpZiAodGltZVRhZy50ZXh0Q29udGVudCkgcmV0dXJuIHRpbWVUYWcudGV4dENvbnRlbnQudHJpbSgpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFBvc3RVcmwoZWxlbWVudDogRWxlbWVudCwgcGxhdGZvcm06IFBsYXRmb3JtKTogc3RyaW5nIHtcclxuICBpZiAocGxhdGZvcm0gPT09IFwiZmFjZWJvb2tcIikge1xyXG4gICAgY29uc3QgbGlua3MgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEFuY2hvckVsZW1lbnQ+KFwiYVtocmVmXVwiKTtcclxuICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xyXG4gICAgICBjb25zdCBocmVmID0gbGluay5ocmVmO1xyXG4gICAgICBpZiAoaHJlZi5pbmNsdWRlcyhcIi9wb3N0cy9cIikgfHwgaHJlZi5pbmNsdWRlcyhcInN0b3J5X2ZiaWRcIikgfHwgaHJlZi5pbmNsdWRlcyhcInBlcm1hbGlua1wiKSkge1xyXG4gICAgICAgIHJldHVybiBocmVmO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChwbGF0Zm9ybSA9PT0gXCJsaW5rZWRpblwiKSB7XHJcbiAgICBjb25zdCBsaW5rcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MQW5jaG9yRWxlbWVudD4oXCJhW2hyZWZdXCIpO1xyXG4gICAgZm9yIChjb25zdCBsaW5rIG9mIGxpbmtzKSB7XHJcbiAgICAgIGNvbnN0IGhyZWYgPSBsaW5rLmhyZWY7XHJcbiAgICAgIGlmIChocmVmLmluY2x1ZGVzKFwiL2ZlZWQvdXBkYXRlL1wiKSB8fCBocmVmLmluY2x1ZGVzKFwiL3Bvc3RzL1wiKSB8fCBocmVmLmluY2x1ZGVzKFwidWdjUG9zdFwiKSkge1xyXG4gICAgICAgIHJldHVybiBocmVmO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChwbGF0Zm9ybSA9PT0gXCJqb2JzdHJlZXRcIikge1xyXG4gICAgY29uc3QgbGluayA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MQW5jaG9yRWxlbWVudD4oXCJhW2hyZWYqPScvam9iLyddLCBhW2RhdGEtYXV0b21hdGlvbj0nam9iLWxpc3QtaXRlbS1saW5rLW92ZXJsYXknXVwiKTtcclxuICAgIGlmIChsaW5rPy5ocmVmKSByZXR1cm4gbGluay5ocmVmO1xyXG4gICAgY29uc3Qgam9iSWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtam9iLWlkXCIpID8/IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1hdXRvbWF0aW9uLWlkXCIpO1xyXG4gICAgaWYgKGpvYklkKSByZXR1cm4gYGh0dHBzOi8vd3d3LmpvYnN0cmVldC5jb20ucGgvam9iLyR7am9iSWR9YDtcclxuICB9IGVsc2UgaWYgKHBsYXRmb3JtID09PSBcImluZGVlZFwiKSB7XHJcbiAgICBjb25zdCBsaW5rID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yPEhUTUxBbmNob3JFbGVtZW50PihcImFbaHJlZio9Jy9yYy9jbGsnXSwgYVtocmVmKj0nL3ZpZXdqb2InXSwgaDIgYVwiKTtcclxuICAgIGlmIChsaW5rPy5ocmVmKSByZXR1cm4gbGluay5ocmVmO1xyXG4gICAgY29uc3QgamsgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtamtcIik7XHJcbiAgICBpZiAoamspIHJldHVybiBgaHR0cHM6Ly9waC5pbmRlZWQuY29tL3ZpZXdqb2I/ams9JHtqa31gO1xyXG4gIH1cclxuICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBMaW5rZWRJbi1zcGVjaWZpYyBleHRyYWN0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdExpbmtlZEluVGl0bGUoZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgLy8gTGlua2VkSW4gam9iIHVwZGF0ZSB0aXRsZSBvZnRlbiBpbiAuZmVlZC1zaGFyZWQtdGV4dCBzdHJvbmcgb3IgLnVwZGF0ZS1jb21wb25lbnRzLXRleHRcclxuICBjb25zdCBzdHJvbmcgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmZlZWQtc2hhcmVkLXRleHQgc3Ryb25nXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudXBkYXRlLWNvbXBvbmVudHMtdGV4dCBzdHJvbmdcIik7XHJcbiAgaWYgKHN0cm9uZz8udGV4dENvbnRlbnQpIHJldHVybiBzdHJvbmcudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICAvLyBJbmxpbmUgam9iIGxpc3RpbmcgdGl0bGVcclxuICBjb25zdCBqb2JUaXRsZSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcclxuICAgIFwiLmpvYi1jYXJkLWNvbnRhaW5lcl9fbGluaywgLmpvYnMtdW5pZmllZC10b3AtY2FyZF9fam9iLXRpdGxlXCJcclxuICApO1xyXG4gIGlmIChqb2JUaXRsZT8udGV4dENvbnRlbnQpIHJldHVybiBqb2JUaXRsZS50ZXh0Q29udGVudC50cmltKCk7XHJcblxyXG4gIGNvbnN0IG1hdGNoID0gZnVsbFRleHQubWF0Y2goLyg/OmhpcmluZ3xsb29raW5nIGZvcnxuZWVkKVteLiE/XFxuXXs1LDgwfS9pKTtcclxuICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaFswXS50cmltKCk7XHJcblxyXG4gIHJldHVybiBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5EZXNjcmlwdGlvbihlbGVtZW50OiBFbGVtZW50LCBwb3N0VGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAvLyBUaGVzZSBzZWxlY3RvcnMgYXJlIHNjb3BlZCB0byBwb3N0IGJvZHkgXHUyMDE0IHRoZXkgbmV2ZXIgaW5jbHVkZSB0aGUgY29tbWVudHMgbGlzdFxyXG4gIGNvbnN0IHRleHROb2RlID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi5mZWVkLXNoYXJlZC10ZXh0XCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudXBkYXRlLWNvbXBvbmVudHMtdGV4dFwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmZlZWQtc2hhcmVkLXVwZGF0ZS12Ml9fZGVzY3JpcHRpb25cIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIltkYXRhLXRlc3QtaWQ9J21haW4tZmVlZC1hY3Rpdml0eS1jYXJkX19jb21tZW50YXJ5J11cIik7XHJcblxyXG4gIGlmICh0ZXh0Tm9kZT8udGV4dENvbnRlbnQpIHJldHVybiB0ZXh0Tm9kZS50ZXh0Q29udGVudC50cmltKCk7XHJcblxyXG4gIC8vIEZhbGwgYmFjayB0byBhbHJlYWR5LWNsZWFuZWQgdGV4dCAoY29tbWVudHMgc3RyaXBwZWQgYnkgZ2V0UG9zdEJvZHlUZXh0KVxyXG4gIHJldHVybiBwb3N0VGV4dDtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdExpbmtlZEluUG9zdGVyKGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGFjdG9yID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi51cGRhdGUtY29tcG9uZW50cy1hY3Rvcl9fbmFtZSBzcGFuW2FyaWEtaGlkZGVuPSd0cnVlJ11cIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi5mZWVkLXNoYXJlZC1hY3Rvcl9fbmFtZVwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLnVwZGF0ZS1jb21wb25lbnRzLWFjdG9yX19uYW1lXCIpO1xyXG5cclxuICByZXR1cm4gYWN0b3I/LnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdExpbmtlZEluVGltZXN0YW1wKGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpbWVFbCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcInRpbWVcIik7XHJcbiAgaWYgKHRpbWVFbCkge1xyXG4gICAgY29uc3QgZHQgPSB0aW1lRWwuZ2V0QXR0cmlidXRlKFwiZGF0ZXRpbWVcIik7XHJcbiAgICBpZiAoZHQpIHJldHVybiBuZXcgRGF0ZShkdCkudG9JU09TdHJpbmcoKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHJlbGF0aXZlVGltZSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcclxuICAgIFwiLmZlZWQtc2hhcmVkLWFjdG9yX19zdWItZGVzY3JpcHRpb24sIC51cGRhdGUtY29tcG9uZW50cy1hY3Rvcl9fc3ViLWRlc2NyaXB0aW9uXCJcclxuICApO1xyXG4gIGlmIChyZWxhdGl2ZVRpbWU/LnRleHRDb250ZW50KSByZXR1cm4gcmVsYXRpdmVUaW1lLnRleHRDb250ZW50LnRyaW0oKTtcclxuXHJcbiAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEpvYlN0cmVldC1zcGVjaWZpYyBleHRyYWN0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEpvYlN0cmVldFRpdGxlKGVsZW1lbnQ6IEVsZW1lbnQsIGZ1bGxUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpdGxlID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYXV0b21hdGlvbj1cImpvYi1jYXJkLXRpdGxlXCJdIHNwYW4nKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hdXRvbWF0aW9uPVwiam9iLWNhcmQtdGl0bGVcIl0nKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiaDEsIGgyLCBoM1wiKTtcclxuICBpZiAodGl0bGU/LnRleHRDb250ZW50KSByZXR1cm4gdGl0bGUudGV4dENvbnRlbnQudHJpbSgpO1xyXG4gIGNvbnN0IGxpbmVzID0gZnVsbFRleHQuc3BsaXQoXCJcXG5cIikubWFwKChsKSA9PiBsLnRyaW0oKSkuZmlsdGVyKChsKSA9PiBsLmxlbmd0aCA+IDUgJiYgbC5sZW5ndGggPCAxMjApO1xyXG4gIHJldHVybiBsaW5lc1swXSA/PyBcIkpvYiBPcGVuaW5nXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RKb2JTdHJlZXREZXNjcmlwdGlvbihlbGVtZW50OiBFbGVtZW50LCBmdWxsVGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBkZXNjID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYXV0b21hdGlvbj1cImpvYi1jYXJkLXRlYXNlclwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tjbGFzcyo9XCJ0ZWFzZXJcIl0nKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbY2xhc3MqPVwiZGVzY3JpcHRpb25cIl0nKTtcclxuICBpZiAoZGVzYz8udGV4dENvbnRlbnQpIHJldHVybiBkZXNjLnRleHRDb250ZW50LnRyaW0oKTtcclxuICByZXR1cm4gZnVsbFRleHQudHJpbSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0Sm9iU3RyZWV0Q29tcGFueShlbGVtZW50OiBFbGVtZW50KTogc3RyaW5nIHtcclxuICBjb25zdCBjb21wYW55ID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYXV0b21hdGlvbj1cImpvYi1jYXJkLWNvbXBhbnlcIl0nKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbY2xhc3MqPVwiY29tcGFueVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tjbGFzcyo9XCJhZHZlcnRpc2VyXCJdJyk7XHJcbiAgcmV0dXJuIGNvbXBhbnk/LnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEluZGVlZC1zcGVjaWZpYyBleHRyYWN0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEluZGVlZFRpdGxlKGVsZW1lbnQ6IEVsZW1lbnQsIGZ1bGxUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpdGxlID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImgyLmpvYlRpdGxlIHNwYW5bdGl0bGVdXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoMi5qb2JUaXRsZSBzcGFuOm5vdChbY2xhc3NdKVwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmpvYlRpdGxlIGEgc3BhblwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiaDIsIGgzXCIpO1xyXG4gIGlmICh0aXRsZT8udGV4dENvbnRlbnQpIHJldHVybiB0aXRsZS50ZXh0Q29udGVudC50cmltKCk7XHJcbiAgY29uc3QgbGluZXMgPSBmdWxsVGV4dC5zcGxpdChcIlxcblwiKS5tYXAoKGwpID0+IGwudHJpbSgpKS5maWx0ZXIoKGwpID0+IGwubGVuZ3RoID4gNSAmJiBsLmxlbmd0aCA8IDEyMCk7XHJcbiAgcmV0dXJuIGxpbmVzWzBdID8/IFwiSm9iIE9wZW5pbmdcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEluZGVlZERlc2NyaXB0aW9uKGVsZW1lbnQ6IEVsZW1lbnQsIGZ1bGxUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGRlc2MgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmpvYi1zbmlwcGV0XCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tjbGFzcyo9XCJzbmlwcGV0XCJdJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2NsYXNzKj1cImRlc2NyaXB0aW9uXCJdJyk7XHJcbiAgaWYgKGRlc2M/LnRleHRDb250ZW50KSByZXR1cm4gZGVzYy50ZXh0Q29udGVudC50cmltKCk7XHJcbiAgcmV0dXJuIGZ1bGxUZXh0LnRyaW0oKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEluZGVlZENvbXBhbnkoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgY29uc3QgY29tcGFueSA9XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuY29tcGFueU5hbWVcIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwiY29tcGFueS1uYW1lXCJdJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2NsYXNzKj1cImNvbXBhbnlcIl0nKTtcclxuICByZXR1cm4gY29tcGFueT8udGV4dENvbnRlbnQ/LnRyaW0oKSA/PyBcIlwiO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgR2VuZXJpYyB0aW1lc3RhbXAgZmFsbGJhY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBleHRyYWN0R2VuZXJpY1RpbWVzdGFtcChlbGVtZW50OiBFbGVtZW50KTogc3RyaW5nIHtcclxuICBjb25zdCB0aW1lRWwgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCJ0aW1lXCIpO1xyXG4gIGlmICh0aW1lRWwpIHtcclxuICAgIGNvbnN0IGR0ID0gdGltZUVsLmdldEF0dHJpYnV0ZShcImRhdGV0aW1lXCIpO1xyXG4gICAgaWYgKGR0KSByZXR1cm4gbmV3IERhdGUoZHQpLnRvSVNPU3RyaW5nKCk7XHJcbiAgfVxyXG4gIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBTaGFyZWQgaGVscGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIHBhcnNlQnVkZ2V0KHRleHQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcbiAgQ1VSUkVOQ1lfUkVHRVgubGFzdEluZGV4ID0gMDtcclxuICBjb25zdCBtYXRjaCA9IENVUlJFTkNZX1JFR0VYLmV4ZWModGV4dCk7XHJcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgY29uc3QgbnVtU3RyID0gbWF0Y2hbMF0ucmVwbGFjZSgvW14wLTldL2csIFwiXCIpO1xyXG4gIGNvbnN0IG51bSA9IHBhcnNlSW50KG51bVN0ciwgMTApO1xyXG4gIHJldHVybiBpc05hTihudW0pID8gdW5kZWZpbmVkIDogbnVtO1xyXG59XHJcblxyXG5jb25zdCBMT0NBVElPTl9QQVRURVJOUyA9IFtcclxuICAvXFxibG9jYXRpb25bOlxcc10rKFtBLVphLXpcXHMsXSs/KSg/OlxcLnwsfFxcbnwkKS9pLFxyXG4gIC9cXGIoPzpiYXNlZCBpbnxsb2NhdGVkIGlufHdvcmsgaW58d29ya2luZyBpbnxzaXRlWzpcXHNdKylcXHMqKFtBLVphLXpcXHMsXSs/KSg/OlxcLnwsfFxcbnwkKS9pLFxyXG4gIC9cXGIoPzppbnxhdClcXHMrKFtBLVpdW2Etel0rKD86W1xccyxdK1tBLVpdW2Etel0rKSopKD89XFxzKltcXC5cXCxcXG5dKS8sXHJcbiAgL1xcYihbQS1aXVthLXpdKyg/Olxcc1tBLVpdW2Etel0rKSopLFxccyooPzpNZXRyb1xccyk/KD86TWFuaWxhfENlYnV8RGF2YW98UXVlem9uIENpdHl8TWFrYXRpfFBhc2lnfFRhZ3VpZ3xNYW5kYWx1eW9uZ3xQYXJhXHUwMEYxYXF1ZXxMYXMgUGlcdTAwRjFhc3xNdW50aW5sdXBhfENhbG9vY2FufE1hcmlraW5hfFBhc2F5fER1YmFpfEFidSBEaGFiaXxTaGFyamFofFNpbmdhcG9yZXxSaXlhZGh8UWF0YXIpLyxcclxuXTtcclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RMb2NhdGlvbih0ZXh0OiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBMT0NBVElPTl9QQVRURVJOUykge1xyXG4gICAgY29uc3QgbWF0Y2ggPSB0ZXh0Lm1hdGNoKHBhdHRlcm4pO1xyXG4gICAgaWYgKG1hdGNoPy5bMV0pIHJldHVybiBtYXRjaFsxXS50cmltKCk7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbi8qKiBTdHJpcCBIVE1MIHRhZ3MgYW5kIHRyaW0gd2hpdGVzcGFjZSAqL1xyXG5mdW5jdGlvbiBzYW5pdGl6ZShpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gaW5wdXQucmVwbGFjZSgvPFtePl0qPi9nLCBcIlwiKS5yZXBsYWNlKC9cXHMrL2csIFwiIFwiKS50cmltKCk7XHJcbn1cclxuIiwgImltcG9ydCB0eXBlIHtcclxuICBCdWxrRGVmYXVsdHMsXHJcbiAgQ2F0ZWdvcnksXHJcbiAgRXN0aW1hdGVCdWRnZXRNZXNzYWdlLFxyXG4gIEVzdGltYXRlQnVkZ2V0UmVzcG9uc2UsXHJcbiAgR2VuZXJhdGVEZXNjcmlwdGlvbk1lc3NhZ2UsXHJcbiAgR2VuZXJhdGVEZXNjcmlwdGlvblJlc3BvbnNlLFxyXG4gIEltcG9ydEpvYk1lc3NhZ2UsXHJcbiAgSW1wb3J0Sm9iUmVzcG9uc2UsXHJcbiAgSm9iUG9zdCxcclxufSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBDb25zdGFudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5jb25zdCBTQ0FOX0JUTl9JRCAgID0gXCJsb2NhbHByby1zY2FuLWhvc3RcIjtcclxuY29uc3QgUEFORUxfSE9TVF9JRCA9IFwibG9jYWxwcm8tcGFuZWwtaG9zdFwiO1xyXG5jb25zdCBNT0RBTF9IT1NUX0lEID0gXCJsb2NhbHByby1tb2RhbC1ob3N0XCI7XHJcbmNvbnN0IExQX1VSTCAgICAgICAgPSBcImh0dHBzOi8vd3d3LmxvY2FscHJvLmFzaWFcIjtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBTaGFyZWQgU2hhZG93IERPTSBzdHlsZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5jb25zdCBCQVNFX1NUWUxFUyA9IGBcclxuICA6aG9zdCB7IGFsbDogaW5pdGlhbDsgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgc2Fucy1zZXJpZjsgfVxyXG5cclxuICAvKiBcdTI1MDBcdTI1MDAgRmxvYXRpbmcgc2NhbiBidXR0b25zIFx1MjUwMFx1MjUwMCAqL1xyXG4gIC5scC1mYWItd3JhcCB7XHJcbiAgICBwb3NpdGlvbjogZml4ZWQ7XHJcbiAgICBib3R0b206IDI4cHg7XHJcbiAgICByaWdodDogMjhweDtcclxuICAgIHotaW5kZXg6IDIxNDc0ODM2NDY7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcclxuICAgIGFsaWduLWl0ZW1zOiBmbGV4LWVuZDtcclxuICAgIGdhcDogOHB4O1xyXG4gIH1cclxuICAubHAtZmFiIHtcclxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogOHB4O1xyXG4gICAgcGFkZGluZzogMTFweCAxOHB4O1xyXG4gICAgYmFja2dyb3VuZDogIzFhNTZkYjtcclxuICAgIGNvbG9yOiAjZmZmO1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDcwMDtcclxuICAgIGJvcmRlcjogbm9uZTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDUwcHg7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBib3gtc2hhZG93OiAwIDRweCAxNnB4IHJnYmEoMjYsODYsMjE5LC40NSk7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4ycywgdHJhbnNmb3JtIC4xNXMsIGJveC1zaGFkb3cgLjJzO1xyXG4gICAgbGluZS1oZWlnaHQ6IDE7XHJcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xyXG4gIH1cclxuICAubHAtZmFiOmhvdmVyICB7IGJhY2tncm91bmQ6ICMxZTQyOWY7IGJveC1zaGFkb3c6IDAgNnB4IDIwcHggcmdiYSgyNiw4NiwyMTksLjU1KTsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0xcHgpOyB9XHJcbiAgLmxwLWZhYjphY3RpdmUgeyB0cmFuc2Zvcm06IHNjYWxlKDAuOTYpOyB9XHJcbiAgLmxwLWZhYjpkaXNhYmxlZCB7IGJhY2tncm91bmQ6ICM2YjcyODA7IGN1cnNvcjogbm90LWFsbG93ZWQ7IGJveC1zaGFkb3c6IG5vbmU7IHRyYW5zZm9ybTogbm9uZTsgfVxyXG4gIC5scC1mYWIuc2Vjb25kYXJ5IHsgYmFja2dyb3VuZDogIzBmNzY2ZTsgYm94LXNoYWRvdzogMCA0cHggMTZweCByZ2JhKDE1LDExOCwxMTAsLjQpOyBmb250LXNpemU6IDEycHg7IHBhZGRpbmc6IDlweCAxNHB4OyB9XHJcbiAgLmxwLWZhYi5zZWNvbmRhcnk6aG92ZXIgeyBiYWNrZ3JvdW5kOiAjMGQ1ZTU4OyB9XHJcbiAgLmxwLWZhYiBzdmcgeyBmbGV4LXNocmluazogMDsgfVxyXG5cclxuICAvKiBcdTI1MDBcdTI1MDAgU2VsZWN0aW9uIHBhbmVsIChzaWRlIGRyYXdlcikgXHUyNTAwXHUyNTAwICovXHJcbiAgLmxwLXBhbmVsLW92ZXJsYXkge1xyXG4gICAgcG9zaXRpb246IGZpeGVkO1xyXG4gICAgaW5zZXQ6IDA7XHJcbiAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLC4zNSk7XHJcbiAgICB6LWluZGV4OiAyMTQ3NDgzNjQ2O1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7XHJcbiAgICBhbmltYXRpb246IGxwLWZhZGUtaW4gLjE1cyBlYXNlO1xyXG4gIH1cclxuICBAa2V5ZnJhbWVzIGxwLWZhZGUtaW4geyBmcm9tIHsgb3BhY2l0eTogMCB9IHRvIHsgb3BhY2l0eTogMSB9IH1cclxuXHJcbiAgLmxwLXBhbmVsIHtcclxuICAgIHdpZHRoOiA0NDBweDtcclxuICAgIG1heC13aWR0aDogMTAwdnc7XHJcbiAgICBoZWlnaHQ6IDEwMCU7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcbiAgICBib3gtc2hhZG93OiAtNHB4IDAgMjRweCByZ2JhKDAsMCwwLC4xNSk7XHJcbiAgICBhbmltYXRpb246IGxwLXNsaWRlLWxlZnQgLjJzIGVhc2U7XHJcbiAgfVxyXG4gIEBrZXlmcmFtZXMgbHAtc2xpZGUtbGVmdCB7IGZyb20geyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoNDBweCk7IG9wYWNpdHk6IDAgfSB0byB7IHRyYW5zZm9ybTogdHJhbnNsYXRlWCgwKTsgb3BhY2l0eTogMSB9IH1cclxuXHJcbiAgLmxwLXBhbmVsLWhlYWRlciB7XHJcbiAgICBwYWRkaW5nOiAxNnB4IDE4cHggMTJweDtcclxuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZTVlN2ViO1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XHJcbiAgICBmbGV4LXNocmluazogMDtcclxuICB9XHJcbiAgLmxwLXBhbmVsLXRpdGxlIHtcclxuICAgIGZvbnQtc2l6ZTogMTVweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICBjb2xvcjogIzExMTgyNztcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA4cHg7XHJcbiAgfVxyXG4gIC5scC1wYW5lbC1jb3VudCB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZWZmNmZmO1xyXG4gICAgY29sb3I6ICMxZTQwYWY7XHJcbiAgICBib3JkZXItcmFkaXVzOiAyMHB4O1xyXG4gICAgcGFkZGluZzogMnB4IDlweDtcclxuICAgIGZvbnQtc2l6ZTogMTJweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgfVxyXG4gIC5scC1jbG9zZS1idG4ge1xyXG4gICAgYmFja2dyb3VuZDogbm9uZTtcclxuICAgIGJvcmRlcjogbm9uZTtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIGNvbG9yOiAjNmI3MjgwO1xyXG4gICAgcGFkZGluZzogNHB4O1xyXG4gICAgYm9yZGVyLXJhZGl1czogNnB4O1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgfVxyXG4gIC5scC1jbG9zZS1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZjNmNGY2OyBjb2xvcjogIzExMTgyNzsgfVxyXG5cclxuICAvKiBTZWFyY2ggYmFyICovXHJcbiAgLmxwLXNlYXJjaC13cmFwIHtcclxuICAgIHBhZGRpbmc6IDEwcHggMThweDtcclxuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjNmNGY2O1xyXG4gICAgZmxleC1zaHJpbms6IDA7XHJcbiAgfVxyXG4gIC5scC1zZWFyY2gtaW5wdXQge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBwYWRkaW5nOiA4cHggMTJweCA4cHggMzRweDtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2QxZDVkYjtcclxuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgIGZvbnQtc2l6ZTogMTNweDtcclxuICAgIGNvbG9yOiAjMTExODI3O1xyXG4gICAgYmFja2dyb3VuZDogI2Y5ZmFmYiB1cmwoXCJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zycgd2lkdGg9JzE0JyBoZWlnaHQ9JzE0JyBmaWxsPSdub25lJyB2aWV3Qm94PScwIDAgMjQgMjQnIHN0cm9rZT0nJTIzNmI3MjgwJyBzdHJva2Utd2lkdGg9JzInJTNFJTNDcGF0aCBzdHJva2UtbGluZWNhcD0ncm91bmQnIHN0cm9rZS1saW5lam9pbj0ncm91bmQnIGQ9J00yMSAyMWwtNC4zNS00LjM1TTE3IDExQTYgNiAwIDExNSAxMWE2IDYgMCAwMTEyIDB6Jy8lM0UlM0Mvc3ZnJTNFXCIpIG5vLXJlcGVhdCAxMHB4IGNlbnRlcjtcclxuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XHJcbiAgICBvdXRsaW5lOiBub25lO1xyXG4gICAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIC4xNXM7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLXNlYXJjaC1pbnB1dDpmb2N1cyB7IGJvcmRlci1jb2xvcjogIzFhNTZkYjsgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjsgfVxyXG5cclxuICAvKiBCdWxrIHByZS1maWxsICovXHJcbiAgLmxwLWJ1bGstc2VjdGlvbiB7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2YzZjRmNjtcclxuICAgIGZsZXgtc2hyaW5rOiAwO1xyXG4gIH1cclxuICAubHAtYnVsay10b2dnbGUge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcclxuICAgIHBhZGRpbmc6IDEwcHggMThweDtcclxuICAgIGJhY2tncm91bmQ6IG5vbmU7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY29sb3I6ICMzNzQxNTE7XHJcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgbGV0dGVyLXNwYWNpbmc6IC40cHg7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWJ1bGstdG9nZ2xlOmhvdmVyIHsgYmFja2dyb3VuZDogI2Y5ZmFmYjsgfVxyXG4gIC5scC1idWxrLXRvZ2dsZSBzdmcgeyB0cmFuc2l0aW9uOiB0cmFuc2Zvcm0gLjJzOyB9XHJcbiAgLmxwLWJ1bGstdG9nZ2xlLm9wZW4gc3ZnIHsgdHJhbnNmb3JtOiByb3RhdGUoMTgwZGVnKTsgfVxyXG5cclxuICAubHAtYnVsay1ib2R5IHtcclxuICAgIGRpc3BsYXk6IG5vbmU7XHJcbiAgICBwYWRkaW5nOiA0cHggMThweCAxNHB4O1xyXG4gICAgYmFja2dyb3VuZDogI2ZhZmFmYTtcclxuICB9XHJcbiAgLmxwLWJ1bGstYm9keS5vcGVuIHsgZGlzcGxheTogYmxvY2s7IH1cclxuICAubHAtYnVsay1ncmlkIHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEwcHg7IG1hcmdpbi1ib3R0b206IDEwcHg7IH1cclxuICAubHAtYnVsay1sYWJlbCB7IGRpc3BsYXk6IGJsb2NrOyBmb250LXNpemU6IDExcHg7IGZvbnQtd2VpZ2h0OiA2MDA7IGNvbG9yOiAjNmI3MjgwOyBtYXJnaW4tYm90dG9tOiAzcHg7IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOiAuNHB4OyB9XHJcbiAgLmxwLWJ1bGstaW5wdXQsIC5scC1idWxrLXNlbGVjdCB7XHJcbiAgICB3aWR0aDogMTAwJTtcclxuICAgIHBhZGRpbmc6IDdweCAxMHB4O1xyXG4gICAgYm9yZGVyOiAxLjVweCBzb2xpZCAjZDFkNWRiO1xyXG4gICAgYm9yZGVyLXJhZGl1czogN3B4O1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgY29sb3I6ICMxMTE4Mjc7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcclxuICAgIG91dGxpbmU6IG5vbmU7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICAgIHRyYW5zaXRpb246IGJvcmRlci1jb2xvciAuMTVzO1xyXG4gIH1cclxuICAubHAtYnVsay1pbnB1dDpmb2N1cywgLmxwLWJ1bGstc2VsZWN0OmZvY3VzIHsgYm9yZGVyLWNvbG9yOiAjMWE1NmRiOyB9XHJcbiAgLmxwLWJ1bGstYXBwbHkge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBwYWRkaW5nOiA4cHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjMWE1NmRiO1xyXG4gICAgY29sb3I6ICNmZmY7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBib3JkZXItcmFkaXVzOiA3cHg7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xNXM7XHJcbiAgfVxyXG4gIC5scC1idWxrLWFwcGx5OmhvdmVyIHsgYmFja2dyb3VuZDogIzFlNDI5ZjsgfVxyXG5cclxuICAvKiBUb29sYmFyIChzZWxlY3QtYWxsICsgY291bnQgKyBDU1YpICovXHJcbiAgLmxwLXBhbmVsLXRvb2xiYXIge1xyXG4gICAgcGFkZGluZzogOHB4IDE4cHg7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2YzZjRmNjtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xyXG4gICAgZmxleC1zaHJpbms6IDA7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmFmYWZhO1xyXG4gIH1cclxuICAubHAtc2VsZWN0LWFsbC1sYWJlbCB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogN3B4O1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGNvbG9yOiAjMzc0MTUxO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgdXNlci1zZWxlY3Q6IG5vbmU7XHJcbiAgfVxyXG4gIC5scC1zZWxlY3QtYWxsLWxhYmVsIGlucHV0IHsgY3Vyc29yOiBwb2ludGVyOyB3aWR0aDogMTVweDsgaGVpZ2h0OiAxNXB4OyBhY2NlbnQtY29sb3I6ICMxYTU2ZGI7IH1cclxuICAubHAtdG9vbGJhci1yaWdodCB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogOHB4OyB9XHJcbiAgLmxwLXNlbGVjdGVkLWNvdW50IHsgZm9udC1zaXplOiAxMnB4OyBjb2xvcjogIzZiNzI4MDsgZm9udC13ZWlnaHQ6IDUwMDsgfVxyXG4gIC5scC1jc3YtYnRuIHtcclxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogNHB4O1xyXG4gICAgcGFkZGluZzogNHB4IDlweDtcclxuICAgIGJhY2tncm91bmQ6ICNmZmY7XHJcbiAgICBib3JkZXI6IDEuNXB4IHNvbGlkICNkMWQ1ZGI7XHJcbiAgICBib3JkZXItcmFkaXVzOiA2cHg7XHJcbiAgICBmb250LXNpemU6IDExcHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY29sb3I6ICMzNzQxNTE7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjFzO1xyXG4gIH1cclxuICAubHAtY3N2LWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6ICNmM2Y0ZjY7IH1cclxuXHJcbiAgLyogSm9iIGxpc3QgKi9cclxuICAubHAtcGFuZWwtbGlzdCB7IGZsZXg6IDE7IG92ZXJmbG93LXk6IGF1dG87IHBhZGRpbmc6IDZweCAwOyB9XHJcblxyXG4gIC5scC1qb2ItaXRlbSB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGZsZXgtc3RhcnQ7XHJcbiAgICBnYXA6IDEwcHg7XHJcbiAgICBwYWRkaW5nOiAxMHB4IDE4cHg7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y5ZmFmYjtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjFzO1xyXG4gIH1cclxuICAubHAtam9iLWl0ZW06aG92ZXIgICB7IGJhY2tncm91bmQ6ICNmOWZhZmI7IH1cclxuICAubHAtam9iLWl0ZW0uc2VsZWN0ZWQgeyBiYWNrZ3JvdW5kOiAjZWZmNmZmOyB9XHJcbiAgLmxwLWpvYi1pdGVtLmhpZGRlbiAgIHsgZGlzcGxheTogbm9uZTsgfVxyXG5cclxuICAubHAtam9iLWNoZWNrYm94IHtcclxuICAgIG1hcmdpbi10b3A6IDNweDtcclxuICAgIGZsZXgtc2hyaW5rOiAwO1xyXG4gICAgd2lkdGg6IDE1cHg7XHJcbiAgICBoZWlnaHQ6IDE1cHg7XHJcbiAgICBhY2NlbnQtY29sb3I6ICMxYTU2ZGI7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgfVxyXG4gIC5scC1qb2ItaW5mbyB7IGZsZXg6IDE7IG1pbi13aWR0aDogMDsgfVxyXG4gIC5scC1qb2ItdGl0bGUge1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGNvbG9yOiAjMTExODI3O1xyXG4gICAgbWFyZ2luLWJvdHRvbTogM3B4O1xyXG4gICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcclxuICAgIG92ZXJmbG93OiBoaWRkZW47XHJcbiAgICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpcztcclxuICB9XHJcbiAgLmxwLWpvYi1tZXRhIHtcclxuICAgIGZvbnQtc2l6ZTogMTFweDtcclxuICAgIGNvbG9yOiAjNmI3MjgwO1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDVweDtcclxuICAgIGZsZXgtd3JhcDogd3JhcDtcclxuICB9XHJcbiAgLmxwLWR1cC1iYWRnZSB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmVmM2M3O1xyXG4gICAgY29sb3I6ICM5MjQwMGU7XHJcbiAgICBib3JkZXItcmFkaXVzOiA0cHg7XHJcbiAgICBwYWRkaW5nOiAxcHggNnB4O1xyXG4gICAgZm9udC1zaXplOiAxMHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDcwMDtcclxuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICBsZXR0ZXItc3BhY2luZzogLjNweDtcclxuICB9XHJcblxyXG4gIC5scC1zb3VyY2UtY2hpcCB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XHJcbiAgICBwYWRkaW5nOiAxcHggNnB4O1xyXG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xyXG4gICAgZm9udC1zaXplOiAxMHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDcwMDtcclxuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICBsZXR0ZXItc3BhY2luZzogLjVweDtcclxuICB9XHJcbiAgLmxwLXNvdXJjZS1jaGlwLmZhY2Vib29rICB7IGJhY2tncm91bmQ6ICNkYmVhZmU7IGNvbG9yOiAjMWQ0ZWQ4OyB9XHJcbiAgLmxwLXNvdXJjZS1jaGlwLmxpbmtlZGluICB7IGJhY2tncm91bmQ6ICNjZmZhZmU7IGNvbG9yOiAjMGU3NDkwOyB9XHJcbiAgLmxwLXNvdXJjZS1jaGlwLmpvYnN0cmVldCB7IGJhY2tncm91bmQ6ICNkMWZhZTU7IGNvbG9yOiAjMDY1ZjQ2OyB9XHJcbiAgLmxwLXNvdXJjZS1jaGlwLmluZGVlZCAgICB7IGJhY2tncm91bmQ6ICNmY2U3ZjM7IGNvbG9yOiAjOWQxNzRkOyB9XHJcblxyXG4gIC5scC1uby1yZXN1bHRzIHtcclxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICAgIHBhZGRpbmc6IDMycHggMThweDtcclxuICAgIGNvbG9yOiAjOWNhM2FmO1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgZGlzcGxheTogbm9uZTtcclxuICB9XHJcbiAgLmxwLW5vLXJlc3VsdHMudmlzaWJsZSB7IGRpc3BsYXk6IGJsb2NrOyB9XHJcblxyXG4gIC8qIEZvb3RlciAqL1xyXG4gIC5scC1wYW5lbC1mb290ZXIgeyBwYWRkaW5nOiAxMnB4IDE4cHg7IGJvcmRlci10b3A6IDFweCBzb2xpZCAjZTVlN2ViOyBmbGV4LXNocmluazogMDsgYmFja2dyb3VuZDogI2ZmZjsgfVxyXG4gIC5scC1pbXBvcnQtYnRuIHtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgcGFkZGluZzogMTFweCAyMHB4O1xyXG4gICAgYmFja2dyb3VuZDogIzFhNTZkYjtcclxuICAgIGNvbG9yOiAjZmZmO1xyXG4gICAgYm9yZGVyOiBub25lO1xyXG4gICAgYm9yZGVyLXJhZGl1czogMTBweDtcclxuICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xNXM7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xyXG4gICAgZ2FwOiA3cHg7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWltcG9ydC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjMWU0MjlmOyB9XHJcbiAgLmxwLWltcG9ydC1idG46ZGlzYWJsZWQgeyBiYWNrZ3JvdW5kOiAjOWNhM2FmOyBjdXJzb3I6IG5vdC1hbGxvd2VkOyB9XHJcblxyXG4gIC8qIFx1MjUwMFx1MjUwMCBNb2RhbCBvdmVybGF5IFx1MjUwMFx1MjUwMCAqL1xyXG4gIC5scC1vdmVybGF5IHtcclxuICAgIHBvc2l0aW9uOiBmaXhlZDtcclxuICAgIGluc2V0OiAwO1xyXG4gICAgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwuNSk7XHJcbiAgICB6LWluZGV4OiAyMTQ3NDgzNjQ3O1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcclxuICAgIHBhZGRpbmc6IDE2cHg7XHJcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xyXG4gICAgYW5pbWF0aW9uOiBscC1mYWRlLWluIC4xNXMgZWFzZTtcclxuICB9XHJcbiAgLmxwLW1vZGFsIHtcclxuICAgIGJhY2tncm91bmQ6ICNmZmY7XHJcbiAgICBib3JkZXItcmFkaXVzOiAxNnB4O1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBtYXgtd2lkdGg6IDU2MHB4O1xyXG4gICAgbWF4LWhlaWdodDogOTB2aDtcclxuICAgIG92ZXJmbG93LXk6IGF1dG87XHJcbiAgICBib3gtc2hhZG93OiAwIDIwcHggNjBweCByZ2JhKDAsMCwwLC4zKTtcclxuICAgIGFuaW1hdGlvbjogbHAtc2xpZGUtdXAgLjJzIGVhc2U7XHJcbiAgfVxyXG4gIEBrZXlmcmFtZXMgbHAtc2xpZGUtdXAgeyBmcm9tIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDIwcHgpOyBvcGFjaXR5OiAwIH0gdG8geyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IG9wYWNpdHk6IDEgfSB9XHJcblxyXG4gIC5scC1tb2RhbC1oZWFkZXIge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XHJcbiAgICBwYWRkaW5nOiAxOHB4IDIycHggMTRweDtcclxuICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZTVlN2ViO1xyXG4gIH1cclxuICAubHAtbW9kYWwtdGl0bGUgeyBmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiA3MDA7IGNvbG9yOiAjMTExODI3OyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgfVxyXG4gIC5scC1tb2RhbC1wcm9ncmVzcyB7IGZvbnQtc2l6ZTogMTJweDsgZm9udC13ZWlnaHQ6IDYwMDsgY29sb3I6ICM2YjcyODA7IGJhY2tncm91bmQ6ICNmM2Y0ZjY7IHBhZGRpbmc6IDNweCAxMHB4OyBib3JkZXItcmFkaXVzOiAyMHB4OyB9XHJcbiAgLmxwLW1vZGFsLWhlYWRlci1yaWdodCB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogOHB4OyB9XHJcbiAgLmxwLW1vZGFsLWJvZHkgeyBwYWRkaW5nOiAxOHB4IDIycHg7IH1cclxuXHJcbiAgLmxwLWZpZWxkIHsgbWFyZ2luLWJvdHRvbTogMTNweDsgfVxyXG4gIC5scC1sYWJlbCB7IGRpc3BsYXk6IGJsb2NrOyBmb250LXNpemU6IDExcHg7IGZvbnQtd2VpZ2h0OiA2MDA7IGNvbG9yOiAjMzc0MTUxOyBtYXJnaW4tYm90dG9tOiA0cHg7IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOiAuNXB4OyB9XHJcbiAgLmxwLWxhYmVsIC5scC1yZXF1aXJlZCB7IGNvbG9yOiAjZWY0NDQ0OyBtYXJnaW4tbGVmdDogMnB4OyB9XHJcbiAgLmxwLWlucHV0LCAubHAtdGV4dGFyZWEsIC5scC1zZWxlY3Qge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBwYWRkaW5nOiA5cHggMTJweDtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2QxZDVkYjtcclxuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgIGNvbG9yOiAjMTExODI3O1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XHJcbiAgICBvdXRsaW5lOiBub25lO1xyXG4gICAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIC4xNXM7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWlucHV0OmZvY3VzLCAubHAtdGV4dGFyZWE6Zm9jdXMsIC5scC1zZWxlY3Q6Zm9jdXMgeyBib3JkZXItY29sb3I6ICMxYTU2ZGI7IH1cclxuICAubHAtdGV4dGFyZWEgeyByZXNpemU6IHZlcnRpY2FsOyBtaW4taGVpZ2h0OiA5MHB4OyB9XHJcbiAgLmxwLXNlbGVjdDpkaXNhYmxlZCB7IGJhY2tncm91bmQ6ICNmM2Y0ZjY7IGNvbG9yOiAjOWNhM2FmOyB9XHJcbiAgLmxwLXJvdyAgIHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEycHg7IH1cclxuICBpbnB1dFt0eXBlPVwiZGF0ZVwiXS5scC1pbnB1dCB7IGNvbG9yLXNjaGVtZTogbGlnaHQ7IH1cclxuXHJcbiAgLmxwLWhpbnQgeyBmb250LXNpemU6IDExcHg7IGNvbG9yOiAjNmI3MjgwOyBtYXJnaW4tdG9wOiAzcHg7IH1cclxuICAubHAtaGludC5haSB7IGNvbG9yOiAjN2MzYWVkOyB9XHJcbiAgLmxwLWhpbnQuc3VjY2VzcyB7IGNvbG9yOiAjMDU5NjY5OyB9XHJcblxyXG4gIC8qIEFJIGVzdGltYXRlIGJ1dHRvbiAqL1xyXG4gIC5scC1lc3RpbWF0ZS1idG4ge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA0cHg7XHJcbiAgICBtYXJnaW4tdG9wOiA0cHg7XHJcbiAgICBwYWRkaW5nOiA0cHggMTBweDtcclxuICAgIGJhY2tncm91bmQ6ICNmNWYzZmY7XHJcbiAgICBjb2xvcjogIzZkMjhkOTtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2RkZDZmZTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDZweDtcclxuICAgIGZvbnQtc2l6ZTogMTFweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xNXM7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWVzdGltYXRlLWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6ICNlZGU5ZmU7IH1cclxuICAubHAtZXN0aW1hdGUtYnRuOmRpc2FibGVkIHsgb3BhY2l0eTogLjY7IGN1cnNvcjogbm90LWFsbG93ZWQ7IH1cclxuXHJcbiAgLyogQUkgY2xlYW4gZGVzY3JpcHRpb24gYnV0dG9uICovXHJcbiAgLmxwLWFpLWNsZWFuLWJ0biB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDRweDtcclxuICAgIG1hcmdpbi10b3A6IDRweDtcclxuICAgIHBhZGRpbmc6IDRweCAxMHB4O1xyXG4gICAgYmFja2dyb3VuZDogI2YwZmRmNDtcclxuICAgIGNvbG9yOiAjMTU4MDNkO1xyXG4gICAgYm9yZGVyOiAxLjVweCBzb2xpZCAjYmJmN2QwO1xyXG4gICAgYm9yZGVyLXJhZGl1czogNnB4O1xyXG4gICAgZm9udC1zaXplOiAxMXB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cztcclxuICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gIH1cclxuICAubHAtYWktY2xlYW4tYnRuOmhvdmVyIHsgYmFja2dyb3VuZDogI2RjZmNlNzsgfVxyXG4gIC5scC1haS1jbGVhbi1idG46ZGlzYWJsZWQgeyBvcGFjaXR5OiAuNjsgY3Vyc29yOiBub3QtYWxsb3dlZDsgfVxyXG5cclxuICAvKiBBSSBTbWFydCBGaWxsIGJhciAqL1xyXG4gIC5scC1haS1iYXIge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDhweDtcclxuICAgIHBhZGRpbmc6IDlweCAxNHB4O1xyXG4gICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDEzNWRlZywgI2Y1ZjNmZiAwJSwgI2VmZjZmZiAxMDAlKTtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2RkZDZmZTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDEwcHg7XHJcbiAgICBtYXJnaW4tYm90dG9tOiAxNHB4O1xyXG4gIH1cclxuICAubHAtYWktYmFyLWxhYmVsIHtcclxuICAgIGZsZXg6IDE7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY29sb3I6ICM1YjIxYjY7XHJcbiAgfVxyXG4gIC5scC1haS1iYXItbGFiZWwgc3BhbiB7IGZvbnQtd2VpZ2h0OiA0MDA7IGNvbG9yOiAjN2MzYWVkOyB9XHJcbiAgLmxwLXNtYXJ0LWZpbGwtYnRuIHtcclxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogNXB4O1xyXG4gICAgcGFkZGluZzogNnB4IDEzcHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjN2MzYWVkO1xyXG4gICAgY29sb3I6ICNmZmY7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBib3JkZXItcmFkaXVzOiA3cHg7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAuMTVzO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xyXG4gIH1cclxuICAubHAtc21hcnQtZmlsbC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjNmQyOGQ5OyB9XHJcbiAgLmxwLXNtYXJ0LWZpbGwtYnRuOmRpc2FibGVkIHsgYmFja2dyb3VuZDogI2E3OGJmYTsgY3Vyc29yOiBub3QtYWxsb3dlZDsgfVxyXG5cclxuICAvKiBcdTI1MDBcdTI1MDAgUGVyLXBvc3QgaW5saW5lIGltcG9ydCBidXR0b24gXHUyNTAwXHUyNTAwICovXHJcbiAgLmxwLXBvc3QtYnRuLXdyYXAge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBwYWRkaW5nOiA2cHggMCAycHggMDtcclxuICB9XHJcbiAgLmxwLXBvc3QtYnRuIHtcclxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogNXB4O1xyXG4gICAgcGFkZGluZzogNXB4IDEycHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZWZmNmZmO1xyXG4gICAgY29sb3I6ICMxZDRlZDg7XHJcbiAgICBib3JkZXI6IDEuNXB4IHNvbGlkICNiZmRiZmU7XHJcbiAgICBib3JkZXItcmFkaXVzOiAyMHB4O1xyXG4gICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIHNhbnMtc2VyaWY7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xNXMsIGJvcmRlci1jb2xvciAuMTVzLCBib3gtc2hhZG93IC4xNXM7XHJcbiAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xyXG4gICAgbGluZS1oZWlnaHQ6IDE7XHJcbiAgfVxyXG4gIC5scC1wb3N0LWJ0bjpob3ZlciB7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZGJlYWZlO1xyXG4gICAgYm9yZGVyLWNvbG9yOiAjOTNjNWZkO1xyXG4gICAgYm94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMjksNzgsMjE2LC4xNSk7XHJcbiAgfVxyXG4gIC5scC1wb3N0LWJ0bjphY3RpdmUgeyB0cmFuc2Zvcm06IHNjYWxlKDAuOTcpOyB9XHJcbiAgLmxwLXBvc3QtYnRuLmltcG9ydGluZyB7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZjNmNGY2O1xyXG4gICAgY29sb3I6ICM2YjcyODA7XHJcbiAgICBib3JkZXItY29sb3I6ICNlNWU3ZWI7XHJcbiAgICBjdXJzb3I6IG5vdC1hbGxvd2VkO1xyXG4gIH1cclxuICAubHAtcG9zdC1idG4uZG9uZSB7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZDFmYWU1O1xyXG4gICAgY29sb3I6ICMwNjVmNDY7XHJcbiAgICBib3JkZXItY29sb3I6ICM2ZWU3Yjc7XHJcbiAgICBjdXJzb3I6IGRlZmF1bHQ7XHJcbiAgfVxyXG5cclxuICAvKiBDb250YWN0IGluZm8gcGlsbCAqL1xyXG4gIC5scC1jb250YWN0LWluZm8ge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDEwcHg7XHJcbiAgICBwYWRkaW5nOiA4cHggMTJweDtcclxuICAgIGJhY2tncm91bmQ6ICNmOGZhZmM7XHJcbiAgICBib3JkZXI6IDEuNXB4IHNvbGlkICNlMmU4ZjA7XHJcbiAgICBib3JkZXItcmFkaXVzOiA4cHg7XHJcbiAgICBtYXJnaW4tYm90dG9tOiAxM3B4O1xyXG4gICAgZmxleC13cmFwOiB3cmFwO1xyXG4gIH1cclxuICAubHAtY29udGFjdC1sYWJlbCB7XHJcbiAgICBmb250LXNpemU6IDEwcHg7XHJcbiAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgY29sb3I6ICM2NDc0OGI7XHJcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgbGV0dGVyLXNwYWNpbmc6IC41cHg7XHJcbiAgICBmbGV4LXNocmluazogMDtcclxuICB9XHJcbiAgLmxwLWNvbnRhY3QtY2hpcCB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDRweDtcclxuICAgIHBhZGRpbmc6IDNweCA4cHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gICAgYm9yZGVyOiAxcHggc29saWQgI2NiZDVlMTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDIwcHg7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBjb2xvcjogIzMzNDE1NTtcclxuICAgIGZvbnQtd2VpZ2h0OiA1MDA7XHJcbiAgICB1c2VyLXNlbGVjdDogdGV4dDtcclxuICB9XHJcblxyXG4gIC8qIE1vZGFsIGZvb3RlciAqL1xyXG4gIC5scC1tb2RhbC1mb290ZXIgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEwcHg7IGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7IHBhZGRpbmc6IDE0cHggMjJweDsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU3ZWI7IH1cclxuICAubHAtY2FuY2VsLWJ0biB7XHJcbiAgICBwYWRkaW5nOiA5cHggMThweDtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2QxZDVkYjtcclxuICAgIGJhY2tncm91bmQ6ICNmZmY7XHJcbiAgICBjb2xvcjogIzM3NDE1MTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xNXM7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWNhbmNlbC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZjlmYWZiOyB9XHJcbiAgLmxwLXNraXAtYnRuIHtcclxuICAgIHBhZGRpbmc6IDlweCAxOHB4O1xyXG4gICAgYm9yZGVyOiAxLjVweCBzb2xpZCAjZDFkNWRiO1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGNvbG9yOiAjNmI3MjgwO1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxNHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cztcclxuICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gIH1cclxuICAubHAtc2tpcC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZjlmYWZiOyBjb2xvcjogIzM3NDE1MTsgfVxyXG4gIC5scC1zdWJtaXQtYnRuIHtcclxuICAgIHBhZGRpbmc6IDlweCAyMHB4O1xyXG4gICAgYmFja2dyb3VuZDogIzFhNTZkYjtcclxuICAgIGNvbG9yOiAjZmZmO1xyXG4gICAgYm9yZGVyOiBub25lO1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxNHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cztcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA2cHg7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLXN1Ym1pdC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjMWU0MjlmOyB9XHJcbiAgLmxwLXN1Ym1pdC1idG46ZGlzYWJsZWQgeyBiYWNrZ3JvdW5kOiAjOWNhM2FmOyBjdXJzb3I6IG5vdC1hbGxvd2VkOyB9XHJcblxyXG4gIC8qIFN0YXR1cyAqL1xyXG4gIC5scC1zdGF0dXMgeyBtYXJnaW46IDAgMjJweCAxNHB4OyBwYWRkaW5nOiAxMHB4IDE0cHg7IGJvcmRlci1yYWRpdXM6IDhweDsgZm9udC1zaXplOiAxM3B4OyBmb250LXdlaWdodDogNTAwOyBkaXNwbGF5OiBub25lOyBsaW5lLWhlaWdodDogMS41OyB9XHJcbiAgLmxwLXN0YXR1cy5zdWNjZXNzIHsgZGlzcGxheTogYmxvY2s7IGJhY2tncm91bmQ6ICNkMWZhZTU7IGNvbG9yOiAjMDY1ZjQ2OyB9XHJcbiAgLmxwLXN0YXR1cy5lcnJvciAgIHsgZGlzcGxheTogYmxvY2s7IGJhY2tncm91bmQ6ICNmZWUyZTI7IGNvbG9yOiAjOTkxYjFiOyB9XHJcbiAgLmxwLXN0YXR1cy5sb2FkaW5nIHsgZGlzcGxheTogYmxvY2s7IGJhY2tncm91bmQ6ICNlZmY2ZmY7IGNvbG9yOiAjMWU0MGFmOyB9XHJcbiAgLmxwLXN0YXR1cyBhIHsgY29sb3I6IGluaGVyaXQ7IGZvbnQtd2VpZ2h0OiA3MDA7IH1cclxuICAubHAtc3RhdHVzIGE6aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgfVxyXG5gO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEZsb2F0aW5nIHNjYW4gYnV0dG9ucyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbi8qKlxyXG4gKiBJbmplY3RzIHR3byBmaXhlZCBidXR0b25zOlxyXG4gKiAgLSBcIlNjYW4gSm9icyBvbiBUaGlzIFBhZ2VcIiBcdTIwMTQgaW1tZWRpYXRlIHNjYW5cclxuICogIC0gXCJTY3JvbGwgJiBTY2FuXCIgXHUyMDE0IGF1dG8tc2Nyb2xscyB0aGVuIHNjYW5zXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0RmxvYXRpbmdTY2FuQnV0dG9uKFxyXG4gIG9uU2NhbjogICAgICAgKHNldFNjYW5uaW5nU3RhdGU6IChzOiBib29sZWFuKSA9PiB2b2lkKSA9PiB2b2lkLFxyXG4gIG9uU2Nyb2xsU2NhbjogKHNldFNjYW5uaW5nU3RhdGU6IChzOiBib29sZWFuKSA9PiB2b2lkKSA9PiB2b2lkXHJcbik6IHZvaWQge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFNDQU5fQlROX0lEKT8ucmVtb3ZlKCk7XHJcblxyXG4gIGNvbnN0IGhvc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGhvc3QuaWQgPSBTQ0FOX0JUTl9JRDtcclxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGhvc3QpO1xyXG5cclxuICBjb25zdCBzaGFkb3cgPSBob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xyXG4gIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xyXG4gIHN0eWxlLnRleHRDb250ZW50ID0gQkFTRV9TVFlMRVM7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKHN0eWxlKTtcclxuXHJcbiAgY29uc3Qgd3JhcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgd3JhcC5jbGFzc05hbWUgPSBcImxwLWZhYi13cmFwXCI7XHJcblxyXG4gIGNvbnN0IG1ha2VCdG4gPSAobGFiZWw6IHN0cmluZywgc2Vjb25kYXJ5OiBib29sZWFuKTogSFRNTEJ1dHRvbkVsZW1lbnQgPT4ge1xyXG4gICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGJ0bi5jbGFzc05hbWUgPSBzZWNvbmRhcnkgPyBcImxwLWZhYiBzZWNvbmRhcnlcIiA6IFwibHAtZmFiXCI7XHJcbiAgICBidG4uaW5uZXJIVE1MID0gc2Vjb25kYXJ5XHJcbiAgICAgID8gYDxzdmcgd2lkdGg9XCIxM1wiIGhlaWdodD1cIjEzXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xOSAxM2wtNyA3LTctN20xNC04bC03IDctNy03XCIvPjwvc3ZnPiAke2xhYmVsfWBcclxuICAgICAgOiBgPHN2ZyB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTRcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyLjVcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTIxIDIxbC00LjM1LTQuMzVNMTcgMTFBNiA2IDAgMTE1IDExYTYgNiAwIDAxMTIgMHpcIi8+PC9zdmc+ICR7bGFiZWx9YDtcclxuICAgIHJldHVybiBidG47XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc2NhbkJ0biAgICAgICA9IG1ha2VCdG4oXCJTY2FuIEpvYnMgb24gVGhpcyBQYWdlXCIsIGZhbHNlKTtcclxuICBjb25zdCBzY3JvbGxTY2FuQnRuID0gbWFrZUJ0bihcIlNjcm9sbCAmIFNjYW5cIiwgdHJ1ZSk7XHJcblxyXG4gIGNvbnN0IGJ1aWxkU2V0dGVyID0gKGJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQsIGlzU2Nyb2xsU2NhbjogYm9vbGVhbikgPT4gKHNjYW5uaW5nOiBib29sZWFuKSA9PiB7XHJcbiAgICBzY2FuQnRuLmRpc2FibGVkID0gc2Nhbm5pbmc7XHJcbiAgICBzY3JvbGxTY2FuQnRuLmRpc2FibGVkID0gc2Nhbm5pbmc7XHJcbiAgICBidG4uaW5uZXJIVE1MID0gc2Nhbm5pbmdcclxuICAgICAgPyBgPHN2ZyB3aWR0aD1cIjEzXCIgaGVpZ2h0PVwiMTNcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk00IDR2NWg1TTIwIDIwdi01aC01TTQgOWE5IDkgMCAwMTE0LjQtNS40TTIwIDE1YTkgOSAwIDAxLTE0LjQgNS40XCIvPjwvc3ZnPiAke2lzU2Nyb2xsU2NhbiA/IFwiU2Nyb2xsaW5nXHUyMDI2XCIgOiBcIlNjYW5uaW5nXHUyMDI2XCJ9YFxyXG4gICAgICA6IGlzU2Nyb2xsU2NhblxyXG4gICAgICAgID8gYDxzdmcgd2lkdGg9XCIxM1wiIGhlaWdodD1cIjEzXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xOSAxM2wtNyA3LTctN20xNC04bC03IDctNy03XCIvPjwvc3ZnPiBTY3JvbGwgJiBTY2FuYFxyXG4gICAgICAgIDogYDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0yMSAyMWwtNC4zNS00LjM1TTE3IDExQTYgNiAwIDExNSAxMWE2IDYgMCAwMTEyIDB6XCIvPjwvc3ZnPiBTY2FuIEpvYnMgb24gVGhpcyBQYWdlYDtcclxuICB9O1xyXG5cclxuICBzY2FuQnRuLmFkZEV2ZW50TGlzdGVuZXIoICAgICAgXCJjbGlja1wiLCAoKSA9PiBvblNjYW4oYnVpbGRTZXR0ZXIoc2NhbkJ0biwgZmFsc2UpKSk7XHJcbiAgc2Nyb2xsU2NhbkJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gb25TY3JvbGxTY2FuKGJ1aWxkU2V0dGVyKHNjcm9sbFNjYW5CdG4sIHRydWUpKSk7XHJcblxyXG4gIHdyYXAuYXBwZW5kQ2hpbGQoc2NhbkJ0bik7XHJcbiAgd3JhcC5hcHBlbmRDaGlsZChzY3JvbGxTY2FuQnRuKTtcclxuICBzaGFkb3cuYXBwZW5kQ2hpbGQod3JhcCk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBQZXItcG9zdCBpbmxpbmUgaW1wb3J0IGJ1dHRvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IFBFUl9QT1NUX0FUVFIgPSBcImRhdGEtbHAtaW5qZWN0ZWRcIjtcclxuY29uc3QgUEVSX1BPU1RfU1RZTEVTID0gYFxyXG4gIDpob3N0IHsgZGlzcGxheTogYmxvY2s7IH1cclxuICAubHAtcG9zdC1idG4td3JhcCB7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIHBhZGRpbmc6IDZweCAwIDJweCAwO1xyXG4gIH1cclxuICAubHAtcG9zdC1idG4ge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA1cHg7XHJcbiAgICBwYWRkaW5nOiA1cHggMTJweDtcclxuICAgIGJhY2tncm91bmQ6ICNlZmY2ZmY7XHJcbiAgICBjb2xvcjogIzFkNGVkODtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2JmZGJmZTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDIwcHg7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgc2Fucy1zZXJpZjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cywgYm9yZGVyLWNvbG9yIC4xNXMsIGJveC1zaGFkb3cgLjE1cztcclxuICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XHJcbiAgICBsaW5lLWhlaWdodDogMTtcclxuICB9XHJcbiAgLmxwLXBvc3QtYnRuOmhvdmVyIHtcclxuICAgIGJhY2tncm91bmQ6ICNkYmVhZmU7XHJcbiAgICBib3JkZXItY29sb3I6ICM5M2M1ZmQ7XHJcbiAgICBib3gtc2hhZG93OiAwIDJweCA4cHggcmdiYSgyOSw3OCwyMTYsLjE1KTtcclxuICB9XHJcbiAgLmxwLXBvc3QtYnRuOmFjdGl2ZSB7IHRyYW5zZm9ybTogc2NhbGUoMC45Nyk7IH1cclxuICAubHAtcG9zdC1idG4uaW1wb3J0aW5nIHsgYmFja2dyb3VuZDogI2YzZjRmNjsgY29sb3I6ICM2YjcyODA7IGJvcmRlci1jb2xvcjogI2U1ZTdlYjsgY3Vyc29yOiBub3QtYWxsb3dlZDsgfVxyXG4gIC5scC1wb3N0LWJ0bi5kb25lIHsgYmFja2dyb3VuZDogI2QxZmFlNTsgY29sb3I6ICMwNjVmNDY7IGJvcmRlci1jb2xvcjogIzZlZTdiNzsgY3Vyc29yOiBkZWZhdWx0OyB9XHJcbmA7XHJcblxyXG5jb25zdCBJTVBPUlRfSUNPTiA9IGA8c3ZnIHdpZHRoPVwiMTFcIiBoZWlnaHQ9XCIxMVwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjIuNVwiPjxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNCAxNnYxYTMgMyAwIDAwMyAzaDEwYTMgMyAwIDAwMy0zdi0xbS00LThsLTQtNG0wIDBMOCA4bTQtNHYxMlwiLz48L3N2Zz5gO1xyXG5cclxuLyoqXHJcbiAqIEFwcGVuZHMgYSBzbWFsbCBcIkltcG9ydCB0byBMb2NhbFByb1wiIGJ1dHRvbiB0byBhIHNpbmdsZSBwb3N0IGNvbnRhaW5lci5cclxuICogVXNlcyBhbiBpc29sYXRlZCBTaGFkb3cgRE9NIHNvIHBhZ2Ugc3R5bGVzIG5ldmVyIGJsZWVkIGluLlxyXG4gKlxyXG4gKiBAcGFyYW0gY29udGFpbmVyICBUaGUgcG9zdCBlbGVtZW50IHRvIGF0dGFjaCB0aGUgYnV0dG9uIHRvLlxyXG4gKiBAcGFyYW0gaXNEdXAgICAgICBXaGV0aGVyIHRoaXMgcG9zdCBoYXMgYWxyZWFkeSBiZWVuIGltcG9ydGVkIChzaG93cyBtdXRlZCBzdGF0ZSkuXHJcbiAqIEBwYXJhbSBvbkNsaWNrICAgIEFzeW5jIGNhbGxiYWNrIGludm9rZWQgd2hlbiB0aGUgdXNlciBjbGlja3MgSW1wb3J0LlxyXG4gKiAgICAgICAgICAgICAgICAgICBSZWNlaXZlcyBhIHNldHRlciB0byB1cGRhdGUgdGhlIGJ1dHRvbiBzdGF0ZSB0byBcImRvbmVcIiBvbiBzdWNjZXNzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGluamVjdFBlclBvc3RJbXBvcnRCdXR0b24oXHJcbiAgY29udGFpbmVyOiBFbGVtZW50LFxyXG4gIGlzRHVwOiBib29sZWFuLFxyXG4gIG9uQ2xpY2s6IChtYXJrRG9uZTogKCkgPT4gdm9pZCkgPT4gdm9pZFxyXG4pOiB2b2lkIHtcclxuICBpZiAoY29udGFpbmVyLmhhc0F0dHJpYnV0ZShQRVJfUE9TVF9BVFRSKSkgcmV0dXJuO1xyXG4gIGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoUEVSX1BPU1RfQVRUUiwgXCIxXCIpO1xyXG5cclxuICBjb25zdCBob3N0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBjb25zdCBzaGFkb3cgPSBob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xyXG5cclxuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcclxuICBzdHlsZS50ZXh0Q29udGVudCA9IFBFUl9QT1NUX1NUWUxFUztcclxuXHJcbiAgY29uc3Qgd3JhcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgd3JhcC5jbGFzc05hbWUgPSBcImxwLXBvc3QtYnRuLXdyYXBcIjtcclxuXHJcbiAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBidG4uY2xhc3NOYW1lID0gXCJscC1wb3N0LWJ0blwiICsgKGlzRHVwID8gXCIgZG9uZVwiIDogXCJcIik7XHJcbiAgYnRuLmlubmVySFRNTCA9IGlzRHVwXHJcbiAgICA/IGAke0lNUE9SVF9JQ09OfSBBbHJlYWR5IGltcG9ydGVkYFxyXG4gICAgOiBgJHtJTVBPUlRfSUNPTn0gSW1wb3J0IHRvIExvY2FsUHJvYDtcclxuXHJcbiAgY29uc3QgbWFya0RvbmUgPSAoKSA9PiB7XHJcbiAgICBidG4uY2xhc3NOYW1lID0gXCJscC1wb3N0LWJ0biBkb25lXCI7XHJcbiAgICBidG4uaW5uZXJIVE1MID0gYCR7SU1QT1JUX0lDT059IEltcG9ydGVkIWA7XHJcbiAgfTtcclxuXHJcbiAgaWYgKCFpc0R1cCkge1xyXG4gICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xyXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgIGlmIChidG4uY2xhc3NMaXN0LmNvbnRhaW5zKFwiaW1wb3J0aW5nXCIpIHx8IGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoXCJkb25lXCIpKSByZXR1cm47XHJcbiAgICAgIGJ0bi5jbGFzc05hbWUgPSBcImxwLXBvc3QtYnRuIGltcG9ydGluZ1wiO1xyXG4gICAgICBidG4uaW5uZXJIVE1MID0gYCR7SU1QT1JUX0lDT059IE9wZW5pbmdcdTIwMjZgO1xyXG4gICAgICBvbkNsaWNrKG1hcmtEb25lKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgd3JhcC5hcHBlbmRDaGlsZChidG4pO1xyXG4gIHNoYWRvdy5hcHBlbmRDaGlsZChzdHlsZSk7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKHdyYXApO1xyXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChob3N0KTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEpvYiBzZWxlY3Rpb24gcGFuZWwgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2hvd0pvYlNlbGVjdGlvblBhbmVsKFxyXG4gIGpvYnM6IEpvYlBvc3RbXSxcclxuICBpbXBvcnRlZFVybHM6IFNldDxzdHJpbmc+LFxyXG4gIG9uSW1wb3J0OiAoc2VsZWN0ZWQ6IEpvYlBvc3RbXSwgYnVsa0RlZmF1bHRzOiBCdWxrRGVmYXVsdHMpID0+IHZvaWRcclxuKTogdm9pZCB7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoUEFORUxfSE9TVF9JRCk/LnJlbW92ZSgpO1xyXG5cclxuICBjb25zdCBob3N0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBob3N0LmlkID0gUEFORUxfSE9TVF9JRDtcclxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGhvc3QpO1xyXG5cclxuICBjb25zdCBzaGFkb3cgPSBob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xyXG4gIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xyXG4gIHN0eWxlLnRleHRDb250ZW50ID0gQkFTRV9TVFlMRVM7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKHN0eWxlKTtcclxuXHJcbiAgY29uc3Qgc2VsZWN0ZWQgPSBuZXcgU2V0PG51bWJlcj4oam9icy5tYXAoKF8sIGkpID0+IGkpKTtcclxuICBsZXQgYnVsa0RlZmF1bHRzOiBCdWxrRGVmYXVsdHMgPSB7fTtcclxuICBsZXQgZmlsdGVyVGV4dCA9IFwiXCI7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBPdmVybGF5ICsgcGFuZWwgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgb3ZlcmxheS5jbGFzc05hbWUgPSBcImxwLXBhbmVsLW92ZXJsYXlcIjtcclxuICBjb25zdCBwYW5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgcGFuZWwuY2xhc3NOYW1lID0gXCJscC1wYW5lbFwiO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgSGVhZGVyIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgaGVhZGVyLmNsYXNzTmFtZSA9IFwibHAtcGFuZWwtaGVhZGVyXCI7XHJcbiAgY29uc3QgdGl0bGVXcmFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICB0aXRsZVdyYXAuY2xhc3NOYW1lID0gXCJscC1wYW5lbC10aXRsZVwiO1xyXG4gIHRpdGxlV3JhcC5pbm5lckhUTUwgPSBgXHJcbiAgICA8c3ZnIHdpZHRoPVwiMTdcIiBoZWlnaHQ9XCIxN1wiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIj5cclxuICAgICAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk05IDVIN2EyIDIgMCAwMC0yIDJ2MTJhMiAyIDAgMDAyIDJoMTBhMiAyIDAgMDAyLTJWN2EyIDIgMCAwMC0yLTJoLTJNOSA1YTIgMiAwIDAwMiAyaDJhMiAyIDAgMDAyLTJNOSA1YTIgMiAwIDAxMi0yaDJhMiAyIDAgMDEyIDJcIi8+XHJcbiAgICA8L3N2Zz5cclxuICAgIEpvYnMgRm91bmQgPHNwYW4gY2xhc3M9XCJscC1wYW5lbC1jb3VudFwiPiR7am9icy5sZW5ndGh9PC9zcGFuPlxyXG4gIGA7XHJcbiAgY29uc3QgY2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIGNsb3NlQnRuLmNsYXNzTmFtZSA9IFwibHAtY2xvc2UtYnRuXCI7XHJcbiAgY2xvc2VCdG4uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIyMFwiIGhlaWdodD1cIjIwXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiPjxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNiAxOEwxOCA2TTYgNmwxMiAxMlwiLz48L3N2Zz5gO1xyXG4gIGNsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBob3N0LnJlbW92ZSgpKTtcclxuICBoZWFkZXIuYXBwZW5kQ2hpbGQodGl0bGVXcmFwKTtcclxuICBoZWFkZXIuYXBwZW5kQ2hpbGQoY2xvc2VCdG4pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgU2VhcmNoIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IHNlYXJjaFdyYXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIHNlYXJjaFdyYXAuY2xhc3NOYW1lID0gXCJscC1zZWFyY2gtd3JhcFwiO1xyXG4gIGNvbnN0IHNlYXJjaElucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4gIHNlYXJjaElucHV0LnR5cGUgPSBcInRleHRcIjtcclxuICBzZWFyY2hJbnB1dC5jbGFzc05hbWUgPSBcImxwLXNlYXJjaC1pbnB1dFwiO1xyXG4gIHNlYXJjaElucHV0LnBsYWNlaG9sZGVyID0gXCJGaWx0ZXIgcG9zdHNcdTIwMjZcIjtcclxuICBzZWFyY2hJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4ge1xyXG4gICAgZmlsdGVyVGV4dCA9IHNlYXJjaElucHV0LnZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBsZXQgdmlzaWJsZUNvdW50ID0gMDtcclxuICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuICAgICAgY29uc3Qgam9iID0gam9ic1tpXTtcclxuICAgICAgY29uc3QgbWF0Y2hlcyA9ICFmaWx0ZXJUZXh0XHJcbiAgICAgICAgfHwgam9iLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyVGV4dClcclxuICAgICAgICB8fCBqb2IuZGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhmaWx0ZXJUZXh0KVxyXG4gICAgICAgIHx8IChqb2IucG9zdGVkX2J5ID8/IFwiXCIpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyVGV4dCk7XHJcbiAgICAgIGl0ZW0uY2xhc3NMaXN0LnRvZ2dsZShcImhpZGRlblwiLCAhbWF0Y2hlcyk7XHJcbiAgICAgIGlmIChtYXRjaGVzKSB2aXNpYmxlQ291bnQrKztcclxuICAgIH0pO1xyXG4gICAgbm9SZXN1bHRzLmNsYXNzTGlzdC50b2dnbGUoXCJ2aXNpYmxlXCIsIHZpc2libGVDb3VudCA9PT0gMCk7XHJcbiAgICB1cGRhdGVDb3VudCgpO1xyXG4gIH0pO1xyXG4gIHNlYXJjaFdyYXAuYXBwZW5kQ2hpbGQoc2VhcmNoSW5wdXQpO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQnVsayBwcmUtZmlsbCBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBidWxrU2VjdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgYnVsa1NlY3Rpb24uY2xhc3NOYW1lID0gXCJscC1idWxrLXNlY3Rpb25cIjtcclxuICBjb25zdCBidWxrVG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBidWxrVG9nZ2xlLnR5cGUgPSBcImJ1dHRvblwiO1xyXG4gIGJ1bGtUb2dnbGUuY2xhc3NOYW1lID0gXCJscC1idWxrLXRvZ2dsZVwiO1xyXG4gIGJ1bGtUb2dnbGUuaW5uZXJIVE1MID0gYFxyXG4gICAgQXBwbHkgRGVmYXVsdHMgdG8gQWxsXHJcbiAgICA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxNFwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjIuNVwiPlxyXG4gICAgICA8cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTE5IDlsLTcgNy03LTdcIi8+XHJcbiAgICA8L3N2Zz5cclxuICBgO1xyXG4gIGNvbnN0IGJ1bGtCb2R5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBidWxrQm9keS5jbGFzc05hbWUgPSBcImxwLWJ1bGstYm9keVwiO1xyXG5cclxuICBjb25zdCB0b21vcnJvd1N0ciA9IG5ldyBEYXRlKERhdGUubm93KCkgKyA4Nl80MDBfMDAwKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTtcclxuICBjb25zdCB0b2RheVN0ciAgICA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcbiAgYnVsa0JvZHkuaW5uZXJIVE1MID0gYFxyXG4gICAgPGRpdiBjbGFzcz1cImxwLWJ1bGstZ3JpZFwiPlxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWJ1bGstbGFiZWxcIj5Mb2NhdGlvbjwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtYnVsay1pbnB1dFwiIGlkPVwibHAtYnVsay1sb2NhdGlvblwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJlLmcuIE1ha2F0aSBDaXR5XCIgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibHAtYnVsay1sYWJlbFwiPkJ1ZGdldCAoUEhQKTwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtYnVsay1pbnB1dFwiIGlkPVwibHAtYnVsay1idWRnZXRcIiB0eXBlPVwibnVtYmVyXCIgbWluPVwiMVwiIHBsYWNlaG9sZGVyPVwiZS5nLiAxNTAwXCIgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibHAtYnVsay1sYWJlbFwiPlNjaGVkdWxlIERhdGU8L2xhYmVsPlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWJ1bGstaW5wdXRcIiBpZD1cImxwLWJ1bGstZGF0ZVwiIHR5cGU9XCJkYXRlXCIgdmFsdWU9XCIke3RvbW9ycm93U3RyfVwiIG1pbj1cIiR7dG9kYXlTdHJ9XCIgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXY+XHJcbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibHAtYnVsay1sYWJlbFwiPlVyZ2VuY3k8L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XCJscC1idWxrLXNlbGVjdFwiIGlkPVwibHAtYnVsay11cmdlbmN5XCI+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwic3RhbmRhcmRcIj5TdGFuZGFyZDwvb3B0aW9uPlxyXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInNhbWVfZGF5XCI+U2FtZSBEYXk8L29wdGlvbj5cclxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJydXNoXCI+UnVzaDwvb3B0aW9uPlxyXG4gICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgPGJ1dHRvbiBjbGFzcz1cImxwLWJ1bGstYXBwbHlcIiBpZD1cImxwLWJ1bGstYXBwbHlcIj5BcHBseSB0byBBbGwgU2VsZWN0ZWQ8L2J1dHRvbj5cclxuICBgO1xyXG5cclxuICBidWxrVG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICBjb25zdCBvcGVuID0gYnVsa0JvZHkuY2xhc3NMaXN0LnRvZ2dsZShcIm9wZW5cIik7XHJcbiAgICBidWxrVG9nZ2xlLmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIsIG9wZW4pO1xyXG4gIH0pO1xyXG5cclxuICAoYnVsa0JvZHkucXVlcnlTZWxlY3RvcihcIiNscC1idWxrLWFwcGx5XCIpIGFzIEhUTUxCdXR0b25FbGVtZW50KS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgY29uc3QgbG9jYXRpb25FbCA9IGJ1bGtCb2R5LnF1ZXJ5U2VsZWN0b3IoXCIjbHAtYnVsay1sb2NhdGlvblwiKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgYnVkZ2V0RWwgICA9IGJ1bGtCb2R5LnF1ZXJ5U2VsZWN0b3IoXCIjbHAtYnVsay1idWRnZXRcIikgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgZGF0ZUVsICAgICA9IGJ1bGtCb2R5LnF1ZXJ5U2VsZWN0b3IoXCIjbHAtYnVsay1kYXRlXCIpICAgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgdXJnZW5jeUVsICA9IGJ1bGtCb2R5LnF1ZXJ5U2VsZWN0b3IoXCIjbHAtYnVsay11cmdlbmN5XCIpICBhcyBIVE1MU2VsZWN0RWxlbWVudDtcclxuICAgIGJ1bGtEZWZhdWx0cyA9IHtcclxuICAgICAgbG9jYXRpb246ICAgICBsb2NhdGlvbkVsLnZhbHVlLnRyaW0oKSB8fCB1bmRlZmluZWQsXHJcbiAgICAgIGJ1ZGdldDogICAgICAgcGFyc2VGbG9hdChidWRnZXRFbC52YWx1ZSkgfHwgdW5kZWZpbmVkLFxyXG4gICAgICBzY2hlZHVsZURhdGU6IGRhdGVFbC52YWx1ZSB8fCB1bmRlZmluZWQsXHJcbiAgICAgIHVyZ2VuY3k6ICAgICAgKHVyZ2VuY3lFbC52YWx1ZSBhcyBCdWxrRGVmYXVsdHNbXCJ1cmdlbmN5XCJdKSB8fCB1bmRlZmluZWQsXHJcbiAgICB9O1xyXG4gICAgYnVsa0JvZHkuY2xhc3NMaXN0LnJlbW92ZShcIm9wZW5cIik7XHJcbiAgICBidWxrVG9nZ2xlLmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpO1xyXG4gICAgLy8gVmlzdWFsIGNvbmZpcm1hdGlvblxyXG4gICAgYnVsa1RvZ2dsZS50ZXh0Q29udGVudCA9IFwiXHUyNzEzIERlZmF1bHRzIHNldCBcdTIwMTQgQXBwbHkgRGVmYXVsdHMgdG8gQWxsXCI7XHJcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgYnVsa1RvZ2dsZS5pbm5lckhUTUwgPSBgQXBwbHkgRGVmYXVsdHMgdG8gQWxsIDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xOSA5bC03IDctNy03XCIvPjwvc3ZnPmA7XHJcbiAgICB9LCAyMDAwKTtcclxuICB9KTtcclxuXHJcbiAgYnVsa1NlY3Rpb24uYXBwZW5kQ2hpbGQoYnVsa1RvZ2dsZSk7XHJcbiAgYnVsa1NlY3Rpb24uYXBwZW5kQ2hpbGQoYnVsa0JvZHkpO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgVG9vbGJhciBcdTI1MDBcdTI1MDBcclxuICBjb25zdCB0b29sYmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICB0b29sYmFyLmNsYXNzTmFtZSA9IFwibHAtcGFuZWwtdG9vbGJhclwiO1xyXG5cclxuICBjb25zdCBzZWxlY3RBbGxMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiKTtcclxuICBzZWxlY3RBbGxMYWJlbC5jbGFzc05hbWUgPSBcImxwLXNlbGVjdC1hbGwtbGFiZWxcIjtcclxuICBjb25zdCBzZWxlY3RBbGxDYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICBzZWxlY3RBbGxDYi50eXBlID0gXCJjaGVja2JveFwiO1xyXG4gIHNlbGVjdEFsbENiLmNoZWNrZWQgPSB0cnVlO1xyXG4gIHNlbGVjdEFsbExhYmVsLmFwcGVuZENoaWxkKHNlbGVjdEFsbENiKTtcclxuICBzZWxlY3RBbGxMYWJlbC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlNlbGVjdCBBbGxcIikpO1xyXG5cclxuICBjb25zdCB0b29sYmFyUmlnaHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIHRvb2xiYXJSaWdodC5jbGFzc05hbWUgPSBcImxwLXRvb2xiYXItcmlnaHRcIjtcclxuXHJcbiAgY29uc3QgY291bnRMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gIGNvdW50TGFiZWwuY2xhc3NOYW1lID0gXCJscC1zZWxlY3RlZC1jb3VudFwiO1xyXG5cclxuICBjb25zdCBjc3ZCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIGNzdkJ0bi5jbGFzc05hbWUgPSBcImxwLWNzdi1idG5cIjtcclxuICBjc3ZCdG4uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIxMlwiIGhlaWdodD1cIjEyXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiPjxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNCAxNnYxYTMgMyAwIDAwMyAzaDEwYTMgMyAwIDAwMy0zdi0xbS00LTRsLTQgNG0wIDBsLTQtNG00IDRWNFwiLz48L3N2Zz4gQ1NWYDtcclxuICBjc3ZCdG4udGl0bGUgPSBcIkV4cG9ydCBhbGwgc2NyYXBlZCBwb3N0cyB0byBDU1ZcIjtcclxuICBjc3ZCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGV4cG9ydFRvQ1NWKGpvYnMpKTtcclxuXHJcbiAgdG9vbGJhclJpZ2h0LmFwcGVuZENoaWxkKGNvdW50TGFiZWwpO1xyXG4gIHRvb2xiYXJSaWdodC5hcHBlbmRDaGlsZChjc3ZCdG4pO1xyXG4gIHRvb2xiYXIuYXBwZW5kQ2hpbGQoc2VsZWN0QWxsTGFiZWwpO1xyXG4gIHRvb2xiYXIuYXBwZW5kQ2hpbGQodG9vbGJhclJpZ2h0KTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIExpc3QgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgbGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgbGlzdC5jbGFzc05hbWUgPSBcImxwLXBhbmVsLWxpc3RcIjtcclxuICBjb25zdCBub1Jlc3VsdHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIG5vUmVzdWx0cy5jbGFzc05hbWUgPSBcImxwLW5vLXJlc3VsdHNcIjtcclxuICBub1Jlc3VsdHMudGV4dENvbnRlbnQgPSBcIk5vIHBvc3RzIG1hdGNoIHlvdXIgZmlsdGVyLlwiO1xyXG5cclxuICBjb25zdCBjaGVja2JveGVzOiBIVE1MSW5wdXRFbGVtZW50W10gPSBbXTtcclxuICBjb25zdCBpdGVtczogSFRNTEVsZW1lbnRbXSA9IFtdO1xyXG5cclxuICBjb25zdCB1cGRhdGVDb3VudCA9ICgpID0+IHtcclxuICAgIGNvbnN0IHZpc2libGVTZWxlY3RlZCA9IGpvYnMuZmlsdGVyKChfLCBpKSA9PlxyXG4gICAgICBzZWxlY3RlZC5oYXMoaSkgJiYgIWl0ZW1zW2ldLmNsYXNzTGlzdC5jb250YWlucyhcImhpZGRlblwiKVxyXG4gICAgKS5sZW5ndGg7XHJcbiAgICBjb25zdCB2aXNpYmxlVG90YWwgPSBqb2JzLmZpbHRlcigoXywgaSkgPT4gIWl0ZW1zW2ldLmNsYXNzTGlzdC5jb250YWlucyhcImhpZGRlblwiKSkubGVuZ3RoO1xyXG4gICAgY291bnRMYWJlbC50ZXh0Q29udGVudCA9IGAke3NlbGVjdGVkLnNpemV9IG9mICR7am9icy5sZW5ndGh9IHNlbGVjdGVkYDtcclxuICAgIGltcG9ydEJ0bi5kaXNhYmxlZCA9IHNlbGVjdGVkLnNpemUgPT09IDA7XHJcbiAgICBpbXBvcnRCdG4udGV4dENvbnRlbnQgPSBzZWxlY3RlZC5zaXplID09PSAwXHJcbiAgICAgID8gXCJTZWxlY3QgcG9zdHMgdG8gaW1wb3J0XCJcclxuICAgICAgOiBgSW1wb3J0IFNlbGVjdGVkICgke3NlbGVjdGVkLnNpemV9KWA7XHJcbiAgICBzZWxlY3RBbGxDYi5jaGVja2VkID0gdmlzaWJsZVNlbGVjdGVkID4gMCAmJiB2aXNpYmxlU2VsZWN0ZWQgPT09IHZpc2libGVUb3RhbDtcclxuICAgIHNlbGVjdEFsbENiLmluZGV0ZXJtaW5hdGUgPSB2aXNpYmxlU2VsZWN0ZWQgPiAwICYmIHZpc2libGVTZWxlY3RlZCA8IHZpc2libGVUb3RhbDtcclxuICB9O1xyXG5cclxuICBqb2JzLmZvckVhY2goKGpvYiwgaSkgPT4ge1xyXG4gICAgY29uc3QgaXNEdXAgPSBpbXBvcnRlZFVybHMuaGFzKGpvYi5zb3VyY2VfdXJsKTtcclxuICAgIGNvbnN0IGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgaXRlbS5jbGFzc05hbWUgPSBcImxwLWpvYi1pdGVtIHNlbGVjdGVkXCI7XHJcbiAgICBpdGVtcy5wdXNoKGl0ZW0pO1xyXG5cclxuICAgIGNvbnN0IGNiID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4gICAgY2IudHlwZSA9IFwiY2hlY2tib3hcIjtcclxuICAgIGNiLmNsYXNzTmFtZSA9IFwibHAtam9iLWNoZWNrYm94XCI7XHJcbiAgICBjYi5jaGVja2VkID0gdHJ1ZTtcclxuICAgIGNoZWNrYm94ZXMucHVzaChjYik7XHJcblxyXG4gICAgY29uc3QgaW5mbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBpbmZvLmNsYXNzTmFtZSA9IFwibHAtam9iLWluZm9cIjtcclxuICAgIGNvbnN0IGRpc3BsYXlUaXRsZSA9IGpvYi50aXRsZSB8fCBqb2IuZGVzY3JpcHRpb24uc2xpY2UoMCwgNzApICsgXCJcdTIwMjZcIjtcclxuICAgIGluZm8uaW5uZXJIVE1MID0gYFxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtam9iLXRpdGxlXCI+JHtlc2NhcGVUZXh0KGRpc3BsYXlUaXRsZSl9PC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1qb2ItbWV0YVwiPlxyXG4gICAgICAgIDxzcGFuIGNsYXNzPVwibHAtc291cmNlLWNoaXAgJHtqb2Iuc291cmNlfVwiPiR7am9iLnNvdXJjZX08L3NwYW4+XHJcbiAgICAgICAgJHtpc0R1cCA/IGA8c3BhbiBjbGFzcz1cImxwLWR1cC1iYWRnZVwiPkFscmVhZHkgaW1wb3J0ZWQ8L3NwYW4+YCA6IFwiXCJ9XHJcbiAgICAgICAgJHtqb2IucG9zdGVkX2J5ID8gYDxzcGFuPiR7ZXNjYXBlVGV4dChqb2IucG9zdGVkX2J5KX08L3NwYW4+YCA6IFwiXCJ9XHJcbiAgICAgICAgJHtqb2IubG9jYXRpb24gID8gYDxzcGFuPlx1RDgzRFx1RENDRCAke2VzY2FwZVRleHQoam9iLmxvY2F0aW9uKX08L3NwYW4+YCA6IFwiXCJ9XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgYDtcclxuXHJcbiAgICBjb25zdCB0b2dnbGUgPSAoY2hlY2tlZDogYm9vbGVhbikgPT4ge1xyXG4gICAgICBjYi5jaGVja2VkID0gY2hlY2tlZDtcclxuICAgICAgaXRlbS5jbGFzc0xpc3QudG9nZ2xlKFwic2VsZWN0ZWRcIiwgY2hlY2tlZCk7XHJcbiAgICAgIGlmIChjaGVja2VkKSBzZWxlY3RlZC5hZGQoaSk7IGVsc2Ugc2VsZWN0ZWQuZGVsZXRlKGkpO1xyXG4gICAgICB1cGRhdGVDb3VudCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjYi5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHRvZ2dsZShjYi5jaGVja2VkKSk7XHJcbiAgICBpdGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4geyBpZiAoZS50YXJnZXQgIT09IGNiKSB0b2dnbGUoIWNiLmNoZWNrZWQpOyB9KTtcclxuICAgIGl0ZW0uYXBwZW5kQ2hpbGQoY2IpO1xyXG4gICAgaXRlbS5hcHBlbmRDaGlsZChpbmZvKTtcclxuICAgIGxpc3QuYXBwZW5kQ2hpbGQoaXRlbSk7XHJcbiAgfSk7XHJcblxyXG4gIGxpc3QuYXBwZW5kQ2hpbGQobm9SZXN1bHRzKTtcclxuXHJcbiAgc2VsZWN0QWxsQ2IuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICBjb25zdCBjaGVja2VkID0gc2VsZWN0QWxsQ2IuY2hlY2tlZDtcclxuICAgIGpvYnMuZm9yRWFjaCgoXywgaSkgPT4ge1xyXG4gICAgICBpZiAoaXRlbXNbaV0uY2xhc3NMaXN0LmNvbnRhaW5zKFwiaGlkZGVuXCIpKSByZXR1cm47XHJcbiAgICAgIGNoZWNrYm94ZXNbaV0uY2hlY2tlZCA9IGNoZWNrZWQ7XHJcbiAgICAgIGl0ZW1zW2ldLmNsYXNzTGlzdC50b2dnbGUoXCJzZWxlY3RlZFwiLCBjaGVja2VkKTtcclxuICAgICAgaWYgKGNoZWNrZWQpIHNlbGVjdGVkLmFkZChpKTsgZWxzZSBzZWxlY3RlZC5kZWxldGUoaSk7XHJcbiAgICB9KTtcclxuICAgIHNlbGVjdEFsbENiLmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcclxuICAgIHVwZGF0ZUNvdW50KCk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBGb290ZXIgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgZm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBmb290ZXIuY2xhc3NOYW1lID0gXCJscC1wYW5lbC1mb290ZXJcIjtcclxuICBjb25zdCBpbXBvcnRCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIGltcG9ydEJ0bi5jbGFzc05hbWUgPSBcImxwLWltcG9ydC1idG5cIjtcclxuXHJcbiAgaW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICBjb25zdCBzZWxlY3RlZEpvYnMgPSBqb2JzLmZpbHRlcigoXywgaSkgPT4gc2VsZWN0ZWQuaGFzKGkpKTtcclxuICAgIGhvc3QucmVtb3ZlKCk7XHJcbiAgICBvbkltcG9ydChzZWxlY3RlZEpvYnMsIGJ1bGtEZWZhdWx0cyk7XHJcbiAgfSk7XHJcblxyXG4gIGZvb3Rlci5hcHBlbmRDaGlsZChpbXBvcnRCdG4pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQXNzZW1ibGUgXHUyNTAwXHUyNTAwXHJcbiAgcGFuZWwuYXBwZW5kQ2hpbGQoaGVhZGVyKTtcclxuICBwYW5lbC5hcHBlbmRDaGlsZChzZWFyY2hXcmFwKTtcclxuICBwYW5lbC5hcHBlbmRDaGlsZChidWxrU2VjdGlvbik7XHJcbiAgcGFuZWwuYXBwZW5kQ2hpbGQodG9vbGJhcik7XHJcbiAgcGFuZWwuYXBwZW5kQ2hpbGQobGlzdCk7XHJcbiAgcGFuZWwuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcclxuICBvdmVybGF5LmFwcGVuZENoaWxkKHBhbmVsKTtcclxuICBzaGFkb3cuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XHJcblxyXG4gIG92ZXJsYXkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7IGlmIChlLnRhcmdldCA9PT0gb3ZlcmxheSkgaG9zdC5yZW1vdmUoKTsgfSk7XHJcblxyXG4gIHVwZGF0ZUNvdW50KCk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBDU1YgZXhwb3J0IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXhwb3J0VG9DU1Yoam9iczogSm9iUG9zdFtdKTogdm9pZCB7XHJcbiAgY29uc3QgaGVhZGVycyA9IFtcIlRpdGxlXCIsIFwiRGVzY3JpcHRpb25cIiwgXCJTb3VyY2VcIiwgXCJQb3N0ZWQgQnlcIiwgXCJMb2NhdGlvblwiLCBcIkJ1ZGdldFwiLCBcIlRpbWVzdGFtcFwiLCBcIlNvdXJjZSBVUkxcIl07XHJcbiAgY29uc3Qgcm93cyA9IGpvYnMubWFwKChqKSA9PiBbXHJcbiAgICBqLnRpdGxlLFxyXG4gICAgai5kZXNjcmlwdGlvbi5yZXBsYWNlKC9cXG4vZywgXCIgXCIpLFxyXG4gICAgai5zb3VyY2UsXHJcbiAgICBqLnBvc3RlZF9ieSxcclxuICAgIGoubG9jYXRpb24gPz8gXCJcIixcclxuICAgIGouYnVkZ2V0ICE9IG51bGwgPyBTdHJpbmcoai5idWRnZXQpIDogXCJcIixcclxuICAgIGoudGltZXN0YW1wLFxyXG4gICAgai5zb3VyY2VfdXJsLFxyXG4gIF0ubWFwKGNzdkNlbGwpLmpvaW4oXCIsXCIpKTtcclxuXHJcbiAgY29uc3QgY3N2ID0gW2hlYWRlcnMuam9pbihcIixcIiksIC4uLnJvd3NdLmpvaW4oXCJcXHJcXG5cIik7XHJcbiAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtjc3ZdLCB7IHR5cGU6IFwidGV4dC9jc3Y7Y2hhcnNldD11dGYtODtcIiB9KTtcclxuICBjb25zdCB1cmwgID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcclxuICBjb25zdCBhICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcbiAgYS5ocmVmID0gdXJsO1xyXG4gIGEuZG93bmxvYWQgPSBgbG9jYWxwcm8tam9icy0ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCl9LmNzdmA7XHJcbiAgYS5jbGljaygpO1xyXG4gIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3N2Q2VsbCh2YWw6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgZXNjYXBlZCA9IHZhbC5yZXBsYWNlKC9cIi9nLCAnXCJcIicpO1xyXG4gIHJldHVybiAvW1wiLFxcbl0vLnRlc3QoZXNjYXBlZCkgPyBgXCIke2VzY2FwZWR9XCJgIDogZXNjYXBlZDtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEpvYiByZXZpZXcgbW9kYWwgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5pbnRlcmZhY2UgQmF0Y2hDb250ZXh0IHtcclxuICBjdXJyZW50OiBudW1iZXI7XHJcbiAgdG90YWw6IG51bWJlcjtcclxuICBvbk5leHQ6ICgpID0+IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzaG93Sm9iTW9kYWwoXHJcbiAgaW5pdGlhbEpvYjogSm9iUG9zdCxcclxuICBjYXRlZ29yaWVzOiBDYXRlZ29yeVtdLFxyXG4gIGFpQ2F0ZWdvcnk/OiBzdHJpbmcsXHJcbiAgYmF0Y2g/OiBCYXRjaENvbnRleHQsXHJcbiAgYnVsa0RlZmF1bHRzPzogQnVsa0RlZmF1bHRzXHJcbik6IHZvaWQge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKE1PREFMX0hPU1RfSUQpPy5yZW1vdmUoKTtcclxuXHJcbiAgY29uc3QgaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgaG9zdC5pZCA9IE1PREFMX0hPU1RfSUQ7XHJcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChob3N0KTtcclxuXHJcbiAgY29uc3Qgc2hhZG93ID0gaG9zdC5hdHRhY2hTaGFkb3coeyBtb2RlOiBcIm9wZW5cIiB9KTtcclxuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcclxuICBzdHlsZS50ZXh0Q29udGVudCA9IEJBU0VfU1RZTEVTO1xyXG4gIHNoYWRvdy5hcHBlbmRDaGlsZChzdHlsZSk7XHJcblxyXG4gIGNvbnN0IG92ZXJsYXkgPSBidWlsZE1vZGFsT3ZlcmxheShpbml0aWFsSm9iLCBjYXRlZ29yaWVzLCBhaUNhdGVnb3J5ID8/IG51bGwsIGJhdGNoID8/IG51bGwsIGJ1bGtEZWZhdWx0cyA/PyB7fSwgc2hhZG93LCBob3N0KTtcclxuICBzaGFkb3cuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XHJcblxyXG4gIG92ZXJsYXkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XHJcbiAgICBpZiAoZS50YXJnZXQgPT09IG92ZXJsYXkpIHsgY2xvc2VNb2RhbChob3N0KTsgaWYgKGJhdGNoKSBiYXRjaC5vbk5leHQoKTsgfVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBlc2NIYW5kbGVyID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xyXG4gICAgICBjbG9zZU1vZGFsKGhvc3QpO1xyXG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlc2NIYW5kbGVyKTtcclxuICAgICAgaWYgKGJhdGNoKSBiYXRjaC5vbk5leHQoKTtcclxuICAgIH1cclxuICB9O1xyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGVzY0hhbmRsZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9zZU1vZGFsKGhvc3Q6IEhUTUxFbGVtZW50KTogdm9pZCB7IGhvc3QucmVtb3ZlKCk7IH1cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkTW9kYWxPdmVybGF5KFxyXG4gIGpvYjogSm9iUG9zdCxcclxuICBjYXRlZ29yaWVzOiBDYXRlZ29yeVtdLFxyXG4gIGFpQ2F0ZWdvcnk6IHN0cmluZyB8IG51bGwsXHJcbiAgYmF0Y2g6IEJhdGNoQ29udGV4dCB8IG51bGwsXHJcbiAgYnVsa0RlZmF1bHRzOiBCdWxrRGVmYXVsdHMsXHJcbiAgc2hhZG93OiBTaGFkb3dSb290LFxyXG4gIGhvc3Q6IEhUTUxFbGVtZW50XHJcbik6IEhUTUxFbGVtZW50IHtcclxuICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBvdmVybGF5LmNsYXNzTmFtZSA9IFwibHAtb3ZlcmxheVwiO1xyXG5cclxuICBjb25zdCBtb2RhbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgbW9kYWwuY2xhc3NOYW1lID0gXCJscC1tb2RhbFwiO1xyXG4gIG1vZGFsLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJkaWFsb2dcIik7XHJcbiAgbW9kYWwuc2V0QXR0cmlidXRlKFwiYXJpYS1tb2RhbFwiLCBcInRydWVcIik7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBIZWFkZXIgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBoZWFkZXIuY2xhc3NOYW1lID0gXCJscC1tb2RhbC1oZWFkZXJcIjtcclxuXHJcbiAgY29uc3QgdGl0bGVXcmFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICB0aXRsZVdyYXAuY2xhc3NOYW1lID0gXCJscC1tb2RhbC10aXRsZVwiO1xyXG4gIHRpdGxlV3JhcC5pbm5lckhUTUwgPSBgXHJcbiAgICA8c3ZnIHdpZHRoPVwiMThcIiBoZWlnaHQ9XCIxOFwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIj5cclxuICAgICAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0yMCA3bC04LTQtOCA0bTE2IDBsLTggNG04LTR2MTBsLTggNG0wLTEwTDQgN204IDR2MTBcIi8+XHJcbiAgICA8L3N2Zz5cclxuICAgIEltcG9ydCBKb2JcclxuICAgIDxzcGFuIGNsYXNzPVwibHAtc291cmNlLWNoaXAgJHtqb2Iuc291cmNlfVwiPiR7am9iLnNvdXJjZX08L3NwYW4+XHJcbiAgYDtcclxuXHJcbiAgY29uc3QgaGVhZGVyUmlnaHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGhlYWRlclJpZ2h0LmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtaGVhZGVyLXJpZ2h0XCI7XHJcbiAgaWYgKGJhdGNoKSB7XHJcbiAgICBjb25zdCBwcm9nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcbiAgICBwcm9nLmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtcHJvZ3Jlc3NcIjtcclxuICAgIHByb2cudGV4dENvbnRlbnQgPSBgJHtiYXRjaC5jdXJyZW50fSAvICR7YmF0Y2gudG90YWx9YDtcclxuICAgIGhlYWRlclJpZ2h0LmFwcGVuZENoaWxkKHByb2cpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgY2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIGNsb3NlQnRuLmNsYXNzTmFtZSA9IFwibHAtY2xvc2UtYnRuXCI7XHJcbiAgY2xvc2VCdG4uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIyMFwiIGhlaWdodD1cIjIwXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiPjxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNiAxOEwxOCA2TTYgNmwxMiAxMlwiLz48L3N2Zz5gO1xyXG4gIGNsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IGNsb3NlTW9kYWwoaG9zdCk7IGlmIChiYXRjaCkgYmF0Y2gub25OZXh0KCk7IH0pO1xyXG4gIGhlYWRlclJpZ2h0LmFwcGVuZENoaWxkKGNsb3NlQnRuKTtcclxuICBoZWFkZXIuYXBwZW5kQ2hpbGQodGl0bGVXcmFwKTtcclxuICBoZWFkZXIuYXBwZW5kQ2hpbGQoaGVhZGVyUmlnaHQpO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQm9keSBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBib2R5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBib2R5LmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtYm9keVwiO1xyXG5cclxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIik7XHJcbiAgZm9ybS5ub1ZhbGlkYXRlID0gdHJ1ZTtcclxuXHJcbiAgY29uc3QgZWZmZWN0aXZlQ2F0ZWdvcnkgPSBhaUNhdGVnb3J5ID8/IGpvYi5jYXRlZ29yeSA/PyBcIlwiO1xyXG4gIGNvbnN0IGZpbmRDYXRCeU5hbWUgPSAobmFtZTogc3RyaW5nKSA9PlxyXG4gICAgY2F0ZWdvcmllcy5maW5kKChjKSA9PiBjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZS50b0xvd2VyQ2FzZSgpKTtcclxuICBjb25zdCBtYXRjaGVkQ2F0ID0gZmluZENhdEJ5TmFtZShlZmZlY3RpdmVDYXRlZ29yeSk7XHJcblxyXG4gIGNvbnN0IGNhdE9wdGlvbnMgPSBjYXRlZ29yaWVzLmxlbmd0aFxyXG4gICAgPyBbYDxvcHRpb24gdmFsdWU9XCJcIj4tLSBTZWxlY3QgY2F0ZWdvcnkgLS08L29wdGlvbj5gLFxyXG4gICAgICAgIC4uLmNhdGVnb3JpZXMubWFwKChjKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBzZWwgPSBtYXRjaGVkQ2F0Py5faWQgPT09IGMuX2lkID8gXCJzZWxlY3RlZFwiIDogXCJcIjtcclxuICAgICAgICAgIHJldHVybiBgPG9wdGlvbiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihjLl9pZCl9XCIgZGF0YS1uYW1lPVwiJHtlc2NhcGVBdHRyKGMubmFtZSl9XCIgJHtzZWx9PiR7ZXNjYXBlVGV4dChjLmljb24gPz8gXCJcIil9ICR7ZXNjYXBlVGV4dChjLm5hbWUpfTwvb3B0aW9uPmA7XHJcbiAgICAgICAgfSldLmpvaW4oXCJcIilcclxuICAgIDogYDxvcHRpb24gdmFsdWU9XCJcIj5Mb2FkaW5nIGNhdGVnb3JpZXNcdTIwMjY8L29wdGlvbj5gO1xyXG5cclxuICBjb25zdCBjYXRIaW50ID0gYWlDYXRlZ29yeVxyXG4gICAgPyBgPGRpdiBjbGFzcz1cImxwLWhpbnQgYWlcIj5cdTI3MjYgQUk6IFwiJHtlc2NhcGVUZXh0KGFpQ2F0ZWdvcnkpfVwiPC9kaXY+YFxyXG4gICAgOiBlZmZlY3RpdmVDYXRlZ29yeSAmJiBtYXRjaGVkQ2F0XHJcbiAgICA/IGA8ZGl2IGNsYXNzPVwibHAtaGludFwiPkF1dG86IFwiJHtlc2NhcGVUZXh0KGVmZmVjdGl2ZUNhdGVnb3J5KX1cIjwvZGl2PmBcclxuICAgIDogXCJcIjtcclxuXHJcbiAgY29uc3QgdG9kYXlTdHIgICAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG4gIGNvbnN0IHRvbW9ycm93U3RyID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDg2XzQwMF8wMDApLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG5cclxuICAvLyBBcHBseSBidWxrIGRlZmF1bHRzIG92ZXIgZXh0cmFjdGVkIHZhbHVlc1xyXG4gIGNvbnN0IHByZUxvY2F0aW9uICAgICA9IGJ1bGtEZWZhdWx0cy5sb2NhdGlvbiAgICAgPz8gam9iLmxvY2F0aW9uID8/IFwiXCI7XHJcbiAgY29uc3QgcHJlQnVkZ2V0ICAgICAgID0gYnVsa0RlZmF1bHRzLmJ1ZGdldCAgICAgICAgPz8gam9iLmJ1ZGdldCAgID8/IFwiXCI7XHJcbiAgY29uc3QgcHJlU2NoZWR1bGUgICAgID0gYnVsa0RlZmF1bHRzLnNjaGVkdWxlRGF0ZSAgPz8gam9iLnNjaGVkdWxlRGF0ZSA/PyB0b21vcnJvd1N0cjtcclxuICBjb25zdCBwcmVVcmdlbmN5ICAgICAgPSBidWxrRGVmYXVsdHMudXJnZW5jeSAgICAgICA/PyBcInN0YW5kYXJkXCI7XHJcblxyXG4gIGZvcm0uaW5uZXJIVE1MID0gYFxyXG4gICAgPGRpdiBjbGFzcz1cImxwLWZpZWxkXCI+XHJcbiAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtdGl0bGVcIj5Kb2IgVGl0bGUgPHNwYW4gY2xhc3M9XCJscC1yZXF1aXJlZFwiPio8L3NwYW4+PC9sYWJlbD5cclxuICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLXRpdGxlXCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihqb2IudGl0bGUpfVwiIHJlcXVpcmVkIG1heGxlbmd0aD1cIjE1MFwiIC8+XHJcbiAgICA8L2Rpdj5cclxuICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLWRlc2NyaXB0aW9uXCI+RGVzY3JpcHRpb24gPHNwYW4gY2xhc3M9XCJscC1yZXF1aXJlZFwiPio8L3NwYW4+PC9sYWJlbD5cclxuICAgICAgPHRleHRhcmVhIGNsYXNzPVwibHAtdGV4dGFyZWFcIiBpZD1cImxwLWRlc2NyaXB0aW9uXCIgbWF4bGVuZ3RoPVwiMjAwMFwiIHJlcXVpcmVkPiR7ZXNjYXBlVGV4dChqb2IuZGVzY3JpcHRpb24pfTwvdGV4dGFyZWE+XHJcbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwibHAtYWktY2xlYW4tYnRuXCIgaWQ9XCJscC1jbGVhbi1idG5cIj5cdTI3MjYgQ2xlYW4gd2l0aCBBSTwvYnV0dG9uPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtaGludFwiIGlkPVwibHAtY2xlYW4taGludFwiPjwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtcm93XCI+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtY2F0ZWdvcnlcIj5DYXRlZ29yeSA8c3BhbiBjbGFzcz1cImxwLXJlcXVpcmVkXCI+Kjwvc3Bhbj48L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XCJscC1zZWxlY3RcIiBpZD1cImxwLWNhdGVnb3J5XCIgJHtjYXRlZ29yaWVzLmxlbmd0aCA9PT0gMCA/IFwiZGlzYWJsZWRcIiA6IFwiXCJ9PiR7Y2F0T3B0aW9uc308L3NlbGVjdD5cclxuICAgICAgICAke2NhdEhpbnR9XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLXBvc3RlclwiPlBvc3RlZCBCeTwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLXBvc3RlclwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2VzY2FwZUF0dHIoam9iLnBvc3RlZF9ieSl9XCIgbWF4bGVuZ3RoPVwiMTAwXCIgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICAgIDxkaXYgY2xhc3M9XCJscC1yb3dcIj5cclxuICAgICAgPGRpdiBjbGFzcz1cImxwLWZpZWxkXCI+XHJcbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibHAtbGFiZWxcIiBmb3I9XCJscC1sb2NhdGlvblwiPkxvY2F0aW9uIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLWxvY2F0aW9uXCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihwcmVMb2NhdGlvbil9XCIgbWF4bGVuZ3RoPVwiMTAwXCIgcGxhY2Vob2xkZXI9XCJlLmcuIE1ha2F0aSBDaXR5XCIgcmVxdWlyZWQgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtYnVkZ2V0XCI+QnVkZ2V0IChQSFApIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLWJ1ZGdldFwiIHR5cGU9XCJudW1iZXJcIiB2YWx1ZT1cIiR7cHJlQnVkZ2V0fVwiIG1pbj1cIjFcIiBzdGVwPVwiMVwiIHBsYWNlaG9sZGVyPVwiZS5nLiAxNTAwXCIgcmVxdWlyZWQgLz5cclxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImxwLWVzdGltYXRlLWJ0blwiIGlkPVwibHAtZXN0aW1hdGUtYnRuXCI+XHUyNzI2IEVzdGltYXRlIHdpdGggQUk8L2J1dHRvbj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibHAtaGludFwiIGlkPVwibHAtZXN0aW1hdGUtaGludFwiPjwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgPGRpdiBjbGFzcz1cImxwLXJvd1wiPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLXNjaGVkdWxlXCI+U2NoZWR1bGUgRGF0ZSA8c3BhbiBjbGFzcz1cImxwLXJlcXVpcmVkXCI+Kjwvc3Bhbj48L2xhYmVsPlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWlucHV0XCIgaWQ9XCJscC1zY2hlZHVsZVwiIHR5cGU9XCJkYXRlXCIgdmFsdWU9XCIke2VzY2FwZUF0dHIocHJlU2NoZWR1bGUpfVwiIG1pbj1cIiR7dG9kYXlTdHJ9XCIgcmVxdWlyZWQgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtdXJnZW5jeVwiPlVyZ2VuY3k8L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XCJscC1zZWxlY3RcIiBpZD1cImxwLXVyZ2VuY3lcIj5cclxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzdGFuZGFyZFwiICR7cHJlVXJnZW5jeSA9PT0gXCJzdGFuZGFyZFwiICA/IFwic2VsZWN0ZWRcIiA6IFwiXCJ9PlN0YW5kYXJkPC9vcHRpb24+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwic2FtZV9kYXlcIiAke3ByZVVyZ2VuY3kgPT09IFwic2FtZV9kYXlcIiAgPyBcInNlbGVjdGVkXCIgOiBcIlwifT5TYW1lIERheTwvb3B0aW9uPlxyXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInJ1c2hcIiAgICAgJHtwcmVVcmdlbmN5ID09PSBcInJ1c2hcIiAgICAgID8gXCJzZWxlY3RlZFwiIDogXCJcIn0+UnVzaDwvb3B0aW9uPlxyXG4gICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gIGA7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBBSSBTbWFydCBGaWxsIGJhciAoaW5qZWN0ZWQgYmVmb3JlIGZvcm0pIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGFpQmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBhaUJhci5jbGFzc05hbWUgPSBcImxwLWFpLWJhclwiO1xyXG4gIGNvbnN0IGFpQmFyTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGFpQmFyTGFiZWwuY2xhc3NOYW1lID0gXCJscC1haS1iYXItbGFiZWxcIjtcclxuICBhaUJhckxhYmVsLmlubmVySFRNTCA9IGBcdTI3MjYgQUkgU21hcnQgRmlsbCA8c3Bhbj5cdTIwMTQgY2xlYW4gZGVzY3JpcHRpb24gKyBjYXRlZ29yeSArIGJ1ZGdldCBpbiBvbmUgY2xpY2s8L3NwYW4+YDtcclxuICBjb25zdCBzbWFydEZpbGxCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIHNtYXJ0RmlsbEJ0bi50eXBlID0gXCJidXR0b25cIjtcclxuICBzbWFydEZpbGxCdG4uY2xhc3NOYW1lID0gXCJscC1zbWFydC1maWxsLWJ0blwiO1xyXG4gIHNtYXJ0RmlsbEJ0bi5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIjEyXCIgaGVpZ2h0PVwiMTJcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyLjVcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTEzIDEwVjNMNCAxNGg3djdsOS0xMWgtN3pcIi8+PC9zdmc+IFNtYXJ0IEZpbGxgO1xyXG4gIGFpQmFyLmFwcGVuZENoaWxkKGFpQmFyTGFiZWwpO1xyXG4gIGFpQmFyLmFwcGVuZENoaWxkKHNtYXJ0RmlsbEJ0bik7XHJcbiAgYm9keS5pbnNlcnRCZWZvcmUoYWlCYXIsIGZvcm0pO1xyXG5cclxuICBib2R5LmFwcGVuZENoaWxkKGZvcm0pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQ29udGFjdCBpbmZvIHNlY3Rpb24gKHBob25lL2VtYWlsIGZyb20gcG9zdCkgXHUyNTAwXHUyNTAwXHJcbiAgaWYgKGpvYi5waG9uZSB8fCBqb2IuZW1haWwpIHtcclxuICAgIGNvbnN0IGNvbnRhY3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgY29udGFjdERpdi5jbGFzc05hbWUgPSBcImxwLWNvbnRhY3QtaW5mb1wiO1xyXG4gICAgY29uc3QgY29udGFjdExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcbiAgICBjb250YWN0TGFiZWwuY2xhc3NOYW1lID0gXCJscC1jb250YWN0LWxhYmVsXCI7XHJcbiAgICBjb250YWN0TGFiZWwudGV4dENvbnRlbnQgPSBcIkNvbnRhY3RcIjtcclxuICAgIGNvbnRhY3REaXYuYXBwZW5kQ2hpbGQoY29udGFjdExhYmVsKTtcclxuICAgIGlmIChqb2IucGhvbmUpIHtcclxuICAgICAgY29uc3QgY2hpcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgICBjaGlwLmNsYXNzTmFtZSA9IFwibHAtY29udGFjdC1jaGlwXCI7XHJcbiAgICAgIGNoaXAuaW5uZXJIVE1MID0gYFx1RDgzRFx1RENERSAke2VzY2FwZVRleHQoam9iLnBob25lKX1gO1xyXG4gICAgICBjaGlwLnRpdGxlID0gXCJDbGljayB0byBjb3B5XCI7XHJcbiAgICAgIGNoaXAuc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XHJcbiAgICAgIGNoaXAuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgdm9pZCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChqb2IucGhvbmUhKTsgY2hpcC5pbm5lckhUTUwgPSBcIlx1MjcxMyBDb3BpZWQhXCI7IHNldFRpbWVvdXQoKCkgPT4geyBjaGlwLmlubmVySFRNTCA9IGBcdUQ4M0RcdURDREUgJHtlc2NhcGVUZXh0KGpvYi5waG9uZSEpfWA7IH0sIDE1MDApOyB9KTtcclxuICAgICAgY29udGFjdERpdi5hcHBlbmRDaGlsZChjaGlwKTtcclxuICAgIH1cclxuICAgIGlmIChqb2IuZW1haWwpIHtcclxuICAgICAgY29uc3QgY2hpcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgICBjaGlwLmNsYXNzTmFtZSA9IFwibHAtY29udGFjdC1jaGlwXCI7XHJcbiAgICAgIGNoaXAuaW5uZXJIVE1MID0gYFx1MjcwOVx1RkUwRiAke2VzY2FwZVRleHQoam9iLmVtYWlsKX1gO1xyXG4gICAgICBjaGlwLnRpdGxlID0gXCJDbGljayB0byBjb3B5XCI7XHJcbiAgICAgIGNoaXAuc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XHJcbiAgICAgIGNoaXAuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgdm9pZCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChqb2IuZW1haWwhKTsgY2hpcC5pbm5lckhUTUwgPSBcIlx1MjcxMyBDb3BpZWQhXCI7IHNldFRpbWVvdXQoKCkgPT4geyBjaGlwLmlubmVySFRNTCA9IGBcdTI3MDlcdUZFMEYgJHtlc2NhcGVUZXh0KGpvYi5lbWFpbCEpfWA7IH0sIDE1MDApOyB9KTtcclxuICAgICAgY29udGFjdERpdi5hcHBlbmRDaGlsZChjaGlwKTtcclxuICAgIH1cclxuICAgIGJvZHkuYXBwZW5kQ2hpbGQoY29udGFjdERpdik7XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQUkgYnVkZ2V0IGVzdGltYXRlIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGVzdGltYXRlQnRuICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWVzdGltYXRlLWJ0blwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGw7XHJcbiAgY29uc3QgZXN0aW1hdGVIaW50ID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtZXN0aW1hdGUtaGludFwiKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XHJcblxyXG4gIGlmIChlc3RpbWF0ZUJ0biAmJiBlc3RpbWF0ZUhpbnQpIHtcclxuICAgIGVzdGltYXRlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNhdGVnb3J5RWwgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1jYXRlZ29yeVwiKSBhcyBIVE1MU2VsZWN0RWxlbWVudDtcclxuICAgICAgY29uc3QgdGl0bGVFbCAgICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXRpdGxlXCIpICAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgIGNvbnN0IGJ1ZGdldEVsICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1idWRnZXRcIikgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgICBjb25zdCBjYXROYW1lICAgID0gY2F0ZWdvcnlFbC5zZWxlY3RlZE9wdGlvbnNbMF0/LmdldEF0dHJpYnV0ZShcImRhdGEtbmFtZVwiKSA/PyBcIlwiO1xyXG5cclxuICAgICAgaWYgKCFjYXROYW1lKSB7XHJcbiAgICAgICAgZXN0aW1hdGVIaW50LnRleHRDb250ZW50ID0gXCJTZWxlY3QgYSBjYXRlZ29yeSBmaXJzdC5cIjtcclxuICAgICAgICBlc3RpbWF0ZUhpbnQuY2xhc3NOYW1lID0gXCJscC1oaW50XCI7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBlc3RpbWF0ZUJ0bi5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICAgIGVzdGltYXRlQnRuLnRleHRDb250ZW50ID0gXCJFc3RpbWF0aW5nXHUyMDI2XCI7XHJcbiAgICAgIGVzdGltYXRlSGludC50ZXh0Q29udGVudCA9IFwiXCI7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IG1zZzogRXN0aW1hdGVCdWRnZXRNZXNzYWdlID0ge1xyXG4gICAgICAgICAgdHlwZTogXCJFU1RJTUFURV9CVURHRVRcIixcclxuICAgICAgICAgIHRpdGxlOiB0aXRsZUVsLnZhbHVlLnRyaW0oKSB8fCBqb2IudGl0bGUsXHJcbiAgICAgICAgICBjYXRlZ29yeTogY2F0TmFtZSxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBqb2IuZGVzY3JpcHRpb24uc2xpY2UoMCwgMzAwKSxcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IHJlczogRXN0aW1hdGVCdWRnZXRSZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKG1zZyk7XHJcblxyXG4gICAgICAgIGlmIChyZXM/LnN1Y2Nlc3MgJiYgcmVzLm1pZHBvaW50KSB7XHJcbiAgICAgICAgICBidWRnZXRFbC52YWx1ZSA9IFN0cmluZyhyZXMubWlkcG9pbnQpO1xyXG4gICAgICAgICAgY29uc3QgcmFuZ2UgPSAocmVzLm1pbiAhPSBudWxsICYmIHJlcy5tYXggIT0gbnVsbClcclxuICAgICAgICAgICAgPyBgUEhQICR7cmVzLm1pbi50b0xvY2FsZVN0cmluZygpfSBcdTIwMTMgJHtyZXMubWF4LnRvTG9jYWxlU3RyaW5nKCl9YFxyXG4gICAgICAgICAgICA6IFwiXCI7XHJcbiAgICAgICAgICBlc3RpbWF0ZUhpbnQudGV4dENvbnRlbnQgPSBgXHUyNzI2IEFJIGVzdGltYXRlOiAke3JhbmdlfSR7cmVzLm5vdGUgPyBgIFx1MDBCNyAke3Jlcy5ub3RlfWAgOiBcIlwifWA7XHJcbiAgICAgICAgICBlc3RpbWF0ZUhpbnQuY2xhc3NOYW1lID0gXCJscC1oaW50IGFpXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGVzdGltYXRlSGludC50ZXh0Q29udGVudCA9IHJlcz8uZXJyb3IgPz8gXCJFc3RpbWF0ZSB1bmF2YWlsYWJsZS5cIjtcclxuICAgICAgICAgIGVzdGltYXRlSGludC5jbGFzc05hbWUgPSBcImxwLWhpbnRcIjtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgIGVzdGltYXRlSGludC50ZXh0Q29udGVudCA9IFwiQ291bGQgbm90IGZldGNoIGVzdGltYXRlLlwiO1xyXG4gICAgICAgIGVzdGltYXRlSGludC5jbGFzc05hbWUgPSBcImxwLWhpbnRcIjtcclxuICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBlc3RpbWF0ZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgIGVzdGltYXRlQnRuLnRleHRDb250ZW50ID0gXCJcdTI3MjYgRXN0aW1hdGUgd2l0aCBBSVwiO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBDbGVhbiB3aXRoIEFJIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGNsZWFuQnRuICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNsZWFuLWJ0blwiKSAgYXMgSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsO1xyXG4gIGNvbnN0IGNsZWFuSGludCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNsZWFuLWhpbnRcIikgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xyXG5cclxuICBpZiAoY2xlYW5CdG4gJiYgY2xlYW5IaW50KSB7XHJcbiAgICBjbGVhbkJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjYXRlZ29yeUVsID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtY2F0ZWdvcnlcIikgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XHJcbiAgICAgIGNvbnN0IHRpdGxlRWwgICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC10aXRsZVwiKSAgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgICBjb25zdCBkZXNjRWwgICAgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtZGVzY3JpcHRpb25cIikgYXMgSFRNTFRleHRBcmVhRWxlbWVudDtcclxuICAgICAgY29uc3QgY2F0TmFtZSAgICA9IGNhdGVnb3J5RWwuc2VsZWN0ZWRPcHRpb25zWzBdPy5nZXRBdHRyaWJ1dGUoXCJkYXRhLW5hbWVcIikgPz8gXCJcIjtcclxuXHJcbiAgICAgIGNsZWFuQnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgY2xlYW5CdG4udGV4dENvbnRlbnQgPSBcIkdlbmVyYXRpbmdcdTIwMjZcIjtcclxuICAgICAgY2xlYW5IaW50LnRleHRDb250ZW50ID0gXCJcIjtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgbXNnOiBHZW5lcmF0ZURlc2NyaXB0aW9uTWVzc2FnZSA9IHtcclxuICAgICAgICAgIHR5cGU6IFwiR0VORVJBVEVfREVTQ1JJUFRJT05cIixcclxuICAgICAgICAgIHRpdGxlOiB0aXRsZUVsLnZhbHVlLnRyaW0oKSB8fCBqb2IudGl0bGUsXHJcbiAgICAgICAgICBjYXRlZ29yeTogY2F0TmFtZSB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCByZXM6IEdlbmVyYXRlRGVzY3JpcHRpb25SZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKG1zZyk7XHJcblxyXG4gICAgICAgIGlmIChyZXM/LnN1Y2Nlc3MgJiYgcmVzLmRlc2NyaXB0aW9uKSB7XHJcbiAgICAgICAgICBkZXNjRWwudmFsdWUgPSByZXMuZGVzY3JpcHRpb247XHJcbiAgICAgICAgICBjbGVhbkhpbnQudGV4dENvbnRlbnQgPSBcIlx1MjcyNiBBSS1nZW5lcmF0ZWQgXHUyMDE0IHJldmlldyBiZWZvcmUgc3VibWl0dGluZ1wiO1xyXG4gICAgICAgICAgY2xlYW5IaW50LmNsYXNzTmFtZSA9IFwibHAtaGludCBhaVwiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjbGVhbkhpbnQudGV4dENvbnRlbnQgPSByZXM/LmVycm9yID8/IFwiQ291bGQgbm90IGdlbmVyYXRlIGRlc2NyaXB0aW9uLlwiO1xyXG4gICAgICAgICAgY2xlYW5IaW50LmNsYXNzTmFtZSA9IFwibHAtaGludFwiO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgY2xlYW5IaW50LnRleHRDb250ZW50ID0gXCJDb3VsZCBub3QgcmVhY2ggQUkgc2VydmljZS5cIjtcclxuICAgICAgICBjbGVhbkhpbnQuY2xhc3NOYW1lID0gXCJscC1oaW50XCI7XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgY2xlYW5CdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBjbGVhbkJ0bi50ZXh0Q29udGVudCA9IFwiXHUyNzI2IENsZWFuIHdpdGggQUlcIjtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQUkgU21hcnQgRmlsbCAoY2xlYW4gZGVzY3JpcHRpb24gKyBlc3RpbWF0ZSBidWRnZXQgc2ltdWx0YW5lb3VzbHkpIFx1MjUwMFx1MjUwMFxyXG4gIHNtYXJ0RmlsbEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3QgY2F0ZWdvcnlFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNhdGVnb3J5XCIpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgY29uc3QgdGl0bGVFbCAgICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXRpdGxlXCIpICAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBkZXNjRWwgICAgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtZGVzY3JpcHRpb25cIikgYXMgSFRNTFRleHRBcmVhRWxlbWVudDtcclxuICAgIGNvbnN0IGJ1ZGdldEVsICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1idWRnZXRcIikgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3QgY2F0TmFtZSAgICA9IGNhdGVnb3J5RWwuc2VsZWN0ZWRPcHRpb25zWzBdPy5nZXRBdHRyaWJ1dGUoXCJkYXRhLW5hbWVcIikgPz8gXCJcIjtcclxuXHJcbiAgICBpZiAoIWNhdE5hbWUpIHtcclxuICAgICAgc21hcnRGaWxsQnRuLnRleHRDb250ZW50ID0gXCJTZWxlY3QgYSBjYXRlZ29yeSBmaXJzdFwiO1xyXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHsgc21hcnRGaWxsQnRuLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTJcIiBoZWlnaHQ9XCIxMlwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjIuNVwiPjxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNMTMgMTBWM0w0IDE0aDd2N2w5LTExaC03elwiLz48L3N2Zz4gU21hcnQgRmlsbGA7IH0sIDIwMDApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgc21hcnRGaWxsQnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHNtYXJ0RmlsbEJ0bi50ZXh0Q29udGVudCA9IFwiV29ya2luZ1x1MjAyNlwiO1xyXG5cclxuICAgIGNvbnN0IHRpdGxlVmFsID0gdGl0bGVFbC52YWx1ZS50cmltKCkgfHwgam9iLnRpdGxlO1xyXG5cclxuICAgIGNvbnN0IFtkZXNjUmVzLCBidWRnZXRSZXNdID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKFtcclxuICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2U8R2VuZXJhdGVEZXNjcmlwdGlvbk1lc3NhZ2UsIEdlbmVyYXRlRGVzY3JpcHRpb25SZXNwb25zZT4oe1xyXG4gICAgICAgIHR5cGU6IFwiR0VORVJBVEVfREVTQ1JJUFRJT05cIixcclxuICAgICAgICB0aXRsZTogdGl0bGVWYWwsXHJcbiAgICAgICAgY2F0ZWdvcnk6IGNhdE5hbWUsXHJcbiAgICAgIH0pLFxyXG4gICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTxFc3RpbWF0ZUJ1ZGdldE1lc3NhZ2UsIEVzdGltYXRlQnVkZ2V0UmVzcG9uc2U+KHtcclxuICAgICAgICB0eXBlOiBcIkVTVElNQVRFX0JVREdFVFwiLFxyXG4gICAgICAgIHRpdGxlOiB0aXRsZVZhbCxcclxuICAgICAgICBjYXRlZ29yeTogY2F0TmFtZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogam9iLmRlc2NyaXB0aW9uLnNsaWNlKDAsIDMwMCksXHJcbiAgICAgIH0pLFxyXG4gICAgXSk7XHJcblxyXG4gICAgaWYgKGRlc2NSZXMuc3RhdHVzID09PSBcImZ1bGZpbGxlZFwiICYmIGRlc2NSZXMudmFsdWU/LnN1Y2Nlc3MgJiYgZGVzY1Jlcy52YWx1ZS5kZXNjcmlwdGlvbikge1xyXG4gICAgICBkZXNjRWwudmFsdWUgPSBkZXNjUmVzLnZhbHVlLmRlc2NyaXB0aW9uO1xyXG4gICAgICBpZiAoY2xlYW5IaW50KSB7IGNsZWFuSGludC50ZXh0Q29udGVudCA9IFwiXHUyNzI2IEFJLWdlbmVyYXRlZCBcdTIwMTQgcmV2aWV3IGJlZm9yZSBzdWJtaXR0aW5nXCI7IGNsZWFuSGludC5jbGFzc05hbWUgPSBcImxwLWhpbnQgYWlcIjsgfVxyXG4gICAgfVxyXG4gICAgaWYgKGJ1ZGdldFJlcy5zdGF0dXMgPT09IFwiZnVsZmlsbGVkXCIgJiYgYnVkZ2V0UmVzLnZhbHVlPy5zdWNjZXNzICYmIGJ1ZGdldFJlcy52YWx1ZS5taWRwb2ludCkge1xyXG4gICAgICBidWRnZXRFbC52YWx1ZSA9IFN0cmluZyhidWRnZXRSZXMudmFsdWUubWlkcG9pbnQpO1xyXG4gICAgICBpZiAoZXN0aW1hdGVIaW50KSB7XHJcbiAgICAgICAgY29uc3QgciA9IGJ1ZGdldFJlcy52YWx1ZTtcclxuICAgICAgICBjb25zdCByYW5nZSA9IChyLm1pbiAhPSBudWxsICYmIHIubWF4ICE9IG51bGwpID8gYFBIUCAke3IubWluLnRvTG9jYWxlU3RyaW5nKCl9IFx1MjAxMyAke3IubWF4LnRvTG9jYWxlU3RyaW5nKCl9YCA6IFwiXCI7XHJcbiAgICAgICAgZXN0aW1hdGVIaW50LnRleHRDb250ZW50ID0gYFx1MjcyNiBBSSBlc3RpbWF0ZTogJHtyYW5nZX0ke3Iubm90ZSA/IGAgXHUwMEI3ICR7ci5ub3RlfWAgOiBcIlwifWA7XHJcbiAgICAgICAgZXN0aW1hdGVIaW50LmNsYXNzTmFtZSA9IFwibHAtaGludCBhaVwiO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc21hcnRGaWxsQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICBzbWFydEZpbGxCdG4uaW5uZXJIVE1MID0gYDxzdmcgd2lkdGg9XCIxMlwiIGhlaWdodD1cIjEyXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xMyAxMFYzTDQgMTRoN3Y3bDktMTFoLTd6XCIvPjwvc3ZnPiBTbWFydCBGaWxsYDtcclxuICB9KTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFN0YXR1cyBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBzdGF0dXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIHN0YXR1cy5jbGFzc05hbWUgPSBcImxwLXN0YXR1c1wiO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgRm9vdGVyIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgZm9vdGVyLmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtZm9vdGVyXCI7XHJcblxyXG4gIGlmIChiYXRjaCkge1xyXG4gICAgY29uc3Qgc2tpcEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBza2lwQnRuLnR5cGUgPSBcImJ1dHRvblwiO1xyXG4gICAgc2tpcEJ0bi5jbGFzc05hbWUgPSBcImxwLXNraXAtYnRuXCI7XHJcbiAgICBza2lwQnRuLnRleHRDb250ZW50ID0gXCJTa2lwXCI7XHJcbiAgICBza2lwQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IGNsb3NlTW9kYWwoaG9zdCk7IGJhdGNoLm9uTmV4dCgpOyB9KTtcclxuICAgIGZvb3Rlci5hcHBlbmRDaGlsZChza2lwQnRuKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc3QgY2FuY2VsQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGNhbmNlbEJ0bi50eXBlID0gXCJidXR0b25cIjtcclxuICAgIGNhbmNlbEJ0bi5jbGFzc05hbWUgPSBcImxwLWNhbmNlbC1idG5cIjtcclxuICAgIGNhbmNlbEJ0bi50ZXh0Q29udGVudCA9IFwiQ2FuY2VsXCI7XHJcbiAgICBjYW5jZWxCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGNsb3NlTW9kYWwoaG9zdCkpO1xyXG4gICAgZm9vdGVyLmFwcGVuZENoaWxkKGNhbmNlbEJ0bik7XHJcbiAgfVxyXG5cclxuICBjb25zdCBzdWJtaXRCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIHN1Ym1pdEJ0bi50eXBlID0gXCJidXR0b25cIjtcclxuICBzdWJtaXRCdG4uY2xhc3NOYW1lID0gXCJscC1zdWJtaXQtYnRuXCI7XHJcbiAgc3VibWl0QnRuLmlubmVySFRNTCA9IGBcclxuICAgIDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+XHJcbiAgICAgIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNCAxNnYxYTMgMyAwIDAwMyAzaDEwYTMgMyAwIDAwMy0zdi0xbS00LThsLTQtNG0wIDBMOCA4bTQtNHYxMlwiLz5cclxuICAgIDwvc3ZnPlxyXG4gICAgJHtiYXRjaCA/IFwiU3VibWl0ICYgTmV4dFwiIDogXCJTdWJtaXQgdG8gTG9jYWxQcm9cIn1cclxuICBgO1xyXG4gIGZvb3Rlci5hcHBlbmRDaGlsZChzdWJtaXRCdG4pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgU3VibWl0IGhhbmRsZXIgXHUyNTAwXHUyNTAwXHJcbiAgc3VibWl0QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCB0aXRsZUVsICAgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdGl0bGVcIikgICAgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRlc2NFbCAgICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1kZXNjcmlwdGlvblwiKSBhcyBIVE1MVGV4dEFyZWFFbGVtZW50O1xyXG4gICAgY29uc3QgY2F0ZWdvcnlFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNhdGVnb3J5XCIpICAgIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgY29uc3QgcG9zdGVyRWwgICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXBvc3RlclwiKSAgICAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBsb2NhdGlvbkVsID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtbG9jYXRpb25cIikgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGJ1ZGdldEVsICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1idWRnZXRcIikgICAgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3Qgc2NoZWR1bGVFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXNjaGVkdWxlXCIpICAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCB1cmdlbmN5RWwgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdXJnZW5jeVwiKSAgICAgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XHJcblxyXG4gICAgY29uc3QgdGl0bGUgICAgICAgID0gdGl0bGVFbC52YWx1ZS50cmltKCk7XHJcbiAgICBjb25zdCBkZXNjcmlwdGlvbiAgPSBkZXNjRWwudmFsdWUudHJpbSgpO1xyXG4gICAgY29uc3QgY2F0ZWdvcnlJZCAgID0gY2F0ZWdvcnlFbC52YWx1ZTtcclxuICAgIGNvbnN0IGNhdGVnb3J5TmFtZSA9IGNhdGVnb3J5RWwuc2VsZWN0ZWRPcHRpb25zWzBdPy5nZXRBdHRyaWJ1dGUoXCJkYXRhLW5hbWVcIikgPz8gXCJcIjtcclxuICAgIGNvbnN0IGxvY2F0aW9uICAgICA9IGxvY2F0aW9uRWwudmFsdWUudHJpbSgpO1xyXG4gICAgY29uc3QgYnVkZ2V0ICAgICAgID0gcGFyc2VGbG9hdChidWRnZXRFbC52YWx1ZSk7XHJcbiAgICBjb25zdCBzY2hlZHVsZURhdGUgPSBzY2hlZHVsZUVsLnZhbHVlO1xyXG4gICAgY29uc3QgdXJnZW5jeSAgICAgID0gdXJnZW5jeUVsLnZhbHVlIGFzIFwic3RhbmRhcmRcIiB8IFwic2FtZV9kYXlcIiB8IFwicnVzaFwiO1xyXG5cclxuICAgIGlmICghdGl0bGUpICAgICAgIHsgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJKb2IgdGl0bGUgaXMgcmVxdWlyZWQuXCIpOyAgICAgICAgICAgICAgdGl0bGVFbC5mb2N1cygpOyAgICByZXR1cm47IH1cclxuICAgIGlmICghZGVzY3JpcHRpb24pIHsgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJEZXNjcmlwdGlvbiBpcyByZXF1aXJlZC5cIik7ICAgICAgICAgICAgIGRlc2NFbC5mb2N1cygpOyAgICAgcmV0dXJuOyB9XHJcbiAgICBpZiAoIWNhdGVnb3J5SWQpICB7IHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIFwiUGxlYXNlIHNlbGVjdCBhIGNhdGVnb3J5LlwiKTsgICAgICAgICAgICBjYXRlZ29yeUVsLmZvY3VzKCk7IHJldHVybjsgfVxyXG4gICAgaWYgKCFsb2NhdGlvbikgICAgeyBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBcIkxvY2F0aW9uIGlzIHJlcXVpcmVkLlwiKTsgICAgICAgICAgICAgICAgbG9jYXRpb25FbC5mb2N1cygpOyByZXR1cm47IH1cclxuICAgIGlmICghYnVkZ2V0IHx8IGJ1ZGdldCA8PSAwIHx8IGlzTmFOKGJ1ZGdldCkpIHtcclxuICAgICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJCdWRnZXQgbXVzdCBiZSBncmVhdGVyIHRoYW4gMCAoUEhQKS5cIik7XHJcbiAgICAgIGJ1ZGdldEVsLmZvY3VzKCk7IHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICghc2NoZWR1bGVEYXRlKSB7IHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIFwiU2NoZWR1bGUgZGF0ZSBpcyByZXF1aXJlZC5cIik7IHNjaGVkdWxlRWwuZm9jdXMoKTsgcmV0dXJuOyB9XHJcblxyXG4gICAgc3VibWl0QnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHN1Ym1pdEJ0bi50ZXh0Q29udGVudCA9IFwiU3VibWl0dGluZ1x1MjAyNlwiO1xyXG4gICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwibG9hZGluZ1wiLCBcIlNlbmRpbmcgdG8gTG9jYWxQcm9cdTIwMjZcIik7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlZEpvYjogSm9iUG9zdCA9IHtcclxuICAgICAgLi4uam9iLCB0aXRsZSwgZGVzY3JpcHRpb24sXHJcbiAgICAgIHBvc3RlZF9ieTogcG9zdGVyRWwudmFsdWUudHJpbSgpLFxyXG4gICAgICBsb2NhdGlvbiwgYnVkZ2V0LCBzY2hlZHVsZURhdGUsXHJcbiAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeU5hbWUsXHJcbiAgICAgIGNhdGVnb3J5SWQsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IG1zZzogSW1wb3J0Sm9iTWVzc2FnZSA9IHsgdHlwZTogXCJJTVBPUlRfSk9CXCIsIHBheWxvYWQ6IHVwZGF0ZWRKb2IgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlPEltcG9ydEpvYk1lc3NhZ2UsIEltcG9ydEpvYlJlc3BvbnNlPihtc2cpO1xyXG5cclxuICAgICAgaWYgKHJlc3BvbnNlPy5zdWNjZXNzKSB7XHJcbiAgICAgICAgY29uc3Qgam9iSWQgID0gcmVzcG9uc2Uuam9iX2lkID8/IFwiXCI7XHJcbiAgICAgICAgY29uc3Qgdmlld1VybCA9IGAke0xQX1VSTH0vam9icy8ke2pvYklkfWA7XHJcbiAgICAgICAgc3RhdHVzLmNsYXNzTmFtZSA9IFwibHAtc3RhdHVzIHN1Y2Nlc3NcIjtcclxuICAgICAgICBzdGF0dXMuaW5uZXJIVE1MID0gYEltcG9ydGVkISA8YSBocmVmPVwiJHtlc2NhcGVBdHRyKHZpZXdVcmwpfVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyXCI+VmlldyBvbiBMb2NhbFBybyBcdTIxOTI8L2E+YDtcclxuICAgICAgICBzdGF0dXMuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgICAgICBzdWJtaXRCdG4udGV4dENvbnRlbnQgPSBcIlN1Ym1pdHRlZCFcIjtcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgY2xvc2VNb2RhbChob3N0KTsgaWYgKGJhdGNoKSBiYXRjaC5vbk5leHQoKTsgfSwgMjAwMCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3QgZXJyVGV4dCA9IHJlc3BvbnNlPy5lcnJvciA/PyBcIkltcG9ydCBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uXCI7XHJcbiAgICAgICAgY29uc3QgaXNBdXRoRXJyID0gZXJyVGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwic2Vzc2lvblwiKSB8fCBlcnJUZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJzaWduIGluXCIpO1xyXG4gICAgICAgIHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIGlzQXV0aEVyclxyXG4gICAgICAgICAgPyBcIlNlc3Npb24gZXhwaXJlZC4gUGxlYXNlIHNpZ24gaW4gYWdhaW4gdmlhIHRoZSBleHRlbnNpb24gaWNvbi5cIlxyXG4gICAgICAgICAgOiBlcnJUZXh0KTtcclxuICAgICAgICBzdWJtaXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBzdWJtaXRCdG4uaW5uZXJIVE1MID0gYmF0Y2ggPyBcIlN1Ym1pdCAmIE5leHRcIiA6IFwiU3VibWl0IHRvIExvY2FsUHJvXCI7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBgRXh0ZW5zaW9uIGVycm9yOiAke1N0cmluZyhlcnIpfWApO1xyXG4gICAgICBzdWJtaXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgc3VibWl0QnRuLmlubmVySFRNTCA9IGJhdGNoID8gXCJTdWJtaXQgJiBOZXh0XCIgOiBcIlN1Ym1pdCB0byBMb2NhbFByb1wiO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBtb2RhbC5hcHBlbmRDaGlsZChoZWFkZXIpO1xyXG4gIG1vZGFsLmFwcGVuZENoaWxkKGJvZHkpO1xyXG4gIG1vZGFsLmFwcGVuZENoaWxkKHN0YXR1cyk7XHJcbiAgbW9kYWwuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcclxuICBvdmVybGF5LmFwcGVuZENoaWxkKG1vZGFsKTtcclxuICByZXR1cm4gb3ZlcmxheTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEhlbHBlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBzaG93U3RhdHVzKGVsOiBIVE1MRWxlbWVudCwgdHlwZTogXCJzdWNjZXNzXCIgfCBcImVycm9yXCIgfCBcImxvYWRpbmdcIiwgbXNnOiBzdHJpbmcpOiB2b2lkIHtcclxuICBlbC5jbGFzc05hbWUgPSBgbHAtc3RhdHVzICR7dHlwZX1gO1xyXG4gIGVsLnRleHRDb250ZW50ID0gbXNnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlc2NhcGVBdHRyKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gc3RyLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKS5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKS5yZXBsYWNlKC88L2csIFwiJmx0O1wiKS5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIikucmVwbGFjZSgvPC9nLCBcIiZsdDtcIikucmVwbGFjZSgvPi9nLCBcIiZndDtcIik7XHJcbn1cclxuIiwgIi8qKlxyXG4gKiBDb250ZW50IHNjcmlwdCBcdTIwMTQgaW5qZWN0ZWQgaW50byBmYWNlYm9vay5jb20sIGxpbmtlZGluLmNvbSwgam9ic3RyZWV0LmNvbSwgaW5kZWVkLmNvbS5cclxuICpcclxuICogRmxvdyBBIFx1MjAxNCBQZXItcG9zdCBpbmxpbmUgYnV0dG9uIChhdXRvbWF0aWMsIG9uIHBhZ2UgbG9hZCk6XHJcbiAqICAxLiBPbiBsb2FkIGFuZCBvbiBuZXcgcG9zdHMgKE11dGF0aW9uT2JzZXJ2ZXIpLCBpbmplY3QgYSBzbWFsbFxyXG4gKiAgICAgXCJJbXBvcnQgdG8gTG9jYWxQcm9cIiBidXR0b24gYXQgdGhlIGJvdHRvbSBvZiBlYWNoIHBvc3QgY29udGFpbmVyLlxyXG4gKiAgMi4gQ2xpY2tpbmcgaXQgZXh0cmFjdHMgdGhhdCBwb3N0J3MgZGF0YSwgcnVucyBBSSBjYXRlZ29yeSBjbGFzc2lmaWNhdGlvbixcclxuICogICAgIGFuZCBvcGVucyB0aGUgcmV2aWV3IG1vZGFsIGltbWVkaWF0ZWx5LlxyXG4gKlxyXG4gKiBGbG93IEIgXHUyMDE0IEJ1bGsgc2NhbiAoZmxvYXRpbmcgYWN0aW9uIGJ1dHRvbnMpOlxyXG4gKiAgMS4gVXNlciBjbGlja3MgXCJTY2FuIEpvYnMgb24gVGhpcyBQYWdlXCIgb3IgXCJTY3JvbGwgJiBTY2FuXCIuXHJcbiAqICAyLiBBbGwgcG9zdHMgYXJlIGNvbGxlY3RlZCwgZXh0cmFjdGVkLCBhbmQgc2hvd24gaW4gYSBzZWxlY3Rpb24gcGFuZWwuXHJcbiAqICAzLiBVc2VyIHNlbGVjdHMgcG9zdHMgXHUyMTkyIHNlcXVlbnRpYWwgcmV2aWV3IG1vZGFscy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBleHRyYWN0Sm9iRGF0YSB9IGZyb20gXCIuL3V0aWxzL3BhcnNlclwiO1xyXG5pbXBvcnQge1xyXG4gIGluamVjdEZsb2F0aW5nU2NhbkJ1dHRvbixcclxuICBpbmplY3RQZXJQb3N0SW1wb3J0QnV0dG9uLFxyXG4gIHNob3dKb2JTZWxlY3Rpb25QYW5lbCxcclxuICBzaG93Sm9iTW9kYWwsXHJcbn0gZnJvbSBcIi4vdXRpbHMvZG9tSGVscGVyc1wiO1xyXG5pbXBvcnQgdHlwZSB7XHJcbiAgQnVsa0RlZmF1bHRzLFxyXG4gIENhdGVnb3J5LFxyXG4gIENsYXNzaWZ5Q2F0ZWdvcnlNZXNzYWdlLFxyXG4gIENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZSxcclxuICBHZXRDYXRlZ29yaWVzTWVzc2FnZSxcclxuICBHZXRDYXRlZ29yaWVzUmVzcG9uc2UsXHJcbiAgR2V0SW1wb3J0SGlzdG9yeU1lc3NhZ2UsXHJcbiAgR2V0SW1wb3J0SGlzdG9yeVJlc3BvbnNlLFxyXG4gIEpvYlBvc3QsXHJcbiAgUGxhdGZvcm0sXHJcbn0gZnJvbSBcIi4vdHlwZXNcIjtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBQbGF0Zm9ybSBkZXRlY3Rpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBkZXRlY3RQbGF0Zm9ybSgpOiBQbGF0Zm9ybSB8IG51bGwge1xyXG4gIGNvbnN0IGhvc3QgPSB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWU7XHJcbiAgaWYgKGhvc3QuaW5jbHVkZXMoXCJmYWNlYm9vay5jb21cIikpICByZXR1cm4gXCJmYWNlYm9va1wiO1xyXG4gIGlmIChob3N0LmluY2x1ZGVzKFwibGlua2VkaW4uY29tXCIpKSAgcmV0dXJuIFwibGlua2VkaW5cIjtcclxuICBpZiAoaG9zdC5pbmNsdWRlcyhcImpvYnN0cmVldC5jb21cIikpIHJldHVybiBcImpvYnN0cmVldFwiO1xyXG4gIGlmIChob3N0LmluY2x1ZGVzKFwiaW5kZWVkLmNvbVwiKSkgICAgcmV0dXJuIFwiaW5kZWVkXCI7XHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmNvbnN0IFBMQVRGT1JNID0gZGV0ZWN0UGxhdGZvcm0oKTtcclxuXHJcbmlmICghUExBVEZPUk0pIHtcclxuICB0aHJvdyBuZXcgRXJyb3IoXCJbTG9jYWxQcm9dIFVuc3VwcG9ydGVkIHBsYXRmb3JtIFx1MjAxNCBjb250ZW50IHNjcmlwdCBleGl0aW5nLlwiKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENhdGVnb3J5IGNhY2hlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxubGV0IGNhY2hlZENhdGVnb3JpZXM6IENhdGVnb3J5W10gPSBbXTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHByZWxvYWRDYXRlZ29yaWVzKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBtc2c6IEdldENhdGVnb3JpZXNNZXNzYWdlID0geyB0eXBlOiBcIkdFVF9DQVRFR09SSUVTXCIgfTtcclxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlPEdldENhdGVnb3JpZXNNZXNzYWdlLCBHZXRDYXRlZ29yaWVzUmVzcG9uc2U+KG1zZyk7XHJcbiAgICBpZiAocmVzPy5zdWNjZXNzICYmIHJlcy5jYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY2FjaGVkQ2F0ZWdvcmllcyA9IHJlcy5jYXRlZ29yaWVzO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gQmFja2dyb3VuZCBtYXkgbm90IGJlIHJlYWR5IG9uIGNvbGQgc3RhcnRcclxuICB9XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBQb3N0IGNvbnRhaW5lciBzZWxlY3RvcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBnZXRQb3N0Q29udGFpbmVycygpOiBFbGVtZW50W10ge1xyXG4gIHN3aXRjaCAoUExBVEZPUk0pIHtcclxuICAgIGNhc2UgXCJmYWNlYm9va1wiOlxyXG4gICAgICAvLyBGaWx0ZXIgdG8gdG9wLWxldmVsIGFydGljbGVzIG9ubHkgXHUyMDE0IGNvbW1lbnRzIGFyZSBbcm9sZT1cImFydGljbGVcIl0gbmVzdGVkXHJcbiAgICAgIC8vIGluc2lkZSBhIHBhcmVudCBbcm9sZT1cImFydGljbGVcIl0sIHNvIHdlIHJlamVjdCBhbnl0aGluZyB3aXRoIGFuIGFuY2VzdG9yIGFydGljbGUuXHJcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKFxyXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyb2xlPVwiYXJ0aWNsZVwiXSwgW2RhdGEtcGFnZWxldF49XCJGZWVkVW5pdFwiXScpXHJcbiAgICAgICkuZmlsdGVyKChlbCkgPT4gZWwucGFyZW50RWxlbWVudD8uY2xvc2VzdCgnW3JvbGU9XCJhcnRpY2xlXCJdJykgPT09IG51bGwpO1xyXG5cclxuICAgIGNhc2UgXCJsaW5rZWRpblwiOiB7XHJcbiAgICAgIGNvbnN0IGZlZWRTZWxlY3RvciA9IFtcclxuICAgICAgICBcIi5mZWVkLXNoYXJlZC11cGRhdGUtdjJcIiwgICAgICAgICAgIC8vIGNsYXNzaWMgZmVlZCBwb3N0IHdyYXBwZXJcclxuICAgICAgICBcIi5vY2NsdWRhYmxlLXVwZGF0ZVwiLCAgICAgICAgICAgICAgIC8vIGltcHJlc3Npb24tdHJhY2tlZCB3cmFwcGVyXHJcbiAgICAgICAgXCJsaS5maWUtaW1wcmVzc2lvbi1jb250YWluZXJcIiwgICAgICAvLyBuZXdlciBmZWVkIGxpc3QgaXRlbVxyXG4gICAgICAgICdbZGF0YS11cm5ePVwidXJuOmxpOmFjdGl2aXR5XCJdJywgICAgLy8gcG9zdCBhY3Rpdml0eVxyXG4gICAgICAgICdbZGF0YS11cm5ePVwidXJuOmxpOnNoYXJlXCJdJywgICAgICAgLy8gc2hhcmVkIHBvc3RcclxuICAgICAgICAnW2RhdGEtdXJuXj1cInVybjpsaTp1Z2NQb3N0XCJdJywgICAgIC8vIHVzZXItZ2VuZXJhdGVkIGNvbnRlbnQgcG9zdFxyXG4gICAgICBdLmpvaW4oXCIsIFwiKTtcclxuICAgICAgY29uc3QgY29tbWVudENvbnRhaW5lcnMgPVxyXG4gICAgICAgIFwiLmNvbW1lbnRzLWNvbW1lbnQtaXRlbSwgLmNvbW1lbnRzLWNvbW1lbnRzLWxpc3QsIC5jb21tZW50cy1jb21tZW50LWxpc3QsIFwiICtcclxuICAgICAgICBcIi5jb21tZW50cy1yZXBseS1pdGVtLCAuc29jaWFsLWRldGFpbHMtc29jaWFsLWFjdGl2aXR5XCI7XHJcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoZmVlZFNlbGVjdG9yKSkuZmlsdGVyKFxyXG4gICAgICAgIChlbCkgPT5cclxuICAgICAgICAgICFlbC5jbG9zZXN0KGNvbW1lbnRDb250YWluZXJzKSAmJlxyXG4gICAgICAgICAgZWwucGFyZW50RWxlbWVudD8uY2xvc2VzdChmZWVkU2VsZWN0b3IpID09PSBudWxsXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FzZSBcImpvYnN0cmVldFwiOlxyXG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShcclxuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFxyXG4gICAgICAgICAgW1xyXG4gICAgICAgICAgICAnW2RhdGEtYXV0b21hdGlvbj1cIm5vcm1hbEpvYlwiXScsXHJcbiAgICAgICAgICAgICdbZGF0YS1hdXRvbWF0aW9uPVwiZmVhdHVyZWRKb2JcIl0nLFxyXG4gICAgICAgICAgICBcImFydGljbGVbZGF0YS1qb2ItaWRdXCIsXHJcbiAgICAgICAgICAgICdbY2xhc3MqPVwiam9iLWl0ZW1cIl0nLFxyXG4gICAgICAgICAgICAnW2NsYXNzKj1cIkpvYkNhcmRcIl0nLFxyXG4gICAgICAgICAgXS5qb2luKFwiLCBcIilcclxuICAgICAgICApXHJcbiAgICAgICk7XHJcblxyXG4gICAgY2FzZSBcImluZGVlZFwiOlxyXG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShcclxuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFxyXG4gICAgICAgICAgW1xyXG4gICAgICAgICAgICBcIltkYXRhLWprXVwiLFxyXG4gICAgICAgICAgICBcIi5qb2Jfc2Vlbl9iZWFjb25cIixcclxuICAgICAgICAgICAgXCIucmVzdWx0Q29udGVudFwiLFxyXG4gICAgICAgICAgICAnW2NsYXNzKj1cImpvYkNhcmRcIl0nLFxyXG4gICAgICAgICAgICBcIi5qb2JzZWFyY2gtUmVzdWx0c0xpc3QgPiBsaVwiLFxyXG4gICAgICAgICAgXS5qb2luKFwiLCBcIilcclxuICAgICAgICApXHJcbiAgICAgICk7XHJcblxyXG4gICAgZGVmYXVsdDpcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEFscmVhZHktaW1wb3J0ZWQgVVJMIHNldCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEltcG9ydGVkVXJscygpOiBQcm9taXNlPFNldDxzdHJpbmc+PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IG1zZzogR2V0SW1wb3J0SGlzdG9yeU1lc3NhZ2UgPSB7IHR5cGU6IFwiR0VUX0lNUE9SVF9ISVNUT1JZXCIgfTtcclxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlPEdldEltcG9ydEhpc3RvcnlNZXNzYWdlLCBHZXRJbXBvcnRIaXN0b3J5UmVzcG9uc2U+KG1zZyk7XHJcbiAgICBpZiAocmVzPy5zdWNjZXNzKSB7XHJcbiAgICAgIHJldHVybiBuZXcgU2V0KHJlcy5oaXN0b3J5Lm1hcCgoaCkgPT4gaC5zb3VyY2VfdXJsKSk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBOb24tZmF0YWxcclxuICB9XHJcbiAgcmV0dXJuIG5ldyBTZXQoKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEF1dG8tc2Nyb2xsIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuLyoqXHJcbiAqIExpbmtlZEluIHJlbmRlcnMgaXRzIGZlZWQgaW5zaWRlIGEgc2Nyb2xsYWJsZSBjb250YWluZXIsIG5vdCB0aGUgd2luZG93LlxyXG4gKiBXZSBmaW5kIHRoYXQgY29udGFpbmVyIGFuZCBzY3JvbGwgaXQgZGlyZWN0bHk7IHdpbmRvdy5zY3JvbGxCeSBhbG9uZSBkb2VzIG5vdGhpbmcuXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRTY3JvbGxDb250YWluZXIoKTogRWxlbWVudCB8IG51bGwge1xyXG4gIGlmIChQTEFURk9STSA9PT0gXCJsaW5rZWRpblwiKSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnNjYWZmb2xkLWxheW91dF9fbWFpblwiKSA/P1xyXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwibWFpbi5zY2FmZm9sZC1sYXlvdXRfX21haW5cIikgPz9cclxuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2NsYXNzKj1cInNjYWZmb2xkLWxheW91dF9fbWFpblwiXScpID8/XHJcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJtYWluW3JvbGU9J21haW4nXVwiKSA/P1xyXG4gICAgICBudWxsXHJcbiAgICApO1xyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gYXV0b1Njcm9sbFBhZ2UoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgY29udGFpbmVyID0gZ2V0U2Nyb2xsQ29udGFpbmVyKCk7XHJcbiAgY29uc3QgdG90YWxTY3JvbGxzID0gODtcclxuICBjb25zdCBzdGVwSGVpZ2h0ICAgPSB3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjg1O1xyXG5cclxuICAvLyBMaW5rZWRJbiBuZWVkcyBsb25nZXIgcGF1c2VzIGZvciBpdHMgbGF6eS1sb2FkIHRvIGZpcmVcclxuICBjb25zdCBwYXVzZU1zID0gUExBVEZPUk0gPT09IFwibGlua2VkaW5cIiA/IDExMDAgOiA3MDA7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWxTY3JvbGxzOyBpKyspIHtcclxuICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgY29udGFpbmVyLnNjcm9sbEJ5KHsgdG9wOiBzdGVwSGVpZ2h0LCBiZWhhdmlvcjogXCJzbW9vdGhcIiB9KTtcclxuICAgIH1cclxuICAgIC8vIEFsd2F5cyBhbHNvIHNjcm9sbCB3aW5kb3cgXHUyMDE0IGhhbmRsZXMgcGFnZXMgdGhhdCB1c2Ugd2luZG93IHNjcm9sbFxyXG4gICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwSGVpZ2h0LCBiZWhhdmlvcjogXCJzbW9vdGhcIiB9KTtcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIHBhdXNlTXMpKTtcclxuICB9XHJcblxyXG4gIC8vIEZpbmFsIHBhdXNlIHNvIGxhenktbG9hZGVkIGNvbnRlbnQgc2V0dGxlcyBiZWZvcmUgd2Ugc2NhblxyXG4gIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDgwMCkpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgUGVyLXBvc3QgaW5saW5lIGltcG9ydCBidXR0b25zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuLyoqIFNldCBvZiBVUkxzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gaW1wb3J0ZWQgKGxvYWRlZCBvbmNlIG9uIGluaXQpLiAqL1xyXG5sZXQgaW1wb3J0ZWRVcmxDYWNoZTogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcblxyXG4vKipcclxuICogUnVucyBBSSBjYXRlZ29yeSBjbGFzc2lmaWNhdGlvbiB0aGVuIG9wZW5zIHRoZSByZXZpZXcgbW9kYWwgZm9yIGEgc2luZ2xlIHBvc3QuXHJcbiAqIFJlLXVzZXMgdGhlIHNhbWUgcHJvY2Vzc0ltcG9ydFF1ZXVlIHBhdGggc28gdGhlIHVzZXIgZ2V0cyB0aGUgc2FtZSBleHBlcmllbmNlLlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaW1wb3J0U2luZ2xlUG9zdChjb250YWluZXI6IEVsZW1lbnQsIG1hcmtEb25lOiAoKSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3Qgam9iID0gZXh0cmFjdEpvYkRhdGEoY29udGFpbmVyLCBQTEFURk9STSEpO1xyXG5cclxuICBsZXQgYWlDYXRlZ29yeTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIGlmIChjYWNoZWRDYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1zZzogQ2xhc3NpZnlDYXRlZ29yeU1lc3NhZ2UgPSB7XHJcbiAgICAgICAgdHlwZTogXCJDTEFTU0lGWV9DQVRFR09SWVwiLFxyXG4gICAgICAgIHRpdGxlOiBqb2IudGl0bGUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGpvYi5kZXNjcmlwdGlvbixcclxuICAgICAgICBhdmFpbGFibGVDYXRlZ29yaWVzOiBjYWNoZWRDYXRlZ29yaWVzLm1hcCgoYykgPT4gYy5uYW1lKSxcclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTxDbGFzc2lmeUNhdGVnb3J5TWVzc2FnZSwgQ2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlPihtc2cpLFxyXG4gICAgICAgIG5ldyBQcm9taXNlPENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZT4oKHJlc29sdmUpID0+XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSB9KSwgNDAwMClcclxuICAgICAgICApLFxyXG4gICAgICBdKTtcclxuICAgICAgaWYgKHJlcz8uc3VjY2VzcyAmJiByZXMuY2F0ZWdvcnkpIGFpQ2F0ZWdvcnkgPSByZXMuY2F0ZWdvcnk7XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgLy8gTm9uLWZhdGFsXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBXcmFwIG9uTmV4dCB0byBtYXJrIHRoZSBpbmxpbmUgYnV0dG9uIGFzIGRvbmUgYWZ0ZXIgdGhlIG1vZGFsIGNsb3NlcyAvIHN1Ym1pdHNcclxuICBzaG93Sm9iTW9kYWwoam9iLCBjYWNoZWRDYXRlZ29yaWVzLCBhaUNhdGVnb3J5LCB1bmRlZmluZWQsIHt9KTtcclxuXHJcbiAgLy8gTWFyayBkb25lIG9uY2UgdGhlIG1vZGFsIGlzIHNob3duICh0aGUgdXNlciBtYXkgc3RpbGwgY2FuY2VsIFx1MjAxNCB0aGF0J3MgZmluZSlcclxuICBtYXJrRG9uZSgpO1xyXG59XHJcblxyXG4vKipcclxuICogUmV0dXJucyB0cnVlIG9ubHkgZm9yIGdlbnVpbmUgdG9wLWxldmVsIHBvc3QgY29udGFpbmVycy5cclxuICpcclxuICogRmFjZWJvb2sgYW5kIExpbmtlZEluIGJvdGggcmVuZGVyIGNvbW1lbnQgdGhyZWFkcyB1c2luZyB0aGUgc2FtZSBlbGVtZW50XHJcbiAqIHR5cGVzIGFzIHBvc3QgY29udGFpbmVycyAoW3JvbGU9XCJhcnRpY2xlXCJdLCAuZmVlZC1zaGFyZWQtdXBkYXRlLXYyLCBldGMuKS5cclxuICogVGhpcyBndWFyZCBlbnN1cmVzIHdlIG9ubHkgaW5qZWN0IGJ1dHRvbnMgb24gcmVhbCBwb3N0cy5cclxuICovXHJcbmZ1bmN0aW9uIGlzVG9wTGV2ZWxDb250YWluZXIoZWw6IEVsZW1lbnQpOiBib29sZWFuIHtcclxuICBzd2l0Y2ggKFBMQVRGT1JNKSB7XHJcbiAgICBjYXNlIFwiZmFjZWJvb2tcIjoge1xyXG4gICAgICAvLyBDb21tZW50cyBhcmUgW3JvbGU9XCJhcnRpY2xlXCJdIE5FU1RFRCBpbnNpZGUgdGhlIHBhcmVudCBmZWVkIGFydGljbGUuXHJcbiAgICAgIC8vIEEgdG9wLWxldmVsIHBvc3QgaGFzIG5vIGFuY2VzdG9yIFtyb2xlPVwiYXJ0aWNsZVwiXS5cclxuICAgICAgcmV0dXJuIGVsLnBhcmVudEVsZW1lbnQ/LmNsb3Nlc3QoJ1tyb2xlPVwiYXJ0aWNsZVwiXScpID09PSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNhc2UgXCJsaW5rZWRpblwiOiB7XHJcbiAgICAgIC8vIFJlcGxpZXMgbGl2ZSBpbnNpZGUgLmNvbW1lbnRzLWNvbW1lbnQtaXRlbSAvIC5jb21tZW50cy1jb21tZW50cy1saXN0LlxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgZWwuY2xvc2VzdChcclxuICAgICAgICAgIFwiLmNvbW1lbnRzLWNvbW1lbnQtaXRlbSwgLmNvbW1lbnRzLWNvbW1lbnRzLWxpc3QsIC5jb21tZW50cy1jb21tZW50LWxpc3QsIFwiICtcclxuICAgICAgICAgIFwiLmNvbW1lbnRzLXJlcGx5LWl0ZW0sIC5zb2NpYWwtZGV0YWlscy1zb2NpYWwtYWN0aXZpdHlcIlxyXG4gICAgICAgIClcclxuICAgICAgKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAvLyBSZWplY3QgZmVlZCBlbGVtZW50cyB0aGF0IGFyZSB0aGVtc2VsdmVzIG5lc3RlZCBpbnNpZGUgYW5vdGhlciBmZWVkIHVwZGF0ZS5cclxuICAgICAgY29uc3QgZmVlZFNlbGVjdG9yID1cclxuICAgICAgICBcIi5mZWVkLXNoYXJlZC11cGRhdGUtdjIsIC5vY2NsdWRhYmxlLXVwZGF0ZSwgbGkuZmllLWltcHJlc3Npb24tY29udGFpbmVyXCI7XHJcbiAgICAgIHJldHVybiBlbC5wYXJlbnRFbGVtZW50Py5jbG9zZXN0KGZlZWRTZWxlY3RvcikgPT09IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgZGVmYXVsdDpcclxuICAgICAgLy8gSm9iU3RyZWV0IC8gSW5kZWVkIHVzZSBjYXJkIGVsZW1lbnRzIHRoYXQgZG9uJ3QgbmVzdCBpbiBjb21tZW50cy5cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSW5qZWN0IChvciB1cGRhdGUpIHRoZSBcIkltcG9ydCB0byBMb2NhbFByb1wiIGlubGluZSBidXR0b24gb24gYSBzaW5nbGUgcG9zdCBjb250YWluZXIuXHJcbiAqIFNraXBzIGNvbnRhaW5lcnMgdGhhdCBhcmUgY29tbWVudCBzZWN0aW9ucywgdG9vIHNob3J0LCBvciBhbHJlYWR5IGluamVjdGVkLlxyXG4gKi9cclxuZnVuY3Rpb24gaW5qZWN0QnV0dG9uT25Qb3N0KGNvbnRhaW5lcjogRWxlbWVudCk6IHZvaWQge1xyXG4gIC8vIFNraXAgY29tbWVudCBzZWN0aW9ucyBhbmQgbm9uLXRvcC1sZXZlbCBuZXN0ZWQgZWxlbWVudHNcclxuICBpZiAoIWlzVG9wTGV2ZWxDb250YWluZXIoY29udGFpbmVyKSkgcmV0dXJuO1xyXG5cclxuICBjb25zdCB0ZXh0ID0gY29udGFpbmVyLnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcclxuICBpZiAodGV4dC5sZW5ndGggPCAyMCkgcmV0dXJuO1xyXG4gIGlmIChjb250YWluZXIuaGFzQXR0cmlidXRlKFwiZGF0YS1scC1pbmplY3RlZFwiKSkgcmV0dXJuO1xyXG5cclxuICAvLyBCZXN0LWVmZm9ydCBkdXBsaWNhdGUgZGV0ZWN0aW9uIHVzaW5nIHRoZSBmaXJzdCBwb3N0LWxpbmsgaW4gdGhlIGNvbnRhaW5lclxyXG4gIGNvbnN0IGZpcnN0TGluayA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxBbmNob3JFbGVtZW50PihcclxuICAgICdhW2hyZWYqPVwiL3Bvc3RzL1wiXSwgYVtocmVmKj1cInN0b3J5X2ZiaWQ9XCJdLCBhW2hyZWYqPVwiP3A9XCJdLCBhW2hyZWYqPVwiL2pvYnMvdmlldy9cIl0sIGFbaHJlZio9XCJqaz1cIl0nXHJcbiAgKTtcclxuICBjb25zdCBpc0R1cCA9IGZpcnN0TGluayA/IGltcG9ydGVkVXJsQ2FjaGUuaGFzKGZpcnN0TGluay5ocmVmKSA6IGZhbHNlO1xyXG5cclxuICBpbmplY3RQZXJQb3N0SW1wb3J0QnV0dG9uKGNvbnRhaW5lciwgaXNEdXAsIChtYXJrRG9uZSkgPT4ge1xyXG4gICAgdm9pZCBpbXBvcnRTaW5nbGVQb3N0KGNvbnRhaW5lciwgbWFya0RvbmUpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5sZXQgX2luamVjdERlYm91bmNlOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xyXG5cclxuLyoqIFNjYW5zIGFsbCBjdXJyZW50IHBvc3QgY29udGFpbmVycyBhbmQgaW5qZWN0cyBidXR0b25zIG9uIGFueSBuZXcgb25lcy4gKi9cclxuZnVuY3Rpb24gaW5qZWN0QWxsUG9zdEJ1dHRvbnMoKTogdm9pZCB7XHJcbiAgaWYgKF9pbmplY3REZWJvdW5jZSkgY2xlYXJUaW1lb3V0KF9pbmplY3REZWJvdW5jZSk7XHJcbiAgX2luamVjdERlYm91bmNlID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICBnZXRQb3N0Q29udGFpbmVycygpLmZvckVhY2goaW5qZWN0QnV0dG9uT25Qb3N0KTtcclxuICB9LCA0MDApO1xyXG59XHJcblxyXG4vKiogV2F0Y2ggZm9yIG5ldyBwb3N0cyBhcHBlYXJpbmcgaW4gdGhlIGZlZWQgYW5kIGluamVjdCBidXR0b25zIGF1dG9tYXRpY2FsbHkuICovXHJcbmZ1bmN0aW9uIG9ic2VydmVBbmRJbmplY3RCdXR0b25zKCk6IHZvaWQge1xyXG4gIGluamVjdEFsbFBvc3RCdXR0b25zKCk7IC8vIGluaXRpYWwgcGFzc1xyXG5cclxuICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IGluamVjdEFsbFBvc3RCdXR0b25zKCkpO1xyXG4gIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfSk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBTY2FuIHBhZ2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVTY2FuUGFnZShcclxuICBzZXRTY2FubmluZ1N0YXRlOiAoc2Nhbm5pbmc6IGJvb2xlYW4pID0+IHZvaWQsXHJcbiAgd2l0aEF1dG9TY3JvbGwgPSBmYWxzZVxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBzZXRTY2FubmluZ1N0YXRlKHRydWUpO1xyXG4gIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwKSk7XHJcblxyXG4gIGlmICh3aXRoQXV0b1Njcm9sbCkge1xyXG4gICAgYXdhaXQgYXV0b1Njcm9sbFBhZ2UoKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNvbnRhaW5lcnMgPSBnZXRQb3N0Q29udGFpbmVycygpO1xyXG4gIGNvbnN0IHVuaXF1ZSA9IFsuLi5uZXcgU2V0KGNvbnRhaW5lcnMpXS5maWx0ZXIoXHJcbiAgICAoZWwpID0+IGVsLnRleHRDb250ZW50ICYmIGVsLnRleHRDb250ZW50LnRyaW0oKS5sZW5ndGggPiAyMFxyXG4gICk7XHJcblxyXG4gIGNvbnN0IGpvYnM6IEpvYlBvc3RbXSA9IHVuaXF1ZS5tYXAoKGMpID0+IGV4dHJhY3RKb2JEYXRhKGMsIFBMQVRGT1JNISkpO1xyXG5cclxuICBjb25zdCBbaW1wb3J0ZWRVcmxzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtnZXRJbXBvcnRlZFVybHMoKV0pO1xyXG5cclxuICBzZXRTY2FubmluZ1N0YXRlKGZhbHNlKTtcclxuXHJcbiAgaWYgKGpvYnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICBhbGVydChcIltMb2NhbFByb10gTm8gcG9zdHMgZm91bmQgb24gdGhpcyBwYWdlLiBUcnkgc2Nyb2xsaW5nIHRvIGxvYWQgbW9yZSBjb250ZW50IGZpcnN0LCBvciB1c2UgJ1Njcm9sbCAmIFNjYW4nLlwiKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHNob3dKb2JTZWxlY3Rpb25QYW5lbChqb2JzLCBpbXBvcnRlZFVybHMsIChzZWxlY3RlZCwgYnVsa0RlZmF1bHRzKSA9PiB7XHJcbiAgICB2b2lkIHByb2Nlc3NJbXBvcnRRdWV1ZShzZWxlY3RlZCwgMCwgYnVsa0RlZmF1bHRzKTtcclxuICB9KTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEltcG9ydCBxdWV1ZSAoc2VxdWVudGlhbCBtb2RhbHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0ltcG9ydFF1ZXVlKFxyXG4gIGpvYnM6IEpvYlBvc3RbXSxcclxuICBpbmRleDogbnVtYmVyLFxyXG4gIGJ1bGtEZWZhdWx0cz86IEJ1bGtEZWZhdWx0c1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBpZiAoaW5kZXggPj0gam9icy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgY29uc3Qgam9iID0gam9ic1tpbmRleF07XHJcblxyXG4gIGxldCBhaUNhdGVnb3J5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gIGlmIChjYWNoZWRDYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1zZzogQ2xhc3NpZnlDYXRlZ29yeU1lc3NhZ2UgPSB7XHJcbiAgICAgICAgdHlwZTogXCJDTEFTU0lGWV9DQVRFR09SWVwiLFxyXG4gICAgICAgIHRpdGxlOiBqb2IudGl0bGUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGpvYi5kZXNjcmlwdGlvbixcclxuICAgICAgICBhdmFpbGFibGVDYXRlZ29yaWVzOiBjYWNoZWRDYXRlZ29yaWVzLm1hcCgoYykgPT4gYy5uYW1lKSxcclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTxDbGFzc2lmeUNhdGVnb3J5TWVzc2FnZSwgQ2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlPihtc2cpLFxyXG4gICAgICAgIG5ldyBQcm9taXNlPENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZT4oKHJlc29sdmUpID0+XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSB9KSwgNDAwMClcclxuICAgICAgICApLFxyXG4gICAgICBdKTtcclxuICAgICAgaWYgKHJlcz8uc3VjY2VzcyAmJiByZXMuY2F0ZWdvcnkpIHtcclxuICAgICAgICBhaUNhdGVnb3J5ID0gcmVzLmNhdGVnb3J5O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgLy8gTm9uLWZhdGFsXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb25zdCByZW1haW5pbmcgPSBqb2JzLmxlbmd0aCAtIGluZGV4O1xyXG5cclxuICBzaG93Sm9iTW9kYWwoXHJcbiAgICBqb2IsXHJcbiAgICBjYWNoZWRDYXRlZ29yaWVzLFxyXG4gICAgYWlDYXRlZ29yeSxcclxuICAgIHJlbWFpbmluZyA+IDFcclxuICAgICAgPyB7XHJcbiAgICAgICAgICBjdXJyZW50OiBpbmRleCArIDEsXHJcbiAgICAgICAgICB0b3RhbDogam9icy5sZW5ndGgsXHJcbiAgICAgICAgICBvbk5leHQ6ICgpID0+IHZvaWQgcHJvY2Vzc0ltcG9ydFF1ZXVlKGpvYnMsIGluZGV4ICsgMSwgYnVsa0RlZmF1bHRzKSxcclxuICAgICAgICB9XHJcbiAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgYnVsa0RlZmF1bHRzXHJcbiAgKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIE1lc3NhZ2UgbGlzdGVuZXIgKFNDQU5fVEFCICsgUElORyBmcm9tIHBvcHVwKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobXNnLCBzZW5kZXI6IHsgaWQ/OiBzdHJpbmcgfSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWQpID0+IHtcclxuICBpZiAoc2VuZGVyLmlkICE9PSBjaHJvbWUucnVudGltZS5pZCkgcmV0dXJuO1xyXG4gIGlmIChtc2cudHlwZSA9PT0gXCJQSU5HXCIpIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IG9rOiB0cnVlIH0pO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIGlmIChtc2cudHlwZSA9PT0gXCJTQ0FOX1RBQlwiKSB7XHJcbiAgICB2b2lkIGhhbmRsZVNjYW5QYWdlKCgpID0+IHt9LCAobXNnIGFzIHsgYXV0b1Njcm9sbD86IGJvb2xlYW4gfSkuYXV0b1Njcm9sbCA/PyBmYWxzZSk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBvazogdHJ1ZSB9KTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufSk7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQm9vdHN0cmFwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAvLyBQcmUtbG9hZCBjYXRlZ29yaWVzIGFuZCBpbXBvcnRlZCBVUkwgY2FjaGUgaW4gcGFyYWxsZWxcclxuICBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xyXG4gICAgcHJlbG9hZENhdGVnb3JpZXMoKSxcclxuICAgIGdldEltcG9ydGVkVXJscygpLnRoZW4oKHVybHMpID0+IHsgaW1wb3J0ZWRVcmxDYWNoZSA9IHVybHM7IH0pLFxyXG4gIF0pO1xyXG5cclxuICAvLyBTdGFydCBwZXItcG9zdCBidXR0b24gaW5qZWN0aW9uIChhdXRvLXdhdGNoZXMgZm9yIG5ldyBwb3N0cyB2aWEgTXV0YXRpb25PYnNlcnZlcilcclxuICBvYnNlcnZlQW5kSW5qZWN0QnV0dG9ucygpO1xyXG5cclxuICAvLyBGbG9hdGluZyBidWxrLXNjYW4gYnV0dG9uc1xyXG4gIGluamVjdEZsb2F0aW5nU2NhbkJ1dHRvbihcclxuICAgIChzZXRTdGF0ZSkgPT4gdm9pZCBoYW5kbGVTY2FuUGFnZShzZXRTdGF0ZSwgZmFsc2UpLFxyXG4gICAgKHNldFN0YXRlKSA9PiB2b2lkIGhhbmRsZVNjYW5QYWdlKHNldFN0YXRlLCB0cnVlKVxyXG4gICk7XHJcblxyXG4gIGNvbnNvbGUubG9nKGBbTG9jYWxQcm9dIENvbnRlbnQgc2NyaXB0IGFjdGl2ZSBvbiAke1BMQVRGT1JNfWApO1xyXG59XHJcblxyXG5pZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJsb2FkaW5nXCIpIHtcclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCAoKSA9PiB7IHZvaWQgaW5pdCgpOyB9KTtcclxufSBlbHNlIHtcclxuICB2b2lkIGluaXQoKTtcclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7QUFFQSxNQUFNLGNBQWM7QUFDcEIsTUFBTSxpQkFBaUI7QUFDdkIsTUFBTSxjQUFjO0FBSXBCLE1BQU0sb0JBQThDO0FBQUEsSUFDbEQsVUFBVSxDQUFDLFdBQVcsWUFBWSxRQUFRLFNBQVMsVUFBVSxVQUFVLFlBQVk7QUFBQSxJQUNuRixZQUFZLENBQUMsZUFBZSxjQUFj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QUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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QUk7QUFBQSxVQUNwRDtBQUFBLFFBQ0YsQ0FBQztBQUNELFlBQUksS0FBSyxXQUFXLElBQUksVUFBVTtBQUNoQyx1QkFBYSxJQUFJO0FBQUEsUUFDbkI7QUFBQSxNQUNGLFFBQVE7QUFBQSxNQUVSO0FBQUEsSUFDRjtBQUVBLFVBQU0sWUFBWSxLQUFLLFNBQVM7QUFFaEM7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBLFlBQVksSUFDUjtBQUFBLFFBQ0UsU0FBUyxRQUFRO0FBQUEsUUFDakIsT0FBTyxLQUFLO0FBQUEsUUFDWixRQUFRLE1BQU0sS0FBSyxtQkFBbUIsTUFBTSxRQUFRLEdBQUcsWUFBWTtBQUFBLE1BQ3JFLElBQ0E7QUFBQSxNQUNKO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFJQSxTQUFPLFFBQVEsVUFBVSxZQUFZLENBQUMsS0FBSyxRQUF5QixpQkFBOEM7QUFDaEgsUUFBSSxPQUFPLE9BQU8sT0FBTyxRQUFRO0FBQUk7QUFDckMsUUFBSSxJQUFJLFNBQVMsUUFBUTtBQUN2QixtQkFBYSxFQUFFLElBQUksS0FBSyxDQUFDO0FBQ3pCLGFBQU87QUFBQSxJQUNUO0FBQ0EsUUFBSSxJQUFJLFNBQVMsWUFBWTtBQUMzQixXQUFLLGVBQWUsTUFBTTtBQUFBLE1BQUMsR0FBSSxJQUFpQyxjQUFjLEtBQUs7QUFDbkYsbUJBQWEsRUFBRSxJQUFJLEtBQUssQ0FBQztBQUN6QixhQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0YsQ0FBQztBQUlELGlCQUFlLE9BQXNCO0FBRW5DLFVBQU0sUUFBUSxXQUFXO0FBQUEsTUFDdkIsa0JBQWtCO0FBQUEsTUFDbEIsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLFNBQVM7QUFBRSwyQkFBbUI7QUFBQSxNQUFNLENBQUM7QUFBQSxJQUMvRCxDQUFDO0FBR0QsNEJBQXdCO0FBR3hCO0FBQUEsTUFDRSxDQUFDLGFBQWEsS0FBSyxlQUFlLFVBQVUsS0FBSztBQUFBLE1BQ2pELENBQUMsYUFBYSxLQUFLLGVBQWUsVUFBVSxJQUFJO0FBQUEsSUFDbEQ7QUFFQSxZQUFRLElBQUksdUNBQXVDLFFBQVEsRUFBRTtBQUFBLEVBQy9EO0FBRUEsTUFBSSxTQUFTLGVBQWUsV0FBVztBQUNyQyxhQUFTLGlCQUFpQixvQkFBb0IsTUFBTTtBQUFFLFdBQUssS0FBSztBQUFBLElBQUcsQ0FBQztBQUFBLEVBQ3RFLE9BQU87QUFDTCxTQUFLLEtBQUs7QUFBQSxFQUNaOyIsCiAgIm5hbWVzIjogW10KfQo=
