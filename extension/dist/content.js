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
    const hasPhone = PHONE_REGEX.test(text);
    const hasCurrency = CURRENCY_REGEX.test(text);
    const hasEmail = EMAIL_REGEX.test(text);
    PHONE_REGEX.lastIndex = 0;
    CURRENCY_REGEX.lastIndex = 0;
    EMAIL_REGEX.lastIndex = 0;
    return { hasPhone, hasCurrency, hasEmail };
  }
  function extractJobData(element, platform) {
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
      title = extractIndeedTitle(element, text);
      description = extractIndeedDescription(element, text);
      postedBy = extractIndeedCompany(element);
      timestamp = extractGenericTimestamp(element);
    }
    if (!title) {
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 10 && l.length < 120);
      title = lines[0] ?? "Job Opportunity";
    }
    const budget = hasCurrency ? parseBudget(text) : void 0;
    const location = extractLocation(text);
    const category = autoTagCategory(text);
    return {
      title: sanitize(title.slice(0, 150)),
      description: sanitize(description.slice(0, 2e3)),
      source: platform,
      source_url: extractPostUrl(element, platform) || url,
      posted_by: sanitize(postedBy.slice(0, 100)),
      timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      location: location ? sanitize(location) : void 0,
      budget,
      category
    };
  }
  function extractFacebookTitle(element, fullText) {
    const strong = element.querySelector("strong");
    if (strong?.textContent)
      return strong.textContent.trim();
    for (const tag of ["h1", "h2", "h3"]) {
      const heading = element.querySelector(tag);
      if (heading?.textContent)
        return heading.textContent.trim();
    }
    const match = fullText.match(/(?:hiring|looking for|need)[^.!?\n]{5,80}/i);
    if (match)
      return match[0].trim();
    return "";
  }
  function extractFacebookDescription(element, fullText) {
    const textNode = element.querySelector('[data-ad-preview="message"]') ?? element.querySelector('[data-testid="post_message"]') ?? element.querySelector(".xdj266r") ?? // FB class for post body (changes often)
    element.querySelector('[dir="auto"]');
    if (textNode?.textContent)
      return textNode.textContent.trim();
    return fullText.trim();
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
  function extractLinkedInDescription(element, fullText) {
    const textNode = element.querySelector(".feed-shared-text") ?? element.querySelector(".update-components-text") ?? element.querySelector(".feed-shared-update-v2__description");
    if (textNode?.textContent)
      return textNode.textContent.trim();
    return fullText.trim();
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
    body.appendChild(form);
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
              "[data-urn]"
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
  async function autoScrollPage() {
    const totalScrolls = 6;
    for (let i = 0; i < totalScrolls; i++) {
      window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 700));
    }
    await new Promise((r) => setTimeout(r, 500));
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
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
    preloadCategories();
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdXRpbHMvcGFyc2VyLnRzIiwgIi4uL3V0aWxzL2RvbUhlbHBlcnMudHMiLCAiLi4vY29udGVudC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHR5cGUgeyBKb2JQb3N0LCBQbGF0Zm9ybSB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5cclxuY29uc3QgUEhPTkVfUkVHRVggPSAvKFxcKz9cXGRbXFxkXFxzXFwtKCkuXXs3LDE1fVxcZCkvZztcclxuY29uc3QgQ1VSUkVOQ1lfUkVHRVggPSAvKD86UEhQfEFFRHxVU0R8XFwkfFx1MjBCMXxcdTIwQUN8XHUwMEEzKVxccypbXFxkLF0rfFtcXGQsXStcXHMqKD86UEhQfEFFRHxVU0QpL2dpO1xyXG5jb25zdCBFTUFJTF9SRUdFWCA9IC9bYS16QS1aMC05Ll8lKy1dK0BbYS16QS1aMC05Li1dK1xcLlthLXpBLVpdezIsfS9nO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENhdGVnb3J5IGF1dG8tdGFnZ2luZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IENBVEVHT1JZX0tFWVdPUkRTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgUGx1bWJpbmc6IFtcInBsdW1iZXJcIiwgXCJwbHVtYmluZ1wiLCBcInBpcGVcIiwgXCJkcmFpblwiLCBcImZhdWNldFwiLCBcInRvaWxldFwiLCBcIndhdGVyIGxlYWtcIl0sXHJcbiAgRWxlY3RyaWNhbDogW1wiZWxlY3RyaWNpYW5cIiwgXCJlbGVjdHJpY2FsXCIsIFwid2lyaW5nXCIsIFwiY2lyY3VpdFwiLCBcInBhbmVsXCIsIFwib3V0bGV0XCIsIFwidm9sdGFnZVwiXSxcclxuICBDYXJwZW50cnk6IFtcImNhcnBlbnRlclwiLCBcImNhcnBlbnRyeVwiLCBcIndvb2RcIiwgXCJmdXJuaXR1cmVcIiwgXCJjYWJpbmV0XCIsIFwiZmxvb3JpbmdcIl0sXHJcbiAgUGFpbnRpbmc6IFtcInBhaW50ZXJcIiwgXCJwYWludGluZ1wiLCBcInBhaW50XCIsIFwiY29hdGluZ1wiLCBcIndhbGxwYXBlclwiLCBcImZpbmlzaGluZ1wiXSxcclxuICBDbGVhbmluZzogW1wiY2xlYW5lclwiLCBcImNsZWFuaW5nXCIsIFwiaG91c2VrZWVwaW5nXCIsIFwiamFuaXRvcmlhbFwiLCBcInNhbml0YXRpb25cIiwgXCJtYWlkXCJdLFxyXG4gIERyaXZpbmc6IFtcImRyaXZlclwiLCBcImRyaXZpbmdcIiwgXCJkZWxpdmVyeVwiLCBcImNvdXJpZXJcIiwgXCJ0cmFuc3BvcnRcIiwgXCJsb2dpc3RpY3NcIiwgXCJncmFiXCJdLFxyXG4gIEhWQUM6IFtcImh2YWNcIiwgXCJhaXJjb25cIiwgXCJhaXIgY29uZGl0aW9uaW5nXCIsIFwiYWlyY29uZGl0aW9uaW5nXCIsIFwicmVmcmlnZXJhdGlvblwiLCBcImNvb2xpbmdcIiwgXCJoZWF0aW5nXCJdLFxyXG4gIFdlbGRpbmc6IFtcIndlbGRlclwiLCBcIndlbGRpbmdcIiwgXCJmYWJyaWNhdGlvblwiLCBcInN0ZWVsXCIsIFwibWV0YWxcIl0sXHJcbiAgQ29uc3RydWN0aW9uOiBbXCJtYXNvblwiLCBcIm1hc29ucnlcIiwgXCJjb25zdHJ1Y3Rpb25cIiwgXCJsYWJvcmVyXCIsIFwiY29uY3JldGVcIiwgXCJidWlsZGVyXCIsIFwic2NhZmZvbGRpbmdcIl0sXHJcbiAgTWVjaGFuaWNhbDogW1wibWVjaGFuaWNcIiwgXCJtZWNoYW5pY2FsXCIsIFwiZW5naW5lXCIsIFwibW90b3JcIiwgXCJhdXRvbW90aXZlXCIsIFwidmVoaWNsZVwiLCBcInJlcGFpclwiXSxcclxuICBJVDogW1wiZGV2ZWxvcGVyXCIsIFwicHJvZ3JhbW1lclwiLCBcInNvZnR3YXJlXCIsIFwiY29kaW5nXCIsIFwid2ViXCIsIFwiYXBwXCIsIFwiaXQgc3VwcG9ydFwiLCBcIm5ldHdvcmtcIl0sXHJcbiAgRGVzaWduOiBbXCJkZXNpZ25lclwiLCBcImdyYXBoaWNcIiwgXCJ1aVwiLCBcInV4XCIsIFwiY3JlYXRpdmVcIiwgXCJpbGx1c3RyYXRvclwiLCBcInBob3Rvc2hvcFwiXSxcclxuICBIZWFsdGhjYXJlOiBbXCJudXJzZVwiLCBcImNhcmVnaXZlclwiLCBcIm1lZGljYWxcIiwgXCJoZWFsdGhjYXJlXCIsIFwiZG9jdG9yXCIsIFwidGhlcmFwaXN0XCJdLFxyXG4gIEVkdWNhdGlvbjogW1widGVhY2hlclwiLCBcInR1dG9yXCIsIFwiaW5zdHJ1Y3RvclwiLCBcImVkdWNhdG9yXCIsIFwidHJhaW5lclwiLCBcInRlYWNoaW5nXCJdLFxyXG4gIFNlY3VyaXR5OiBbXCJzZWN1cml0eSBndWFyZFwiLCBcInNlY3VyaXR5IG9mZmljZXJcIiwgXCJib2R5Z3VhcmRcIiwgXCJjY3R2XCIsIFwicGF0cm9sXCJdLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gYXV0b1RhZ0NhdGVnb3J5KHRleHQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgY29uc3QgbG93ZXIgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XHJcbiAgbGV0IGJlc3RDYXRlZ29yeTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIGxldCBiZXN0U2NvcmUgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwga2V5d29yZHNdIG9mIE9iamVjdC5lbnRyaWVzKENBVEVHT1JZX0tFWVdPUkRTKSkge1xyXG4gICAgY29uc3Qgc2NvcmUgPSBrZXl3b3Jkcy5maWx0ZXIoKGt3KSA9PiBsb3dlci5pbmNsdWRlcyhrdykpLmxlbmd0aDtcclxuICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xyXG4gICAgICBiZXN0U2NvcmUgPSBzY29yZTtcclxuICAgICAgYmVzdENhdGVnb3J5ID0gY2F0ZWdvcnk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYmVzdFNjb3JlID4gMCA/IGJlc3RDYXRlZ29yeSA6IHVuZGVmaW5lZDtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFNpZ25hbCBleHRyYWN0aW9uIChwaG9uZSAvIGN1cnJlbmN5IC8gZW1haWwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuaW50ZXJmYWNlIFBvc3RTaWduYWxzIHtcclxuICBoYXNQaG9uZTogYm9vbGVhbjtcclxuICBoYXNDdXJyZW5jeTogYm9vbGVhbjtcclxuICBoYXNFbWFpbDogYm9vbGVhbjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFNpZ25hbHModGV4dDogc3RyaW5nKTogUG9zdFNpZ25hbHMge1xyXG4gIGNvbnN0IGhhc1Bob25lID0gUEhPTkVfUkVHRVgudGVzdCh0ZXh0KTtcclxuICBjb25zdCBoYXNDdXJyZW5jeSA9IENVUlJFTkNZX1JFR0VYLnRlc3QodGV4dCk7XHJcbiAgY29uc3QgaGFzRW1haWwgPSBFTUFJTF9SRUdFWC50ZXN0KHRleHQpO1xyXG5cclxuICBQSE9ORV9SRUdFWC5sYXN0SW5kZXggPSAwO1xyXG4gIENVUlJFTkNZX1JFR0VYLmxhc3RJbmRleCA9IDA7XHJcbiAgRU1BSUxfUkVHRVgubGFzdEluZGV4ID0gMDtcclxuXHJcbiAgcmV0dXJuIHsgaGFzUGhvbmUsIGhhc0N1cnJlbmN5LCBoYXNFbWFpbCB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgUHVibGljIGRldGVjdGlvbiBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4vKipcclxuICogQWx3YXlzIHJldHVybnMgdHJ1ZSBcdTIwMTQgdGhlIEltcG9ydCBidXR0b24gaXMgc2hvd24gb24gZXZlcnkgcG9zdC5cclxuICogRXhwb3J0ZWQgZm9yIHVzZSBpbiB0aGUgY29udGVudCBzY3JpcHQgc2Nhbm5lci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RKb2JQb3N0KF9lbGVtZW50OiBFbGVtZW50KTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGpvYiBkYXRhIGZyb20gYSBwb3N0IGVsZW1lbnQuXHJcbiAqIEhhbmRsZXMgcGxhdGZvcm0tc3BlY2lmaWMgRE9NIHN0cnVjdHVyZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Sm9iRGF0YShlbGVtZW50OiBFbGVtZW50LCBwbGF0Zm9ybTogUGxhdGZvcm0pOiBKb2JQb3N0IHtcclxuICBjb25zdCB0ZXh0ID0gZWxlbWVudC50ZXh0Q29udGVudCA/PyBcIlwiO1xyXG4gIGNvbnN0IHsgaGFzQ3VycmVuY3kgfSA9IGV4dHJhY3RTaWduYWxzKHRleHQpO1xyXG5cclxuICBsZXQgdGl0bGUgPSBcIlwiO1xyXG4gIGxldCBkZXNjcmlwdGlvbiA9IFwiXCI7XHJcbiAgbGV0IHBvc3RlZEJ5ID0gXCJcIjtcclxuICBsZXQgdGltZXN0YW1wID0gXCJcIjtcclxuICBjb25zdCB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcclxuXHJcbiAgaWYgKHBsYXRmb3JtID09PSBcImZhY2Vib29rXCIpIHtcclxuICAgIHRpdGxlID0gZXh0cmFjdEZhY2Vib29rVGl0bGUoZWxlbWVudCwgdGV4dCk7XHJcbiAgICBkZXNjcmlwdGlvbiA9IGV4dHJhY3RGYWNlYm9va0Rlc2NyaXB0aW9uKGVsZW1lbnQsIHRleHQpO1xyXG4gICAgcG9zdGVkQnkgPSBleHRyYWN0RmFjZWJvb2tQb3N0ZXIoZWxlbWVudCk7XHJcbiAgICB0aW1lc3RhbXAgPSBleHRyYWN0RmFjZWJvb2tUaW1lc3RhbXAoZWxlbWVudCk7XHJcbiAgfSBlbHNlIGlmIChwbGF0Zm9ybSA9PT0gXCJsaW5rZWRpblwiKSB7XHJcbiAgICB0aXRsZSA9IGV4dHJhY3RMaW5rZWRJblRpdGxlKGVsZW1lbnQsIHRleHQpO1xyXG4gICAgZGVzY3JpcHRpb24gPSBleHRyYWN0TGlua2VkSW5EZXNjcmlwdGlvbihlbGVtZW50LCB0ZXh0KTtcclxuICAgIHBvc3RlZEJ5ID0gZXh0cmFjdExpbmtlZEluUG9zdGVyKGVsZW1lbnQpO1xyXG4gICAgdGltZXN0YW1wID0gZXh0cmFjdExpbmtlZEluVGltZXN0YW1wKGVsZW1lbnQpO1xyXG4gIH0gZWxzZSBpZiAocGxhdGZvcm0gPT09IFwiam9ic3RyZWV0XCIpIHtcclxuICAgIHRpdGxlID0gZXh0cmFjdEpvYlN0cmVldFRpdGxlKGVsZW1lbnQsIHRleHQpO1xyXG4gICAgZGVzY3JpcHRpb24gPSBleHRyYWN0Sm9iU3RyZWV0RGVzY3JpcHRpb24oZWxlbWVudCwgdGV4dCk7XHJcbiAgICBwb3N0ZWRCeSA9IGV4dHJhY3RKb2JTdHJlZXRDb21wYW55KGVsZW1lbnQpO1xyXG4gICAgdGltZXN0YW1wID0gZXh0cmFjdEdlbmVyaWNUaW1lc3RhbXAoZWxlbWVudCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGluZGVlZFxyXG4gICAgdGl0bGUgPSBleHRyYWN0SW5kZWVkVGl0bGUoZWxlbWVudCwgdGV4dCk7XHJcbiAgICBkZXNjcmlwdGlvbiA9IGV4dHJhY3RJbmRlZWREZXNjcmlwdGlvbihlbGVtZW50LCB0ZXh0KTtcclxuICAgIHBvc3RlZEJ5ID0gZXh0cmFjdEluZGVlZENvbXBhbnkoZWxlbWVudCk7XHJcbiAgICB0aW1lc3RhbXAgPSBleHRyYWN0R2VuZXJpY1RpbWVzdGFtcChlbGVtZW50KTtcclxuICB9XHJcblxyXG4gIC8vIEZhbGxiYWNrIHRpdGxlIGZyb20gZmlyc3QgbWVhbmluZ2Z1bCBsaW5lIG9mIHRleHRcclxuICBpZiAoIXRpdGxlKSB7XHJcbiAgICBjb25zdCBsaW5lcyA9IHRleHRcclxuICAgICAgLnNwbGl0KFwiXFxuXCIpXHJcbiAgICAgIC5tYXAoKGwpID0+IGwudHJpbSgpKVxyXG4gICAgICAuZmlsdGVyKChsKSA9PiBsLmxlbmd0aCA+IDEwICYmIGwubGVuZ3RoIDwgMTIwKTtcclxuICAgIHRpdGxlID0gbGluZXNbMF0gPz8gXCJKb2IgT3Bwb3J0dW5pdHlcIjtcclxuICB9XHJcblxyXG4gIGNvbnN0IGJ1ZGdldCA9IGhhc0N1cnJlbmN5ID8gcGFyc2VCdWRnZXQodGV4dCkgOiB1bmRlZmluZWQ7XHJcbiAgY29uc3QgbG9jYXRpb24gPSBleHRyYWN0TG9jYXRpb24odGV4dCk7XHJcbiAgY29uc3QgY2F0ZWdvcnkgPSBhdXRvVGFnQ2F0ZWdvcnkodGV4dCk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICB0aXRsZTogc2FuaXRpemUodGl0bGUuc2xpY2UoMCwgMTUwKSksXHJcbiAgICBkZXNjcmlwdGlvbjogc2FuaXRpemUoZGVzY3JpcHRpb24uc2xpY2UoMCwgMjAwMCkpLFxyXG4gICAgc291cmNlOiBwbGF0Zm9ybSxcclxuICAgIHNvdXJjZV91cmw6IGV4dHJhY3RQb3N0VXJsKGVsZW1lbnQsIHBsYXRmb3JtKSB8fCB1cmwsXHJcbiAgICBwb3N0ZWRfYnk6IHNhbml0aXplKHBvc3RlZEJ5LnNsaWNlKDAsIDEwMCkpLFxyXG4gICAgdGltZXN0YW1wOiB0aW1lc3RhbXAgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgbG9jYXRpb246IGxvY2F0aW9uID8gc2FuaXRpemUobG9jYXRpb24pIDogdW5kZWZpbmVkLFxyXG4gICAgYnVkZ2V0LFxyXG4gICAgY2F0ZWdvcnksXHJcbiAgfTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEZhY2Vib29rLXNwZWNpZmljIGV4dHJhY3RvcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBleHRyYWN0RmFjZWJvb2tUaXRsZShlbGVtZW50OiBFbGVtZW50LCBmdWxsVGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAvLyBUcnkgc3Ryb25nL2JvbGQgdGFncyB0aGF0IG9mdGVuIGNvbnRhaW4gam9iIHRpdGxlXHJcbiAgY29uc3Qgc3Ryb25nID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwic3Ryb25nXCIpO1xyXG4gIGlmIChzdHJvbmc/LnRleHRDb250ZW50KSByZXR1cm4gc3Ryb25nLnRleHRDb250ZW50LnRyaW0oKTtcclxuXHJcbiAgLy8gVHJ5IGgxL2gyL2gzXHJcbiAgZm9yIChjb25zdCB0YWcgb2YgW1wiaDFcIiwgXCJoMlwiLCBcImgzXCJdKSB7XHJcbiAgICBjb25zdCBoZWFkaW5nID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKHRhZyk7XHJcbiAgICBpZiAoaGVhZGluZz8udGV4dENvbnRlbnQpIHJldHVybiBoZWFkaW5nLnRleHRDb250ZW50LnRyaW0oKTtcclxuICB9XHJcblxyXG4gIC8vIFVzZSB0aGUgZmlyc3QgY2FwaXRhbGl6ZWQgc2VudGVuY2UgdGhhdCBtYXRjaGVzIGEgam9iIHBhdHRlcm5cclxuICBjb25zdCBtYXRjaCA9IGZ1bGxUZXh0Lm1hdGNoKC8oPzpoaXJpbmd8bG9va2luZyBmb3J8bmVlZClbXi4hP1xcbl17NSw4MH0vaSk7XHJcbiAgaWYgKG1hdGNoKSByZXR1cm4gbWF0Y2hbMF0udHJpbSgpO1xyXG5cclxuICByZXR1cm4gXCJcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEZhY2Vib29rRGVzY3JpcHRpb24oZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgLy8gRmFjZWJvb2sgcG9zdCB0ZXh0IGxpdmVzIGluIGRpdltkYXRhLWFkLXByZXZpZXc9XCJtZXNzYWdlXCJdIG9yIFtkaXI9XCJhdXRvXCJdIHNwYW5zXHJcbiAgY29uc3QgdGV4dE5vZGUgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hZC1wcmV2aWV3PVwibWVzc2FnZVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInBvc3RfbWVzc2FnZVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIueGRqMjY2clwiKSA/PyAvLyBGQiBjbGFzcyBmb3IgcG9zdCBib2R5IChjaGFuZ2VzIG9mdGVuKVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGlyPVwiYXV0b1wiXScpO1xyXG5cclxuICBpZiAodGV4dE5vZGU/LnRleHRDb250ZW50KSByZXR1cm4gdGV4dE5vZGUudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICByZXR1cm4gZnVsbFRleHQudHJpbSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0RmFjZWJvb2tQb3N0ZXIoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgLy8gQWN0b3IgbmFtZSB0eXBpY2FsbHkgaW4gYSBsaW5rIHdpdGggYXJpYS1sYWJlbCBvciBwcm9maWxlIGxpbmtcclxuICBjb25zdCBhY3RvckxpbmsgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdhW3JvbGU9XCJsaW5rXCJdW3RhYmluZGV4PVwiMFwiXSBzdHJvbmcnKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJzdG9yeS1zdWJ0aXRsZVwiXSBhJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImgzIGFcIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImg0IGFcIik7XHJcblxyXG4gIHJldHVybiBhY3Rvckxpbms/LnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEZhY2Vib29rVGltZXN0YW1wKGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpbWVFbCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImFiYnJbZGF0YS11dGltZV1cIik7XHJcbiAgaWYgKHRpbWVFbCkge1xyXG4gICAgY29uc3QgdXRpbWUgPSB0aW1lRWwuZ2V0QXR0cmlidXRlKFwiZGF0YS11dGltZVwiKTtcclxuICAgIGlmICh1dGltZSkgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHV0aW1lKSAqIDEwMDApLnRvSVNPU3RyaW5nKCk7XHJcbiAgfVxyXG5cclxuICBjb25zdCB0aW1lVGFnID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwidGltZVwiKTtcclxuICBpZiAodGltZVRhZykge1xyXG4gICAgY29uc3QgZHQgPSB0aW1lVGFnLmdldEF0dHJpYnV0ZShcImRhdGV0aW1lXCIpO1xyXG4gICAgaWYgKGR0KSByZXR1cm4gbmV3IERhdGUoZHQpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBpZiAodGltZVRhZy50ZXh0Q29udGVudCkgcmV0dXJuIHRpbWVUYWcudGV4dENvbnRlbnQudHJpbSgpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFBvc3RVcmwoZWxlbWVudDogRWxlbWVudCwgcGxhdGZvcm06IFBsYXRmb3JtKTogc3RyaW5nIHtcclxuICBpZiAocGxhdGZvcm0gPT09IFwiZmFjZWJvb2tcIikge1xyXG4gICAgY29uc3QgbGlua3MgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEFuY2hvckVsZW1lbnQ+KFwiYVtocmVmXVwiKTtcclxuICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xyXG4gICAgICBjb25zdCBocmVmID0gbGluay5ocmVmO1xyXG4gICAgICBpZiAoaHJlZi5pbmNsdWRlcyhcIi9wb3N0cy9cIikgfHwgaHJlZi5pbmNsdWRlcyhcInN0b3J5X2ZiaWRcIikgfHwgaHJlZi5pbmNsdWRlcyhcInBlcm1hbGlua1wiKSkge1xyXG4gICAgICAgIHJldHVybiBocmVmO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChwbGF0Zm9ybSA9PT0gXCJsaW5rZWRpblwiKSB7XHJcbiAgICBjb25zdCBsaW5rcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MQW5jaG9yRWxlbWVudD4oXCJhW2hyZWZdXCIpO1xyXG4gICAgZm9yIChjb25zdCBsaW5rIG9mIGxpbmtzKSB7XHJcbiAgICAgIGNvbnN0IGhyZWYgPSBsaW5rLmhyZWY7XHJcbiAgICAgIGlmIChocmVmLmluY2x1ZGVzKFwiL2ZlZWQvdXBkYXRlL1wiKSB8fCBocmVmLmluY2x1ZGVzKFwiL3Bvc3RzL1wiKSB8fCBocmVmLmluY2x1ZGVzKFwidWdjUG9zdFwiKSkge1xyXG4gICAgICAgIHJldHVybiBocmVmO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChwbGF0Zm9ybSA9PT0gXCJqb2JzdHJlZXRcIikge1xyXG4gICAgY29uc3QgbGluayA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MQW5jaG9yRWxlbWVudD4oXCJhW2hyZWYqPScvam9iLyddLCBhW2RhdGEtYXV0b21hdGlvbj0nam9iLWxpc3QtaXRlbS1saW5rLW92ZXJsYXknXVwiKTtcclxuICAgIGlmIChsaW5rPy5ocmVmKSByZXR1cm4gbGluay5ocmVmO1xyXG4gICAgY29uc3Qgam9iSWQgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtam9iLWlkXCIpID8/IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS1hdXRvbWF0aW9uLWlkXCIpO1xyXG4gICAgaWYgKGpvYklkKSByZXR1cm4gYGh0dHBzOi8vd3d3LmpvYnN0cmVldC5jb20ucGgvam9iLyR7am9iSWR9YDtcclxuICB9IGVsc2UgaWYgKHBsYXRmb3JtID09PSBcImluZGVlZFwiKSB7XHJcbiAgICBjb25zdCBsaW5rID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yPEhUTUxBbmNob3JFbGVtZW50PihcImFbaHJlZio9Jy9yYy9jbGsnXSwgYVtocmVmKj0nL3ZpZXdqb2InXSwgaDIgYVwiKTtcclxuICAgIGlmIChsaW5rPy5ocmVmKSByZXR1cm4gbGluay5ocmVmO1xyXG4gICAgY29uc3QgamsgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImRhdGEtamtcIik7XHJcbiAgICBpZiAoamspIHJldHVybiBgaHR0cHM6Ly9waC5pbmRlZWQuY29tL3ZpZXdqb2I/ams9JHtqa31gO1xyXG4gIH1cclxuICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBMaW5rZWRJbi1zcGVjaWZpYyBleHRyYWN0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdExpbmtlZEluVGl0bGUoZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgLy8gTGlua2VkSW4gam9iIHVwZGF0ZSB0aXRsZSBvZnRlbiBpbiAuZmVlZC1zaGFyZWQtdGV4dCBzdHJvbmcgb3IgLnVwZGF0ZS1jb21wb25lbnRzLXRleHRcclxuICBjb25zdCBzdHJvbmcgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmZlZWQtc2hhcmVkLXRleHQgc3Ryb25nXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudXBkYXRlLWNvbXBvbmVudHMtdGV4dCBzdHJvbmdcIik7XHJcbiAgaWYgKHN0cm9uZz8udGV4dENvbnRlbnQpIHJldHVybiBzdHJvbmcudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICAvLyBJbmxpbmUgam9iIGxpc3RpbmcgdGl0bGVcclxuICBjb25zdCBqb2JUaXRsZSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcclxuICAgIFwiLmpvYi1jYXJkLWNvbnRhaW5lcl9fbGluaywgLmpvYnMtdW5pZmllZC10b3AtY2FyZF9fam9iLXRpdGxlXCJcclxuICApO1xyXG4gIGlmIChqb2JUaXRsZT8udGV4dENvbnRlbnQpIHJldHVybiBqb2JUaXRsZS50ZXh0Q29udGVudC50cmltKCk7XHJcblxyXG4gIGNvbnN0IG1hdGNoID0gZnVsbFRleHQubWF0Y2goLyg/OmhpcmluZ3xsb29raW5nIGZvcnxuZWVkKVteLiE/XFxuXXs1LDgwfS9pKTtcclxuICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaFswXS50cmltKCk7XHJcblxyXG4gIHJldHVybiBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5EZXNjcmlwdGlvbihlbGVtZW50OiBFbGVtZW50LCBmdWxsVGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCB0ZXh0Tm9kZSA9XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuZmVlZC1zaGFyZWQtdGV4dFwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLnVwZGF0ZS1jb21wb25lbnRzLXRleHRcIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi5mZWVkLXNoYXJlZC11cGRhdGUtdjJfX2Rlc2NyaXB0aW9uXCIpO1xyXG5cclxuICBpZiAodGV4dE5vZGU/LnRleHRDb250ZW50KSByZXR1cm4gdGV4dE5vZGUudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICByZXR1cm4gZnVsbFRleHQudHJpbSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5Qb3N0ZXIoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgY29uc3QgYWN0b3IgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLnVwZGF0ZS1jb21wb25lbnRzLWFjdG9yX19uYW1lIHNwYW5bYXJpYS1oaWRkZW49J3RydWUnXVwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmZlZWQtc2hhcmVkLWFjdG9yX19uYW1lXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudXBkYXRlLWNvbXBvbmVudHMtYWN0b3JfX25hbWVcIik7XHJcblxyXG4gIHJldHVybiBhY3Rvcj8udGV4dENvbnRlbnQ/LnRyaW0oKSA/PyBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5UaW1lc3RhbXAoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdGltZUVsID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwidGltZVwiKTtcclxuICBpZiAodGltZUVsKSB7XHJcbiAgICBjb25zdCBkdCA9IHRpbWVFbC5nZXRBdHRyaWJ1dGUoXCJkYXRldGltZVwiKTtcclxuICAgIGlmIChkdCkgcmV0dXJuIG5ldyBEYXRlKGR0KS50b0lTT1N0cmluZygpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVsYXRpdmVUaW1lID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFxyXG4gICAgXCIuZmVlZC1zaGFyZWQtYWN0b3JfX3N1Yi1kZXNjcmlwdGlvbiwgLnVwZGF0ZS1jb21wb25lbnRzLWFjdG9yX19zdWItZGVzY3JpcHRpb25cIlxyXG4gICk7XHJcbiAgaWYgKHJlbGF0aXZlVGltZT8udGV4dENvbnRlbnQpIHJldHVybiByZWxhdGl2ZVRpbWUudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgSm9iU3RyZWV0LXNwZWNpZmljIGV4dHJhY3RvcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBleHRyYWN0Sm9iU3RyZWV0VGl0bGUoZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgdGl0bGUgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hdXRvbWF0aW9uPVwiam9iLWNhcmQtdGl0bGVcIl0gc3BhbicpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWF1dG9tYXRpb249XCJqb2ItY2FyZC10aXRsZVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoMSwgaDIsIGgzXCIpO1xyXG4gIGlmICh0aXRsZT8udGV4dENvbnRlbnQpIHJldHVybiB0aXRsZS50ZXh0Q29udGVudC50cmltKCk7XHJcbiAgY29uc3QgbGluZXMgPSBmdWxsVGV4dC5zcGxpdChcIlxcblwiKS5tYXAoKGwpID0+IGwudHJpbSgpKS5maWx0ZXIoKGwpID0+IGwubGVuZ3RoID4gNSAmJiBsLmxlbmd0aCA8IDEyMCk7XHJcbiAgcmV0dXJuIGxpbmVzWzBdID8/IFwiSm9iIE9wZW5pbmdcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEpvYlN0cmVldERlc2NyaXB0aW9uKGVsZW1lbnQ6IEVsZW1lbnQsIGZ1bGxUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGRlc2MgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hdXRvbWF0aW9uPVwiam9iLWNhcmQtdGVhc2VyXCJdJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2NsYXNzKj1cInRlYXNlclwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tjbGFzcyo9XCJkZXNjcmlwdGlvblwiXScpO1xyXG4gIGlmIChkZXNjPy50ZXh0Q29udGVudCkgcmV0dXJuIGRlc2MudGV4dENvbnRlbnQudHJpbSgpO1xyXG4gIHJldHVybiBmdWxsVGV4dC50cmltKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RKb2JTdHJlZXRDb21wYW55KGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGNvbXBhbnkgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hdXRvbWF0aW9uPVwiam9iLWNhcmQtY29tcGFueVwiXScpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tjbGFzcyo9XCJjb21wYW55XCJdJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2NsYXNzKj1cImFkdmVydGlzZXJcIl0nKTtcclxuICByZXR1cm4gY29tcGFueT8udGV4dENvbnRlbnQ/LnRyaW0oKSA/PyBcIlwiO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgSW5kZWVkLXNwZWNpZmljIGV4dHJhY3RvcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBleHRyYWN0SW5kZWVkVGl0bGUoZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgdGl0bGUgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiaDIuam9iVGl0bGUgc3Bhblt0aXRsZV1cIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcImgyLmpvYlRpdGxlIHNwYW46bm90KFtjbGFzc10pXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuam9iVGl0bGUgYSBzcGFuXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoMiwgaDNcIik7XHJcbiAgaWYgKHRpdGxlPy50ZXh0Q29udGVudCkgcmV0dXJuIHRpdGxlLnRleHRDb250ZW50LnRyaW0oKTtcclxuICBjb25zdCBsaW5lcyA9IGZ1bGxUZXh0LnNwbGl0KFwiXFxuXCIpLm1hcCgobCkgPT4gbC50cmltKCkpLmZpbHRlcigobCkgPT4gbC5sZW5ndGggPiA1ICYmIGwubGVuZ3RoIDwgMTIwKTtcclxuICByZXR1cm4gbGluZXNbMF0gPz8gXCJKb2IgT3BlbmluZ1wiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0SW5kZWVkRGVzY3JpcHRpb24oZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgZGVzYyA9XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuam9iLXNuaXBwZXRcIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2NsYXNzKj1cInNuaXBwZXRcIl0nKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbY2xhc3MqPVwiZGVzY3JpcHRpb25cIl0nKTtcclxuICBpZiAoZGVzYz8udGV4dENvbnRlbnQpIHJldHVybiBkZXNjLnRleHRDb250ZW50LnRyaW0oKTtcclxuICByZXR1cm4gZnVsbFRleHQudHJpbSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0SW5kZWVkQ29tcGFueShlbGVtZW50OiBFbGVtZW50KTogc3RyaW5nIHtcclxuICBjb25zdCBjb21wYW55ID1cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi5jb21wYW55TmFtZVwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS10ZXN0aWQ9XCJjb21wYW55LW5hbWVcIl0nKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCdbY2xhc3MqPVwiY29tcGFueVwiXScpO1xyXG4gIHJldHVybiBjb21wYW55Py50ZXh0Q29udGVudD8udHJpbSgpID8/IFwiXCI7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBHZW5lcmljIHRpbWVzdGFtcCBmYWxsYmFjayBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RHZW5lcmljVGltZXN0YW1wKGVsZW1lbnQ6IEVsZW1lbnQpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpbWVFbCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcInRpbWVcIik7XHJcbiAgaWYgKHRpbWVFbCkge1xyXG4gICAgY29uc3QgZHQgPSB0aW1lRWwuZ2V0QXR0cmlidXRlKFwiZGF0ZXRpbWVcIik7XHJcbiAgICBpZiAoZHQpIHJldHVybiBuZXcgRGF0ZShkdCkudG9JU09TdHJpbmcoKTtcclxuICB9XHJcbiAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFNoYXJlZCBoZWxwZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gcGFyc2VCdWRnZXQodGV4dDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuICBDVVJSRU5DWV9SRUdFWC5sYXN0SW5kZXggPSAwO1xyXG4gIGNvbnN0IG1hdGNoID0gQ1VSUkVOQ1lfUkVHRVguZXhlYyh0ZXh0KTtcclxuICBpZiAoIW1hdGNoKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuICBjb25zdCBudW1TdHIgPSBtYXRjaFswXS5yZXBsYWNlKC9bXjAtOV0vZywgXCJcIik7XHJcbiAgY29uc3QgbnVtID0gcGFyc2VJbnQobnVtU3RyLCAxMCk7XHJcbiAgcmV0dXJuIGlzTmFOKG51bSkgPyB1bmRlZmluZWQgOiBudW07XHJcbn1cclxuXHJcbmNvbnN0IExPQ0FUSU9OX1BBVFRFUk5TID0gW1xyXG4gIC9cXGJsb2NhdGlvbls6XFxzXSsoW0EtWmEtelxccyxdKz8pKD86XFwufCx8XFxufCQpL2ksXHJcbiAgL1xcYig/OmJhc2VkIGlufGxvY2F0ZWQgaW58d29yayBpbnx3b3JraW5nIGlufHNpdGVbOlxcc10rKVxccyooW0EtWmEtelxccyxdKz8pKD86XFwufCx8XFxufCQpL2ksXHJcbiAgL1xcYig/OmlufGF0KVxccysoW0EtWl1bYS16XSsoPzpbXFxzLF0rW0EtWl1bYS16XSspKikoPz1cXHMqW1xcLlxcLFxcbl0pLyxcclxuICAvXFxiKFtBLVpdW2Etel0rKD86XFxzW0EtWl1bYS16XSspKiksXFxzKig/Ok1ldHJvXFxzKT8oPzpNYW5pbGF8Q2VidXxEYXZhb3xRdWV6b24gQ2l0eXxNYWthdGl8UGFzaWd8VGFndWlnfE1hbmRhbHV5b25nfFBhcmFcdTAwRjFhcXVlfExhcyBQaVx1MDBGMWFzfE11bnRpbmx1cGF8Q2Fsb29jYW58TWFyaWtpbmF8UGFzYXl8RHViYWl8QWJ1IERoYWJpfFNoYXJqYWh8U2luZ2Fwb3JlfFJpeWFkaHxRYXRhcikvLFxyXG5dO1xyXG5cclxuZnVuY3Rpb24gZXh0cmFjdExvY2F0aW9uKHRleHQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIExPQ0FUSU9OX1BBVFRFUk5TKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IHRleHQubWF0Y2gocGF0dGVybik7XHJcbiAgICBpZiAobWF0Y2g/LlsxXSkgcmV0dXJuIG1hdGNoWzFdLnRyaW0oKTtcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLyoqIFN0cmlwIEhUTUwgdGFncyBhbmQgdHJpbSB3aGl0ZXNwYWNlICovXHJcbmZ1bmN0aW9uIHNhbml0aXplKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBpbnB1dC5yZXBsYWNlKC88W14+XSo+L2csIFwiXCIpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKTtcclxufVxyXG4iLCAiaW1wb3J0IHR5cGUge1xyXG4gIEJ1bGtEZWZhdWx0cyxcclxuICBDYXRlZ29yeSxcclxuICBFc3RpbWF0ZUJ1ZGdldE1lc3NhZ2UsXHJcbiAgRXN0aW1hdGVCdWRnZXRSZXNwb25zZSxcclxuICBJbXBvcnRKb2JNZXNzYWdlLFxyXG4gIEltcG9ydEpvYlJlc3BvbnNlLFxyXG4gIEpvYlBvc3QsXHJcbn0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ29uc3RhbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuY29uc3QgU0NBTl9CVE5fSUQgICA9IFwibG9jYWxwcm8tc2Nhbi1ob3N0XCI7XHJcbmNvbnN0IFBBTkVMX0hPU1RfSUQgPSBcImxvY2FscHJvLXBhbmVsLWhvc3RcIjtcclxuY29uc3QgTU9EQUxfSE9TVF9JRCA9IFwibG9jYWxwcm8tbW9kYWwtaG9zdFwiO1xyXG5jb25zdCBMUF9VUkwgICAgICAgID0gXCJodHRwczovL3d3dy5sb2NhbHByby5hc2lhXCI7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgU2hhcmVkIFNoYWRvdyBET00gc3R5bGVzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuY29uc3QgQkFTRV9TVFlMRVMgPSBgXHJcbiAgOmhvc3QgeyBhbGw6IGluaXRpYWw7IGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIHNhbnMtc2VyaWY7IH1cclxuXHJcbiAgLyogXHUyNTAwXHUyNTAwIEZsb2F0aW5nIHNjYW4gYnV0dG9ucyBcdTI1MDBcdTI1MDAgKi9cclxuICAubHAtZmFiLXdyYXAge1xyXG4gICAgcG9zaXRpb246IGZpeGVkO1xyXG4gICAgYm90dG9tOiAyOHB4O1xyXG4gICAgcmlnaHQ6IDI4cHg7XHJcbiAgICB6LWluZGV4OiAyMTQ3NDgzNjQ2O1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcbiAgICBhbGlnbi1pdGVtczogZmxleC1lbmQ7XHJcbiAgICBnYXA6IDhweDtcclxuICB9XHJcbiAgLmxwLWZhYiB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDhweDtcclxuICAgIHBhZGRpbmc6IDExcHggMThweDtcclxuICAgIGJhY2tncm91bmQ6ICMxYTU2ZGI7XHJcbiAgICBjb2xvcjogI2ZmZjtcclxuICAgIGZvbnQtc2l6ZTogMTNweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBib3JkZXItcmFkaXVzOiA1MHB4O1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgYm94LXNoYWRvdzogMCA0cHggMTZweCByZ2JhKDI2LDg2LDIxOSwuNDUpO1xyXG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAuMnMsIHRyYW5zZm9ybSAuMTVzLCBib3gtc2hhZG93IC4ycztcclxuICAgIGxpbmUtaGVpZ2h0OiAxO1xyXG4gICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcclxuICB9XHJcbiAgLmxwLWZhYjpob3ZlciAgeyBiYWNrZ3JvdW5kOiAjMWU0MjlmOyBib3gtc2hhZG93OiAwIDZweCAyMHB4IHJnYmEoMjYsODYsMjE5LC41NSk7IHRyYW5zZm9ybTogdHJhbnNsYXRlWSgtMXB4KTsgfVxyXG4gIC5scC1mYWI6YWN0aXZlIHsgdHJhbnNmb3JtOiBzY2FsZSgwLjk2KTsgfVxyXG4gIC5scC1mYWI6ZGlzYWJsZWQgeyBiYWNrZ3JvdW5kOiAjNmI3MjgwOyBjdXJzb3I6IG5vdC1hbGxvd2VkOyBib3gtc2hhZG93OiBub25lOyB0cmFuc2Zvcm06IG5vbmU7IH1cclxuICAubHAtZmFiLnNlY29uZGFyeSB7IGJhY2tncm91bmQ6ICMwZjc2NmU7IGJveC1zaGFkb3c6IDAgNHB4IDE2cHggcmdiYSgxNSwxMTgsMTEwLC40KTsgZm9udC1zaXplOiAxMnB4OyBwYWRkaW5nOiA5cHggMTRweDsgfVxyXG4gIC5scC1mYWIuc2Vjb25kYXJ5OmhvdmVyIHsgYmFja2dyb3VuZDogIzBkNWU1ODsgfVxyXG4gIC5scC1mYWIgc3ZnIHsgZmxleC1zaHJpbms6IDA7IH1cclxuXHJcbiAgLyogXHUyNTAwXHUyNTAwIFNlbGVjdGlvbiBwYW5lbCAoc2lkZSBkcmF3ZXIpIFx1MjUwMFx1MjUwMCAqL1xyXG4gIC5scC1wYW5lbC1vdmVybGF5IHtcclxuICAgIHBvc2l0aW9uOiBmaXhlZDtcclxuICAgIGluc2V0OiAwO1xyXG4gICAgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwuMzUpO1xyXG4gICAgei1pbmRleDogMjE0NzQ4MzY0NjtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kO1xyXG4gICAgYW5pbWF0aW9uOiBscC1mYWRlLWluIC4xNXMgZWFzZTtcclxuICB9XHJcbiAgQGtleWZyYW1lcyBscC1mYWRlLWluIHsgZnJvbSB7IG9wYWNpdHk6IDAgfSB0byB7IG9wYWNpdHk6IDEgfSB9XHJcblxyXG4gIC5scC1wYW5lbCB7XHJcbiAgICB3aWR0aDogNDQwcHg7XHJcbiAgICBtYXgtd2lkdGg6IDEwMHZ3O1xyXG4gICAgaGVpZ2h0OiAxMDAlO1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xyXG4gICAgYm94LXNoYWRvdzogLTRweCAwIDI0cHggcmdiYSgwLDAsMCwuMTUpO1xyXG4gICAgYW5pbWF0aW9uOiBscC1zbGlkZS1sZWZ0IC4ycyBlYXNlO1xyXG4gIH1cclxuICBAa2V5ZnJhbWVzIGxwLXNsaWRlLWxlZnQgeyBmcm9tIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDQwcHgpOyBvcGFjaXR5OiAwIH0gdG8geyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMCk7IG9wYWNpdHk6IDEgfSB9XHJcblxyXG4gIC5scC1wYW5lbC1oZWFkZXIge1xyXG4gICAgcGFkZGluZzogMTZweCAxOHB4IDEycHg7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2U1ZTdlYjtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xyXG4gICAgZmxleC1zaHJpbms6IDA7XHJcbiAgfVxyXG4gIC5scC1wYW5lbC10aXRsZSB7XHJcbiAgICBmb250LXNpemU6IDE1cHg7XHJcbiAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgY29sb3I6ICMxMTE4Mjc7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogOHB4O1xyXG4gIH1cclxuICAubHAtcGFuZWwtY291bnQge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgYmFja2dyb3VuZDogI2VmZjZmZjtcclxuICAgIGNvbG9yOiAjMWU0MGFmO1xyXG4gICAgYm9yZGVyLXJhZGl1czogMjBweDtcclxuICAgIHBhZGRpbmc6IDJweCA5cHg7XHJcbiAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICBmb250LXdlaWdodDogNzAwO1xyXG4gIH1cclxuICAubHAtY2xvc2UtYnRuIHtcclxuICAgIGJhY2tncm91bmQ6IG5vbmU7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBjb2xvcjogIzZiNzI4MDtcclxuICAgIHBhZGRpbmc6IDRweDtcclxuICAgIGJvcmRlci1yYWRpdXM6IDZweDtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gIH1cclxuICAubHAtY2xvc2UtYnRuOmhvdmVyIHsgYmFja2dyb3VuZDogI2YzZjRmNjsgY29sb3I6ICMxMTE4Mjc7IH1cclxuXHJcbiAgLyogU2VhcmNoIGJhciAqL1xyXG4gIC5scC1zZWFyY2gtd3JhcCB7XHJcbiAgICBwYWRkaW5nOiAxMHB4IDE4cHg7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2YzZjRmNjtcclxuICAgIGZsZXgtc2hyaW5rOiAwO1xyXG4gIH1cclxuICAubHAtc2VhcmNoLWlucHV0IHtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgcGFkZGluZzogOHB4IDEycHggOHB4IDM0cHg7XHJcbiAgICBib3JkZXI6IDEuNXB4IHNvbGlkICNkMWQ1ZGI7XHJcbiAgICBib3JkZXItcmFkaXVzOiA4cHg7XHJcbiAgICBmb250LXNpemU6IDEzcHg7XHJcbiAgICBjb2xvcjogIzExMTgyNztcclxuICAgIGJhY2tncm91bmQ6ICNmOWZhZmIgdXJsKFwiZGF0YTppbWFnZS9zdmcreG1sLCUzQ3N2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNCcgaGVpZ2h0PScxNCcgZmlsbD0nbm9uZScgdmlld0JveD0nMCAwIDI0IDI0JyBzdHJva2U9JyUyMzZiNzI4MCcgc3Ryb2tlLXdpZHRoPScyJyUzRSUzQ3BhdGggc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBkPSdNMjEgMjFsLTQuMzUtNC4zNU0xNyAxMUE2IDYgMCAxMTUgMTFhNiA2IDAgMDExMiAweicvJTNFJTNDL3N2ZyUzRVwiKSBuby1yZXBlYXQgMTBweCBjZW50ZXI7XHJcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xyXG4gICAgb3V0bGluZTogbm9uZTtcclxuICAgIHRyYW5zaXRpb246IGJvcmRlci1jb2xvciAuMTVzO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgfVxyXG4gIC5scC1zZWFyY2gtaW5wdXQ6Zm9jdXMgeyBib3JkZXItY29sb3I6ICMxYTU2ZGI7IGJhY2tncm91bmQtY29sb3I6ICNmZmY7IH1cclxuXHJcbiAgLyogQnVsayBwcmUtZmlsbCAqL1xyXG4gIC5scC1idWxrLXNlY3Rpb24ge1xyXG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmM2Y0ZjY7XHJcbiAgICBmbGV4LXNocmluazogMDtcclxuICB9XHJcbiAgLmxwLWJ1bGstdG9nZ2xlIHtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XHJcbiAgICBwYWRkaW5nOiAxMHB4IDE4cHg7XHJcbiAgICBiYWNrZ3JvdW5kOiBub25lO1xyXG4gICAgYm9yZGVyOiBub25lO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGNvbG9yOiAjMzc0MTUxO1xyXG4gICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcclxuICAgIGxldHRlci1zcGFjaW5nOiAuNHB4O1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgfVxyXG4gIC5scC1idWxrLXRvZ2dsZTpob3ZlciB7IGJhY2tncm91bmQ6ICNmOWZhZmI7IH1cclxuICAubHAtYnVsay10b2dnbGUgc3ZnIHsgdHJhbnNpdGlvbjogdHJhbnNmb3JtIC4yczsgfVxyXG4gIC5scC1idWxrLXRvZ2dsZS5vcGVuIHN2ZyB7IHRyYW5zZm9ybTogcm90YXRlKDE4MGRlZyk7IH1cclxuXHJcbiAgLmxwLWJ1bGstYm9keSB7XHJcbiAgICBkaXNwbGF5OiBub25lO1xyXG4gICAgcGFkZGluZzogNHB4IDE4cHggMTRweDtcclxuICAgIGJhY2tncm91bmQ6ICNmYWZhZmE7XHJcbiAgfVxyXG4gIC5scC1idWxrLWJvZHkub3BlbiB7IGRpc3BsYXk6IGJsb2NrOyB9XHJcbiAgLmxwLWJ1bGstZ3JpZCB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMHB4OyBtYXJnaW4tYm90dG9tOiAxMHB4OyB9XHJcbiAgLmxwLWJ1bGstbGFiZWwgeyBkaXNwbGF5OiBibG9jazsgZm9udC1zaXplOiAxMXB4OyBmb250LXdlaWdodDogNjAwOyBjb2xvcjogIzZiNzI4MDsgbWFyZ2luLWJvdHRvbTogM3B4OyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogLjRweDsgfVxyXG4gIC5scC1idWxrLWlucHV0LCAubHAtYnVsay1zZWxlY3Qge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBwYWRkaW5nOiA3cHggMTBweDtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2QxZDVkYjtcclxuICAgIGJvcmRlci1yYWRpdXM6IDdweDtcclxuICAgIGZvbnQtc2l6ZTogMTNweDtcclxuICAgIGNvbG9yOiAjMTExODI3O1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XHJcbiAgICBvdXRsaW5lOiBub25lO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgICB0cmFuc2l0aW9uOiBib3JkZXItY29sb3IgLjE1cztcclxuICB9XHJcbiAgLmxwLWJ1bGstaW5wdXQ6Zm9jdXMsIC5scC1idWxrLXNlbGVjdDpmb2N1cyB7IGJvcmRlci1jb2xvcjogIzFhNTZkYjsgfVxyXG4gIC5scC1idWxrLWFwcGx5IHtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgcGFkZGluZzogOHB4O1xyXG4gICAgYmFja2dyb3VuZDogIzFhNTZkYjtcclxuICAgIGNvbG9yOiAjZmZmO1xyXG4gICAgYm9yZGVyOiBub25lO1xyXG4gICAgYm9yZGVyLXJhZGl1czogN3B4O1xyXG4gICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAuMTVzO1xyXG4gIH1cclxuICAubHAtYnVsay1hcHBseTpob3ZlciB7IGJhY2tncm91bmQ6ICMxZTQyOWY7IH1cclxuXHJcbiAgLyogVG9vbGJhciAoc2VsZWN0LWFsbCArIGNvdW50ICsgQ1NWKSAqL1xyXG4gIC5scC1wYW5lbC10b29sYmFyIHtcclxuICAgIHBhZGRpbmc6IDhweCAxOHB4O1xyXG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmM2Y0ZjY7XHJcbiAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcclxuICAgIGZsZXgtc2hyaW5rOiAwO1xyXG4gICAgYmFja2dyb3VuZDogI2ZhZmFmYTtcclxuICB9XHJcbiAgLmxwLXNlbGVjdC1hbGwtbGFiZWwge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDdweDtcclxuICAgIGZvbnQtc2l6ZTogMTNweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICBjb2xvcjogIzM3NDE1MTtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHVzZXItc2VsZWN0OiBub25lO1xyXG4gIH1cclxuICAubHAtc2VsZWN0LWFsbC1sYWJlbCBpbnB1dCB7IGN1cnNvcjogcG9pbnRlcjsgd2lkdGg6IDE1cHg7IGhlaWdodDogMTVweDsgYWNjZW50LWNvbG9yOiAjMWE1NmRiOyB9XHJcbiAgLmxwLXRvb2xiYXItcmlnaHQgeyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgfVxyXG4gIC5scC1zZWxlY3RlZC1jb3VudCB7IGZvbnQtc2l6ZTogMTJweDsgY29sb3I6ICM2YjcyODA7IGZvbnQtd2VpZ2h0OiA1MDA7IH1cclxuICAubHAtY3N2LWJ0biB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDRweDtcclxuICAgIHBhZGRpbmc6IDRweCA5cHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gICAgYm9yZGVyOiAxLjVweCBzb2xpZCAjZDFkNWRiO1xyXG4gICAgYm9yZGVyLXJhZGl1czogNnB4O1xyXG4gICAgZm9udC1zaXplOiAxMXB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGNvbG9yOiAjMzc0MTUxO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xcztcclxuICB9XHJcbiAgLmxwLWNzdi1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZjNmNGY2OyB9XHJcblxyXG4gIC8qIEpvYiBsaXN0ICovXHJcbiAgLmxwLXBhbmVsLWxpc3QgeyBmbGV4OiAxOyBvdmVyZmxvdy15OiBhdXRvOyBwYWRkaW5nOiA2cHggMDsgfVxyXG5cclxuICAubHAtam9iLWl0ZW0ge1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0O1xyXG4gICAgZ2FwOiAxMHB4O1xyXG4gICAgcGFkZGluZzogMTBweCAxOHB4O1xyXG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmOWZhZmI7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xcztcclxuICB9XHJcbiAgLmxwLWpvYi1pdGVtOmhvdmVyICAgeyBiYWNrZ3JvdW5kOiAjZjlmYWZiOyB9XHJcbiAgLmxwLWpvYi1pdGVtLnNlbGVjdGVkIHsgYmFja2dyb3VuZDogI2VmZjZmZjsgfVxyXG4gIC5scC1qb2ItaXRlbS5oaWRkZW4gICB7IGRpc3BsYXk6IG5vbmU7IH1cclxuXHJcbiAgLmxwLWpvYi1jaGVja2JveCB7XHJcbiAgICBtYXJnaW4tdG9wOiAzcHg7XHJcbiAgICBmbGV4LXNocmluazogMDtcclxuICAgIHdpZHRoOiAxNXB4O1xyXG4gICAgaGVpZ2h0OiAxNXB4O1xyXG4gICAgYWNjZW50LWNvbG9yOiAjMWE1NmRiO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gIH1cclxuICAubHAtam9iLWluZm8geyBmbGV4OiAxOyBtaW4td2lkdGg6IDA7IH1cclxuICAubHAtam9iLXRpdGxlIHtcclxuICAgIGZvbnQtc2l6ZTogMTNweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICBjb2xvcjogIzExMTgyNztcclxuICAgIG1hcmdpbi1ib3R0b206IDNweDtcclxuICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XHJcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xyXG4gICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XHJcbiAgfVxyXG4gIC5scC1qb2ItbWV0YSB7XHJcbiAgICBmb250LXNpemU6IDExcHg7XHJcbiAgICBjb2xvcjogIzZiNzI4MDtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA1cHg7XHJcbiAgICBmbGV4LXdyYXA6IHdyYXA7XHJcbiAgfVxyXG4gIC5scC1kdXAtYmFkZ2Uge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgYmFja2dyb3VuZDogI2ZlZjNjNztcclxuICAgIGNvbG9yOiAjOTI0MDBlO1xyXG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xyXG4gICAgcGFkZGluZzogMXB4IDZweDtcclxuICAgIGZvbnQtc2l6ZTogMTBweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgbGV0dGVyLXNwYWNpbmc6IC4zcHg7XHJcbiAgfVxyXG5cclxuICAubHAtc291cmNlLWNoaXAge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgcGFkZGluZzogMXB4IDZweDtcclxuICAgIGJvcmRlci1yYWRpdXM6IDRweDtcclxuICAgIGZvbnQtc2l6ZTogMTBweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgbGV0dGVyLXNwYWNpbmc6IC41cHg7XHJcbiAgfVxyXG4gIC5scC1zb3VyY2UtY2hpcC5mYWNlYm9vayAgeyBiYWNrZ3JvdW5kOiAjZGJlYWZlOyBjb2xvcjogIzFkNGVkODsgfVxyXG4gIC5scC1zb3VyY2UtY2hpcC5saW5rZWRpbiAgeyBiYWNrZ3JvdW5kOiAjY2ZmYWZlOyBjb2xvcjogIzBlNzQ5MDsgfVxyXG4gIC5scC1zb3VyY2UtY2hpcC5qb2JzdHJlZXQgeyBiYWNrZ3JvdW5kOiAjZDFmYWU1OyBjb2xvcjogIzA2NWY0NjsgfVxyXG4gIC5scC1zb3VyY2UtY2hpcC5pbmRlZWQgICAgeyBiYWNrZ3JvdW5kOiAjZmNlN2YzOyBjb2xvcjogIzlkMTc0ZDsgfVxyXG5cclxuICAubHAtbm8tcmVzdWx0cyB7XHJcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICBwYWRkaW5nOiAzMnB4IDE4cHg7XHJcbiAgICBjb2xvcjogIzljYTNhZjtcclxuICAgIGZvbnQtc2l6ZTogMTNweDtcclxuICAgIGRpc3BsYXk6IG5vbmU7XHJcbiAgfVxyXG4gIC5scC1uby1yZXN1bHRzLnZpc2libGUgeyBkaXNwbGF5OiBibG9jazsgfVxyXG5cclxuICAvKiBGb290ZXIgKi9cclxuICAubHAtcGFuZWwtZm9vdGVyIHsgcGFkZGluZzogMTJweCAxOHB4OyBib3JkZXItdG9wOiAxcHggc29saWQgI2U1ZTdlYjsgZmxleC1zaHJpbms6IDA7IGJhY2tncm91bmQ6ICNmZmY7IH1cclxuICAubHAtaW1wb3J0LWJ0biB7XHJcbiAgICB3aWR0aDogMTAwJTtcclxuICAgIHBhZGRpbmc6IDExcHggMjBweDtcclxuICAgIGJhY2tncm91bmQ6ICMxYTU2ZGI7XHJcbiAgICBjb2xvcjogI2ZmZjtcclxuICAgIGJvcmRlcjogbm9uZTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDEwcHg7XHJcbiAgICBmb250LXNpemU6IDE0cHg7XHJcbiAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAuMTVzO1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcclxuICAgIGdhcDogN3B4O1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgfVxyXG4gIC5scC1pbXBvcnQtYnRuOmhvdmVyIHsgYmFja2dyb3VuZDogIzFlNDI5ZjsgfVxyXG4gIC5scC1pbXBvcnQtYnRuOmRpc2FibGVkIHsgYmFja2dyb3VuZDogIzljYTNhZjsgY3Vyc29yOiBub3QtYWxsb3dlZDsgfVxyXG5cclxuICAvKiBcdTI1MDBcdTI1MDAgTW9kYWwgb3ZlcmxheSBcdTI1MDBcdTI1MDAgKi9cclxuICAubHAtb3ZlcmxheSB7XHJcbiAgICBwb3NpdGlvbjogZml4ZWQ7XHJcbiAgICBpbnNldDogMDtcclxuICAgIGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsLjUpO1xyXG4gICAgei1pbmRleDogMjE0NzQ4MzY0NztcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XHJcbiAgICBwYWRkaW5nOiAxNnB4O1xyXG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcclxuICAgIGFuaW1hdGlvbjogbHAtZmFkZS1pbiAuMTVzIGVhc2U7XHJcbiAgfVxyXG4gIC5scC1tb2RhbCB7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gICAgYm9yZGVyLXJhZGl1czogMTZweDtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgbWF4LXdpZHRoOiA1NjBweDtcclxuICAgIG1heC1oZWlnaHQ6IDkwdmg7XHJcbiAgICBvdmVyZmxvdy15OiBhdXRvO1xyXG4gICAgYm94LXNoYWRvdzogMCAyMHB4IDYwcHggcmdiYSgwLDAsMCwuMyk7XHJcbiAgICBhbmltYXRpb246IGxwLXNsaWRlLXVwIC4ycyBlYXNlO1xyXG4gIH1cclxuICBAa2V5ZnJhbWVzIGxwLXNsaWRlLXVwIHsgZnJvbSB7IHRyYW5zZm9ybTogdHJhbnNsYXRlWSgyMHB4KTsgb3BhY2l0eTogMCB9IHRvIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApOyBvcGFjaXR5OiAxIH0gfVxyXG5cclxuICAubHAtbW9kYWwtaGVhZGVyIHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xyXG4gICAgcGFkZGluZzogMThweCAyMnB4IDE0cHg7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2U1ZTdlYjtcclxuICB9XHJcbiAgLmxwLW1vZGFsLXRpdGxlIHsgZm9udC1zaXplOiAxNnB4OyBmb250LXdlaWdodDogNzAwOyBjb2xvcjogIzExMTgyNzsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA4cHg7IH1cclxuICAubHAtbW9kYWwtcHJvZ3Jlc3MgeyBmb250LXNpemU6IDEycHg7IGZvbnQtd2VpZ2h0OiA2MDA7IGNvbG9yOiAjNmI3MjgwOyBiYWNrZ3JvdW5kOiAjZjNmNGY2OyBwYWRkaW5nOiAzcHggMTBweDsgYm9yZGVyLXJhZGl1czogMjBweDsgfVxyXG4gIC5scC1tb2RhbC1oZWFkZXItcmlnaHQgeyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgfVxyXG4gIC5scC1tb2RhbC1ib2R5IHsgcGFkZGluZzogMThweCAyMnB4OyB9XHJcblxyXG4gIC5scC1maWVsZCB7IG1hcmdpbi1ib3R0b206IDEzcHg7IH1cclxuICAubHAtbGFiZWwgeyBkaXNwbGF5OiBibG9jazsgZm9udC1zaXplOiAxMXB4OyBmb250LXdlaWdodDogNjAwOyBjb2xvcjogIzM3NDE1MTsgbWFyZ2luLWJvdHRvbTogNHB4OyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzogLjVweDsgfVxyXG4gIC5scC1sYWJlbCAubHAtcmVxdWlyZWQgeyBjb2xvcjogI2VmNDQ0NDsgbWFyZ2luLWxlZnQ6IDJweDsgfVxyXG4gIC5scC1pbnB1dCwgLmxwLXRleHRhcmVhLCAubHAtc2VsZWN0IHtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgcGFkZGluZzogOXB4IDEycHg7XHJcbiAgICBib3JkZXI6IDEuNXB4IHNvbGlkICNkMWQ1ZGI7XHJcbiAgICBib3JkZXItcmFkaXVzOiA4cHg7XHJcbiAgICBmb250LXNpemU6IDE0cHg7XHJcbiAgICBjb2xvcjogIzExMTgyNztcclxuICAgIGJhY2tncm91bmQ6ICNmZmY7XHJcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xyXG4gICAgb3V0bGluZTogbm9uZTtcclxuICAgIHRyYW5zaXRpb246IGJvcmRlci1jb2xvciAuMTVzO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgfVxyXG4gIC5scC1pbnB1dDpmb2N1cywgLmxwLXRleHRhcmVhOmZvY3VzLCAubHAtc2VsZWN0OmZvY3VzIHsgYm9yZGVyLWNvbG9yOiAjMWE1NmRiOyB9XHJcbiAgLmxwLXRleHRhcmVhIHsgcmVzaXplOiB2ZXJ0aWNhbDsgbWluLWhlaWdodDogOTBweDsgfVxyXG4gIC5scC1zZWxlY3Q6ZGlzYWJsZWQgeyBiYWNrZ3JvdW5kOiAjZjNmNGY2OyBjb2xvcjogIzljYTNhZjsgfVxyXG4gIC5scC1yb3cgICB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMnB4OyB9XHJcbiAgaW5wdXRbdHlwZT1cImRhdGVcIl0ubHAtaW5wdXQgeyBjb2xvci1zY2hlbWU6IGxpZ2h0OyB9XHJcblxyXG4gIC5scC1oaW50IHsgZm9udC1zaXplOiAxMXB4OyBjb2xvcjogIzZiNzI4MDsgbWFyZ2luLXRvcDogM3B4OyB9XHJcbiAgLmxwLWhpbnQuYWkgeyBjb2xvcjogIzdjM2FlZDsgfVxyXG4gIC5scC1oaW50LnN1Y2Nlc3MgeyBjb2xvcjogIzA1OTY2OTsgfVxyXG5cclxuICAvKiBBSSBlc3RpbWF0ZSBidXR0b24gKi9cclxuICAubHAtZXN0aW1hdGUtYnRuIHtcclxuICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xyXG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgIGdhcDogNHB4O1xyXG4gICAgbWFyZ2luLXRvcDogNHB4O1xyXG4gICAgcGFkZGluZzogNHB4IDEwcHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZjVmM2ZmO1xyXG4gICAgY29sb3I6ICM2ZDI4ZDk7XHJcbiAgICBib3JkZXI6IDEuNXB4IHNvbGlkICNkZGQ2ZmU7XHJcbiAgICBib3JkZXItcmFkaXVzOiA2cHg7XHJcbiAgICBmb250LXNpemU6IDExcHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAuMTVzO1xyXG4gICAgZm9udC1mYW1pbHk6IGluaGVyaXQ7XHJcbiAgfVxyXG4gIC5scC1lc3RpbWF0ZS1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZWRlOWZlOyB9XHJcbiAgLmxwLWVzdGltYXRlLWJ0bjpkaXNhYmxlZCB7IG9wYWNpdHk6IC42OyBjdXJzb3I6IG5vdC1hbGxvd2VkOyB9XHJcblxyXG4gIC8qIE1vZGFsIGZvb3RlciAqL1xyXG4gIC5scC1tb2RhbC1mb290ZXIgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEwcHg7IGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7IHBhZGRpbmc6IDE0cHggMjJweDsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU3ZWI7IH1cclxuICAubHAtY2FuY2VsLWJ0biB7XHJcbiAgICBwYWRkaW5nOiA5cHggMThweDtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2QxZDVkYjtcclxuICAgIGJhY2tncm91bmQ6ICNmZmY7XHJcbiAgICBjb2xvcjogIzM3NDE1MTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xNXM7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWNhbmNlbC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZjlmYWZiOyB9XHJcbiAgLmxwLXNraXAtYnRuIHtcclxuICAgIHBhZGRpbmc6IDlweCAxOHB4O1xyXG4gICAgYm9yZGVyOiAxLjVweCBzb2xpZCAjZDFkNWRiO1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGNvbG9yOiAjNmI3MjgwO1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxNHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cztcclxuICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gIH1cclxuICAubHAtc2tpcC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZjlmYWZiOyBjb2xvcjogIzM3NDE1MTsgfVxyXG4gIC5scC1zdWJtaXQtYnRuIHtcclxuICAgIHBhZGRpbmc6IDlweCAyMHB4O1xyXG4gICAgYmFja2dyb3VuZDogIzFhNTZkYjtcclxuICAgIGNvbG9yOiAjZmZmO1xyXG4gICAgYm9yZGVyOiBub25lO1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxNHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cztcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA2cHg7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLXN1Ym1pdC1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjMWU0MjlmOyB9XHJcbiAgLmxwLXN1Ym1pdC1idG46ZGlzYWJsZWQgeyBiYWNrZ3JvdW5kOiAjOWNhM2FmOyBjdXJzb3I6IG5vdC1hbGxvd2VkOyB9XHJcblxyXG4gIC8qIFN0YXR1cyAqL1xyXG4gIC5scC1zdGF0dXMgeyBtYXJnaW46IDAgMjJweCAxNHB4OyBwYWRkaW5nOiAxMHB4IDE0cHg7IGJvcmRlci1yYWRpdXM6IDhweDsgZm9udC1zaXplOiAxM3B4OyBmb250LXdlaWdodDogNTAwOyBkaXNwbGF5OiBub25lOyBsaW5lLWhlaWdodDogMS41OyB9XHJcbiAgLmxwLXN0YXR1cy5zdWNjZXNzIHsgZGlzcGxheTogYmxvY2s7IGJhY2tncm91bmQ6ICNkMWZhZTU7IGNvbG9yOiAjMDY1ZjQ2OyB9XHJcbiAgLmxwLXN0YXR1cy5lcnJvciAgIHsgZGlzcGxheTogYmxvY2s7IGJhY2tncm91bmQ6ICNmZWUyZTI7IGNvbG9yOiAjOTkxYjFiOyB9XHJcbiAgLmxwLXN0YXR1cy5sb2FkaW5nIHsgZGlzcGxheTogYmxvY2s7IGJhY2tncm91bmQ6ICNlZmY2ZmY7IGNvbG9yOiAjMWU0MGFmOyB9XHJcbiAgLmxwLXN0YXR1cyBhIHsgY29sb3I6IGluaGVyaXQ7IGZvbnQtd2VpZ2h0OiA3MDA7IH1cclxuICAubHAtc3RhdHVzIGE6aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgfVxyXG5gO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEZsb2F0aW5nIHNjYW4gYnV0dG9ucyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbi8qKlxyXG4gKiBJbmplY3RzIHR3byBmaXhlZCBidXR0b25zOlxyXG4gKiAgLSBcIlNjYW4gSm9icyBvbiBUaGlzIFBhZ2VcIiBcdTIwMTQgaW1tZWRpYXRlIHNjYW5cclxuICogIC0gXCJTY3JvbGwgJiBTY2FuXCIgXHUyMDE0IGF1dG8tc2Nyb2xscyB0aGVuIHNjYW5zXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0RmxvYXRpbmdTY2FuQnV0dG9uKFxyXG4gIG9uU2NhbjogICAgICAgKHNldFNjYW5uaW5nU3RhdGU6IChzOiBib29sZWFuKSA9PiB2b2lkKSA9PiB2b2lkLFxyXG4gIG9uU2Nyb2xsU2NhbjogKHNldFNjYW5uaW5nU3RhdGU6IChzOiBib29sZWFuKSA9PiB2b2lkKSA9PiB2b2lkXHJcbik6IHZvaWQge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFNDQU5fQlROX0lEKT8ucmVtb3ZlKCk7XHJcblxyXG4gIGNvbnN0IGhvc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGhvc3QuaWQgPSBTQ0FOX0JUTl9JRDtcclxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGhvc3QpO1xyXG5cclxuICBjb25zdCBzaGFkb3cgPSBob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xyXG4gIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xyXG4gIHN0eWxlLnRleHRDb250ZW50ID0gQkFTRV9TVFlMRVM7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKHN0eWxlKTtcclxuXHJcbiAgY29uc3Qgd3JhcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgd3JhcC5jbGFzc05hbWUgPSBcImxwLWZhYi13cmFwXCI7XHJcblxyXG4gIGNvbnN0IG1ha2VCdG4gPSAobGFiZWw6IHN0cmluZywgc2Vjb25kYXJ5OiBib29sZWFuKTogSFRNTEJ1dHRvbkVsZW1lbnQgPT4ge1xyXG4gICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGJ0bi5jbGFzc05hbWUgPSBzZWNvbmRhcnkgPyBcImxwLWZhYiBzZWNvbmRhcnlcIiA6IFwibHAtZmFiXCI7XHJcbiAgICBidG4uaW5uZXJIVE1MID0gc2Vjb25kYXJ5XHJcbiAgICAgID8gYDxzdmcgd2lkdGg9XCIxM1wiIGhlaWdodD1cIjEzXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xOSAxM2wtNyA3LTctN20xNC04bC03IDctNy03XCIvPjwvc3ZnPiAke2xhYmVsfWBcclxuICAgICAgOiBgPHN2ZyB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTRcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyLjVcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTIxIDIxbC00LjM1LTQuMzVNMTcgMTFBNiA2IDAgMTE1IDExYTYgNiAwIDAxMTIgMHpcIi8+PC9zdmc+ICR7bGFiZWx9YDtcclxuICAgIHJldHVybiBidG47XHJcbiAgfTtcclxuXHJcbiAgY29uc3Qgc2NhbkJ0biAgICAgICA9IG1ha2VCdG4oXCJTY2FuIEpvYnMgb24gVGhpcyBQYWdlXCIsIGZhbHNlKTtcclxuICBjb25zdCBzY3JvbGxTY2FuQnRuID0gbWFrZUJ0bihcIlNjcm9sbCAmIFNjYW5cIiwgdHJ1ZSk7XHJcblxyXG4gIGNvbnN0IGJ1aWxkU2V0dGVyID0gKGJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQsIGlzU2Nyb2xsU2NhbjogYm9vbGVhbikgPT4gKHNjYW5uaW5nOiBib29sZWFuKSA9PiB7XHJcbiAgICBzY2FuQnRuLmRpc2FibGVkID0gc2Nhbm5pbmc7XHJcbiAgICBzY3JvbGxTY2FuQnRuLmRpc2FibGVkID0gc2Nhbm5pbmc7XHJcbiAgICBidG4uaW5uZXJIVE1MID0gc2Nhbm5pbmdcclxuICAgICAgPyBgPHN2ZyB3aWR0aD1cIjEzXCIgaGVpZ2h0PVwiMTNcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk00IDR2NWg1TTIwIDIwdi01aC01TTQgOWE5IDkgMCAwMTE0LjQtNS40TTIwIDE1YTkgOSAwIDAxLTE0LjQgNS40XCIvPjwvc3ZnPiAke2lzU2Nyb2xsU2NhbiA/IFwiU2Nyb2xsaW5nXHUyMDI2XCIgOiBcIlNjYW5uaW5nXHUyMDI2XCJ9YFxyXG4gICAgICA6IGlzU2Nyb2xsU2NhblxyXG4gICAgICAgID8gYDxzdmcgd2lkdGg9XCIxM1wiIGhlaWdodD1cIjEzXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xOSAxM2wtNyA3LTctN20xNC04bC03IDctNy03XCIvPjwvc3ZnPiBTY3JvbGwgJiBTY2FuYFxyXG4gICAgICAgIDogYDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0yMSAyMWwtNC4zNS00LjM1TTE3IDExQTYgNiAwIDExNSAxMWE2IDYgMCAwMTEyIDB6XCIvPjwvc3ZnPiBTY2FuIEpvYnMgb24gVGhpcyBQYWdlYDtcclxuICB9O1xyXG5cclxuICBzY2FuQnRuLmFkZEV2ZW50TGlzdGVuZXIoICAgICAgXCJjbGlja1wiLCAoKSA9PiBvblNjYW4oYnVpbGRTZXR0ZXIoc2NhbkJ0biwgZmFsc2UpKSk7XHJcbiAgc2Nyb2xsU2NhbkJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gb25TY3JvbGxTY2FuKGJ1aWxkU2V0dGVyKHNjcm9sbFNjYW5CdG4sIHRydWUpKSk7XHJcblxyXG4gIHdyYXAuYXBwZW5kQ2hpbGQoc2NhbkJ0bik7XHJcbiAgd3JhcC5hcHBlbmRDaGlsZChzY3JvbGxTY2FuQnRuKTtcclxuICBzaGFkb3cuYXBwZW5kQ2hpbGQod3JhcCk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBKb2Igc2VsZWN0aW9uIHBhbmVsIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNob3dKb2JTZWxlY3Rpb25QYW5lbChcclxuICBqb2JzOiBKb2JQb3N0W10sXHJcbiAgaW1wb3J0ZWRVcmxzOiBTZXQ8c3RyaW5nPixcclxuICBvbkltcG9ydDogKHNlbGVjdGVkOiBKb2JQb3N0W10sIGJ1bGtEZWZhdWx0czogQnVsa0RlZmF1bHRzKSA9PiB2b2lkXHJcbik6IHZvaWQge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFBBTkVMX0hPU1RfSUQpPy5yZW1vdmUoKTtcclxuXHJcbiAgY29uc3QgaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgaG9zdC5pZCA9IFBBTkVMX0hPU1RfSUQ7XHJcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChob3N0KTtcclxuXHJcbiAgY29uc3Qgc2hhZG93ID0gaG9zdC5hdHRhY2hTaGFkb3coeyBtb2RlOiBcIm9wZW5cIiB9KTtcclxuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcclxuICBzdHlsZS50ZXh0Q29udGVudCA9IEJBU0VfU1RZTEVTO1xyXG4gIHNoYWRvdy5hcHBlbmRDaGlsZChzdHlsZSk7XHJcblxyXG4gIGNvbnN0IHNlbGVjdGVkID0gbmV3IFNldDxudW1iZXI+KGpvYnMubWFwKChfLCBpKSA9PiBpKSk7XHJcbiAgbGV0IGJ1bGtEZWZhdWx0czogQnVsa0RlZmF1bHRzID0ge307XHJcbiAgbGV0IGZpbHRlclRleHQgPSBcIlwiO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgT3ZlcmxheSArIHBhbmVsIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIG92ZXJsYXkuY2xhc3NOYW1lID0gXCJscC1wYW5lbC1vdmVybGF5XCI7XHJcbiAgY29uc3QgcGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIHBhbmVsLmNsYXNzTmFtZSA9IFwibHAtcGFuZWxcIjtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEhlYWRlciBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGhlYWRlci5jbGFzc05hbWUgPSBcImxwLXBhbmVsLWhlYWRlclwiO1xyXG4gIGNvbnN0IHRpdGxlV3JhcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgdGl0bGVXcmFwLmNsYXNzTmFtZSA9IFwibHAtcGFuZWwtdGl0bGVcIjtcclxuICB0aXRsZVdyYXAuaW5uZXJIVE1MID0gYFxyXG4gICAgPHN2ZyB3aWR0aD1cIjE3XCIgaGVpZ2h0PVwiMTdcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+XHJcbiAgICAgIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNOSA1SDdhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyaDEwYTIgMiAwIDAwMi0yVjdhMiAyIDAgMDAtMi0yaC0yTTkgNWEyIDIgMCAwMDIgMmgyYTIgMiAwIDAwMi0yTTkgNWEyIDIgMCAwMTItMmgyYTIgMiAwIDAxMiAyXCIvPlxyXG4gICAgPC9zdmc+XHJcbiAgICBKb2JzIEZvdW5kIDxzcGFuIGNsYXNzPVwibHAtcGFuZWwtY291bnRcIj4ke2pvYnMubGVuZ3RofTwvc3Bhbj5cclxuICBgO1xyXG4gIGNvbnN0IGNsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBjbG9zZUJ0bi5jbGFzc05hbWUgPSBcImxwLWNsb3NlLWJ0blwiO1xyXG4gIGNsb3NlQnRuLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMjBcIiBoZWlnaHQ9XCIyMFwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTYgMThMMTggNk02IDZsMTIgMTJcIi8+PC9zdmc+YDtcclxuICBjbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gaG9zdC5yZW1vdmUoKSk7XHJcbiAgaGVhZGVyLmFwcGVuZENoaWxkKHRpdGxlV3JhcCk7XHJcbiAgaGVhZGVyLmFwcGVuZENoaWxkKGNsb3NlQnRuKTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFNlYXJjaCBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBzZWFyY2hXcmFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBzZWFyY2hXcmFwLmNsYXNzTmFtZSA9IFwibHAtc2VhcmNoLXdyYXBcIjtcclxuICBjb25zdCBzZWFyY2hJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICBzZWFyY2hJbnB1dC50eXBlID0gXCJ0ZXh0XCI7XHJcbiAgc2VhcmNoSW5wdXQuY2xhc3NOYW1lID0gXCJscC1zZWFyY2gtaW5wdXRcIjtcclxuICBzZWFyY2hJbnB1dC5wbGFjZWhvbGRlciA9IFwiRmlsdGVyIHBvc3RzXHUyMDI2XCI7XHJcbiAgc2VhcmNoSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHtcclxuICAgIGZpbHRlclRleHQgPSBzZWFyY2hJbnB1dC52YWx1ZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgbGV0IHZpc2libGVDb3VudCA9IDA7XHJcbiAgICBpdGVtcy5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcbiAgICAgIGNvbnN0IGpvYiA9IGpvYnNbaV07XHJcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSAhZmlsdGVyVGV4dFxyXG4gICAgICAgIHx8IGpvYi50aXRsZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGZpbHRlclRleHQpXHJcbiAgICAgICAgfHwgam9iLmRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyVGV4dClcclxuICAgICAgICB8fCAoam9iLnBvc3RlZF9ieSA/PyBcIlwiKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGZpbHRlclRleHQpO1xyXG4gICAgICBpdGVtLmNsYXNzTGlzdC50b2dnbGUoXCJoaWRkZW5cIiwgIW1hdGNoZXMpO1xyXG4gICAgICBpZiAobWF0Y2hlcykgdmlzaWJsZUNvdW50Kys7XHJcbiAgICB9KTtcclxuICAgIG5vUmVzdWx0cy5jbGFzc0xpc3QudG9nZ2xlKFwidmlzaWJsZVwiLCB2aXNpYmxlQ291bnQgPT09IDApO1xyXG4gICAgdXBkYXRlQ291bnQoKTtcclxuICB9KTtcclxuICBzZWFyY2hXcmFwLmFwcGVuZENoaWxkKHNlYXJjaElucHV0KTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEJ1bGsgcHJlLWZpbGwgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgYnVsa1NlY3Rpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGJ1bGtTZWN0aW9uLmNsYXNzTmFtZSA9IFwibHAtYnVsay1zZWN0aW9uXCI7XHJcbiAgY29uc3QgYnVsa1RvZ2dsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgYnVsa1RvZ2dsZS50eXBlID0gXCJidXR0b25cIjtcclxuICBidWxrVG9nZ2xlLmNsYXNzTmFtZSA9IFwibHAtYnVsay10b2dnbGVcIjtcclxuICBidWxrVG9nZ2xlLmlubmVySFRNTCA9IGBcclxuICAgIEFwcGx5IERlZmF1bHRzIHRvIEFsbFxyXG4gICAgPHN2ZyB3aWR0aD1cIjE0XCIgaGVpZ2h0PVwiMTRcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyLjVcIj5cclxuICAgICAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xOSA5bC03IDctNy03XCIvPlxyXG4gICAgPC9zdmc+XHJcbiAgYDtcclxuICBjb25zdCBidWxrQm9keSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgYnVsa0JvZHkuY2xhc3NOYW1lID0gXCJscC1idWxrLWJvZHlcIjtcclxuXHJcbiAgY29uc3QgdG9tb3Jyb3dTdHIgPSBuZXcgRGF0ZShEYXRlLm5vdygpICsgODZfNDAwXzAwMCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcbiAgY29uc3QgdG9kYXlTdHIgICAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG4gIGJ1bGtCb2R5LmlubmVySFRNTCA9IGBcclxuICAgIDxkaXYgY2xhc3M9XCJscC1idWxrLWdyaWRcIj5cclxuICAgICAgPGRpdj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1idWxrLWxhYmVsXCI+TG9jYXRpb248L2xhYmVsPlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWJ1bGstaW5wdXRcIiBpZD1cImxwLWJ1bGstbG9jYXRpb25cIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwiZS5nLiBNYWthdGkgQ2l0eVwiIC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWJ1bGstbGFiZWxcIj5CdWRnZXQgKFBIUCk8L2xhYmVsPlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWJ1bGstaW5wdXRcIiBpZD1cImxwLWJ1bGstYnVkZ2V0XCIgdHlwZT1cIm51bWJlclwiIG1pbj1cIjFcIiBwbGFjZWhvbGRlcj1cImUuZy4gMTUwMFwiIC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWJ1bGstbGFiZWxcIj5TY2hlZHVsZSBEYXRlPC9sYWJlbD5cclxuICAgICAgICA8aW5wdXQgY2xhc3M9XCJscC1idWxrLWlucHV0XCIgaWQ9XCJscC1idWxrLWRhdGVcIiB0eXBlPVwiZGF0ZVwiIHZhbHVlPVwiJHt0b21vcnJvd1N0cn1cIiBtaW49XCIke3RvZGF5U3RyfVwiIC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWJ1bGstbGFiZWxcIj5VcmdlbmN5PC9sYWJlbD5cclxuICAgICAgICA8c2VsZWN0IGNsYXNzPVwibHAtYnVsay1zZWxlY3RcIiBpZD1cImxwLWJ1bGstdXJnZW5jeVwiPlxyXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInN0YW5kYXJkXCI+U3RhbmRhcmQ8L29wdGlvbj5cclxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzYW1lX2RheVwiPlNhbWUgRGF5PC9vcHRpb24+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwicnVzaFwiPlJ1c2g8L29wdGlvbj5cclxuICAgICAgICA8L3NlbGVjdD5cclxuICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICAgIDxidXR0b24gY2xhc3M9XCJscC1idWxrLWFwcGx5XCIgaWQ9XCJscC1idWxrLWFwcGx5XCI+QXBwbHkgdG8gQWxsIFNlbGVjdGVkPC9idXR0b24+XHJcbiAgYDtcclxuXHJcbiAgYnVsa1RvZ2dsZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgY29uc3Qgb3BlbiA9IGJ1bGtCb2R5LmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIpO1xyXG4gICAgYnVsa1RvZ2dsZS5jbGFzc0xpc3QudG9nZ2xlKFwib3BlblwiLCBvcGVuKTtcclxuICB9KTtcclxuXHJcbiAgKGJ1bGtCb2R5LnF1ZXJ5U2VsZWN0b3IoXCIjbHAtYnVsay1hcHBseVwiKSBhcyBIVE1MQnV0dG9uRWxlbWVudCkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgIGNvbnN0IGxvY2F0aW9uRWwgPSBidWxrQm9keS5xdWVyeVNlbGVjdG9yKFwiI2xwLWJ1bGstbG9jYXRpb25cIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGJ1ZGdldEVsICAgPSBidWxrQm9keS5xdWVyeVNlbGVjdG9yKFwiI2xwLWJ1bGstYnVkZ2V0XCIpICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRhdGVFbCAgICAgPSBidWxrQm9keS5xdWVyeVNlbGVjdG9yKFwiI2xwLWJ1bGstZGF0ZVwiKSAgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IHVyZ2VuY3lFbCAgPSBidWxrQm9keS5xdWVyeVNlbGVjdG9yKFwiI2xwLWJ1bGstdXJnZW5jeVwiKSAgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XHJcbiAgICBidWxrRGVmYXVsdHMgPSB7XHJcbiAgICAgIGxvY2F0aW9uOiAgICAgbG9jYXRpb25FbC52YWx1ZS50cmltKCkgfHwgdW5kZWZpbmVkLFxyXG4gICAgICBidWRnZXQ6ICAgICAgIHBhcnNlRmxvYXQoYnVkZ2V0RWwudmFsdWUpIHx8IHVuZGVmaW5lZCxcclxuICAgICAgc2NoZWR1bGVEYXRlOiBkYXRlRWwudmFsdWUgfHwgdW5kZWZpbmVkLFxyXG4gICAgICB1cmdlbmN5OiAgICAgICh1cmdlbmN5RWwudmFsdWUgYXMgQnVsa0RlZmF1bHRzW1widXJnZW5jeVwiXSkgfHwgdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuICAgIGJ1bGtCb2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpO1xyXG4gICAgYnVsa1RvZ2dsZS5jbGFzc0xpc3QucmVtb3ZlKFwib3BlblwiKTtcclxuICAgIC8vIFZpc3VhbCBjb25maXJtYXRpb25cclxuICAgIGJ1bGtUb2dnbGUudGV4dENvbnRlbnQgPSBcIlx1MjcxMyBEZWZhdWx0cyBzZXQgXHUyMDE0IEFwcGx5IERlZmF1bHRzIHRvIEFsbFwiO1xyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIGJ1bGtUb2dnbGUuaW5uZXJIVE1MID0gYEFwcGx5IERlZmF1bHRzIHRvIEFsbCA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxNFwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjIuNVwiPjxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNMTkgOWwtNyA3LTctN1wiLz48L3N2Zz5gO1xyXG4gICAgfSwgMjAwMCk7XHJcbiAgfSk7XHJcblxyXG4gIGJ1bGtTZWN0aW9uLmFwcGVuZENoaWxkKGJ1bGtUb2dnbGUpO1xyXG4gIGJ1bGtTZWN0aW9uLmFwcGVuZENoaWxkKGJ1bGtCb2R5KTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFRvb2xiYXIgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgdG9vbGJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgdG9vbGJhci5jbGFzc05hbWUgPSBcImxwLXBhbmVsLXRvb2xiYXJcIjtcclxuXHJcbiAgY29uc3Qgc2VsZWN0QWxsTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIik7XHJcbiAgc2VsZWN0QWxsTGFiZWwuY2xhc3NOYW1lID0gXCJscC1zZWxlY3QtYWxsLWxhYmVsXCI7XHJcbiAgY29uc3Qgc2VsZWN0QWxsQ2IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XHJcbiAgc2VsZWN0QWxsQ2IudHlwZSA9IFwiY2hlY2tib3hcIjtcclxuICBzZWxlY3RBbGxDYi5jaGVja2VkID0gdHJ1ZTtcclxuICBzZWxlY3RBbGxMYWJlbC5hcHBlbmRDaGlsZChzZWxlY3RBbGxDYik7XHJcbiAgc2VsZWN0QWxsTGFiZWwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJTZWxlY3QgQWxsXCIpKTtcclxuXHJcbiAgY29uc3QgdG9vbGJhclJpZ2h0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICB0b29sYmFyUmlnaHQuY2xhc3NOYW1lID0gXCJscC10b29sYmFyLXJpZ2h0XCI7XHJcblxyXG4gIGNvbnN0IGNvdW50TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICBjb3VudExhYmVsLmNsYXNzTmFtZSA9IFwibHAtc2VsZWN0ZWQtY291bnRcIjtcclxuXHJcbiAgY29uc3QgY3N2QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBjc3ZCdG4uY2xhc3NOYW1lID0gXCJscC1jc3YtYnRuXCI7XHJcbiAgY3N2QnRuLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMTJcIiBoZWlnaHQ9XCIxMlwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTQgMTZ2MWEzIDMgMCAwMDMgM2gxMGEzIDMgMCAwMDMtM3YtMW0tNC00bC00IDRtMCAwbC00LTRtNCA0VjRcIi8+PC9zdmc+IENTVmA7XHJcbiAgY3N2QnRuLnRpdGxlID0gXCJFeHBvcnQgYWxsIHNjcmFwZWQgcG9zdHMgdG8gQ1NWXCI7XHJcbiAgY3N2QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBleHBvcnRUb0NTVihqb2JzKSk7XHJcblxyXG4gIHRvb2xiYXJSaWdodC5hcHBlbmRDaGlsZChjb3VudExhYmVsKTtcclxuICB0b29sYmFyUmlnaHQuYXBwZW5kQ2hpbGQoY3N2QnRuKTtcclxuICB0b29sYmFyLmFwcGVuZENoaWxkKHNlbGVjdEFsbExhYmVsKTtcclxuICB0b29sYmFyLmFwcGVuZENoaWxkKHRvb2xiYXJSaWdodCk7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBMaXN0IFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGxpc3QuY2xhc3NOYW1lID0gXCJscC1wYW5lbC1saXN0XCI7XHJcbiAgY29uc3Qgbm9SZXN1bHRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBub1Jlc3VsdHMuY2xhc3NOYW1lID0gXCJscC1uby1yZXN1bHRzXCI7XHJcbiAgbm9SZXN1bHRzLnRleHRDb250ZW50ID0gXCJObyBwb3N0cyBtYXRjaCB5b3VyIGZpbHRlci5cIjtcclxuXHJcbiAgY29uc3QgY2hlY2tib3hlczogSFRNTElucHV0RWxlbWVudFtdID0gW107XHJcbiAgY29uc3QgaXRlbXM6IEhUTUxFbGVtZW50W10gPSBbXTtcclxuXHJcbiAgY29uc3QgdXBkYXRlQ291bnQgPSAoKSA9PiB7XHJcbiAgICBjb25zdCB2aXNpYmxlU2VsZWN0ZWQgPSBqb2JzLmZpbHRlcigoXywgaSkgPT5cclxuICAgICAgc2VsZWN0ZWQuaGFzKGkpICYmICFpdGVtc1tpXS5jbGFzc0xpc3QuY29udGFpbnMoXCJoaWRkZW5cIilcclxuICAgICkubGVuZ3RoO1xyXG4gICAgY29uc3QgdmlzaWJsZVRvdGFsID0gam9icy5maWx0ZXIoKF8sIGkpID0+ICFpdGVtc1tpXS5jbGFzc0xpc3QuY29udGFpbnMoXCJoaWRkZW5cIikpLmxlbmd0aDtcclxuICAgIGNvdW50TGFiZWwudGV4dENvbnRlbnQgPSBgJHtzZWxlY3RlZC5zaXplfSBvZiAke2pvYnMubGVuZ3RofSBzZWxlY3RlZGA7XHJcbiAgICBpbXBvcnRCdG4uZGlzYWJsZWQgPSBzZWxlY3RlZC5zaXplID09PSAwO1xyXG4gICAgaW1wb3J0QnRuLnRleHRDb250ZW50ID0gc2VsZWN0ZWQuc2l6ZSA9PT0gMFxyXG4gICAgICA/IFwiU2VsZWN0IHBvc3RzIHRvIGltcG9ydFwiXHJcbiAgICAgIDogYEltcG9ydCBTZWxlY3RlZCAoJHtzZWxlY3RlZC5zaXplfSlgO1xyXG4gICAgc2VsZWN0QWxsQ2IuY2hlY2tlZCA9IHZpc2libGVTZWxlY3RlZCA+IDAgJiYgdmlzaWJsZVNlbGVjdGVkID09PSB2aXNpYmxlVG90YWw7XHJcbiAgICBzZWxlY3RBbGxDYi5pbmRldGVybWluYXRlID0gdmlzaWJsZVNlbGVjdGVkID4gMCAmJiB2aXNpYmxlU2VsZWN0ZWQgPCB2aXNpYmxlVG90YWw7XHJcbiAgfTtcclxuXHJcbiAgam9icy5mb3JFYWNoKChqb2IsIGkpID0+IHtcclxuICAgIGNvbnN0IGlzRHVwID0gaW1wb3J0ZWRVcmxzLmhhcyhqb2Iuc291cmNlX3VybCk7XHJcbiAgICBjb25zdCBpdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGl0ZW0uY2xhc3NOYW1lID0gXCJscC1qb2ItaXRlbSBzZWxlY3RlZFwiO1xyXG4gICAgaXRlbXMucHVzaChpdGVtKTtcclxuXHJcbiAgICBjb25zdCBjYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICAgIGNiLnR5cGUgPSBcImNoZWNrYm94XCI7XHJcbiAgICBjYi5jbGFzc05hbWUgPSBcImxwLWpvYi1jaGVja2JveFwiO1xyXG4gICAgY2IuY2hlY2tlZCA9IHRydWU7XHJcbiAgICBjaGVja2JveGVzLnB1c2goY2IpO1xyXG5cclxuICAgIGNvbnN0IGluZm8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgaW5mby5jbGFzc05hbWUgPSBcImxwLWpvYi1pbmZvXCI7XHJcbiAgICBjb25zdCBkaXNwbGF5VGl0bGUgPSBqb2IudGl0bGUgfHwgam9iLmRlc2NyaXB0aW9uLnNsaWNlKDAsIDcwKSArIFwiXHUyMDI2XCI7XHJcbiAgICBpbmZvLmlubmVySFRNTCA9IGBcclxuICAgICAgPGRpdiBjbGFzcz1cImxwLWpvYi10aXRsZVwiPiR7ZXNjYXBlVGV4dChkaXNwbGF5VGl0bGUpfTwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtam9iLW1ldGFcIj5cclxuICAgICAgICA8c3BhbiBjbGFzcz1cImxwLXNvdXJjZS1jaGlwICR7am9iLnNvdXJjZX1cIj4ke2pvYi5zb3VyY2V9PC9zcGFuPlxyXG4gICAgICAgICR7aXNEdXAgPyBgPHNwYW4gY2xhc3M9XCJscC1kdXAtYmFkZ2VcIj5BbHJlYWR5IGltcG9ydGVkPC9zcGFuPmAgOiBcIlwifVxyXG4gICAgICAgICR7am9iLnBvc3RlZF9ieSA/IGA8c3Bhbj4ke2VzY2FwZVRleHQoam9iLnBvc3RlZF9ieSl9PC9zcGFuPmAgOiBcIlwifVxyXG4gICAgICAgICR7am9iLmxvY2F0aW9uICA/IGA8c3Bhbj5cdUQ4M0RcdURDQ0QgJHtlc2NhcGVUZXh0KGpvYi5sb2NhdGlvbil9PC9zcGFuPmAgOiBcIlwifVxyXG4gICAgICA8L2Rpdj5cclxuICAgIGA7XHJcblxyXG4gICAgY29uc3QgdG9nZ2xlID0gKGNoZWNrZWQ6IGJvb2xlYW4pID0+IHtcclxuICAgICAgY2IuY2hlY2tlZCA9IGNoZWNrZWQ7XHJcbiAgICAgIGl0ZW0uY2xhc3NMaXN0LnRvZ2dsZShcInNlbGVjdGVkXCIsIGNoZWNrZWQpO1xyXG4gICAgICBpZiAoY2hlY2tlZCkgc2VsZWN0ZWQuYWRkKGkpOyBlbHNlIHNlbGVjdGVkLmRlbGV0ZShpKTtcclxuICAgICAgdXBkYXRlQ291bnQoKTtcclxuICAgIH07XHJcblxyXG4gICAgY2IuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB0b2dnbGUoY2IuY2hlY2tlZCkpO1xyXG4gICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHsgaWYgKGUudGFyZ2V0ICE9PSBjYikgdG9nZ2xlKCFjYi5jaGVja2VkKTsgfSk7XHJcbiAgICBpdGVtLmFwcGVuZENoaWxkKGNiKTtcclxuICAgIGl0ZW0uYXBwZW5kQ2hpbGQoaW5mbyk7XHJcbiAgICBsaXN0LmFwcGVuZENoaWxkKGl0ZW0pO1xyXG4gIH0pO1xyXG5cclxuICBsaXN0LmFwcGVuZENoaWxkKG5vUmVzdWx0cyk7XHJcblxyXG4gIHNlbGVjdEFsbENiLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgY29uc3QgY2hlY2tlZCA9IHNlbGVjdEFsbENiLmNoZWNrZWQ7XHJcbiAgICBqb2JzLmZvckVhY2goKF8sIGkpID0+IHtcclxuICAgICAgaWYgKGl0ZW1zW2ldLmNsYXNzTGlzdC5jb250YWlucyhcImhpZGRlblwiKSkgcmV0dXJuO1xyXG4gICAgICBjaGVja2JveGVzW2ldLmNoZWNrZWQgPSBjaGVja2VkO1xyXG4gICAgICBpdGVtc1tpXS5jbGFzc0xpc3QudG9nZ2xlKFwic2VsZWN0ZWRcIiwgY2hlY2tlZCk7XHJcbiAgICAgIGlmIChjaGVja2VkKSBzZWxlY3RlZC5hZGQoaSk7IGVsc2Ugc2VsZWN0ZWQuZGVsZXRlKGkpO1xyXG4gICAgfSk7XHJcbiAgICBzZWxlY3RBbGxDYi5pbmRldGVybWluYXRlID0gZmFsc2U7XHJcbiAgICB1cGRhdGVDb3VudCgpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgRm9vdGVyIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgZm9vdGVyLmNsYXNzTmFtZSA9IFwibHAtcGFuZWwtZm9vdGVyXCI7XHJcbiAgY29uc3QgaW1wb3J0QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBpbXBvcnRCdG4uY2xhc3NOYW1lID0gXCJscC1pbXBvcnQtYnRuXCI7XHJcblxyXG4gIGltcG9ydEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgY29uc3Qgc2VsZWN0ZWRKb2JzID0gam9icy5maWx0ZXIoKF8sIGkpID0+IHNlbGVjdGVkLmhhcyhpKSk7XHJcbiAgICBob3N0LnJlbW92ZSgpO1xyXG4gICAgb25JbXBvcnQoc2VsZWN0ZWRKb2JzLCBidWxrRGVmYXVsdHMpO1xyXG4gIH0pO1xyXG5cclxuICBmb290ZXIuYXBwZW5kQ2hpbGQoaW1wb3J0QnRuKTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEFzc2VtYmxlIFx1MjUwMFx1MjUwMFxyXG4gIHBhbmVsLmFwcGVuZENoaWxkKGhlYWRlcik7XHJcbiAgcGFuZWwuYXBwZW5kQ2hpbGQoc2VhcmNoV3JhcCk7XHJcbiAgcGFuZWwuYXBwZW5kQ2hpbGQoYnVsa1NlY3Rpb24pO1xyXG4gIHBhbmVsLmFwcGVuZENoaWxkKHRvb2xiYXIpO1xyXG4gIHBhbmVsLmFwcGVuZENoaWxkKGxpc3QpO1xyXG4gIHBhbmVsLmFwcGVuZENoaWxkKGZvb3Rlcik7XHJcbiAgb3ZlcmxheS5hcHBlbmRDaGlsZChwYW5lbCk7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xyXG5cclxuICBvdmVybGF5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4geyBpZiAoZS50YXJnZXQgPT09IG92ZXJsYXkpIGhvc3QucmVtb3ZlKCk7IH0pO1xyXG5cclxuICB1cGRhdGVDb3VudCgpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ1NWIGV4cG9ydCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIGV4cG9ydFRvQ1NWKGpvYnM6IEpvYlBvc3RbXSk6IHZvaWQge1xyXG4gIGNvbnN0IGhlYWRlcnMgPSBbXCJUaXRsZVwiLCBcIkRlc2NyaXB0aW9uXCIsIFwiU291cmNlXCIsIFwiUG9zdGVkIEJ5XCIsIFwiTG9jYXRpb25cIiwgXCJCdWRnZXRcIiwgXCJUaW1lc3RhbXBcIiwgXCJTb3VyY2UgVVJMXCJdO1xyXG4gIGNvbnN0IHJvd3MgPSBqb2JzLm1hcCgoaikgPT4gW1xyXG4gICAgai50aXRsZSxcclxuICAgIGouZGVzY3JpcHRpb24ucmVwbGFjZSgvXFxuL2csIFwiIFwiKSxcclxuICAgIGouc291cmNlLFxyXG4gICAgai5wb3N0ZWRfYnksXHJcbiAgICBqLmxvY2F0aW9uID8/IFwiXCIsXHJcbiAgICBqLmJ1ZGdldCAhPSBudWxsID8gU3RyaW5nKGouYnVkZ2V0KSA6IFwiXCIsXHJcbiAgICBqLnRpbWVzdGFtcCxcclxuICAgIGouc291cmNlX3VybCxcclxuICBdLm1hcChjc3ZDZWxsKS5qb2luKFwiLFwiKSk7XHJcblxyXG4gIGNvbnN0IGNzdiA9IFtoZWFkZXJzLmpvaW4oXCIsXCIpLCAuLi5yb3dzXS5qb2luKFwiXFxyXFxuXCIpO1xyXG4gIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbY3N2XSwgeyB0eXBlOiBcInRleHQvY3N2O2NoYXJzZXQ9dXRmLTg7XCIgfSk7XHJcbiAgY29uc3QgdXJsICA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XHJcbiAgY29uc3QgYSAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG4gIGEuaHJlZiA9IHVybDtcclxuICBhLmRvd25sb2FkID0gYGxvY2FscHJvLWpvYnMtJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApfS5jc3ZgO1xyXG4gIGEuY2xpY2soKTtcclxuICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNzdkNlbGwodmFsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGVzY2FwZWQgPSB2YWwucmVwbGFjZSgvXCIvZywgJ1wiXCInKTtcclxuICByZXR1cm4gL1tcIixcXG5dLy50ZXN0KGVzY2FwZWQpID8gYFwiJHtlc2NhcGVkfVwiYCA6IGVzY2FwZWQ7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBKb2IgcmV2aWV3IG1vZGFsIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuaW50ZXJmYWNlIEJhdGNoQ29udGV4dCB7XHJcbiAgY3VycmVudDogbnVtYmVyO1xyXG4gIHRvdGFsOiBudW1iZXI7XHJcbiAgb25OZXh0OiAoKSA9PiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2hvd0pvYk1vZGFsKFxyXG4gIGluaXRpYWxKb2I6IEpvYlBvc3QsXHJcbiAgY2F0ZWdvcmllczogQ2F0ZWdvcnlbXSxcclxuICBhaUNhdGVnb3J5Pzogc3RyaW5nLFxyXG4gIGJhdGNoPzogQmF0Y2hDb250ZXh0LFxyXG4gIGJ1bGtEZWZhdWx0cz86IEJ1bGtEZWZhdWx0c1xyXG4pOiB2b2lkIHtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChNT0RBTF9IT1NUX0lEKT8ucmVtb3ZlKCk7XHJcblxyXG4gIGNvbnN0IGhvc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGhvc3QuaWQgPSBNT0RBTF9IT1NUX0lEO1xyXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaG9zdCk7XHJcblxyXG4gIGNvbnN0IHNoYWRvdyA9IGhvc3QuYXR0YWNoU2hhZG93KHsgbW9kZTogXCJvcGVuXCIgfSk7XHJcbiAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XHJcbiAgc3R5bGUudGV4dENvbnRlbnQgPSBCQVNFX1NUWUxFUztcclxuICBzaGFkb3cuYXBwZW5kQ2hpbGQoc3R5bGUpO1xyXG5cclxuICBjb25zdCBvdmVybGF5ID0gYnVpbGRNb2RhbE92ZXJsYXkoaW5pdGlhbEpvYiwgY2F0ZWdvcmllcywgYWlDYXRlZ29yeSA/PyBudWxsLCBiYXRjaCA/PyBudWxsLCBidWxrRGVmYXVsdHMgPz8ge30sIHNoYWRvdywgaG9zdCk7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xyXG5cclxuICBvdmVybGF5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xyXG4gICAgaWYgKGUudGFyZ2V0ID09PSBvdmVybGF5KSB7IGNsb3NlTW9kYWwoaG9zdCk7IGlmIChiYXRjaCkgYmF0Y2gub25OZXh0KCk7IH1cclxuICB9KTtcclxuXHJcbiAgY29uc3QgZXNjSGFuZGxlciA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgPT09IFwiRXNjYXBlXCIpIHtcclxuICAgICAgY2xvc2VNb2RhbChob3N0KTtcclxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXNjSGFuZGxlcik7XHJcbiAgICAgIGlmIChiYXRjaCkgYmF0Y2gub25OZXh0KCk7XHJcbiAgICB9XHJcbiAgfTtcclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlc2NIYW5kbGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2xvc2VNb2RhbChob3N0OiBIVE1MRWxlbWVudCk6IHZvaWQgeyBob3N0LnJlbW92ZSgpOyB9XHJcblxyXG5mdW5jdGlvbiBidWlsZE1vZGFsT3ZlcmxheShcclxuICBqb2I6IEpvYlBvc3QsXHJcbiAgY2F0ZWdvcmllczogQ2F0ZWdvcnlbXSxcclxuICBhaUNhdGVnb3J5OiBzdHJpbmcgfCBudWxsLFxyXG4gIGJhdGNoOiBCYXRjaENvbnRleHQgfCBudWxsLFxyXG4gIGJ1bGtEZWZhdWx0czogQnVsa0RlZmF1bHRzLFxyXG4gIHNoYWRvdzogU2hhZG93Um9vdCxcclxuICBob3N0OiBIVE1MRWxlbWVudFxyXG4pOiBIVE1MRWxlbWVudCB7XHJcbiAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgb3ZlcmxheS5jbGFzc05hbWUgPSBcImxwLW92ZXJsYXlcIjtcclxuXHJcbiAgY29uc3QgbW9kYWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIG1vZGFsLmNsYXNzTmFtZSA9IFwibHAtbW9kYWxcIjtcclxuICBtb2RhbC5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwiZGlhbG9nXCIpO1xyXG4gIG1vZGFsLnNldEF0dHJpYnV0ZShcImFyaWEtbW9kYWxcIiwgXCJ0cnVlXCIpO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgSGVhZGVyIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgaGVhZGVyLmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtaGVhZGVyXCI7XHJcblxyXG4gIGNvbnN0IHRpdGxlV3JhcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgdGl0bGVXcmFwLmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtdGl0bGVcIjtcclxuICB0aXRsZVdyYXAuaW5uZXJIVE1MID0gYFxyXG4gICAgPHN2ZyB3aWR0aD1cIjE4XCIgaGVpZ2h0PVwiMThcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+XHJcbiAgICAgIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNMjAgN2wtOC00LTggNG0xNiAwbC04IDRtOC00djEwbC04IDRtMC0xMEw0IDdtOCA0djEwXCIvPlxyXG4gICAgPC9zdmc+XHJcbiAgICBJbXBvcnQgSm9iXHJcbiAgICA8c3BhbiBjbGFzcz1cImxwLXNvdXJjZS1jaGlwICR7am9iLnNvdXJjZX1cIj4ke2pvYi5zb3VyY2V9PC9zcGFuPlxyXG4gIGA7XHJcblxyXG4gIGNvbnN0IGhlYWRlclJpZ2h0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBoZWFkZXJSaWdodC5jbGFzc05hbWUgPSBcImxwLW1vZGFsLWhlYWRlci1yaWdodFwiO1xyXG4gIGlmIChiYXRjaCkge1xyXG4gICAgY29uc3QgcHJvZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xyXG4gICAgcHJvZy5jbGFzc05hbWUgPSBcImxwLW1vZGFsLXByb2dyZXNzXCI7XHJcbiAgICBwcm9nLnRleHRDb250ZW50ID0gYCR7YmF0Y2guY3VycmVudH0gLyAke2JhdGNoLnRvdGFsfWA7XHJcbiAgICBoZWFkZXJSaWdodC5hcHBlbmRDaGlsZChwcm9nKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBjbG9zZUJ0bi5jbGFzc05hbWUgPSBcImxwLWNsb3NlLWJ0blwiO1xyXG4gIGNsb3NlQnRuLmlubmVySFRNTCA9IGA8c3ZnIHdpZHRoPVwiMjBcIiBoZWlnaHQ9XCIyMFwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTYgMThMMTggNk02IDZsMTIgMTJcIi8+PC9zdmc+YDtcclxuICBjbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyBjbG9zZU1vZGFsKGhvc3QpOyBpZiAoYmF0Y2gpIGJhdGNoLm9uTmV4dCgpOyB9KTtcclxuICBoZWFkZXJSaWdodC5hcHBlbmRDaGlsZChjbG9zZUJ0bik7XHJcbiAgaGVhZGVyLmFwcGVuZENoaWxkKHRpdGxlV3JhcCk7XHJcbiAgaGVhZGVyLmFwcGVuZENoaWxkKGhlYWRlclJpZ2h0KTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEJvZHkgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgYm9keSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgYm9keS5jbGFzc05hbWUgPSBcImxwLW1vZGFsLWJvZHlcIjtcclxuXHJcbiAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIpO1xyXG4gIGZvcm0ubm9WYWxpZGF0ZSA9IHRydWU7XHJcblxyXG4gIGNvbnN0IGVmZmVjdGl2ZUNhdGVnb3J5ID0gYWlDYXRlZ29yeSA/PyBqb2IuY2F0ZWdvcnkgPz8gXCJcIjtcclxuICBjb25zdCBmaW5kQ2F0QnlOYW1lID0gKG5hbWU6IHN0cmluZykgPT5cclxuICAgIGNhdGVnb3JpZXMuZmluZCgoYykgPT4gYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUudG9Mb3dlckNhc2UoKSk7XHJcbiAgY29uc3QgbWF0Y2hlZENhdCA9IGZpbmRDYXRCeU5hbWUoZWZmZWN0aXZlQ2F0ZWdvcnkpO1xyXG5cclxuICBjb25zdCBjYXRPcHRpb25zID0gY2F0ZWdvcmllcy5sZW5ndGhcclxuICAgID8gW2A8b3B0aW9uIHZhbHVlPVwiXCI+LS0gU2VsZWN0IGNhdGVnb3J5IC0tPC9vcHRpb24+YCxcclxuICAgICAgICAuLi5jYXRlZ29yaWVzLm1hcCgoYykgPT4ge1xyXG4gICAgICAgICAgY29uc3Qgc2VsID0gbWF0Y2hlZENhdD8uX2lkID09PSBjLl9pZCA/IFwic2VsZWN0ZWRcIiA6IFwiXCI7XHJcbiAgICAgICAgICByZXR1cm4gYDxvcHRpb24gdmFsdWU9XCIke2VzY2FwZUF0dHIoYy5faWQpfVwiIGRhdGEtbmFtZT1cIiR7ZXNjYXBlQXR0cihjLm5hbWUpfVwiICR7c2VsfT4ke2VzY2FwZVRleHQoYy5pY29uID8/IFwiXCIpfSAke2VzY2FwZVRleHQoYy5uYW1lKX08L29wdGlvbj5gO1xyXG4gICAgICAgIH0pXS5qb2luKFwiXCIpXHJcbiAgICA6IGA8b3B0aW9uIHZhbHVlPVwiXCI+TG9hZGluZyBjYXRlZ29yaWVzXHUyMDI2PC9vcHRpb24+YDtcclxuXHJcbiAgY29uc3QgY2F0SGludCA9IGFpQ2F0ZWdvcnlcclxuICAgID8gYDxkaXYgY2xhc3M9XCJscC1oaW50IGFpXCI+XHUyNzI2IEFJOiBcIiR7ZXNjYXBlVGV4dChhaUNhdGVnb3J5KX1cIjwvZGl2PmBcclxuICAgIDogZWZmZWN0aXZlQ2F0ZWdvcnkgJiYgbWF0Y2hlZENhdFxyXG4gICAgPyBgPGRpdiBjbGFzcz1cImxwLWhpbnRcIj5BdXRvOiBcIiR7ZXNjYXBlVGV4dChlZmZlY3RpdmVDYXRlZ29yeSl9XCI8L2Rpdj5gXHJcbiAgICA6IFwiXCI7XHJcblxyXG4gIGNvbnN0IHRvZGF5U3RyICAgID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTtcclxuICBjb25zdCB0b21vcnJvd1N0ciA9IG5ldyBEYXRlKERhdGUubm93KCkgKyA4Nl80MDBfMDAwKS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTtcclxuXHJcbiAgLy8gQXBwbHkgYnVsayBkZWZhdWx0cyBvdmVyIGV4dHJhY3RlZCB2YWx1ZXNcclxuICBjb25zdCBwcmVMb2NhdGlvbiAgICAgPSBidWxrRGVmYXVsdHMubG9jYXRpb24gICAgID8/IGpvYi5sb2NhdGlvbiA/PyBcIlwiO1xyXG4gIGNvbnN0IHByZUJ1ZGdldCAgICAgICA9IGJ1bGtEZWZhdWx0cy5idWRnZXQgICAgICAgID8/IGpvYi5idWRnZXQgICA/PyBcIlwiO1xyXG4gIGNvbnN0IHByZVNjaGVkdWxlICAgICA9IGJ1bGtEZWZhdWx0cy5zY2hlZHVsZURhdGUgID8/IGpvYi5zY2hlZHVsZURhdGUgPz8gdG9tb3Jyb3dTdHI7XHJcbiAgY29uc3QgcHJlVXJnZW5jeSAgICAgID0gYnVsa0RlZmF1bHRzLnVyZ2VuY3kgICAgICAgPz8gXCJzdGFuZGFyZFwiO1xyXG5cclxuICBmb3JtLmlubmVySFRNTCA9IGBcclxuICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLXRpdGxlXCI+Sm9iIFRpdGxlIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWlucHV0XCIgaWQ9XCJscC10aXRsZVwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2VzY2FwZUF0dHIoam9iLnRpdGxlKX1cIiByZXF1aXJlZCBtYXhsZW5ndGg9XCIxNTBcIiAvPlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgPGxhYmVsIGNsYXNzPVwibHAtbGFiZWxcIiBmb3I9XCJscC1kZXNjcmlwdGlvblwiPkRlc2NyaXB0aW9uIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImxwLXRleHRhcmVhXCIgaWQ9XCJscC1kZXNjcmlwdGlvblwiIG1heGxlbmd0aD1cIjIwMDBcIiByZXF1aXJlZD4ke2VzY2FwZVRleHQoam9iLmRlc2NyaXB0aW9uKX08L3RleHRhcmVhPlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtcm93XCI+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtY2F0ZWdvcnlcIj5DYXRlZ29yeSA8c3BhbiBjbGFzcz1cImxwLXJlcXVpcmVkXCI+Kjwvc3Bhbj48L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XCJscC1zZWxlY3RcIiBpZD1cImxwLWNhdGVnb3J5XCIgJHtjYXRlZ29yaWVzLmxlbmd0aCA9PT0gMCA/IFwiZGlzYWJsZWRcIiA6IFwiXCJ9PiR7Y2F0T3B0aW9uc308L3NlbGVjdD5cclxuICAgICAgICAke2NhdEhpbnR9XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLXBvc3RlclwiPlBvc3RlZCBCeTwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLXBvc3RlclwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2VzY2FwZUF0dHIoam9iLnBvc3RlZF9ieSl9XCIgbWF4bGVuZ3RoPVwiMTAwXCIgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICAgIDxkaXYgY2xhc3M9XCJscC1yb3dcIj5cclxuICAgICAgPGRpdiBjbGFzcz1cImxwLWZpZWxkXCI+XHJcbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibHAtbGFiZWxcIiBmb3I9XCJscC1sb2NhdGlvblwiPkxvY2F0aW9uIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLWxvY2F0aW9uXCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihwcmVMb2NhdGlvbil9XCIgbWF4bGVuZ3RoPVwiMTAwXCIgcGxhY2Vob2xkZXI9XCJlLmcuIE1ha2F0aSBDaXR5XCIgcmVxdWlyZWQgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtYnVkZ2V0XCI+QnVkZ2V0IChQSFApIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLWJ1ZGdldFwiIHR5cGU9XCJudW1iZXJcIiB2YWx1ZT1cIiR7cHJlQnVkZ2V0fVwiIG1pbj1cIjFcIiBzdGVwPVwiMVwiIHBsYWNlaG9sZGVyPVwiZS5nLiAxNTAwXCIgcmVxdWlyZWQgLz5cclxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImxwLWVzdGltYXRlLWJ0blwiIGlkPVwibHAtZXN0aW1hdGUtYnRuXCI+XHUyNzI2IEVzdGltYXRlIHdpdGggQUk8L2J1dHRvbj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwibHAtaGludFwiIGlkPVwibHAtZXN0aW1hdGUtaGludFwiPjwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgPGRpdiBjbGFzcz1cImxwLXJvd1wiPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLXNjaGVkdWxlXCI+U2NoZWR1bGUgRGF0ZSA8c3BhbiBjbGFzcz1cImxwLXJlcXVpcmVkXCI+Kjwvc3Bhbj48L2xhYmVsPlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWlucHV0XCIgaWQ9XCJscC1zY2hlZHVsZVwiIHR5cGU9XCJkYXRlXCIgdmFsdWU9XCIke2VzY2FwZUF0dHIocHJlU2NoZWR1bGUpfVwiIG1pbj1cIiR7dG9kYXlTdHJ9XCIgcmVxdWlyZWQgLz5cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtdXJnZW5jeVwiPlVyZ2VuY3k8L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XCJscC1zZWxlY3RcIiBpZD1cImxwLXVyZ2VuY3lcIj5cclxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzdGFuZGFyZFwiICR7cHJlVXJnZW5jeSA9PT0gXCJzdGFuZGFyZFwiICA/IFwic2VsZWN0ZWRcIiA6IFwiXCJ9PlN0YW5kYXJkPC9vcHRpb24+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwic2FtZV9kYXlcIiAke3ByZVVyZ2VuY3kgPT09IFwic2FtZV9kYXlcIiAgPyBcInNlbGVjdGVkXCIgOiBcIlwifT5TYW1lIERheTwvb3B0aW9uPlxyXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInJ1c2hcIiAgICAgJHtwcmVVcmdlbmN5ID09PSBcInJ1c2hcIiAgICAgID8gXCJzZWxlY3RlZFwiIDogXCJcIn0+UnVzaDwvb3B0aW9uPlxyXG4gICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gIGA7XHJcblxyXG4gIGJvZHkuYXBwZW5kQ2hpbGQoZm9ybSk7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBBSSBidWRnZXQgZXN0aW1hdGUgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgZXN0aW1hdGVCdG4gID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtZXN0aW1hdGUtYnRuXCIpIGFzIEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbDtcclxuICBjb25zdCBlc3RpbWF0ZUhpbnQgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1lc3RpbWF0ZS1oaW50XCIpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcclxuXHJcbiAgaWYgKGVzdGltYXRlQnRuICYmIGVzdGltYXRlSGludCkge1xyXG4gICAgZXN0aW1hdGVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgY2F0ZWdvcnlFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNhdGVnb3J5XCIpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgICBjb25zdCB0aXRsZUVsICAgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdGl0bGVcIikgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgICAgY29uc3QgYnVkZ2V0RWwgICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWJ1ZGdldFwiKSAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICAgIGNvbnN0IGNhdE5hbWUgICAgPSBjYXRlZ29yeUVsLnNlbGVjdGVkT3B0aW9uc1swXT8uZ2V0QXR0cmlidXRlKFwiZGF0YS1uYW1lXCIpID8/IFwiXCI7XHJcblxyXG4gICAgICBpZiAoIWNhdE5hbWUpIHtcclxuICAgICAgICBlc3RpbWF0ZUhpbnQudGV4dENvbnRlbnQgPSBcIlNlbGVjdCBhIGNhdGVnb3J5IGZpcnN0LlwiO1xyXG4gICAgICAgIGVzdGltYXRlSGludC5jbGFzc05hbWUgPSBcImxwLWhpbnRcIjtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGVzdGltYXRlQnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgZXN0aW1hdGVCdG4udGV4dENvbnRlbnQgPSBcIkVzdGltYXRpbmdcdTIwMjZcIjtcclxuICAgICAgZXN0aW1hdGVIaW50LnRleHRDb250ZW50ID0gXCJcIjtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgbXNnOiBFc3RpbWF0ZUJ1ZGdldE1lc3NhZ2UgPSB7XHJcbiAgICAgICAgICB0eXBlOiBcIkVTVElNQVRFX0JVREdFVFwiLFxyXG4gICAgICAgICAgdGl0bGU6IHRpdGxlRWwudmFsdWUudHJpbSgpIHx8IGpvYi50aXRsZSxcclxuICAgICAgICAgIGNhdGVnb3J5OiBjYXROYW1lLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246IGpvYi5kZXNjcmlwdGlvbi5zbGljZSgwLCAzMDApLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgY29uc3QgcmVzOiBFc3RpbWF0ZUJ1ZGdldFJlc3BvbnNlID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UobXNnKTtcclxuXHJcbiAgICAgICAgaWYgKHJlcz8uc3VjY2VzcyAmJiByZXMubWlkcG9pbnQpIHtcclxuICAgICAgICAgIGJ1ZGdldEVsLnZhbHVlID0gU3RyaW5nKHJlcy5taWRwb2ludCk7XHJcbiAgICAgICAgICBjb25zdCByYW5nZSA9IChyZXMubWluICE9IG51bGwgJiYgcmVzLm1heCAhPSBudWxsKVxyXG4gICAgICAgICAgICA/IGBQSFAgJHtyZXMubWluLnRvTG9jYWxlU3RyaW5nKCl9IFx1MjAxMyAke3Jlcy5tYXgudG9Mb2NhbGVTdHJpbmcoKX1gXHJcbiAgICAgICAgICAgIDogXCJcIjtcclxuICAgICAgICAgIGVzdGltYXRlSGludC50ZXh0Q29udGVudCA9IGBcdTI3MjYgQUkgZXN0aW1hdGU6ICR7cmFuZ2V9JHtyZXMubm90ZSA/IGAgXHUwMEI3ICR7cmVzLm5vdGV9YCA6IFwiXCJ9YDtcclxuICAgICAgICAgIGVzdGltYXRlSGludC5jbGFzc05hbWUgPSBcImxwLWhpbnQgYWlcIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZXN0aW1hdGVIaW50LnRleHRDb250ZW50ID0gcmVzPy5lcnJvciA/PyBcIkVzdGltYXRlIHVuYXZhaWxhYmxlLlwiO1xyXG4gICAgICAgICAgZXN0aW1hdGVIaW50LmNsYXNzTmFtZSA9IFwibHAtaGludFwiO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgZXN0aW1hdGVIaW50LnRleHRDb250ZW50ID0gXCJDb3VsZCBub3QgZmV0Y2ggZXN0aW1hdGUuXCI7XHJcbiAgICAgICAgZXN0aW1hdGVIaW50LmNsYXNzTmFtZSA9IFwibHAtaGludFwiO1xyXG4gICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIGVzdGltYXRlQnRuLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgZXN0aW1hdGVCdG4udGV4dENvbnRlbnQgPSBcIlx1MjcyNiBFc3RpbWF0ZSB3aXRoIEFJXCI7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFN0YXR1cyBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBzdGF0dXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIHN0YXR1cy5jbGFzc05hbWUgPSBcImxwLXN0YXR1c1wiO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgRm9vdGVyIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IGZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgZm9vdGVyLmNsYXNzTmFtZSA9IFwibHAtbW9kYWwtZm9vdGVyXCI7XHJcblxyXG4gIGlmIChiYXRjaCkge1xyXG4gICAgY29uc3Qgc2tpcEJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBza2lwQnRuLnR5cGUgPSBcImJ1dHRvblwiO1xyXG4gICAgc2tpcEJ0bi5jbGFzc05hbWUgPSBcImxwLXNraXAtYnRuXCI7XHJcbiAgICBza2lwQnRuLnRleHRDb250ZW50ID0gXCJTa2lwXCI7XHJcbiAgICBza2lwQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IGNsb3NlTW9kYWwoaG9zdCk7IGJhdGNoLm9uTmV4dCgpOyB9KTtcclxuICAgIGZvb3Rlci5hcHBlbmRDaGlsZChza2lwQnRuKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc3QgY2FuY2VsQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGNhbmNlbEJ0bi50eXBlID0gXCJidXR0b25cIjtcclxuICAgIGNhbmNlbEJ0bi5jbGFzc05hbWUgPSBcImxwLWNhbmNlbC1idG5cIjtcclxuICAgIGNhbmNlbEJ0bi50ZXh0Q29udGVudCA9IFwiQ2FuY2VsXCI7XHJcbiAgICBjYW5jZWxCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IGNsb3NlTW9kYWwoaG9zdCkpO1xyXG4gICAgZm9vdGVyLmFwcGVuZENoaWxkKGNhbmNlbEJ0bik7XHJcbiAgfVxyXG5cclxuICBjb25zdCBzdWJtaXRCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIHN1Ym1pdEJ0bi50eXBlID0gXCJidXR0b25cIjtcclxuICBzdWJtaXRCdG4uY2xhc3NOYW1lID0gXCJscC1zdWJtaXQtYnRuXCI7XHJcbiAgc3VibWl0QnRuLmlubmVySFRNTCA9IGBcclxuICAgIDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+XHJcbiAgICAgIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNCAxNnYxYTMgMyAwIDAwMyAzaDEwYTMgMyAwIDAwMy0zdi0xbS00LThsLTQtNG0wIDBMOCA4bTQtNHYxMlwiLz5cclxuICAgIDwvc3ZnPlxyXG4gICAgJHtiYXRjaCA/IFwiU3VibWl0ICYgTmV4dFwiIDogXCJTdWJtaXQgdG8gTG9jYWxQcm9cIn1cclxuICBgO1xyXG4gIGZvb3Rlci5hcHBlbmRDaGlsZChzdWJtaXRCdG4pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgU3VibWl0IGhhbmRsZXIgXHUyNTAwXHUyNTAwXHJcbiAgc3VibWl0QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCB0aXRsZUVsICAgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdGl0bGVcIikgICAgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRlc2NFbCAgICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1kZXNjcmlwdGlvblwiKSBhcyBIVE1MVGV4dEFyZWFFbGVtZW50O1xyXG4gICAgY29uc3QgY2F0ZWdvcnlFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNhdGVnb3J5XCIpICAgIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgY29uc3QgcG9zdGVyRWwgICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXBvc3RlclwiKSAgICAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBsb2NhdGlvbkVsID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtbG9jYXRpb25cIikgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGJ1ZGdldEVsICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1idWRnZXRcIikgICAgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3Qgc2NoZWR1bGVFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXNjaGVkdWxlXCIpICAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCB1cmdlbmN5RWwgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdXJnZW5jeVwiKSAgICAgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XHJcblxyXG4gICAgY29uc3QgdGl0bGUgICAgICAgID0gdGl0bGVFbC52YWx1ZS50cmltKCk7XHJcbiAgICBjb25zdCBkZXNjcmlwdGlvbiAgPSBkZXNjRWwudmFsdWUudHJpbSgpO1xyXG4gICAgY29uc3QgY2F0ZWdvcnlJZCAgID0gY2F0ZWdvcnlFbC52YWx1ZTtcclxuICAgIGNvbnN0IGNhdGVnb3J5TmFtZSA9IGNhdGVnb3J5RWwuc2VsZWN0ZWRPcHRpb25zWzBdPy5nZXRBdHRyaWJ1dGUoXCJkYXRhLW5hbWVcIikgPz8gXCJcIjtcclxuICAgIGNvbnN0IGxvY2F0aW9uICAgICA9IGxvY2F0aW9uRWwudmFsdWUudHJpbSgpO1xyXG4gICAgY29uc3QgYnVkZ2V0ICAgICAgID0gcGFyc2VGbG9hdChidWRnZXRFbC52YWx1ZSk7XHJcbiAgICBjb25zdCBzY2hlZHVsZURhdGUgPSBzY2hlZHVsZUVsLnZhbHVlO1xyXG4gICAgY29uc3QgdXJnZW5jeSAgICAgID0gdXJnZW5jeUVsLnZhbHVlIGFzIFwic3RhbmRhcmRcIiB8IFwic2FtZV9kYXlcIiB8IFwicnVzaFwiO1xyXG5cclxuICAgIGlmICghdGl0bGUpICAgICAgIHsgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJKb2IgdGl0bGUgaXMgcmVxdWlyZWQuXCIpOyAgICAgICAgICAgICAgdGl0bGVFbC5mb2N1cygpOyAgICByZXR1cm47IH1cclxuICAgIGlmICghZGVzY3JpcHRpb24pIHsgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJEZXNjcmlwdGlvbiBpcyByZXF1aXJlZC5cIik7ICAgICAgICAgICAgIGRlc2NFbC5mb2N1cygpOyAgICAgcmV0dXJuOyB9XHJcbiAgICBpZiAoIWNhdGVnb3J5SWQpICB7IHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIFwiUGxlYXNlIHNlbGVjdCBhIGNhdGVnb3J5LlwiKTsgICAgICAgICAgICBjYXRlZ29yeUVsLmZvY3VzKCk7IHJldHVybjsgfVxyXG4gICAgaWYgKCFsb2NhdGlvbikgICAgeyBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBcIkxvY2F0aW9uIGlzIHJlcXVpcmVkLlwiKTsgICAgICAgICAgICAgICAgbG9jYXRpb25FbC5mb2N1cygpOyByZXR1cm47IH1cclxuICAgIGlmICghYnVkZ2V0IHx8IGJ1ZGdldCA8PSAwIHx8IGlzTmFOKGJ1ZGdldCkpIHtcclxuICAgICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJCdWRnZXQgbXVzdCBiZSBncmVhdGVyIHRoYW4gMCAoUEhQKS5cIik7XHJcbiAgICAgIGJ1ZGdldEVsLmZvY3VzKCk7IHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICghc2NoZWR1bGVEYXRlKSB7IHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIFwiU2NoZWR1bGUgZGF0ZSBpcyByZXF1aXJlZC5cIik7IHNjaGVkdWxlRWwuZm9jdXMoKTsgcmV0dXJuOyB9XHJcblxyXG4gICAgc3VibWl0QnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHN1Ym1pdEJ0bi50ZXh0Q29udGVudCA9IFwiU3VibWl0dGluZ1x1MjAyNlwiO1xyXG4gICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwibG9hZGluZ1wiLCBcIlNlbmRpbmcgdG8gTG9jYWxQcm9cdTIwMjZcIik7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlZEpvYjogSm9iUG9zdCA9IHtcclxuICAgICAgLi4uam9iLCB0aXRsZSwgZGVzY3JpcHRpb24sXHJcbiAgICAgIHBvc3RlZF9ieTogcG9zdGVyRWwudmFsdWUudHJpbSgpLFxyXG4gICAgICBsb2NhdGlvbiwgYnVkZ2V0LCBzY2hlZHVsZURhdGUsXHJcbiAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeU5hbWUsXHJcbiAgICAgIGNhdGVnb3J5SWQsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IG1zZzogSW1wb3J0Sm9iTWVzc2FnZSA9IHsgdHlwZTogXCJJTVBPUlRfSk9CXCIsIHBheWxvYWQ6IHVwZGF0ZWRKb2IgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlPEltcG9ydEpvYk1lc3NhZ2UsIEltcG9ydEpvYlJlc3BvbnNlPihtc2cpO1xyXG5cclxuICAgICAgaWYgKHJlc3BvbnNlPy5zdWNjZXNzKSB7XHJcbiAgICAgICAgY29uc3Qgam9iSWQgID0gcmVzcG9uc2Uuam9iX2lkID8/IFwiXCI7XHJcbiAgICAgICAgY29uc3Qgdmlld1VybCA9IGAke0xQX1VSTH0vam9icy8ke2pvYklkfWA7XHJcbiAgICAgICAgc3RhdHVzLmNsYXNzTmFtZSA9IFwibHAtc3RhdHVzIHN1Y2Nlc3NcIjtcclxuICAgICAgICBzdGF0dXMuaW5uZXJIVE1MID0gYEltcG9ydGVkISA8YSBocmVmPVwiJHtlc2NhcGVBdHRyKHZpZXdVcmwpfVwiIHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyXCI+VmlldyBvbiBMb2NhbFBybyBcdTIxOTI8L2E+YDtcclxuICAgICAgICBzdGF0dXMuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgICAgICBzdWJtaXRCdG4udGV4dENvbnRlbnQgPSBcIlN1Ym1pdHRlZCFcIjtcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgY2xvc2VNb2RhbChob3N0KTsgaWYgKGJhdGNoKSBiYXRjaC5vbk5leHQoKTsgfSwgMjAwMCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3QgZXJyVGV4dCA9IHJlc3BvbnNlPy5lcnJvciA/PyBcIkltcG9ydCBmYWlsZWQuIFBsZWFzZSB0cnkgYWdhaW4uXCI7XHJcbiAgICAgICAgY29uc3QgaXNBdXRoRXJyID0gZXJyVGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwic2Vzc2lvblwiKSB8fCBlcnJUZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJzaWduIGluXCIpO1xyXG4gICAgICAgIHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIGlzQXV0aEVyclxyXG4gICAgICAgICAgPyBcIlNlc3Npb24gZXhwaXJlZC4gUGxlYXNlIHNpZ24gaW4gYWdhaW4gdmlhIHRoZSBleHRlbnNpb24gaWNvbi5cIlxyXG4gICAgICAgICAgOiBlcnJUZXh0KTtcclxuICAgICAgICBzdWJtaXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBzdWJtaXRCdG4uaW5uZXJIVE1MID0gYmF0Y2ggPyBcIlN1Ym1pdCAmIE5leHRcIiA6IFwiU3VibWl0IHRvIExvY2FsUHJvXCI7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBgRXh0ZW5zaW9uIGVycm9yOiAke1N0cmluZyhlcnIpfWApO1xyXG4gICAgICBzdWJtaXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgc3VibWl0QnRuLmlubmVySFRNTCA9IGJhdGNoID8gXCJTdWJtaXQgJiBOZXh0XCIgOiBcIlN1Ym1pdCB0byBMb2NhbFByb1wiO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBtb2RhbC5hcHBlbmRDaGlsZChoZWFkZXIpO1xyXG4gIG1vZGFsLmFwcGVuZENoaWxkKGJvZHkpO1xyXG4gIG1vZGFsLmFwcGVuZENoaWxkKHN0YXR1cyk7XHJcbiAgbW9kYWwuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcclxuICBvdmVybGF5LmFwcGVuZENoaWxkKG1vZGFsKTtcclxuICByZXR1cm4gb3ZlcmxheTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEhlbHBlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBzaG93U3RhdHVzKGVsOiBIVE1MRWxlbWVudCwgdHlwZTogXCJzdWNjZXNzXCIgfCBcImVycm9yXCIgfCBcImxvYWRpbmdcIiwgbXNnOiBzdHJpbmcpOiB2b2lkIHtcclxuICBlbC5jbGFzc05hbWUgPSBgbHAtc3RhdHVzICR7dHlwZX1gO1xyXG4gIGVsLnRleHRDb250ZW50ID0gbXNnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlc2NhcGVBdHRyKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gc3RyLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKS5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKS5yZXBsYWNlKC88L2csIFwiJmx0O1wiKS5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIikucmVwbGFjZSgvPC9nLCBcIiZsdDtcIikucmVwbGFjZSgvPi9nLCBcIiZndDtcIik7XHJcbn1cclxuIiwgIi8qKlxyXG4gKiBDb250ZW50IHNjcmlwdCBcdTIwMTQgaW5qZWN0ZWQgaW50byBmYWNlYm9vay5jb20sIGxpbmtlZGluLmNvbSwgam9ic3RyZWV0LmNvbSwgaW5kZWVkLmNvbS5cclxuICpcclxuICogRmxvdzpcclxuICogIDEuIERldGVjdCBwbGF0Zm9ybSBmcm9tIGhvc3RuYW1lLlxyXG4gKiAgMi4gSW5qZWN0IGEgZmxvYXRpbmcgXCJTY2FuIEpvYnNcIiBidXR0b24gKyBcIlNjcm9sbCAmIFNjYW5cIiBidXR0b24uXHJcbiAqICAzLiBXaGVuIHNjYW4gaXMgdHJpZ2dlcmVkIChidXR0b24gY2xpY2sgb3IgU0NBTl9UQUIgbWVzc2FnZSBmcm9tIHBvcHVwKTpcclxuICogICAgIGEuIE9wdGlvbmFsbHkgYXV0by1zY3JvbGwgdG8gbG9hZCBtb3JlIHBvc3RzLlxyXG4gKiAgICAgYi4gQ29sbGVjdCBhbGwgcG9zdCBjb250YWluZXJzIGZyb20gdGhlIERPTS5cclxuICogICAgIGMuIEV4dHJhY3Qgam9iIGRhdGEgZnJvbSBlYWNoLlxyXG4gKiAgICAgZC4gTG9hZCBhbHJlYWR5LWltcG9ydGVkIFVSTHMgZm9yIGR1cGxpY2F0ZSBtYXJraW5nLlxyXG4gKiAgICAgZS4gU2hvdyBzZWxlY3Rpb24gcGFuZWwuXHJcbiAqICA0LiBVc2VyIHNlbGVjdHMgcG9zdHMgKyBzZXRzIGJ1bGsgZGVmYXVsdHMgXHUyMTkyIGNsaWNrcyBJbXBvcnQgU2VsZWN0ZWQuXHJcbiAqICA1LiBSZXZpZXcgbW9kYWwgb3BlbnMgZm9yIGVhY2ggc2VsZWN0ZWQgcG9zdCBpbiBzZXF1ZW5jZS5cclxuICovXHJcblxyXG5pbXBvcnQgeyBleHRyYWN0Sm9iRGF0YSB9IGZyb20gXCIuL3V0aWxzL3BhcnNlclwiO1xyXG5pbXBvcnQge1xyXG4gIGluamVjdEZsb2F0aW5nU2NhbkJ1dHRvbixcclxuICBzaG93Sm9iU2VsZWN0aW9uUGFuZWwsXHJcbiAgc2hvd0pvYk1vZGFsLFxyXG59IGZyb20gXCIuL3V0aWxzL2RvbUhlbHBlcnNcIjtcclxuaW1wb3J0IHR5cGUge1xyXG4gIEJ1bGtEZWZhdWx0cyxcclxuICBDYXRlZ29yeSxcclxuICBDbGFzc2lmeUNhdGVnb3J5TWVzc2FnZSxcclxuICBDbGFzc2lmeUNhdGVnb3J5UmVzcG9uc2UsXHJcbiAgR2V0Q2F0ZWdvcmllc01lc3NhZ2UsXHJcbiAgR2V0Q2F0ZWdvcmllc1Jlc3BvbnNlLFxyXG4gIEdldEltcG9ydEhpc3RvcnlNZXNzYWdlLFxyXG4gIEdldEltcG9ydEhpc3RvcnlSZXNwb25zZSxcclxuICBKb2JQb3N0LFxyXG4gIFBsYXRmb3JtLFxyXG59IGZyb20gXCIuL3R5cGVzXCI7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgUGxhdGZvcm0gZGV0ZWN0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZGV0ZWN0UGxhdGZvcm0oKTogUGxhdGZvcm0gfCBudWxsIHtcclxuICBjb25zdCBob3N0ID0gd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lO1xyXG4gIGlmIChob3N0LmluY2x1ZGVzKFwiZmFjZWJvb2suY29tXCIpKSAgcmV0dXJuIFwiZmFjZWJvb2tcIjtcclxuICBpZiAoaG9zdC5pbmNsdWRlcyhcImxpbmtlZGluLmNvbVwiKSkgIHJldHVybiBcImxpbmtlZGluXCI7XHJcbiAgaWYgKGhvc3QuaW5jbHVkZXMoXCJqb2JzdHJlZXQuY29tXCIpKSByZXR1cm4gXCJqb2JzdHJlZXRcIjtcclxuICBpZiAoaG9zdC5pbmNsdWRlcyhcImluZGVlZC5jb21cIikpICAgIHJldHVybiBcImluZGVlZFwiO1xyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5jb25zdCBQTEFURk9STSA9IGRldGVjdFBsYXRmb3JtKCk7XHJcblxyXG5pZiAoIVBMQVRGT1JNKSB7XHJcbiAgdGhyb3cgbmV3IEVycm9yKFwiW0xvY2FsUHJvXSBVbnN1cHBvcnRlZCBwbGF0Zm9ybSBcdTIwMTQgY29udGVudCBzY3JpcHQgZXhpdGluZy5cIik7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBDYXRlZ29yeSBjYWNoZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmxldCBjYWNoZWRDYXRlZ29yaWVzOiBDYXRlZ29yeVtdID0gW107XHJcblxyXG5hc3luYyBmdW5jdGlvbiBwcmVsb2FkQ2F0ZWdvcmllcygpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgbXNnOiBHZXRDYXRlZ29yaWVzTWVzc2FnZSA9IHsgdHlwZTogXCJHRVRfQ0FURUdPUklFU1wiIH07XHJcbiAgICBjb25zdCByZXMgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTxHZXRDYXRlZ29yaWVzTWVzc2FnZSwgR2V0Q2F0ZWdvcmllc1Jlc3BvbnNlPihtc2cpO1xyXG4gICAgaWYgKHJlcz8uc3VjY2VzcyAmJiByZXMuY2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNhY2hlZENhdGVnb3JpZXMgPSByZXMuY2F0ZWdvcmllcztcclxuICAgIH1cclxuICB9IGNhdGNoIHtcclxuICAgIC8vIEJhY2tncm91bmQgbWF5IG5vdCBiZSByZWFkeSBvbiBjb2xkIHN0YXJ0XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgUG9zdCBjb250YWluZXIgc2VsZWN0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZ2V0UG9zdENvbnRhaW5lcnMoKTogRWxlbWVudFtdIHtcclxuICBzd2l0Y2ggKFBMQVRGT1JNKSB7XHJcbiAgICBjYXNlIFwiZmFjZWJvb2tcIjpcclxuICAgICAgcmV0dXJuIEFycmF5LmZyb20oXHJcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW3JvbGU9XCJhcnRpY2xlXCJdLCBbZGF0YS1wYWdlbGV0Xj1cIkZlZWRVbml0XCJdJylcclxuICAgICAgKTtcclxuXHJcbiAgICBjYXNlIFwibGlua2VkaW5cIjpcclxuICAgICAgcmV0dXJuIEFycmF5LmZyb20oXHJcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcclxuICAgICAgICAgIFtcclxuICAgICAgICAgICAgXCIuZmVlZC1zaGFyZWQtdXBkYXRlLXYyXCIsXHJcbiAgICAgICAgICAgIFwiLm9jY2x1ZGFibGUtdXBkYXRlXCIsXHJcbiAgICAgICAgICAgICdbY2xhc3MqPVwib2NjbHVkYWJsZS11cGRhdGVcIl0nLFxyXG4gICAgICAgICAgICAnW2NsYXNzKj1cImZlZWQtc2hhcmVkLXVwZGF0ZVwiXScsXHJcbiAgICAgICAgICAgIFwibGkuZmllLWltcHJlc3Npb24tY29udGFpbmVyXCIsXHJcbiAgICAgICAgICAgICdbY2xhc3MqPVwiZmllLWltcHJlc3Npb24tY29udGFpbmVyXCJdJyxcclxuICAgICAgICAgICAgXCJbZGF0YS1pZF1cIixcclxuICAgICAgICAgICAgXCJbZGF0YS11cm5dXCIsXHJcbiAgICAgICAgICBdLmpvaW4oXCIsIFwiKVxyXG4gICAgICAgIClcclxuICAgICAgKTtcclxuXHJcbiAgICBjYXNlIFwiam9ic3RyZWV0XCI6XHJcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKFxyXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXHJcbiAgICAgICAgICBbXHJcbiAgICAgICAgICAgICdbZGF0YS1hdXRvbWF0aW9uPVwibm9ybWFsSm9iXCJdJyxcclxuICAgICAgICAgICAgJ1tkYXRhLWF1dG9tYXRpb249XCJmZWF0dXJlZEpvYlwiXScsXHJcbiAgICAgICAgICAgIFwiYXJ0aWNsZVtkYXRhLWpvYi1pZF1cIixcclxuICAgICAgICAgICAgJ1tjbGFzcyo9XCJqb2ItaXRlbVwiXScsXHJcbiAgICAgICAgICAgICdbY2xhc3MqPVwiSm9iQ2FyZFwiXScsXHJcbiAgICAgICAgICBdLmpvaW4oXCIsIFwiKVxyXG4gICAgICAgIClcclxuICAgICAgKTtcclxuXHJcbiAgICBjYXNlIFwiaW5kZWVkXCI6XHJcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKFxyXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXHJcbiAgICAgICAgICBbXHJcbiAgICAgICAgICAgIFwiW2RhdGEtamtdXCIsXHJcbiAgICAgICAgICAgIFwiLmpvYl9zZWVuX2JlYWNvblwiLFxyXG4gICAgICAgICAgICBcIi5yZXN1bHRDb250ZW50XCIsXHJcbiAgICAgICAgICAgICdbY2xhc3MqPVwiam9iQ2FyZFwiXScsXHJcbiAgICAgICAgICAgIFwiLmpvYnNlYXJjaC1SZXN1bHRzTGlzdCA+IGxpXCIsXHJcbiAgICAgICAgICBdLmpvaW4oXCIsIFwiKVxyXG4gICAgICAgIClcclxuICAgICAgKTtcclxuXHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQWxyZWFkeS1pbXBvcnRlZCBVUkwgc2V0IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0SW1wb3J0ZWRVcmxzKCk6IFByb21pc2U8U2V0PHN0cmluZz4+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgbXNnOiBHZXRJbXBvcnRIaXN0b3J5TWVzc2FnZSA9IHsgdHlwZTogXCJHRVRfSU1QT1JUX0hJU1RPUllcIiB9O1xyXG4gICAgY29uc3QgcmVzID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2U8R2V0SW1wb3J0SGlzdG9yeU1lc3NhZ2UsIEdldEltcG9ydEhpc3RvcnlSZXNwb25zZT4obXNnKTtcclxuICAgIGlmIChyZXM/LnN1Y2Nlc3MpIHtcclxuICAgICAgcmV0dXJuIG5ldyBTZXQocmVzLmhpc3RvcnkubWFwKChoKSA9PiBoLnNvdXJjZV91cmwpKTtcclxuICAgIH1cclxuICB9IGNhdGNoIHtcclxuICAgIC8vIE5vbi1mYXRhbFxyXG4gIH1cclxuICByZXR1cm4gbmV3IFNldCgpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQXV0by1zY3JvbGwgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5hc3luYyBmdW5jdGlvbiBhdXRvU2Nyb2xsUGFnZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCB0b3RhbFNjcm9sbHMgPSA2O1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWxTY3JvbGxzOyBpKyspIHtcclxuICAgIHdpbmRvdy5zY3JvbGxCeSh7IHRvcDogd2luZG93LmlubmVySGVpZ2h0ICogMC44NSwgYmVoYXZpb3I6IFwic21vb3RoXCIgfSk7XHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA3MDApKTtcclxuICB9XHJcbiAgLy8gUGF1c2UgYnJpZWZseSBzbyBkeW5hbWljYWxseSBsb2FkZWQgY29udGVudCBzZXR0bGVzXHJcbiAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRpbWVvdXQociwgNTAwKSk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBTY2FuIHBhZ2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVTY2FuUGFnZShcclxuICBzZXRTY2FubmluZ1N0YXRlOiAoc2Nhbm5pbmc6IGJvb2xlYW4pID0+IHZvaWQsXHJcbiAgd2l0aEF1dG9TY3JvbGwgPSBmYWxzZVxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBzZXRTY2FubmluZ1N0YXRlKHRydWUpO1xyXG4gIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwKSk7XHJcblxyXG4gIGlmICh3aXRoQXV0b1Njcm9sbCkge1xyXG4gICAgYXdhaXQgYXV0b1Njcm9sbFBhZ2UoKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNvbnRhaW5lcnMgPSBnZXRQb3N0Q29udGFpbmVycygpO1xyXG4gIGNvbnN0IHVuaXF1ZSA9IFsuLi5uZXcgU2V0KGNvbnRhaW5lcnMpXS5maWx0ZXIoXHJcbiAgICAoZWwpID0+IGVsLnRleHRDb250ZW50ICYmIGVsLnRleHRDb250ZW50LnRyaW0oKS5sZW5ndGggPiAyMFxyXG4gICk7XHJcblxyXG4gIGNvbnN0IGpvYnM6IEpvYlBvc3RbXSA9IHVuaXF1ZS5tYXAoKGMpID0+IGV4dHJhY3RKb2JEYXRhKGMsIFBMQVRGT1JNISkpO1xyXG5cclxuICBjb25zdCBbaW1wb3J0ZWRVcmxzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtnZXRJbXBvcnRlZFVybHMoKV0pO1xyXG5cclxuICBzZXRTY2FubmluZ1N0YXRlKGZhbHNlKTtcclxuXHJcbiAgaWYgKGpvYnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICBhbGVydChcIltMb2NhbFByb10gTm8gcG9zdHMgZm91bmQgb24gdGhpcyBwYWdlLiBUcnkgc2Nyb2xsaW5nIHRvIGxvYWQgbW9yZSBjb250ZW50IGZpcnN0LCBvciB1c2UgJ1Njcm9sbCAmIFNjYW4nLlwiKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHNob3dKb2JTZWxlY3Rpb25QYW5lbChqb2JzLCBpbXBvcnRlZFVybHMsIChzZWxlY3RlZCwgYnVsa0RlZmF1bHRzKSA9PiB7XHJcbiAgICB2b2lkIHByb2Nlc3NJbXBvcnRRdWV1ZShzZWxlY3RlZCwgMCwgYnVsa0RlZmF1bHRzKTtcclxuICB9KTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEltcG9ydCBxdWV1ZSAoc2VxdWVudGlhbCBtb2RhbHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0ltcG9ydFF1ZXVlKFxyXG4gIGpvYnM6IEpvYlBvc3RbXSxcclxuICBpbmRleDogbnVtYmVyLFxyXG4gIGJ1bGtEZWZhdWx0cz86IEJ1bGtEZWZhdWx0c1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBpZiAoaW5kZXggPj0gam9icy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgY29uc3Qgam9iID0gam9ic1tpbmRleF07XHJcblxyXG4gIGxldCBhaUNhdGVnb3J5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gIGlmIChjYWNoZWRDYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1zZzogQ2xhc3NpZnlDYXRlZ29yeU1lc3NhZ2UgPSB7XHJcbiAgICAgICAgdHlwZTogXCJDTEFTU0lGWV9DQVRFR09SWVwiLFxyXG4gICAgICAgIHRpdGxlOiBqb2IudGl0bGUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGpvYi5kZXNjcmlwdGlvbixcclxuICAgICAgICBhdmFpbGFibGVDYXRlZ29yaWVzOiBjYWNoZWRDYXRlZ29yaWVzLm1hcCgoYykgPT4gYy5uYW1lKSxcclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTxDbGFzc2lmeUNhdGVnb3J5TWVzc2FnZSwgQ2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlPihtc2cpLFxyXG4gICAgICAgIG5ldyBQcm9taXNlPENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZT4oKHJlc29sdmUpID0+XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSB9KSwgNDAwMClcclxuICAgICAgICApLFxyXG4gICAgICBdKTtcclxuICAgICAgaWYgKHJlcz8uc3VjY2VzcyAmJiByZXMuY2F0ZWdvcnkpIHtcclxuICAgICAgICBhaUNhdGVnb3J5ID0gcmVzLmNhdGVnb3J5O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgLy8gTm9uLWZhdGFsXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb25zdCByZW1haW5pbmcgPSBqb2JzLmxlbmd0aCAtIGluZGV4O1xyXG5cclxuICBzaG93Sm9iTW9kYWwoXHJcbiAgICBqb2IsXHJcbiAgICBjYWNoZWRDYXRlZ29yaWVzLFxyXG4gICAgYWlDYXRlZ29yeSxcclxuICAgIHJlbWFpbmluZyA+IDFcclxuICAgICAgPyB7XHJcbiAgICAgICAgICBjdXJyZW50OiBpbmRleCArIDEsXHJcbiAgICAgICAgICB0b3RhbDogam9icy5sZW5ndGgsXHJcbiAgICAgICAgICBvbk5leHQ6ICgpID0+IHZvaWQgcHJvY2Vzc0ltcG9ydFF1ZXVlKGpvYnMsIGluZGV4ICsgMSwgYnVsa0RlZmF1bHRzKSxcclxuICAgICAgICB9XHJcbiAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgYnVsa0RlZmF1bHRzXHJcbiAgKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIE1lc3NhZ2UgbGlzdGVuZXIgKFNDQU5fVEFCICsgUElORyBmcm9tIHBvcHVwKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobXNnLCBfc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICBpZiAobXNnLnR5cGUgPT09IFwiUElOR1wiKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBvazogdHJ1ZSB9KTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICBpZiAobXNnLnR5cGUgPT09IFwiU0NBTl9UQUJcIikge1xyXG4gICAgdm9pZCBoYW5kbGVTY2FuUGFnZSgoKSA9PiB7fSwgKG1zZyBhcyB7IGF1dG9TY3JvbGw/OiBib29sZWFuIH0pLmF1dG9TY3JvbGwgPz8gZmFsc2UpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IHRydWUgfSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn0pO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEJvb3RzdHJhcCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgcHJlbG9hZENhdGVnb3JpZXMoKTtcclxuXHJcbiAgaW5qZWN0RmxvYXRpbmdTY2FuQnV0dG9uKFxyXG4gICAgKHNldFN0YXRlKSA9PiB2b2lkIGhhbmRsZVNjYW5QYWdlKHNldFN0YXRlLCBmYWxzZSksXHJcbiAgICAoc2V0U3RhdGUpID0+IHZvaWQgaGFuZGxlU2NhblBhZ2Uoc2V0U3RhdGUsIHRydWUpXHJcbiAgKTtcclxuXHJcbiAgY29uc29sZS5sb2coYFtMb2NhbFByb10gQ29udGVudCBzY3JpcHQgYWN0aXZlIG9uICR7UExBVEZPUk19YCk7XHJcbn1cclxuXHJcbmlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImxvYWRpbmdcIikge1xyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHsgdm9pZCBpbml0KCk7IH0pO1xyXG59IGVsc2Uge1xyXG4gIHZvaWQgaW5pdCgpO1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7OztBQUVBLE1BQU0sY0FBYztBQUNwQixNQUFNLGlCQUFpQjtBQUN2QixNQUFNLGNBQWM7QUFJcEIsTUFBTSxvQkFBOEM7QUFBQSxJQUNsRCxVQUFVLENBQUMsV0FBVyxZQUFZLFFBQVEsU0FBUyxVQUFVLFVBQVUsWUFBWTtBQUFBLElBQ25GLFlBQVksQ0FBQyxlQUFlLGNBQWMsVUFBVSxXQUFXLFNBQVMsVUFBVSxTQUFTO0FBQUEsSUFDM0YsV0FBVyxDQUFDLGFBQWEsYUFBYSxRQUFRLGFBQWEsV0FBVyxVQUFVO0FBQUEsSUFDaEYsVUFBVSxDQUFDLFdBQVcsWUFBWSxTQUFTLFdBQVcsYUFBYSxXQUFXO0FBQUEsSUFDOUUsVUFBVSxDQUFDLFdBQVcsWUFBWSxnQkFBZ0IsY0FBYyxjQUFjLE1BQU07QUFBQSxJQUNwRixTQUFTLENBQUMsVUFBVSxXQUFXLFlBQVksV0FBVyxhQUFhLGFBQWEsTUFBTTtBQUFBLElBQ3RGLE1BQU0sQ0FBQyxRQUFRLFVBQVUsb0JBQW9CLG1CQUFtQixpQkFBaUIsV0FBVyxTQUFTO0FBQUEsSUFDckcsU0FBUyxDQUFDLFVBQVUsV0FBVyxlQUFlLFNBQVMsT0FBTztBQUFBLElBQzlELGNBQWMsQ0FBQyxTQUFTLFdBQVcsZ0JBQWdCLFdBQVcsWUFBWSxXQUFXLGFBQWE7QUFBQSxJQUNsRyxZQUFZLENBQUMsWUFBWSxjQUFjLFVBQVUsU0FBUyxjQUFjLFdBQVcsUUFBUTtBQUFBLElBQzNGLElBQUksQ0FBQyxhQUFhLGNBQWMs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QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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
