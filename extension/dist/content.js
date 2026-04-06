"use strict";
(() => {
  // extension/utils/parser.ts
  var JOB_KEYWORDS = {
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
    "naghahanap ng": 3,
    // "looking for" in Tagalog
    "nag-aanyaya": 3,
    // "inviting" applicants
    "may bakante": 4,
    // "has vacancy" in Tagalog
    "kailangan ng": 3,
    // "need a" in Tagalog
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
    "accepting walk-in": 3
  };
  var PHONE_REGEX = /(\+?\d[\d\s\-().]{7,15}\d)/g;
  var CURRENCY_REGEX = /(?:PHP|AED|USD|\$|₱|€|£)\s*[\d,]+|[\d,]+\s*(?:PHP|AED|USD)/gi;
  var EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  var DETECTION_THRESHOLD = 4;
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
  function scoreText(text) {
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
    PHONE_REGEX.lastIndex = 0;
    CURRENCY_REGEX.lastIndex = 0;
    EMAIL_REGEX.lastIndex = 0;
    if (hasPhone)
      score += 2;
    if (hasCurrency)
      score += 3;
    if (hasEmail)
      score += 1;
    const confidence = Math.min(score / 20, 1);
    return { score, confidence, hasPhone, hasCurrency, hasEmail };
  }
  function detectJobPost(element) {
    const text = element.textContent ?? "";
    const { score } = scoreText(text);
    return score >= DETECTION_THRESHOLD;
  }
  function extractJobData(element, platform) {
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
      category,
      confidence
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
    } else {
      const links = element.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href;
        if (href.includes("/feed/update/") || href.includes("/posts/") || href.includes("ugcPost")) {
          return href;
        }
      }
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
  var BUTTON_CLASS = "localpro-import-btn";
  var MODAL_HOST_ID = "localpro-modal-host";
  var SHADOW_STYLES = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  /* \u2500\u2500 Import Button \u2500\u2500 */
  .lp-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 4px;
    padding: 7px 14px;
    background: #1a56db;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
    line-height: 1;
  }
  .lp-btn:hover { background: #1e429f; }
  .lp-btn:active { transform: scale(0.97); }
  .lp-btn svg { flex-shrink: 0; }
  .lp-badge {
    display: inline-block;
    background: rgba(255,255,255,.25);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 11px;
  }

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
  @keyframes lp-fade-in { from { opacity: 0 } to { opacity: 1 } }

  /* \u2500\u2500 Modal card \u2500\u2500 */
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
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e5e7eb;
  }
  .lp-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 8px;
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

  .lp-modal-body { padding: 20px 24px; }

  /* Confidence badge */
  .lp-confidence {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: #eff6ff;
    border-radius: 8px;
    font-size: 12px;
    color: #1e40af;
  }
  .lp-confidence-bar-bg {
    flex: 1;
    height: 6px;
    background: #bfdbfe;
    border-radius: 3px;
    overflow: hidden;
  }
  .lp-confidence-bar {
    height: 100%;
    background: #1a56db;
    border-radius: 3px;
    transition: width .4s ease;
  }

  /* Form fields */
  .lp-field { margin-bottom: 14px; }
  .lp-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
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
  .lp-textarea { resize: vertical; min-height: 100px; }
  .lp-select:disabled { background: #f3f4f6; color: #9ca3af; }

  .lp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .lp-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  input[type="date"].lp-input { color-scheme: light; }

  /* Category loading hint */
  .lp-cat-hint {
    font-size: 11px;
    color: #6b7280;
    margin-top: 3px;
  }
  .lp-cat-hint.ai { color: #7c3aed; }

  /* Footer */
  .lp-modal-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
  }
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

  /* Status messages */
  .lp-status {
    margin: 0 24px 16px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    display: none;
  }
  .lp-status.success { display: block; background: #d1fae5; color: #065f46; }
  .lp-status.error   { display: block; background: #fee2e2; color: #991b1b; }
  .lp-status.loading { display: block; background: #eff6ff; color: #1e40af; }

  /* Source chip */
  .lp-source-chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .lp-source-chip.facebook { background: #dbeafe; color: #1d4ed8; }
  .lp-source-chip.linkedin { background: #cffafe; color: #0e7490; }
`;
  function injectImportButton(postElement, job, onImport) {
    if (postElement.querySelector(`.${BUTTON_CLASS}`))
      return;
    const host = document.createElement("div");
    host.className = BUTTON_CLASS;
    host.style.display = "block";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SHADOW_STYLES;
    shadow.appendChild(style);
    const confidencePct = Math.round((job.confidence ?? 0) * 100);
    const confidenceLabel = confidencePct >= 80 ? "High" : confidencePct >= 50 ? "Medium" : "Low";
    const btn = document.createElement("button");
    btn.className = "lp-btn";
    btn.setAttribute("aria-label", "Import this job post to LocalPro");
    btn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    Import to LocalPro
    <span class="lp-badge">${confidencePct}% ${confidenceLabel}</span>
  `;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onImport(job);
    });
    shadow.appendChild(btn);
    const textBlock = postElement.querySelector('[data-ad-preview="message"]') ?? postElement.querySelector(".feed-shared-text") ?? postElement.querySelector('[dir="auto"]');
    if (textBlock?.parentElement) {
      textBlock.parentElement.insertBefore(host, textBlock.nextSibling);
    } else {
      postElement.appendChild(host);
    }
  }
  function showJobModal(initialJob, categories, aiCategory) {
    document.getElementById(MODAL_HOST_ID)?.remove();
    const host = document.createElement("div");
    host.id = MODAL_HOST_ID;
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SHADOW_STYLES;
    shadow.appendChild(style);
    const overlay = buildModalOverlay(initialJob, categories, aiCategory ?? null, shadow, host);
    shadow.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay)
        closeModal(host);
    });
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal(host);
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }
  function closeModal(host) {
    host.remove();
  }
  function buildModalOverlay(job, categories, aiCategory, shadow, host) {
    const overlay = document.createElement("div");
    overlay.className = "lp-overlay";
    const modal = document.createElement("div");
    modal.className = "lp-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Import Job to LocalPro");
    const header = document.createElement("div");
    header.className = "lp-modal-header";
    header.innerHTML = `
    <div class="lp-modal-title">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
      </svg>
      Import Job to LocalPro
      <span class="lp-source-chip ${job.source}">${job.source}</span>
    </div>
  `;
    const closeBtn = document.createElement("button");
    closeBtn.className = "lp-close-btn";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
    closeBtn.addEventListener("click", () => closeModal(host));
    header.appendChild(closeBtn);
    const body = document.createElement("div");
    body.className = "lp-modal-body";
    const confidencePct = Math.round((job.confidence ?? 0) * 100);
    const confDiv = document.createElement("div");
    confDiv.className = "lp-confidence";
    confDiv.innerHTML = `
    <span>Detection confidence:</span>
    <div class="lp-confidence-bar-bg">
      <div class="lp-confidence-bar" style="width:${confidencePct}%"></div>
    </div>
    <strong>${confidencePct}%</strong>
  `;
    body.appendChild(confDiv);
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
    const catHint = aiCategory ? `<div class="lp-cat-hint ai">\u2726 AI-classified as "${escapeText(aiCategory)}"</div>` : effectiveCategory && matchedCat ? `<div class="lp-cat-hint">Auto-detected: "${escapeText(effectiveCategory)}"</div>` : "";
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const tomorrowStr = new Date(Date.now() + 864e5).toISOString().split("T")[0];
    const initialScheduleDate = job.scheduleDate ?? tomorrowStr;
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
        <select class="lp-select" id="lp-category" ${categories.length === 0 ? "disabled" : ""}>
          ${catOptions}
        </select>
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
        <input class="lp-input" id="lp-location" type="text" value="${escapeAttr(job.location ?? "")}" maxlength="100" placeholder="e.g. Makati City, Metro Manila" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${job.budget ?? ""}" min="1" step="1" placeholder="e.g. 1500" required />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${escapeAttr(initialScheduleDate)}" min="${todayStr}" required />
        <div class="lp-cat-hint">Requested work date</div>
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" selected>Standard</option>
          <option value="same_day">Same Day</option>
          <option value="rush">Rush</option>
        </select>
      </div>
    </div>
  `;
    body.appendChild(form);
    const status = document.createElement("div");
    status.className = "lp-status";
    const footer = document.createElement("div");
    footer.className = "lp-modal-footer";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "lp-cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => closeModal(host));
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "lp-submit-btn";
    submitBtn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    Submit to LocalPro
  `;
    footer.appendChild(cancelBtn);
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
        showStatus(status, "error", "Budget is required and must be greater than 0 (PHP).");
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
          showStatus(status, "success", `Job imported successfully! ID: ${response.job_id ?? "\u2014"}`);
          submitBtn.textContent = "Submitted!";
          setTimeout(() => closeModal(host), 2500);
        } else {
          const errText = response?.error ?? "Import failed. Please try again.";
          if (errText.toLowerCase().includes("session") || errText.toLowerCase().includes("sign in")) {
            showStatus(
              status,
              "error",
              "Session expired. Please sign in again via the extension icon."
            );
          } else {
            showStatus(status, "error", errText);
          }
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Submit to LocalPro`;
        }
      } catch (err) {
        showStatus(status, "error", `Extension error: ${String(err)}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit to LocalPro`;
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
  function getPostContainers(root) {
    if (PLATFORM === "facebook") {
      return Array.from(
        root.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]')
      );
    }
    return Array.from(
      root.querySelectorAll(
        [
          ".feed-shared-update-v2",
          // classic feed post wrapper
          ".occludable-update",
          // impression-tracked wrapper
          '[class*="occludable-update"]',
          // variations of occludable class
          '[class*="feed-shared-update"]',
          // broader class match
          "li.fie-impression-container",
          // newer LinkedIn feed item
          '[class*="fie-impression-container"]',
          "[data-id]",
          // posts with a data-id attribute
          "[data-urn]"
          // posts with a data-urn attribute
        ].join(", ")
      )
    );
  }
  var processedPosts = /* @__PURE__ */ new WeakSet();
  var offScreenPosts = /* @__PURE__ */ new WeakSet();
  function scanForJobPosts(root = document) {
    const containers = getPostContainers(root);
    for (const container of containers) {
      if (processedPosts.has(container))
        continue;
      if (!isNearViewport(container)) {
        offScreenPosts.add(container);
        continue;
      }
      processedPosts.add(container);
      offScreenPosts.delete(container);
      if (!detectJobPost(container))
        continue;
      const job = extractJobData(container, PLATFORM);
      injectImportButton(container, job, (clickedJob) => {
        handleImportClick(clickedJob);
      });
    }
  }
  async function handleImportClick(job) {
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
          // Timeout after 4 s so we don't block the modal
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
    showJobModal(job, cachedCategories, aiCategory);
  }
  function isNearViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight + 1200 && rect.bottom > -400 && rect.width > 0 && rect.height > 0;
  }
  function debounce(fn, ms) {
    let timer = null;
    return (...args) => {
      if (timer)
        clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, ms);
    };
  }
  var debouncedScan = debounce((nodes) => {
    for (const node of nodes) {
      scanForJobPosts(node);
    }
    scanForJobPosts(document);
  }, 300);
  var observer = new MutationObserver((mutations) => {
    const added = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          added.push(node);
        }
      }
    }
    if (added.length > 0)
      debouncedScan(added);
  });
  var debouncedScrollScan = debounce(() => scanForJobPosts(document), 500);
  window.addEventListener("scroll", debouncedScrollScan, { passive: true });
  async function init() {
    preloadCategories();
    scanForJobPosts(document);
    observer.observe(document.body, { childList: true, subtree: true });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdXRpbHMvcGFyc2VyLnRzIiwgIi4uL3V0aWxzL2RvbUhlbHBlcnMudHMiLCAiLi4vY29udGVudC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHR5cGUgeyBKb2JQb3N0LCBQbGF0Zm9ybSB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEtleXdvcmQgc2NvcmluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IEpPQl9LRVlXT1JEUzogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuICAvLyBcdTI1MDBcdTI1MDAgU3Ryb25nIHNpZ25hbHMgXHUyNTAwXHUyNTAwXHJcbiAgaGlyaW5nOiAzLFxyXG4gIFwid2UncmUgaGlyaW5nXCI6IDQsXHJcbiAgXCJ3ZSBhcmUgaGlyaW5nXCI6IDQsXHJcbiAgXCJub3cgaGlyaW5nXCI6IDQsXHJcbiAgXCJqb2Igb3BlbmluZ1wiOiA0LFxyXG4gIFwiam9iIG9wcG9ydHVuaXR5XCI6IDMsXHJcbiAgXCJqb2IgdmFjYW5jeVwiOiA0LFxyXG4gIFwiam9iIG9mZmVyXCI6IDMsXHJcbiAgXCJvcGVuIHBvc2l0aW9uXCI6IDMsXHJcbiAgXCJpbW1lZGlhdGUgaGlyaW5nXCI6IDQsXHJcbiAgXCJ1cmdlbnRseSBoaXJpbmdcIjogNCxcclxuICBcImpvYiBhdmFpbGFibGVcIjogMyxcclxuICBcImpvYnMgYXZhaWxhYmxlXCI6IDMsXHJcbiAgXCJhY2NlcHRpbmcgYXBwbGljYXRpb25zXCI6IDMsXHJcbiAgXCJsb29raW5nIGZvclwiOiAyLFxyXG4gIFwibmVlZCBhXCI6IDIsXHJcbiAgXCJuZWVkZWQgdXJnZW50bHlcIjogMyxcclxuICB1cmdlbnQ6IDIsXHJcbiAgdmFjYW5jeTogMyxcclxuICB2YWNhbmNpZXM6IDMsXHJcbiAgXCJhcHBseSBub3dcIjogMyxcclxuICBcImFwcGx5IGhlcmVcIjogMyxcclxuICBcInNlbmQgY3ZcIjogMyxcclxuICBcInNlbmQgcmVzdW1lXCI6IDMsXHJcbiAgXCJkcm9wIHlvdXIgY3ZcIjogMyxcclxuICBcImRyb3AgY3ZcIjogMyxcclxuICBcInN1Ym1pdCBjdlwiOiAzLFxyXG4gIFwic2VuZCBhcHBsaWNhdGlvblwiOiAzLFxyXG4gIFwiam9iIGRlc2NyaXB0aW9uXCI6IDMsXHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBXb3JrIHR5cGUgXHUyNTAwXHUyNTAwXHJcbiAgXCJmdWxsLXRpbWVcIjogMixcclxuICBmdWxsdGltZTogMixcclxuICBcInBhcnQtdGltZVwiOiAyLFxyXG4gIHBhcnR0aW1lOiAyLFxyXG4gIFwid29yayBmcm9tIGhvbWVcIjogMixcclxuICBcIndvcmsgZnJvbSBvZmZpY2VcIjogMixcclxuICB3Zmg6IDIsXHJcbiAgXCJyZW1vdGUgd29ya1wiOiAyLFxyXG4gIG9uc2l0ZTogMixcclxuICBcIm9uLXNpdGVcIjogMixcclxuICBmcmVlbGFuY2U6IDIsXHJcbiAgY29udHJhY3RvcjogMixcclxuICBcInByb2plY3QtYmFzZWRcIjogMixcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIENvbXBlbnNhdGlvbiBcdTI1MDBcdTI1MDBcclxuICBzYWxhcnk6IDIsXHJcbiAgXCJwZXIgbW9udGhcIjogMixcclxuICBcInBlciBkYXlcIjogMixcclxuICBcInBlciBob3VyXCI6IDEsXHJcbiAgYnVkZ2V0OiAyLFxyXG4gIGNvbXBlbnNhdGlvbjogMixcclxuICBcImJhc2ljIHBheVwiOiAyLFxyXG4gIGFsbG93YW5jZTogMSxcclxuICBiZW5lZml0czogMSxcclxuICBcIndpdGggYmVuZWZpdHNcIjogMixcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIENvbnRhY3QgLyBhcHBseSBcdTI1MDBcdTI1MDBcclxuICBcImRtIGZvclwiOiAyLFxyXG4gIFwiZG0gdXNcIjogMixcclxuICBcImluYm94IHVzXCI6IDIsXHJcbiAgXCJtZXNzYWdlIHVzXCI6IDEsXHJcbiAgXCJjb250YWN0IHVzXCI6IDEsXHJcbiAgXCJpbnRlcmVzdGVkIGFwcGxpY2FudHNcIjogMyxcclxuICBcImludGVyZXN0ZWQgY2FuZGlkYXRlc1wiOiAzLFxyXG4gIGFwcGxpY2FudHM6IDIsXHJcbiAgY2FuZGlkYXRlczogMSxcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFJlcXVpcmVtZW50cyAvIHF1YWxpZmljYXRpb25zIFx1MjUwMFx1MjUwMFxyXG4gIFwiZXhwZXJpZW5jZSByZXF1aXJlZFwiOiAyLFxyXG4gIFwieWVhcnMgZXhwZXJpZW5jZVwiOiAyLFxyXG4gIFwieWVhcnMgb2YgZXhwZXJpZW5jZVwiOiAyLFxyXG4gIFwibWluaW11bSBleHBlcmllbmNlXCI6IDIsXHJcbiAgXCJhdCBsZWFzdFwiOiAxLFxyXG4gIHNraWxsczogMSxcclxuICBxdWFsaWZpY2F0aW9uczogMixcclxuICByZXF1aXJlbWVudHM6IDEsXHJcbiAgcmVzcG9uc2liaWxpdGllczogMixcclxuICBcIm11c3QgaGF2ZVwiOiAxLFxyXG4gIFwibXVzdCBiZVwiOiAxLFxyXG4gIFwibXVzdCBrbm93XCI6IDEsXHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBQb3NpdGlvbiAvIHJvbGUgXHUyNTAwXHUyNTAwXHJcbiAgcG9zaXRpb246IDEsXHJcbiAgcm9sZTogMSxcclxuICBcImpvYiB0aXRsZVwiOiAyLFxyXG4gIHBvc3Q6IDEsXHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBUcmFkZSAmIHNlcnZpY2Uga2V5d29yZHMgXHUyNTAwXHUyNTAwXHJcbiAgcGx1bWJlcjogMyxcclxuICBlbGVjdHJpY2lhbjogMyxcclxuICBjYXJwZW50ZXI6IDMsXHJcbiAgcGFpbnRlcjogMyxcclxuICBjbGVhbmVyOiAzLFxyXG4gIGRyaXZlcjogMixcclxuICB0ZWNobmljaWFuOiAyLFxyXG4gIG1lY2hhbmljOiAyLFxyXG4gIHdlbGRlcjogMyxcclxuICBtYXNvbjogMyxcclxuICBsYWJvcmVyOiAzLFxyXG4gIGhlbHBlcjogMixcclxuICBhc3Npc3RhbnQ6IDEsXHJcbiAgbWFuYWdlcjogMSxcclxuICBlbmdpbmVlcjogMSxcclxuICBkZXZlbG9wZXI6IDEsXHJcbiAgZGVzaWduZXI6IDEsXHJcbiAgc3RhZmY6IDEsXHJcbiAgd29ya2VyOiAyLFxyXG4gIG9wZXJhdG9yOiAyLFxyXG4gIHN1cGVydmlzb3I6IDIsXHJcbiAgXCJzZXJ2aWNlIGNyZXdcIjogMyxcclxuICBjYXNoaWVyOiAzLFxyXG4gIFwic2FsZXMgcmVwcmVzZW50YXRpdmVcIjogMyxcclxuICBcInNhbGVzIGFnZW50XCI6IDMsXHJcbiAgXCJ2aXJ0dWFsIGFzc2lzdGFudFwiOiAzLFxyXG4gIFwiZGF0YSBlbnRyeVwiOiAzLFxyXG4gIGVuY29kZXI6IDMsXHJcbiAgXCJjdXN0b21lciBzZXJ2aWNlXCI6IDIsXHJcbiAgXCJjdXN0b21lciBjYXJlXCI6IDIsXHJcbiAgcmVjZXB0aW9uaXN0OiAzLFxyXG4gIFwiY2FsbCBjZW50ZXJcIjogMyxcclxuICBhZ2VudDogMSxcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEZpbGlwaW5vIC8gcmVnaW9uYWwgcGhyYXNlcyBcdTI1MDBcdTI1MDBcclxuICBcIm5hZ2hhaGFuYXAgbmdcIjogMywgICAvLyBcImxvb2tpbmcgZm9yXCIgaW4gVGFnYWxvZ1xyXG4gIFwibmFnLWFhbnlheWFcIjogMywgICAgIC8vIFwiaW52aXRpbmdcIiBhcHBsaWNhbnRzXHJcbiAgXCJtYXkgYmFrYW50ZVwiOiA0LCAgICAgLy8gXCJoYXMgdmFjYW5jeVwiIGluIFRhZ2Fsb2dcclxuICBcImthaWxhbmdhbiBuZ1wiOiAzLCAgICAvLyBcIm5lZWQgYVwiIGluIFRhZ2Fsb2dcclxuICBcInB1d2VkZSBtYWctYXBwbHlcIjogMyxcclxuICBcInB3ZWRlIG1hZy1hcHBseVwiOiAzLFxyXG4gIFwibWFnLWFwcGx5IG5hXCI6IDMsXHJcbiAgXCJ3YWxhbmcgZXhwZXJpZW5jZVwiOiAyLFxyXG4gIFwidHJhaW5pbmcgcHJvdmlkZWRcIjogMixcclxuICBcIm9wZW4gZm9yXCI6IDIsXHJcbiAgXCJxdWFsaWZpZWQgYXBwbGljYW50c1wiOiAzLFxyXG4gIG9mdzogMixcclxuICBcIm1hbGUgb3IgZmVtYWxlXCI6IDIsXHJcbiAgXCJtYWxlL2ZlbWFsZVwiOiAyLFxyXG4gIFwiYWNjZXB0aW5nIHdhbGstaW5cIjogMyxcclxufTtcclxuXHJcbmNvbnN0IFBIT05FX1JFR0VYID0gLyhcXCs/XFxkW1xcZFxcc1xcLSgpLl17NywxNX1cXGQpL2c7XHJcbmNvbnN0IENVUlJFTkNZX1JFR0VYID0gLyg/OlBIUHxBRUR8VVNEfFxcJHxcdTIwQjF8XHUyMEFDfFx1MDBBMylcXHMqW1xcZCxdK3xbXFxkLF0rXFxzKig/OlBIUHxBRUR8VVNEKS9naTtcclxuY29uc3QgRU1BSUxfUkVHRVggPSAvW2EtekEtWjAtOS5fJSstXStAW2EtekEtWjAtOS4tXStcXC5bYS16QS1aXXsyLH0vZztcclxuXHJcbi8qKiBNaW5pbXVtIHNjb3JlIGZvciBhIHBvc3QgdG8gYmUgY29uc2lkZXJlZCBhIGpvYiBwb3N0ICovXHJcbmNvbnN0IERFVEVDVElPTl9USFJFU0hPTEQgPSA0O1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENhdGVnb3J5IGF1dG8tdGFnZ2luZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IENBVEVHT1JZX0tFWVdPUkRTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgUGx1bWJpbmc6IFtcInBsdW1iZXJcIiwgXCJwbHVtYmluZ1wiLCBcInBpcGVcIiwgXCJkcmFpblwiLCBcImZhdWNldFwiLCBcInRvaWxldFwiLCBcIndhdGVyIGxlYWtcIl0sXHJcbiAgRWxlY3RyaWNhbDogW1wiZWxlY3RyaWNpYW5cIiwgXCJlbGVjdHJpY2FsXCIsIFwid2lyaW5nXCIsIFwiY2lyY3VpdFwiLCBcInBhbmVsXCIsIFwib3V0bGV0XCIsIFwidm9sdGFnZVwiXSxcclxuICBDYXJwZW50cnk6IFtcImNhcnBlbnRlclwiLCBcImNhcnBlbnRyeVwiLCBcIndvb2RcIiwgXCJmdXJuaXR1cmVcIiwgXCJjYWJpbmV0XCIsIFwiZmxvb3JpbmdcIl0sXHJcbiAgUGFpbnRpbmc6IFtcInBhaW50ZXJcIiwgXCJwYWludGluZ1wiLCBcInBhaW50XCIsIFwiY29hdGluZ1wiLCBcIndhbGxwYXBlclwiLCBcImZpbmlzaGluZ1wiXSxcclxuICBDbGVhbmluZzogW1wiY2xlYW5lclwiLCBcImNsZWFuaW5nXCIsIFwiaG91c2VrZWVwaW5nXCIsIFwiamFuaXRvcmlhbFwiLCBcInNhbml0YXRpb25cIiwgXCJtYWlkXCJdLFxyXG4gIERyaXZpbmc6IFtcImRyaXZlclwiLCBcImRyaXZpbmdcIiwgXCJkZWxpdmVyeVwiLCBcImNvdXJpZXJcIiwgXCJ0cmFuc3BvcnRcIiwgXCJsb2dpc3RpY3NcIiwgXCJncmFiXCJdLFxyXG4gIEhWQUM6IFtcImh2YWNcIiwgXCJhaXJjb25cIiwgXCJhaXIgY29uZGl0aW9uaW5nXCIsIFwiYWlyY29uZGl0aW9uaW5nXCIsIFwicmVmcmlnZXJhdGlvblwiLCBcImNvb2xpbmdcIiwgXCJoZWF0aW5nXCJdLFxyXG4gIFdlbGRpbmc6IFtcIndlbGRlclwiLCBcIndlbGRpbmdcIiwgXCJmYWJyaWNhdGlvblwiLCBcInN0ZWVsXCIsIFwibWV0YWxcIl0sXHJcbiAgQ29uc3RydWN0aW9uOiBbXCJtYXNvblwiLCBcIm1hc29ucnlcIiwgXCJjb25zdHJ1Y3Rpb25cIiwgXCJsYWJvcmVyXCIsIFwiY29uY3JldGVcIiwgXCJidWlsZGVyXCIsIFwic2NhZmZvbGRpbmdcIl0sXHJcbiAgTWVjaGFuaWNhbDogW1wibWVjaGFuaWNcIiwgXCJtZWNoYW5pY2FsXCIsIFwiZW5naW5lXCIsIFwibW90b3JcIiwgXCJhdXRvbW90aXZlXCIsIFwidmVoaWNsZVwiLCBcInJlcGFpclwiXSxcclxuICBJVDogW1wiZGV2ZWxvcGVyXCIsIFwicHJvZ3JhbW1lclwiLCBcInNvZnR3YXJlXCIsIFwiY29kaW5nXCIsIFwid2ViXCIsIFwiYXBwXCIsIFwiaXQgc3VwcG9ydFwiLCBcIm5ldHdvcmtcIl0sXHJcbiAgRGVzaWduOiBbXCJkZXNpZ25lclwiLCBcImdyYXBoaWNcIiwgXCJ1aVwiLCBcInV4XCIsIFwiY3JlYXRpdmVcIiwgXCJpbGx1c3RyYXRvclwiLCBcInBob3Rvc2hvcFwiXSxcclxuICBIZWFsdGhjYXJlOiBbXCJudXJzZVwiLCBcImNhcmVnaXZlclwiLCBcIm1lZGljYWxcIiwgXCJoZWFsdGhjYXJlXCIsIFwiZG9jdG9yXCIsIFwidGhlcmFwaXN0XCJdLFxyXG4gIEVkdWNhdGlvbjogW1widGVhY2hlclwiLCBcInR1dG9yXCIsIFwiaW5zdHJ1Y3RvclwiLCBcImVkdWNhdG9yXCIsIFwidHJhaW5lclwiLCBcInRlYWNoaW5nXCJdLFxyXG4gIFNlY3VyaXR5OiBbXCJzZWN1cml0eSBndWFyZFwiLCBcInNlY3VyaXR5IG9mZmljZXJcIiwgXCJib2R5Z3VhcmRcIiwgXCJjY3R2XCIsIFwicGF0cm9sXCJdLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gYXV0b1RhZ0NhdGVnb3J5KHRleHQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgY29uc3QgbG93ZXIgPSB0ZXh0LnRvTG93ZXJDYXNlKCk7XHJcbiAgbGV0IGJlc3RDYXRlZ29yeTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIGxldCBiZXN0U2NvcmUgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwga2V5d29yZHNdIG9mIE9iamVjdC5lbnRyaWVzKENBVEVHT1JZX0tFWVdPUkRTKSkge1xyXG4gICAgY29uc3Qgc2NvcmUgPSBrZXl3b3Jkcy5maWx0ZXIoKGt3KSA9PiBsb3dlci5pbmNsdWRlcyhrdykpLmxlbmd0aDtcclxuICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xyXG4gICAgICBiZXN0U2NvcmUgPSBzY29yZTtcclxuICAgICAgYmVzdENhdGVnb3J5ID0gY2F0ZWdvcnk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYmVzdFNjb3JlID4gMCA/IGJlc3RDYXRlZ29yeSA6IHVuZGVmaW5lZDtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFNjb3JpbmcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5pbnRlcmZhY2UgU2NvcmluZ1Jlc3VsdCB7XHJcbiAgc2NvcmU6IG51bWJlcjtcclxuICBjb25maWRlbmNlOiBudW1iZXI7XHJcbiAgaGFzUGhvbmU6IGJvb2xlYW47XHJcbiAgaGFzQ3VycmVuY3k6IGJvb2xlYW47XHJcbiAgaGFzRW1haWw6IGJvb2xlYW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjb3JlVGV4dCh0ZXh0OiBzdHJpbmcpOiBTY29yaW5nUmVzdWx0IHtcclxuICBjb25zdCBsb3dlciA9IHRleHQudG9Mb3dlckNhc2UoKTtcclxuICBsZXQgc2NvcmUgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IFtrZXl3b3JkLCB3ZWlnaHRdIG9mIE9iamVjdC5lbnRyaWVzKEpPQl9LRVlXT1JEUykpIHtcclxuICAgIGlmIChsb3dlci5pbmNsdWRlcyhrZXl3b3JkKSkge1xyXG4gICAgICBzY29yZSArPSB3ZWlnaHQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb25zdCBoYXNQaG9uZSA9IFBIT05FX1JFR0VYLnRlc3QodGV4dCk7XHJcbiAgY29uc3QgaGFzQ3VycmVuY3kgPSBDVVJSRU5DWV9SRUdFWC50ZXN0KHRleHQpO1xyXG4gIGNvbnN0IGhhc0VtYWlsID0gRU1BSUxfUkVHRVgudGVzdCh0ZXh0KTtcclxuXHJcbiAgLy8gUmVzZXQgcmVnZXggbGFzdEluZGV4IGFmdGVyIHRlc3QoKVxyXG4gIFBIT05FX1JFR0VYLmxhc3RJbmRleCA9IDA7XHJcbiAgQ1VSUkVOQ1lfUkVHRVgubGFzdEluZGV4ID0gMDtcclxuICBFTUFJTF9SRUdFWC5sYXN0SW5kZXggPSAwO1xyXG5cclxuICBpZiAoaGFzUGhvbmUpIHNjb3JlICs9IDI7XHJcbiAgaWYgKGhhc0N1cnJlbmN5KSBzY29yZSArPSAzO1xyXG4gIGlmIChoYXNFbWFpbCkgc2NvcmUgKz0gMTtcclxuXHJcbiAgLy8gTm9ybWFsaXplIHRvIGEgMFx1MjAxMzEgY29uZmlkZW5jZSBzY29yZTsgY2FwIGlucHV0IGF0IDIwIGZvciBub3JtYWxpemF0aW9uXHJcbiAgY29uc3QgY29uZmlkZW5jZSA9IE1hdGgubWluKHNjb3JlIC8gMjAsIDEpO1xyXG5cclxuICByZXR1cm4geyBzY29yZSwgY29uZmlkZW5jZSwgaGFzUGhvbmUsIGhhc0N1cnJlbmN5LCBoYXNFbWFpbCB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgUHVibGljIGRldGVjdGlvbiBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4vKipcclxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBlbGVtZW50IGxvb2tzIGxpa2UgYSBqb2IgcG9zdC5cclxuICogRXhwb3J0ZWQgZm9yIHVzZSBpbiB0aGUgY29udGVudCBzY3JpcHQgc2Nhbm5lci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RKb2JQb3N0KGVsZW1lbnQ6IEVsZW1lbnQpOiBib29sZWFuIHtcclxuICBjb25zdCB0ZXh0ID0gZWxlbWVudC50ZXh0Q29udGVudCA/PyBcIlwiO1xyXG4gIGNvbnN0IHsgc2NvcmUgfSA9IHNjb3JlVGV4dCh0ZXh0KTtcclxuICByZXR1cm4gc2NvcmUgPj0gREVURUNUSU9OX1RIUkVTSE9MRDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgam9iIGRhdGEgZnJvbSBhIHBvc3QgZWxlbWVudC5cclxuICogSGFuZGxlcyBwbGF0Zm9ybS1zcGVjaWZpYyBET00gc3RydWN0dXJlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RKb2JEYXRhKGVsZW1lbnQ6IEVsZW1lbnQsIHBsYXRmb3JtOiBQbGF0Zm9ybSk6IEpvYlBvc3Qge1xyXG4gIGNvbnN0IHRleHQgPSBlbGVtZW50LnRleHRDb250ZW50ID8/IFwiXCI7XHJcbiAgY29uc3QgeyBjb25maWRlbmNlLCBoYXNDdXJyZW5jeSB9ID0gc2NvcmVUZXh0KHRleHQpO1xyXG5cclxuICBsZXQgdGl0bGUgPSBcIlwiO1xyXG4gIGxldCBkZXNjcmlwdGlvbiA9IFwiXCI7XHJcbiAgbGV0IHBvc3RlZEJ5ID0gXCJcIjtcclxuICBsZXQgdGltZXN0YW1wID0gXCJcIjtcclxuICBjb25zdCB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcclxuXHJcbiAgaWYgKHBsYXRmb3JtID09PSBcImZhY2Vib29rXCIpIHtcclxuICAgIHRpdGxlID0gZXh0cmFjdEZhY2Vib29rVGl0bGUoZWxlbWVudCwgdGV4dCk7XHJcbiAgICBkZXNjcmlwdGlvbiA9IGV4dHJhY3RGYWNlYm9va0Rlc2NyaXB0aW9uKGVsZW1lbnQsIHRleHQpO1xyXG4gICAgcG9zdGVkQnkgPSBleHRyYWN0RmFjZWJvb2tQb3N0ZXIoZWxlbWVudCk7XHJcbiAgICB0aW1lc3RhbXAgPSBleHRyYWN0RmFjZWJvb2tUaW1lc3RhbXAoZWxlbWVudCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRpdGxlID0gZXh0cmFjdExpbmtlZEluVGl0bGUoZWxlbWVudCwgdGV4dCk7XHJcbiAgICBkZXNjcmlwdGlvbiA9IGV4dHJhY3RMaW5rZWRJbkRlc2NyaXB0aW9uKGVsZW1lbnQsIHRleHQpO1xyXG4gICAgcG9zdGVkQnkgPSBleHRyYWN0TGlua2VkSW5Qb3N0ZXIoZWxlbWVudCk7XHJcbiAgICB0aW1lc3RhbXAgPSBleHRyYWN0TGlua2VkSW5UaW1lc3RhbXAoZWxlbWVudCk7XHJcbiAgfVxyXG5cclxuICAvLyBGYWxsYmFjayB0aXRsZSBmcm9tIGZpcnN0IG1lYW5pbmdmdWwgbGluZSBvZiB0ZXh0XHJcbiAgaWYgKCF0aXRsZSkge1xyXG4gICAgY29uc3QgbGluZXMgPSB0ZXh0XHJcbiAgICAgIC5zcGxpdChcIlxcblwiKVxyXG4gICAgICAubWFwKChsKSA9PiBsLnRyaW0oKSlcclxuICAgICAgLmZpbHRlcigobCkgPT4gbC5sZW5ndGggPiAxMCAmJiBsLmxlbmd0aCA8IDEyMCk7XHJcbiAgICB0aXRsZSA9IGxpbmVzWzBdID8/IFwiSm9iIE9wcG9ydHVuaXR5XCI7XHJcbiAgfVxyXG5cclxuICBjb25zdCBidWRnZXQgPSBoYXNDdXJyZW5jeSA/IHBhcnNlQnVkZ2V0KHRleHQpIDogdW5kZWZpbmVkO1xyXG4gIGNvbnN0IGxvY2F0aW9uID0gZXh0cmFjdExvY2F0aW9uKHRleHQpO1xyXG4gIGNvbnN0IGNhdGVnb3J5ID0gYXV0b1RhZ0NhdGVnb3J5KHRleHQpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgdGl0bGU6IHNhbml0aXplKHRpdGxlLnNsaWNlKDAsIDE1MCkpLFxyXG4gICAgZGVzY3JpcHRpb246IHNhbml0aXplKGRlc2NyaXB0aW9uLnNsaWNlKDAsIDIwMDApKSxcclxuICAgIHNvdXJjZTogcGxhdGZvcm0sXHJcbiAgICBzb3VyY2VfdXJsOiBleHRyYWN0UG9zdFVybChlbGVtZW50LCBwbGF0Zm9ybSkgfHwgdXJsLFxyXG4gICAgcG9zdGVkX2J5OiBzYW5pdGl6ZShwb3N0ZWRCeS5zbGljZSgwLCAxMDApKSxcclxuICAgIHRpbWVzdGFtcDogdGltZXN0YW1wIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIGxvY2F0aW9uOiBsb2NhdGlvbiA/IHNhbml0aXplKGxvY2F0aW9uKSA6IHVuZGVmaW5lZCxcclxuICAgIGJ1ZGdldCxcclxuICAgIGNhdGVnb3J5LFxyXG4gICAgY29uZmlkZW5jZSxcclxuICB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgRmFjZWJvb2stc3BlY2lmaWMgZXh0cmFjdG9ycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RGYWNlYm9va1RpdGxlKGVsZW1lbnQ6IEVsZW1lbnQsIGZ1bGxUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIC8vIFRyeSBzdHJvbmcvYm9sZCB0YWdzIHRoYXQgb2Z0ZW4gY29udGFpbiBqb2IgdGl0bGVcclxuICBjb25zdCBzdHJvbmcgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCJzdHJvbmdcIik7XHJcbiAgaWYgKHN0cm9uZz8udGV4dENvbnRlbnQpIHJldHVybiBzdHJvbmcudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICAvLyBUcnkgaDEvaDIvaDNcclxuICBmb3IgKGNvbnN0IHRhZyBvZiBbXCJoMVwiLCBcImgyXCIsIFwiaDNcIl0pIHtcclxuICAgIGNvbnN0IGhlYWRpbmcgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IodGFnKTtcclxuICAgIGlmIChoZWFkaW5nPy50ZXh0Q29udGVudCkgcmV0dXJuIGhlYWRpbmcudGV4dENvbnRlbnQudHJpbSgpO1xyXG4gIH1cclxuXHJcbiAgLy8gVXNlIHRoZSBmaXJzdCBjYXBpdGFsaXplZCBzZW50ZW5jZSB0aGF0IG1hdGNoZXMgYSBqb2IgcGF0dGVyblxyXG4gIGNvbnN0IG1hdGNoID0gZnVsbFRleHQubWF0Y2goLyg/OmhpcmluZ3xsb29raW5nIGZvcnxuZWVkKVteLiE/XFxuXXs1LDgwfS9pKTtcclxuICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaFswXS50cmltKCk7XHJcblxyXG4gIHJldHVybiBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0RmFjZWJvb2tEZXNjcmlwdGlvbihlbGVtZW50OiBFbGVtZW50LCBmdWxsVGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAvLyBGYWNlYm9vayBwb3N0IHRleHQgbGl2ZXMgaW4gZGl2W2RhdGEtYWQtcHJldmlldz1cIm1lc3NhZ2VcIl0gb3IgW2Rpcj1cImF1dG9cIl0gc3BhbnNcclxuICBjb25zdCB0ZXh0Tm9kZSA9XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFkLXByZXZpZXc9XCJtZXNzYWdlXCJdJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtdGVzdGlkPVwicG9zdF9tZXNzYWdlXCJdJykgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi54ZGoyNjZyXCIpID8/IC8vIEZCIGNsYXNzIGZvciBwb3N0IGJvZHkgKGNoYW5nZXMgb2Z0ZW4pXHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkaXI9XCJhdXRvXCJdJyk7XHJcblxyXG4gIGlmICh0ZXh0Tm9kZT8udGV4dENvbnRlbnQpIHJldHVybiB0ZXh0Tm9kZS50ZXh0Q29udGVudC50cmltKCk7XHJcblxyXG4gIHJldHVybiBmdWxsVGV4dC50cmltKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RGYWNlYm9va1Bvc3RlcihlbGVtZW50OiBFbGVtZW50KTogc3RyaW5nIHtcclxuICAvLyBBY3RvciBuYW1lIHR5cGljYWxseSBpbiBhIGxpbmsgd2l0aCBhcmlhLWxhYmVsIG9yIHByb2ZpbGUgbGlua1xyXG4gIGNvbnN0IGFjdG9yTGluayA9XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2Fbcm9sZT1cImxpbmtcIl1bdGFiaW5kZXg9XCIwXCJdIHN0cm9uZycpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRlc3RpZD1cInN0b3J5LXN1YnRpdGxlXCJdIGEnKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiaDMgYVwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiaDQgYVwiKTtcclxuXHJcbiAgcmV0dXJuIGFjdG9yTGluaz8udGV4dENvbnRlbnQ/LnRyaW0oKSA/PyBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0RmFjZWJvb2tUaW1lc3RhbXAoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdGltZUVsID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiYWJicltkYXRhLXV0aW1lXVwiKTtcclxuICBpZiAodGltZUVsKSB7XHJcbiAgICBjb25zdCB1dGltZSA9IHRpbWVFbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXV0aW1lXCIpO1xyXG4gICAgaWYgKHV0aW1lKSByZXR1cm4gbmV3IERhdGUocGFyc2VJbnQodXRpbWUpICogMTAwMCkudG9JU09TdHJpbmcoKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHRpbWVUYWcgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCJ0aW1lXCIpO1xyXG4gIGlmICh0aW1lVGFnKSB7XHJcbiAgICBjb25zdCBkdCA9IHRpbWVUYWcuZ2V0QXR0cmlidXRlKFwiZGF0ZXRpbWVcIik7XHJcbiAgICBpZiAoZHQpIHJldHVybiBuZXcgRGF0ZShkdCkudG9JU09TdHJpbmcoKTtcclxuICAgIGlmICh0aW1lVGFnLnRleHRDb250ZW50KSByZXR1cm4gdGltZVRhZy50ZXh0Q29udGVudC50cmltKCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0UG9zdFVybChlbGVtZW50OiBFbGVtZW50LCBwbGF0Zm9ybTogUGxhdGZvcm0pOiBzdHJpbmcge1xyXG4gIGlmIChwbGF0Zm9ybSA9PT0gXCJmYWNlYm9va1wiKSB7XHJcbiAgICBjb25zdCBsaW5rcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MQW5jaG9yRWxlbWVudD4oXCJhW2hyZWZdXCIpO1xyXG4gICAgZm9yIChjb25zdCBsaW5rIG9mIGxpbmtzKSB7XHJcbiAgICAgIGNvbnN0IGhyZWYgPSBsaW5rLmhyZWY7XHJcbiAgICAgIGlmIChocmVmLmluY2x1ZGVzKFwiL3Bvc3RzL1wiKSB8fCBocmVmLmluY2x1ZGVzKFwic3RvcnlfZmJpZFwiKSB8fCBocmVmLmluY2x1ZGVzKFwicGVybWFsaW5rXCIpKSB7XHJcbiAgICAgICAgcmV0dXJuIGhyZWY7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgY29uc3QgbGlua3MgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEFuY2hvckVsZW1lbnQ+KFwiYVtocmVmXVwiKTtcclxuICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xyXG4gICAgICBjb25zdCBocmVmID0gbGluay5ocmVmO1xyXG4gICAgICBpZiAoaHJlZi5pbmNsdWRlcyhcIi9mZWVkL3VwZGF0ZS9cIikgfHwgaHJlZi5pbmNsdWRlcyhcIi9wb3N0cy9cIikgfHwgaHJlZi5pbmNsdWRlcyhcInVnY1Bvc3RcIikpIHtcclxuICAgICAgICByZXR1cm4gaHJlZjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBMaW5rZWRJbi1zcGVjaWZpYyBleHRyYWN0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdExpbmtlZEluVGl0bGUoZWxlbWVudDogRWxlbWVudCwgZnVsbFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgLy8gTGlua2VkSW4gam9iIHVwZGF0ZSB0aXRsZSBvZnRlbiBpbiAuZmVlZC1zaGFyZWQtdGV4dCBzdHJvbmcgb3IgLnVwZGF0ZS1jb21wb25lbnRzLXRleHRcclxuICBjb25zdCBzdHJvbmcgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmZlZWQtc2hhcmVkLXRleHQgc3Ryb25nXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudXBkYXRlLWNvbXBvbmVudHMtdGV4dCBzdHJvbmdcIik7XHJcbiAgaWYgKHN0cm9uZz8udGV4dENvbnRlbnQpIHJldHVybiBzdHJvbmcudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICAvLyBJbmxpbmUgam9iIGxpc3RpbmcgdGl0bGVcclxuICBjb25zdCBqb2JUaXRsZSA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcclxuICAgIFwiLmpvYi1jYXJkLWNvbnRhaW5lcl9fbGluaywgLmpvYnMtdW5pZmllZC10b3AtY2FyZF9fam9iLXRpdGxlXCJcclxuICApO1xyXG4gIGlmIChqb2JUaXRsZT8udGV4dENvbnRlbnQpIHJldHVybiBqb2JUaXRsZS50ZXh0Q29udGVudC50cmltKCk7XHJcblxyXG4gIGNvbnN0IG1hdGNoID0gZnVsbFRleHQubWF0Y2goLyg/OmhpcmluZ3xsb29raW5nIGZvcnxuZWVkKVteLiE/XFxuXXs1LDgwfS9pKTtcclxuICBpZiAobWF0Y2gpIHJldHVybiBtYXRjaFswXS50cmltKCk7XHJcblxyXG4gIHJldHVybiBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5EZXNjcmlwdGlvbihlbGVtZW50OiBFbGVtZW50LCBmdWxsVGV4dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCB0ZXh0Tm9kZSA9XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuZmVlZC1zaGFyZWQtdGV4dFwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLnVwZGF0ZS1jb21wb25lbnRzLXRleHRcIikgPz9cclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi5mZWVkLXNoYXJlZC11cGRhdGUtdjJfX2Rlc2NyaXB0aW9uXCIpO1xyXG5cclxuICBpZiAodGV4dE5vZGU/LnRleHRDb250ZW50KSByZXR1cm4gdGV4dE5vZGUudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICByZXR1cm4gZnVsbFRleHQudHJpbSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5Qb3N0ZXIoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgY29uc3QgYWN0b3IgPVxyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLnVwZGF0ZS1jb21wb25lbnRzLWFjdG9yX19uYW1lIHNwYW5bYXJpYS1oaWRkZW49J3RydWUnXVwiKSA/P1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmZlZWQtc2hhcmVkLWFjdG9yX19uYW1lXCIpID8/XHJcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIudXBkYXRlLWNvbXBvbmVudHMtYWN0b3JfX25hbWVcIik7XHJcblxyXG4gIHJldHVybiBhY3Rvcj8udGV4dENvbnRlbnQ/LnRyaW0oKSA/PyBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TGlua2VkSW5UaW1lc3RhbXAoZWxlbWVudDogRWxlbWVudCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdGltZUVsID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFwidGltZVwiKTtcclxuICBpZiAodGltZUVsKSB7XHJcbiAgICBjb25zdCBkdCA9IHRpbWVFbC5nZXRBdHRyaWJ1dGUoXCJkYXRldGltZVwiKTtcclxuICAgIGlmIChkdCkgcmV0dXJuIG5ldyBEYXRlKGR0KS50b0lTT1N0cmluZygpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVsYXRpdmVUaW1lID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFxyXG4gICAgXCIuZmVlZC1zaGFyZWQtYWN0b3JfX3N1Yi1kZXNjcmlwdGlvbiwgLnVwZGF0ZS1jb21wb25lbnRzLWFjdG9yX19zdWItZGVzY3JpcHRpb25cIlxyXG4gICk7XHJcbiAgaWYgKHJlbGF0aXZlVGltZT8udGV4dENvbnRlbnQpIHJldHVybiByZWxhdGl2ZVRpbWUudGV4dENvbnRlbnQudHJpbSgpO1xyXG5cclxuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgU2hhcmVkIGhlbHBlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBwYXJzZUJ1ZGdldCh0ZXh0OiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xyXG4gIENVUlJFTkNZX1JFR0VYLmxhc3RJbmRleCA9IDA7XHJcbiAgY29uc3QgbWF0Y2ggPSBDVVJSRU5DWV9SRUdFWC5leGVjKHRleHQpO1xyXG4gIGlmICghbWF0Y2gpIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gIGNvbnN0IG51bVN0ciA9IG1hdGNoWzBdLnJlcGxhY2UoL1teMC05XS9nLCBcIlwiKTtcclxuICBjb25zdCBudW0gPSBwYXJzZUludChudW1TdHIsIDEwKTtcclxuICByZXR1cm4gaXNOYU4obnVtKSA/IHVuZGVmaW5lZCA6IG51bTtcclxufVxyXG5cclxuY29uc3QgTE9DQVRJT05fUEFUVEVSTlMgPSBbXHJcbiAgL1xcYmxvY2F0aW9uWzpcXHNdKyhbQS1aYS16XFxzLF0rPykoPzpcXC58LHxcXG58JCkvaSxcclxuICAvXFxiKD86YmFzZWQgaW58bG9jYXRlZCBpbnx3b3JrIGlufHdvcmtpbmcgaW58c2l0ZVs6XFxzXSspXFxzKihbQS1aYS16XFxzLF0rPykoPzpcXC58LHxcXG58JCkvaSxcclxuICAvXFxiKD86aW58YXQpXFxzKyhbQS1aXVthLXpdKyg/OltcXHMsXStbQS1aXVthLXpdKykqKSg/PVxccypbXFwuXFwsXFxuXSkvLFxyXG4gIC9cXGIoW0EtWl1bYS16XSsoPzpcXHNbQS1aXVthLXpdKykqKSxcXHMqKD86TWV0cm9cXHMpPyg/Ok1hbmlsYXxDZWJ1fERhdmFvfFF1ZXpvbiBDaXR5fE1ha2F0aXxQYXNpZ3xUYWd1aWd8TWFuZGFsdXlvbmd8UGFyYVx1MDBGMWFxdWV8TGFzIFBpXHUwMEYxYXN8TXVudGlubHVwYXxDYWxvb2NhbnxNYXJpa2luYXxQYXNheXxEdWJhaXxBYnUgRGhhYml8U2hhcmphaHxTaW5nYXBvcmV8Uml5YWRofFFhdGFyKS8sXHJcbl07XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0TG9jYXRpb24odGV4dDogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgTE9DQVRJT05fUEFUVEVSTlMpIHtcclxuICAgIGNvbnN0IG1hdGNoID0gdGV4dC5tYXRjaChwYXR0ZXJuKTtcclxuICAgIGlmIChtYXRjaD8uWzFdKSByZXR1cm4gbWF0Y2hbMV0udHJpbSgpO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG4vKiogU3RyaXAgSFRNTCB0YWdzIGFuZCB0cmltIHdoaXRlc3BhY2UgKi9cclxuZnVuY3Rpb24gc2FuaXRpemUoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGlucHV0LnJlcGxhY2UoLzxbXj5dKj4vZywgXCJcIikucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSB7IENhdGVnb3J5LCBJbXBvcnRKb2JNZXNzYWdlLCBJbXBvcnRKb2JSZXNwb25zZSwgSm9iUG9zdCB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENvbnN0YW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IEJVVFRPTl9DTEFTUyA9IFwibG9jYWxwcm8taW1wb3J0LWJ0blwiO1xyXG5jb25zdCBNT0RBTF9IT1NUX0lEID0gXCJsb2NhbHByby1tb2RhbC1ob3N0XCI7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgU2hhZG93IERPTSBzdHlsZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5jb25zdCBTSEFET1dfU1RZTEVTID0gYFxyXG4gIDpob3N0IHsgYWxsOiBpbml0aWFsOyBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBzYW5zLXNlcmlmOyB9XHJcblxyXG4gIC8qIFx1MjUwMFx1MjUwMCBJbXBvcnQgQnV0dG9uIFx1MjUwMFx1MjUwMCAqL1xyXG4gIC5scC1idG4ge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA2cHg7XHJcbiAgICBtYXJnaW46IDhweCAwIDRweDtcclxuICAgIHBhZGRpbmc6IDdweCAxNHB4O1xyXG4gICAgYmFja2dyb3VuZDogIzFhNTZkYjtcclxuICAgIGNvbG9yOiAjZmZmO1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGJvcmRlcjogbm9uZTtcclxuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgMC4ycztcclxuICAgIGJveC1zaGFkb3c6IDAgMXB4IDNweCByZ2JhKDAsMCwwLC4yKTtcclxuICAgIGxpbmUtaGVpZ2h0OiAxO1xyXG4gIH1cclxuICAubHAtYnRuOmhvdmVyIHsgYmFja2dyb3VuZDogIzFlNDI5ZjsgfVxyXG4gIC5scC1idG46YWN0aXZlIHsgdHJhbnNmb3JtOiBzY2FsZSgwLjk3KTsgfVxyXG4gIC5scC1idG4gc3ZnIHsgZmxleC1zaHJpbms6IDA7IH1cclxuICAubHAtYmFkZ2Uge1xyXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xyXG4gICAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMjUpO1xyXG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xyXG4gICAgcGFkZGluZzogMXB4IDVweDtcclxuICAgIGZvbnQtc2l6ZTogMTFweDtcclxuICB9XHJcblxyXG4gIC8qIFx1MjUwMFx1MjUwMCBNb2RhbCBvdmVybGF5IFx1MjUwMFx1MjUwMCAqL1xyXG4gIC5scC1vdmVybGF5IHtcclxuICAgIHBvc2l0aW9uOiBmaXhlZDtcclxuICAgIGluc2V0OiAwO1xyXG4gICAgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwuNSk7XHJcbiAgICB6LWluZGV4OiAyMTQ3NDgzNjQ3O1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcclxuICAgIHBhZGRpbmc6IDE2cHg7XHJcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xyXG4gICAgYW5pbWF0aW9uOiBscC1mYWRlLWluIC4xNXMgZWFzZTtcclxuICB9XHJcbiAgQGtleWZyYW1lcyBscC1mYWRlLWluIHsgZnJvbSB7IG9wYWNpdHk6IDAgfSB0byB7IG9wYWNpdHk6IDEgfSB9XHJcblxyXG4gIC8qIFx1MjUwMFx1MjUwMCBNb2RhbCBjYXJkIFx1MjUwMFx1MjUwMCAqL1xyXG4gIC5scC1tb2RhbCB7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gICAgYm9yZGVyLXJhZGl1czogMTZweDtcclxuICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgbWF4LXdpZHRoOiA1NjBweDtcclxuICAgIG1heC1oZWlnaHQ6IDkwdmg7XHJcbiAgICBvdmVyZmxvdy15OiBhdXRvO1xyXG4gICAgYm94LXNoYWRvdzogMCAyMHB4IDYwcHggcmdiYSgwLDAsMCwuMyk7XHJcbiAgICBhbmltYXRpb246IGxwLXNsaWRlLXVwIC4ycyBlYXNlO1xyXG4gIH1cclxuICBAa2V5ZnJhbWVzIGxwLXNsaWRlLXVwIHsgZnJvbSB7IHRyYW5zZm9ybTogdHJhbnNsYXRlWSgyMHB4KTsgb3BhY2l0eTogMCB9IHRvIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApOyBvcGFjaXR5OiAxIH0gfVxyXG5cclxuICAubHAtbW9kYWwtaGVhZGVyIHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xyXG4gICAgcGFkZGluZzogMjBweCAyNHB4IDE2cHg7XHJcbiAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2U1ZTdlYjtcclxuICB9XHJcbiAgLmxwLW1vZGFsLXRpdGxlIHtcclxuICAgIGZvbnQtc2l6ZTogMTdweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XHJcbiAgICBjb2xvcjogIzExMTgyNztcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA4cHg7XHJcbiAgfVxyXG5cclxuICAubHAtY2xvc2UtYnRuIHtcclxuICAgIGJhY2tncm91bmQ6IG5vbmU7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICBjb2xvcjogIzZiNzI4MDtcclxuICAgIHBhZGRpbmc6IDRweDtcclxuICAgIGJvcmRlci1yYWRpdXM6IDZweDtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gIH1cclxuICAubHAtY2xvc2UtYnRuOmhvdmVyIHsgYmFja2dyb3VuZDogI2YzZjRmNjsgY29sb3I6ICMxMTE4Mjc7IH1cclxuXHJcbiAgLmxwLW1vZGFsLWJvZHkgeyBwYWRkaW5nOiAyMHB4IDI0cHg7IH1cclxuXHJcbiAgLyogQ29uZmlkZW5jZSBiYWRnZSAqL1xyXG4gIC5scC1jb25maWRlbmNlIHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gICAgZ2FwOiA4cHg7XHJcbiAgICBtYXJnaW4tYm90dG9tOiAxNnB4O1xyXG4gICAgcGFkZGluZzogOHB4IDEycHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjZWZmNmZmO1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxMnB4O1xyXG4gICAgY29sb3I6ICMxZTQwYWY7XHJcbiAgfVxyXG4gIC5scC1jb25maWRlbmNlLWJhci1iZyB7XHJcbiAgICBmbGV4OiAxO1xyXG4gICAgaGVpZ2h0OiA2cHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjYmZkYmZlO1xyXG4gICAgYm9yZGVyLXJhZGl1czogM3B4O1xyXG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcclxuICB9XHJcbiAgLmxwLWNvbmZpZGVuY2UtYmFyIHtcclxuICAgIGhlaWdodDogMTAwJTtcclxuICAgIGJhY2tncm91bmQ6ICMxYTU2ZGI7XHJcbiAgICBib3JkZXItcmFkaXVzOiAzcHg7XHJcbiAgICB0cmFuc2l0aW9uOiB3aWR0aCAuNHMgZWFzZTtcclxuICB9XHJcblxyXG4gIC8qIEZvcm0gZmllbGRzICovXHJcbiAgLmxwLWZpZWxkIHsgbWFyZ2luLWJvdHRvbTogMTRweDsgfVxyXG4gIC5scC1sYWJlbCB7XHJcbiAgICBkaXNwbGF5OiBibG9jaztcclxuICAgIGZvbnQtc2l6ZTogMTJweDtcclxuICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICBjb2xvcjogIzM3NDE1MTtcclxuICAgIG1hcmdpbi1ib3R0b206IDRweDtcclxuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICBsZXR0ZXItc3BhY2luZzogLjVweDtcclxuICB9XHJcbiAgLmxwLWxhYmVsIC5scC1yZXF1aXJlZCB7IGNvbG9yOiAjZWY0NDQ0OyBtYXJnaW4tbGVmdDogMnB4OyB9XHJcbiAgLmxwLWlucHV0LCAubHAtdGV4dGFyZWEsIC5scC1zZWxlY3Qge1xyXG4gICAgd2lkdGg6IDEwMCU7XHJcbiAgICBwYWRkaW5nOiA5cHggMTJweDtcclxuICAgIGJvcmRlcjogMS41cHggc29saWQgI2QxZDVkYjtcclxuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcclxuICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgIGNvbG9yOiAjMTExODI3O1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XHJcbiAgICBvdXRsaW5lOiBub25lO1xyXG4gICAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIC4xNXM7XHJcbiAgICBmb250LWZhbWlseTogaW5oZXJpdDtcclxuICB9XHJcbiAgLmxwLWlucHV0OmZvY3VzLCAubHAtdGV4dGFyZWE6Zm9jdXMsIC5scC1zZWxlY3Q6Zm9jdXMgeyBib3JkZXItY29sb3I6ICMxYTU2ZGI7IH1cclxuICAubHAtdGV4dGFyZWEgeyByZXNpemU6IHZlcnRpY2FsOyBtaW4taGVpZ2h0OiAxMDBweDsgfVxyXG4gIC5scC1zZWxlY3Q6ZGlzYWJsZWQgeyBiYWNrZ3JvdW5kOiAjZjNmNGY2OyBjb2xvcjogIzljYTNhZjsgfVxyXG5cclxuICAubHAtcm93IHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEycHg7IH1cclxuICAubHAtcm93LTMgeyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmciAxZnIgMWZyOyBnYXA6IDEycHg7IH1cclxuICBpbnB1dFt0eXBlPVwiZGF0ZVwiXS5scC1pbnB1dCB7IGNvbG9yLXNjaGVtZTogbGlnaHQ7IH1cclxuXHJcbiAgLyogQ2F0ZWdvcnkgbG9hZGluZyBoaW50ICovXHJcbiAgLmxwLWNhdC1oaW50IHtcclxuICAgIGZvbnQtc2l6ZTogMTFweDtcclxuICAgIGNvbG9yOiAjNmI3MjgwO1xyXG4gICAgbWFyZ2luLXRvcDogM3B4O1xyXG4gIH1cclxuICAubHAtY2F0LWhpbnQuYWkgeyBjb2xvcjogIzdjM2FlZDsgfVxyXG5cclxuICAvKiBGb290ZXIgKi9cclxuICAubHAtbW9kYWwtZm9vdGVyIHtcclxuICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICBnYXA6IDEwcHg7XHJcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kO1xyXG4gICAgcGFkZGluZzogMTZweCAyNHB4O1xyXG4gICAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU3ZWI7XHJcbiAgfVxyXG4gIC5scC1jYW5jZWwtYnRuIHtcclxuICAgIHBhZGRpbmc6IDlweCAxOHB4O1xyXG4gICAgYm9yZGVyOiAxLjVweCBzb2xpZCAjZDFkNWRiO1xyXG4gICAgYmFja2dyb3VuZDogI2ZmZjtcclxuICAgIGNvbG9yOiAjMzc0MTUxO1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxNHB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDYwMDtcclxuICAgIGN1cnNvcjogcG9pbnRlcjtcclxuICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgLjE1cztcclxuICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gIH1cclxuICAubHAtY2FuY2VsLWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6ICNmOWZhZmI7IH1cclxuXHJcbiAgLmxwLXN1Ym1pdC1idG4ge1xyXG4gICAgcGFkZGluZzogOXB4IDIwcHg7XHJcbiAgICBiYWNrZ3JvdW5kOiAjMWE1NmRiO1xyXG4gICAgY29sb3I6ICNmZmY7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbiAgICBib3JkZXItcmFkaXVzOiA4cHg7XHJcbiAgICBmb250LXNpemU6IDE0cHg7XHJcbiAgICBmb250LXdlaWdodDogNjAwO1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAuMTVzO1xyXG4gICAgZGlzcGxheTogZmxleDtcclxuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAgICBnYXA6IDZweDtcclxuICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gIH1cclxuICAubHAtc3VibWl0LWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6ICMxZTQyOWY7IH1cclxuICAubHAtc3VibWl0LWJ0bjpkaXNhYmxlZCB7IGJhY2tncm91bmQ6ICM5Y2EzYWY7IGN1cnNvcjogbm90LWFsbG93ZWQ7IH1cclxuXHJcbiAgLyogU3RhdHVzIG1lc3NhZ2VzICovXHJcbiAgLmxwLXN0YXR1cyB7XHJcbiAgICBtYXJnaW46IDAgMjRweCAxNnB4O1xyXG4gICAgcGFkZGluZzogMTBweCAxNHB4O1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgZm9udC1zaXplOiAxM3B4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDUwMDtcclxuICAgIGRpc3BsYXk6IG5vbmU7XHJcbiAgfVxyXG4gIC5scC1zdGF0dXMuc3VjY2VzcyB7IGRpc3BsYXk6IGJsb2NrOyBiYWNrZ3JvdW5kOiAjZDFmYWU1OyBjb2xvcjogIzA2NWY0NjsgfVxyXG4gIC5scC1zdGF0dXMuZXJyb3IgICB7IGRpc3BsYXk6IGJsb2NrOyBiYWNrZ3JvdW5kOiAjZmVlMmUyOyBjb2xvcjogIzk5MWIxYjsgfVxyXG4gIC5scC1zdGF0dXMubG9hZGluZyB7IGRpc3BsYXk6IGJsb2NrOyBiYWNrZ3JvdW5kOiAjZWZmNmZmOyBjb2xvcjogIzFlNDBhZjsgfVxyXG5cclxuICAvKiBTb3VyY2UgY2hpcCAqL1xyXG4gIC5scC1zb3VyY2UtY2hpcCB7XHJcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XHJcbiAgICBwYWRkaW5nOiAycHggOHB4O1xyXG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xyXG4gICAgZm9udC1zaXplOiAxMXB4O1xyXG4gICAgZm9udC13ZWlnaHQ6IDcwMDtcclxuICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XHJcbiAgICBsZXR0ZXItc3BhY2luZzogLjVweDtcclxuICB9XHJcbiAgLmxwLXNvdXJjZS1jaGlwLmZhY2Vib29rIHsgYmFja2dyb3VuZDogI2RiZWFmZTsgY29sb3I6ICMxZDRlZDg7IH1cclxuICAubHAtc291cmNlLWNoaXAubGlua2VkaW4geyBiYWNrZ3JvdW5kOiAjY2ZmYWZlOyBjb2xvcjogIzBlNzQ5MDsgfVxyXG5gO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEJ1dHRvbiBpbmplY3Rpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4vKipcclxuICogQXBwZW5kcyBhbiBcIkltcG9ydCB0byBMb2NhbFByb1wiIGJ1dHRvbiBpbnNpZGUgYSBTaGFkb3cgRE9NIGhvc3RcclxuICogYXR0YWNoZWQgdG8gdGhlIHBvc3QgZWxlbWVudC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbmplY3RJbXBvcnRCdXR0b24oXHJcbiAgcG9zdEVsZW1lbnQ6IEVsZW1lbnQsXHJcbiAgam9iOiBKb2JQb3N0LFxyXG4gIG9uSW1wb3J0OiAoam9iOiBKb2JQb3N0KSA9PiB2b2lkXHJcbik6IHZvaWQge1xyXG4gIGlmIChwb3N0RWxlbWVudC5xdWVyeVNlbGVjdG9yKGAuJHtCVVRUT05fQ0xBU1N9YCkpIHJldHVybjtcclxuXHJcbiAgY29uc3QgaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgaG9zdC5jbGFzc05hbWUgPSBCVVRUT05fQ0xBU1M7XHJcbiAgaG9zdC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG5cclxuICBjb25zdCBzaGFkb3cgPSBob3N0LmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xyXG5cclxuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcclxuICBzdHlsZS50ZXh0Q29udGVudCA9IFNIQURPV19TVFlMRVM7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKHN0eWxlKTtcclxuXHJcbiAgY29uc3QgY29uZmlkZW5jZVBjdCA9IE1hdGgucm91bmQoKGpvYi5jb25maWRlbmNlID8/IDApICogMTAwKTtcclxuICBjb25zdCBjb25maWRlbmNlTGFiZWwgPVxyXG4gICAgY29uZmlkZW5jZVBjdCA+PSA4MCA/IFwiSGlnaFwiIDogY29uZmlkZW5jZVBjdCA+PSA1MCA/IFwiTWVkaXVtXCIgOiBcIkxvd1wiO1xyXG5cclxuICBjb25zdCBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gIGJ0bi5jbGFzc05hbWUgPSBcImxwLWJ0blwiO1xyXG4gIGJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiSW1wb3J0IHRoaXMgam9iIHBvc3QgdG8gTG9jYWxQcm9cIik7XHJcbiAgYnRuLmlubmVySFRNTCA9IGBcclxuICAgIDxzdmcgd2lkdGg9XCIxNFwiIGhlaWdodD1cIjE0XCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMi41XCI+XHJcbiAgICAgIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNNCAxNnYxYTMgMyAwIDAwMyAzaDEwYTMgMyAwIDAwMy0zdi0xbS00LThsLTQtNG0wIDBMOCA4bTQtNHYxMlwiLz5cclxuICAgIDwvc3ZnPlxyXG4gICAgSW1wb3J0IHRvIExvY2FsUHJvXHJcbiAgICA8c3BhbiBjbGFzcz1cImxwLWJhZGdlXCI+JHtjb25maWRlbmNlUGN0fSUgJHtjb25maWRlbmNlTGFiZWx9PC9zcGFuPlxyXG4gIGA7XHJcblxyXG4gIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICBvbkltcG9ydChqb2IpO1xyXG4gIH0pO1xyXG5cclxuICBzaGFkb3cuYXBwZW5kQ2hpbGQoYnRuKTtcclxuXHJcbiAgY29uc3QgdGV4dEJsb2NrID1cclxuICAgIHBvc3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFkLXByZXZpZXc9XCJtZXNzYWdlXCJdJykgPz9cclxuICAgIHBvc3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuZmVlZC1zaGFyZWQtdGV4dFwiKSA/P1xyXG4gICAgcG9zdEVsZW1lbnQucXVlcnlTZWxlY3RvcignW2Rpcj1cImF1dG9cIl0nKTtcclxuXHJcbiAgaWYgKHRleHRCbG9jaz8ucGFyZW50RWxlbWVudCkge1xyXG4gICAgdGV4dEJsb2NrLnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGhvc3QsIHRleHRCbG9jay5uZXh0U2libGluZyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHBvc3RFbGVtZW50LmFwcGVuZENoaWxkKGhvc3QpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIE1vZGFsIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuLyoqXHJcbiAqIFNob3dzIHRoZSBqb2IgcHJldmlldyBtb2RhbC5cclxuICogQHBhcmFtIGluaXRpYWxKb2IgICAtIEV4dHJhY3RlZCBqb2IgZGF0YVxyXG4gKiBAcGFyYW0gY2F0ZWdvcmllcyAgIC0gUmVhbCBjYXRlZ29yeSBsaXN0IGZyb20gR0VUIC9hcGkvY2F0ZWdvcmllcyAobWF5IGJlIGVtcHR5KVxyXG4gKiBAcGFyYW0gYWlDYXRlZ29yeSAgIC0gQUktY2xhc3NpZmllZCBjYXRlZ29yeSBuYW1lIChvcHRpb25hbCwgcHJlLXNlbGVjdHMgZHJvcGRvd24pXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2hvd0pvYk1vZGFsKFxyXG4gIGluaXRpYWxKb2I6IEpvYlBvc3QsXHJcbiAgY2F0ZWdvcmllczogaW1wb3J0KFwiLi4vdHlwZXNcIikuQ2F0ZWdvcnlbXSxcclxuICBhaUNhdGVnb3J5Pzogc3RyaW5nXHJcbik6IHZvaWQge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKE1PREFMX0hPU1RfSUQpPy5yZW1vdmUoKTtcclxuXHJcbiAgY29uc3QgaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgaG9zdC5pZCA9IE1PREFMX0hPU1RfSUQ7XHJcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChob3N0KTtcclxuXHJcbiAgY29uc3Qgc2hhZG93ID0gaG9zdC5hdHRhY2hTaGFkb3coeyBtb2RlOiBcIm9wZW5cIiB9KTtcclxuXHJcbiAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XHJcbiAgc3R5bGUudGV4dENvbnRlbnQgPSBTSEFET1dfU1RZTEVTO1xyXG4gIHNoYWRvdy5hcHBlbmRDaGlsZChzdHlsZSk7XHJcblxyXG4gIGNvbnN0IG92ZXJsYXkgPSBidWlsZE1vZGFsT3ZlcmxheShpbml0aWFsSm9iLCBjYXRlZ29yaWVzLCBhaUNhdGVnb3J5ID8/IG51bGwsIHNoYWRvdywgaG9zdCk7XHJcbiAgc2hhZG93LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xyXG5cclxuICBvdmVybGF5LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xyXG4gICAgaWYgKGUudGFyZ2V0ID09PSBvdmVybGF5KSBjbG9zZU1vZGFsKGhvc3QpO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBlc2NIYW5kbGVyID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xyXG4gICAgICBjbG9zZU1vZGFsKGhvc3QpO1xyXG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlc2NIYW5kbGVyKTtcclxuICAgIH1cclxuICB9O1xyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGVzY0hhbmRsZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9zZU1vZGFsKGhvc3Q6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcbiAgaG9zdC5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRNb2RhbE92ZXJsYXkoXHJcbiAgam9iOiBKb2JQb3N0LFxyXG4gIGNhdGVnb3JpZXM6IGltcG9ydChcIi4uL3R5cGVzXCIpLkNhdGVnb3J5W10sXHJcbiAgYWlDYXRlZ29yeTogc3RyaW5nIHwgbnVsbCxcclxuICBzaGFkb3c6IFNoYWRvd1Jvb3QsXHJcbiAgaG9zdDogSFRNTEVsZW1lbnRcclxuKTogSFRNTEVsZW1lbnQge1xyXG4gIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIG92ZXJsYXkuY2xhc3NOYW1lID0gXCJscC1vdmVybGF5XCI7XHJcblxyXG4gIGNvbnN0IG1vZGFsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBtb2RhbC5jbGFzc05hbWUgPSBcImxwLW1vZGFsXCI7XHJcbiAgbW9kYWwuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcImRpYWxvZ1wiKTtcclxuICBtb2RhbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLW1vZGFsXCIsIFwidHJ1ZVwiKTtcclxuICBtb2RhbC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiSW1wb3J0IEpvYiB0byBMb2NhbFByb1wiKTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEhlYWRlciBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGhlYWRlci5jbGFzc05hbWUgPSBcImxwLW1vZGFsLWhlYWRlclwiO1xyXG4gIGhlYWRlci5pbm5lckhUTUwgPSBgXHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtbW9kYWwtdGl0bGVcIj5cclxuICAgICAgPHN2ZyB3aWR0aD1cIjIwXCIgaGVpZ2h0PVwiMjBcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+XHJcbiAgICAgICAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0yMCA3bC04LTQtOCA0bTE2IDBsLTggNG04LTR2MTBsLTggNG0wLTEwTDQgN204IDR2MTBcIi8+XHJcbiAgICAgIDwvc3ZnPlxyXG4gICAgICBJbXBvcnQgSm9iIHRvIExvY2FsUHJvXHJcbiAgICAgIDxzcGFuIGNsYXNzPVwibHAtc291cmNlLWNoaXAgJHtqb2Iuc291cmNlfVwiPiR7am9iLnNvdXJjZX08L3NwYW4+XHJcbiAgICA8L2Rpdj5cclxuICBgO1xyXG4gIGNvbnN0IGNsb3NlQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBjbG9zZUJ0bi5jbGFzc05hbWUgPSBcImxwLWNsb3NlLWJ0blwiO1xyXG4gIGNsb3NlQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJDbG9zZVwiKTtcclxuICBjbG9zZUJ0bi5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIjIwXCIgaGVpZ2h0PVwiMjBcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+XHJcbiAgICA8cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTYgMThMMTggNk02IDZsMTIgMTJcIi8+XHJcbiAgPC9zdmc+YDtcclxuICBjbG9zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gY2xvc2VNb2RhbChob3N0KSk7XHJcbiAgaGVhZGVyLmFwcGVuZENoaWxkKGNsb3NlQnRuKTtcclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIEJvZHkgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgYm9keSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgYm9keS5jbGFzc05hbWUgPSBcImxwLW1vZGFsLWJvZHlcIjtcclxuXHJcbiAgLy8gQ29uZmlkZW5jZSBiYXJcclxuICBjb25zdCBjb25maWRlbmNlUGN0ID0gTWF0aC5yb3VuZCgoam9iLmNvbmZpZGVuY2UgPz8gMCkgKiAxMDApO1xyXG4gIGNvbnN0IGNvbmZEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gIGNvbmZEaXYuY2xhc3NOYW1lID0gXCJscC1jb25maWRlbmNlXCI7XHJcbiAgY29uZkRpdi5pbm5lckhUTUwgPSBgXHJcbiAgICA8c3Bhbj5EZXRlY3Rpb24gY29uZmlkZW5jZTo8L3NwYW4+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtY29uZmlkZW5jZS1iYXItYmdcIj5cclxuICAgICAgPGRpdiBjbGFzcz1cImxwLWNvbmZpZGVuY2UtYmFyXCIgc3R5bGU9XCJ3aWR0aDoke2NvbmZpZGVuY2VQY3R9JVwiPjwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgICA8c3Ryb25nPiR7Y29uZmlkZW5jZVBjdH0lPC9zdHJvbmc+XHJcbiAgYDtcclxuICBib2R5LmFwcGVuZENoaWxkKGNvbmZEaXYpO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgRm9ybSBcdTI1MDBcdTI1MDBcclxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIik7XHJcbiAgZm9ybS5ub1ZhbGlkYXRlID0gdHJ1ZTtcclxuXHJcbiAgLy8gRGV0ZXJtaW5lIGluaXRpYWwgY2F0ZWdvcnkgc2VsZWN0aW9uXHJcbiAgLy8gUHJpb3JpdHk6IGFpQ2F0ZWdvcnkgPiBqb2IuY2F0ZWdvcnkgKGZyb20gbG9jYWwga2V5d29yZCBkZXRlY3Rpb24pXHJcbiAgY29uc3QgZWZmZWN0aXZlQ2F0ZWdvcnkgPSBhaUNhdGVnb3J5ID8/IGpvYi5jYXRlZ29yeSA/PyBcIlwiO1xyXG5cclxuICAvLyBGaW5kIG1hdGNoaW5nIGNhdGVnb3J5IG9iamVjdFxyXG4gIGNvbnN0IGZpbmRDYXRCeU5hbWUgPSAobmFtZTogc3RyaW5nKSA9PlxyXG4gICAgY2F0ZWdvcmllcy5maW5kKChjKSA9PiBjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZS50b0xvd2VyQ2FzZSgpKTtcclxuXHJcbiAgY29uc3QgbWF0Y2hlZENhdCA9IGZpbmRDYXRCeU5hbWUoZWZmZWN0aXZlQ2F0ZWdvcnkpO1xyXG5cclxuICAvLyBCdWlsZCBjYXRlZ29yeSA8c2VsZWN0PlxyXG4gIGNvbnN0IGNhdE9wdGlvbnMgPSBjYXRlZ29yaWVzLmxlbmd0aFxyXG4gICAgPyBbXHJcbiAgICAgICAgYDxvcHRpb24gdmFsdWU9XCJcIj4tLSBTZWxlY3QgY2F0ZWdvcnkgLS08L29wdGlvbj5gLFxyXG4gICAgICAgIC4uLmNhdGVnb3JpZXMubWFwKChjKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBzZWwgPSBtYXRjaGVkQ2F0Py5faWQgPT09IGMuX2lkID8gXCJzZWxlY3RlZFwiIDogXCJcIjtcclxuICAgICAgICAgIHJldHVybiBgPG9wdGlvbiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihjLl9pZCl9XCIgZGF0YS1uYW1lPVwiJHtlc2NhcGVBdHRyKGMubmFtZSl9XCIgJHtzZWx9PiR7ZXNjYXBlVGV4dChjLmljb24gPz8gXCJcIil9ICR7ZXNjYXBlVGV4dChjLm5hbWUpfTwvb3B0aW9uPmA7XHJcbiAgICAgICAgfSksXHJcbiAgICAgIF0uam9pbihcIlwiKVxyXG4gICAgOiBgPG9wdGlvbiB2YWx1ZT1cIlwiPkxvYWRpbmcgY2F0ZWdvcmllc1x1MjAyNjwvb3B0aW9uPmA7XHJcblxyXG4gIGNvbnN0IGNhdEhpbnQgPSBhaUNhdGVnb3J5XHJcbiAgICA/IGA8ZGl2IGNsYXNzPVwibHAtY2F0LWhpbnQgYWlcIj5cdTI3MjYgQUktY2xhc3NpZmllZCBhcyBcIiR7ZXNjYXBlVGV4dChhaUNhdGVnb3J5KX1cIjwvZGl2PmBcclxuICAgIDogZWZmZWN0aXZlQ2F0ZWdvcnkgJiYgbWF0Y2hlZENhdFxyXG4gICAgPyBgPGRpdiBjbGFzcz1cImxwLWNhdC1oaW50XCI+QXV0by1kZXRlY3RlZDogXCIke2VzY2FwZVRleHQoZWZmZWN0aXZlQ2F0ZWdvcnkpfVwiPC9kaXY+YFxyXG4gICAgOiBcIlwiO1xyXG5cclxuICAvLyBEZWZhdWx0IHNjaGVkdWxlIGRhdGU6IHRvbW9ycm93IChzZW5zaWJsZSBkZWZhdWx0OyB1c2VyIGNhbiBhZGp1c3QpXHJcbiAgY29uc3QgdG9kYXlTdHIgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG4gIGNvbnN0IHRvbW9ycm93U3RyID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDg2XzQwMF8wMDApLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG4gIGNvbnN0IGluaXRpYWxTY2hlZHVsZURhdGUgPSBqb2Iuc2NoZWR1bGVEYXRlID8/IHRvbW9ycm93U3RyO1xyXG5cclxuICBmb3JtLmlubmVySFRNTCA9IGBcclxuICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLXRpdGxlXCI+Sm9iIFRpdGxlIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWlucHV0XCIgaWQ9XCJscC10aXRsZVwiIHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2VzY2FwZUF0dHIoam9iLnRpdGxlKX1cIiByZXF1aXJlZCBtYXhsZW5ndGg9XCIxNTBcIiAvPlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgPGxhYmVsIGNsYXNzPVwibHAtbGFiZWxcIiBmb3I9XCJscC1kZXNjcmlwdGlvblwiPkRlc2NyaXB0aW9uIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImxwLXRleHRhcmVhXCIgaWQ9XCJscC1kZXNjcmlwdGlvblwiIG1heGxlbmd0aD1cIjIwMDBcIiByZXF1aXJlZD4ke2VzY2FwZVRleHQoam9iLmRlc2NyaXB0aW9uKX08L3RleHRhcmVhPlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtcm93XCI+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtY2F0ZWdvcnlcIj5DYXRlZ29yeSA8c3BhbiBjbGFzcz1cImxwLXJlcXVpcmVkXCI+Kjwvc3Bhbj48L2xhYmVsPlxyXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XCJscC1zZWxlY3RcIiBpZD1cImxwLWNhdGVnb3J5XCIgJHtjYXRlZ29yaWVzLmxlbmd0aCA9PT0gMCA/IFwiZGlzYWJsZWRcIiA6IFwiXCJ9PlxyXG4gICAgICAgICAgJHtjYXRPcHRpb25zfVxyXG4gICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICAgICR7Y2F0SGludH1cclxuICAgICAgPC9kaXY+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtcG9zdGVyXCI+UG9zdGVkIEJ5PC9sYWJlbD5cclxuICAgICAgICA8aW5wdXQgY2xhc3M9XCJscC1pbnB1dFwiIGlkPVwibHAtcG9zdGVyXCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihqb2IucG9zdGVkX2J5KX1cIiBtYXhsZW5ndGg9XCIxMDBcIiAvPlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG4gICAgPGRpdiBjbGFzcz1cImxwLXJvd1wiPlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLWxvY2F0aW9uXCI+TG9jYXRpb24gPHNwYW4gY2xhc3M9XCJscC1yZXF1aXJlZFwiPio8L3NwYW4+PC9sYWJlbD5cclxuICAgICAgICA8aW5wdXQgY2xhc3M9XCJscC1pbnB1dFwiIGlkPVwibHAtbG9jYXRpb25cIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtlc2NhcGVBdHRyKGpvYi5sb2NhdGlvbiA/PyBcIlwiKX1cIiBtYXhsZW5ndGg9XCIxMDBcIiBwbGFjZWhvbGRlcj1cImUuZy4gTWFrYXRpIENpdHksIE1ldHJvIE1hbmlsYVwiIHJlcXVpcmVkIC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwibHAtZmllbGRcIj5cclxuICAgICAgICA8bGFiZWwgY2xhc3M9XCJscC1sYWJlbFwiIGZvcj1cImxwLWJ1ZGdldFwiPkJ1ZGdldCAoUEhQKSA8c3BhbiBjbGFzcz1cImxwLXJlcXVpcmVkXCI+Kjwvc3Bhbj48L2xhYmVsPlxyXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cImxwLWlucHV0XCIgaWQ9XCJscC1idWRnZXRcIiB0eXBlPVwibnVtYmVyXCIgdmFsdWU9XCIke2pvYi5idWRnZXQgPz8gXCJcIn1cIiBtaW49XCIxXCIgc3RlcD1cIjFcIiBwbGFjZWhvbGRlcj1cImUuZy4gMTUwMFwiIHJlcXVpcmVkIC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgPC9kaXY+XHJcbiAgICA8ZGl2IGNsYXNzPVwibHAtcm93XCI+XHJcbiAgICAgIDxkaXYgY2xhc3M9XCJscC1maWVsZFwiPlxyXG4gICAgICAgIDxsYWJlbCBjbGFzcz1cImxwLWxhYmVsXCIgZm9yPVwibHAtc2NoZWR1bGVcIj5TY2hlZHVsZSBEYXRlIDxzcGFuIGNsYXNzPVwibHAtcmVxdWlyZWRcIj4qPC9zcGFuPjwvbGFiZWw+XHJcbiAgICAgICAgPGlucHV0IGNsYXNzPVwibHAtaW5wdXRcIiBpZD1cImxwLXNjaGVkdWxlXCIgdHlwZT1cImRhdGVcIiB2YWx1ZT1cIiR7ZXNjYXBlQXR0cihpbml0aWFsU2NoZWR1bGVEYXRlKX1cIiBtaW49XCIke3RvZGF5U3RyfVwiIHJlcXVpcmVkIC8+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImxwLWNhdC1oaW50XCI+UmVxdWVzdGVkIHdvcmsgZGF0ZTwvZGl2PlxyXG4gICAgICA8L2Rpdj5cclxuICAgICAgPGRpdiBjbGFzcz1cImxwLWZpZWxkXCI+XHJcbiAgICAgICAgPGxhYmVsIGNsYXNzPVwibHAtbGFiZWxcIiBmb3I9XCJscC11cmdlbmN5XCI+VXJnZW5jeTwvbGFiZWw+XHJcbiAgICAgICAgPHNlbGVjdCBjbGFzcz1cImxwLXNlbGVjdFwiIGlkPVwibHAtdXJnZW5jeVwiPlxyXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInN0YW5kYXJkXCIgc2VsZWN0ZWQ+U3RhbmRhcmQ8L29wdGlvbj5cclxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzYW1lX2RheVwiPlNhbWUgRGF5PC9vcHRpb24+XHJcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwicnVzaFwiPlJ1c2g8L29wdGlvbj5cclxuICAgICAgICA8L3NlbGVjdD5cclxuICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICBgO1xyXG5cclxuICBib2R5LmFwcGVuZENoaWxkKGZvcm0pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgU3RhdHVzIFx1MjUwMFx1MjUwMFxyXG4gIGNvbnN0IHN0YXR1cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgc3RhdHVzLmNsYXNzTmFtZSA9IFwibHAtc3RhdHVzXCI7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBGb290ZXIgXHUyNTAwXHUyNTAwXHJcbiAgY29uc3QgZm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICBmb290ZXIuY2xhc3NOYW1lID0gXCJscC1tb2RhbC1mb290ZXJcIjtcclxuXHJcbiAgY29uc3QgY2FuY2VsQnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBjYW5jZWxCdG4udHlwZSA9IFwiYnV0dG9uXCI7XHJcbiAgY2FuY2VsQnRuLmNsYXNzTmFtZSA9IFwibHAtY2FuY2VsLWJ0blwiO1xyXG4gIGNhbmNlbEJ0bi50ZXh0Q29udGVudCA9IFwiQ2FuY2VsXCI7XHJcbiAgY2FuY2VsQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBjbG9zZU1vZGFsKGhvc3QpKTtcclxuXHJcbiAgY29uc3Qgc3VibWl0QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICBzdWJtaXRCdG4udHlwZSA9IFwiYnV0dG9uXCI7XHJcbiAgc3VibWl0QnRuLmNsYXNzTmFtZSA9IFwibHAtc3VibWl0LWJ0blwiO1xyXG4gIHN1Ym1pdEJ0bi5pbm5lckhUTUwgPSBgXHJcbiAgICA8c3ZnIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxNFwiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjIuNVwiPlxyXG4gICAgICA8cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTQgMTZ2MWEzIDMgMCAwMDMgM2gxMGEzIDMgMCAwMDMtM3YtMW0tNC04bC00LTRtMCAwTDggOG00LTR2MTJcIi8+XHJcbiAgICA8L3N2Zz5cclxuICAgIFN1Ym1pdCB0byBMb2NhbFByb1xyXG4gIGA7XHJcblxyXG4gIGZvb3Rlci5hcHBlbmRDaGlsZChjYW5jZWxCdG4pO1xyXG4gIGZvb3Rlci5hcHBlbmRDaGlsZChzdWJtaXRCdG4pO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgU3VibWl0IGhhbmRsZXIgXHUyNTAwXHUyNTAwXHJcbiAgc3VibWl0QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCB0aXRsZUVsICAgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdGl0bGVcIikgICAgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGRlc2NFbCAgICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1kZXNjcmlwdGlvblwiKSBhcyBIVE1MVGV4dEFyZWFFbGVtZW50O1xyXG4gICAgY29uc3QgY2F0ZWdvcnlFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLWNhdGVnb3J5XCIpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xyXG4gICAgY29uc3QgcG9zdGVyRWwgICA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXBvc3RlclwiKSAgIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCBsb2NhdGlvbkVsID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtbG9jYXRpb25cIikgYXMgSFRNTElucHV0RWxlbWVudDtcclxuICAgIGNvbnN0IGJ1ZGdldEVsICAgPSBzaGFkb3cuZ2V0RWxlbWVudEJ5SWQoXCJscC1idWRnZXRcIikgICBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG4gICAgY29uc3Qgc2NoZWR1bGVFbCA9IHNoYWRvdy5nZXRFbGVtZW50QnlJZChcImxwLXNjaGVkdWxlXCIpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcbiAgICBjb25zdCB1cmdlbmN5RWwgID0gc2hhZG93LmdldEVsZW1lbnRCeUlkKFwibHAtdXJnZW5jeVwiKSAgYXMgSFRNTFNlbGVjdEVsZW1lbnQ7XHJcblxyXG4gICAgY29uc3QgdGl0bGUgPSB0aXRsZUVsLnZhbHVlLnRyaW0oKTtcclxuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gZGVzY0VsLnZhbHVlLnRyaW0oKTtcclxuICAgIGNvbnN0IGNhdGVnb3J5SWQgPSBjYXRlZ29yeUVsLnZhbHVlO1xyXG4gICAgY29uc3QgY2F0ZWdvcnlOYW1lID1cclxuICAgICAgY2F0ZWdvcnlFbC5zZWxlY3RlZE9wdGlvbnNbMF0/LmdldEF0dHJpYnV0ZShcImRhdGEtbmFtZVwiKSA/PyBcIlwiO1xyXG4gICAgY29uc3QgbG9jYXRpb24gPSBsb2NhdGlvbkVsLnZhbHVlLnRyaW0oKTtcclxuICAgIGNvbnN0IGJ1ZGdldCA9IHBhcnNlRmxvYXQoYnVkZ2V0RWwudmFsdWUpO1xyXG4gICAgY29uc3Qgc2NoZWR1bGVEYXRlID0gc2NoZWR1bGVFbC52YWx1ZTtcclxuICAgIGNvbnN0IHVyZ2VuY3kgPSB1cmdlbmN5RWwudmFsdWUgYXMgXCJzdGFuZGFyZFwiIHwgXCJzYW1lX2RheVwiIHwgXCJydXNoXCI7XHJcblxyXG4gICAgaWYgKCF0aXRsZSkge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBcIkpvYiB0aXRsZSBpcyByZXF1aXJlZC5cIik7XHJcbiAgICAgIHRpdGxlRWwuZm9jdXMoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKCFkZXNjcmlwdGlvbikge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBcIkRlc2NyaXB0aW9uIGlzIHJlcXVpcmVkLlwiKTtcclxuICAgICAgZGVzY0VsLmZvY3VzKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICghY2F0ZWdvcnlJZCkge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBcIlBsZWFzZSBzZWxlY3QgYSBjYXRlZ29yeS5cIik7XHJcbiAgICAgIGNhdGVnb3J5RWwuZm9jdXMoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKCFsb2NhdGlvbikge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBcIkxvY2F0aW9uIGlzIHJlcXVpcmVkLlwiKTtcclxuICAgICAgbG9jYXRpb25FbC5mb2N1cygpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoIWJ1ZGdldCB8fCBidWRnZXQgPD0gMCB8fCBpc05hTihidWRnZXQpKSB7XHJcbiAgICAgIHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIFwiQnVkZ2V0IGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwIChQSFApLlwiKTtcclxuICAgICAgYnVkZ2V0RWwuZm9jdXMoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKCFzY2hlZHVsZURhdGUpIHtcclxuICAgICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwiZXJyb3JcIiwgXCJTY2hlZHVsZSBkYXRlIGlzIHJlcXVpcmVkLlwiKTtcclxuICAgICAgc2NoZWR1bGVFbC5mb2N1cygpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgc3VibWl0QnRuLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIHN1Ym1pdEJ0bi50ZXh0Q29udGVudCA9IFwiU3VibWl0dGluZ1x1MjAyNlwiO1xyXG4gICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwibG9hZGluZ1wiLCBcIlNlbmRpbmcgdG8gTG9jYWxQcm9cdTIwMjZcIik7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlZEpvYjogSm9iUG9zdCA9IHtcclxuICAgICAgLi4uam9iLFxyXG4gICAgICB0aXRsZSxcclxuICAgICAgZGVzY3JpcHRpb24sXHJcbiAgICAgIHBvc3RlZF9ieTogcG9zdGVyRWwudmFsdWUudHJpbSgpLFxyXG4gICAgICBsb2NhdGlvbixcclxuICAgICAgYnVkZ2V0LFxyXG4gICAgICBzY2hlZHVsZURhdGUsXHJcbiAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeU5hbWUsXHJcbiAgICAgIGNhdGVnb3J5SWQsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IG1zZzogSW1wb3J0Sm9iTWVzc2FnZSA9IHsgdHlwZTogXCJJTVBPUlRfSk9CXCIsIHBheWxvYWQ6IHVwZGF0ZWRKb2IgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlPEltcG9ydEpvYk1lc3NhZ2UsIEltcG9ydEpvYlJlc3BvbnNlPihtc2cpO1xyXG5cclxuICAgICAgaWYgKHJlc3BvbnNlPy5zdWNjZXNzKSB7XHJcbiAgICAgICAgc2hvd1N0YXR1cyhzdGF0dXMsIFwic3VjY2Vzc1wiLCBgSm9iIGltcG9ydGVkIHN1Y2Nlc3NmdWxseSEgSUQ6ICR7cmVzcG9uc2Uuam9iX2lkID8/IFwiXHUyMDE0XCJ9YCk7XHJcbiAgICAgICAgc3VibWl0QnRuLnRleHRDb250ZW50ID0gXCJTdWJtaXR0ZWQhXCI7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBjbG9zZU1vZGFsKGhvc3QpLCAyNTAwKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zdCBlcnJUZXh0ID0gcmVzcG9uc2U/LmVycm9yID8/IFwiSW1wb3J0IGZhaWxlZC4gUGxlYXNlIHRyeSBhZ2Fpbi5cIjtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICBlcnJUZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJzZXNzaW9uXCIpIHx8XHJcbiAgICAgICAgICBlcnJUZXh0LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJzaWduIGluXCIpXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBzaG93U3RhdHVzKFxyXG4gICAgICAgICAgICBzdGF0dXMsXHJcbiAgICAgICAgICAgIFwiZXJyb3JcIixcclxuICAgICAgICAgICAgXCJTZXNzaW9uIGV4cGlyZWQuIFBsZWFzZSBzaWduIGluIGFnYWluIHZpYSB0aGUgZXh0ZW5zaW9uIGljb24uXCJcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHNob3dTdGF0dXMoc3RhdHVzLCBcImVycm9yXCIsIGVyclRleHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzdWJtaXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICBzdWJtaXRCdG4uaW5uZXJIVE1MID0gYFN1Ym1pdCB0byBMb2NhbFByb2A7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBzaG93U3RhdHVzKHN0YXR1cywgXCJlcnJvclwiLCBgRXh0ZW5zaW9uIGVycm9yOiAke1N0cmluZyhlcnIpfWApO1xyXG4gICAgICBzdWJtaXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgc3VibWl0QnRuLmlubmVySFRNTCA9IGBTdWJtaXQgdG8gTG9jYWxQcm9gO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBtb2RhbC5hcHBlbmRDaGlsZChoZWFkZXIpO1xyXG4gIG1vZGFsLmFwcGVuZENoaWxkKGJvZHkpO1xyXG4gIG1vZGFsLmFwcGVuZENoaWxkKHN0YXR1cyk7XHJcbiAgbW9kYWwuYXBwZW5kQ2hpbGQoZm9vdGVyKTtcclxuICBvdmVybGF5LmFwcGVuZENoaWxkKG1vZGFsKTtcclxuXHJcbiAgcmV0dXJuIG92ZXJsYXk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBIZWxwZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gc2hvd1N0YXR1cyhlbDogSFRNTEVsZW1lbnQsIHR5cGU6IFwic3VjY2Vzc1wiIHwgXCJlcnJvclwiIHwgXCJsb2FkaW5nXCIsIG1zZzogc3RyaW5nKTogdm9pZCB7XHJcbiAgZWwuY2xhc3NOYW1lID0gYGxwLXN0YXR1cyAke3R5cGV9YDtcclxuICBlbC50ZXh0Q29udGVudCA9IG1zZztcclxufVxyXG5cclxuZnVuY3Rpb24gZXNjYXBlQXR0cihzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHN0clxyXG4gICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxyXG4gICAgLnJlcGxhY2UoL1wiL2csIFwiJnF1b3Q7XCIpXHJcbiAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcclxuICAgIC5yZXBsYWNlKC8+L2csIFwiJmd0O1wiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIikucmVwbGFjZSgvPC9nLCBcIiZsdDtcIikucmVwbGFjZSgvPi9nLCBcIiZndDtcIik7XHJcbn1cclxuIiwgIi8qKlxyXG4gKiBDb250ZW50IHNjcmlwdCBcdTIwMTQgaW5qZWN0ZWQgaW50byBmYWNlYm9vay5jb20gYW5kIGxpbmtlZGluLmNvbS5cclxuICpcclxuICogRmxvdzpcclxuICogIDEuIERldGVjdCBwbGF0Zm9ybSBmcm9tIGhvc3RuYW1lLlxyXG4gKiAgMi4gUHJlLWxvYWQgY2F0ZWdvcmllcyArIHN0YXJ0IE11dGF0aW9uT2JzZXJ2ZXIgaW4gcGFyYWxsZWwuXHJcbiAqICAzLiBGb3IgZWFjaCBkZXRlY3RlZCBqb2IgcG9zdDpcclxuICogICAgIGEuIFJ1biBsb2NhbCBrZXl3b3JkIGRldGVjdGlvbiAoZmFzdCwgc3luY2hyb25vdXMpLlxyXG4gKiAgICAgYi4gSW5qZWN0IFwiSW1wb3J0IHRvIExvY2FsUHJvXCIgYnV0dG9uIHZpYSBTaGFkb3cgRE9NLlxyXG4gKiAgNC4gT24gYnV0dG9uIGNsaWNrOlxyXG4gKiAgICAgYS4gRXh0cmFjdCBqb2IgZGF0YS5cclxuICogICAgIGIuIEFzayBiYWNrZ3JvdW5kIHRvIEFJLWNsYXNzaWZ5IHRoZSBjYXRlZ29yeSAobm9uLWJsb2NraW5nKS5cclxuICogICAgIGMuIE9wZW4gbW9kYWwgd2l0aCByZWFsIGNhdGVnb3JpZXMgKyBBSSBzdWdnZXN0aW9uIHByZS1zZWxlY3RlZC5cclxuICovXHJcblxyXG5pbXBvcnQgeyBkZXRlY3RKb2JQb3N0LCBleHRyYWN0Sm9iRGF0YSB9IGZyb20gXCIuL3V0aWxzL3BhcnNlclwiO1xyXG5pbXBvcnQgeyBpbmplY3RJbXBvcnRCdXR0b24sIHNob3dKb2JNb2RhbCB9IGZyb20gXCIuL3V0aWxzL2RvbUhlbHBlcnNcIjtcclxuaW1wb3J0IHR5cGUge1xyXG4gIENhdGVnb3J5LFxyXG4gIENsYXNzaWZ5Q2F0ZWdvcnlNZXNzYWdlLFxyXG4gIENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZSxcclxuICBHZXRDYXRlZ29yaWVzTWVzc2FnZSxcclxuICBHZXRDYXRlZ29yaWVzUmVzcG9uc2UsXHJcbiAgSm9iUG9zdCxcclxuICBQbGF0Zm9ybSxcclxufSBmcm9tIFwiLi90eXBlc1wiO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFBsYXRmb3JtIGRldGVjdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIGRldGVjdFBsYXRmb3JtKCk6IFBsYXRmb3JtIHwgbnVsbCB7XHJcbiAgY29uc3QgaG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZTtcclxuICBpZiAoaG9zdC5pbmNsdWRlcyhcImZhY2Vib29rLmNvbVwiKSkgcmV0dXJuIFwiZmFjZWJvb2tcIjtcclxuICBpZiAoaG9zdC5pbmNsdWRlcyhcImxpbmtlZGluLmNvbVwiKSkgcmV0dXJuIFwibGlua2VkaW5cIjtcclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuY29uc3QgUExBVEZPUk0gPSBkZXRlY3RQbGF0Zm9ybSgpO1xyXG5cclxuaWYgKCFQTEFURk9STSkge1xyXG4gIHRocm93IG5ldyBFcnJvcihcIltMb2NhbFByb10gVW5zdXBwb3J0ZWQgcGxhdGZvcm0gXHUyMDE0IGNvbnRlbnQgc2NyaXB0IGV4aXRpbmcuXCIpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ2F0ZWdvcnkgY2FjaGUgKHBvcHVsYXRlZCBvbmNlIG9uIGluaXQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxubGV0IGNhY2hlZENhdGVnb3JpZXM6IENhdGVnb3J5W10gPSBbXTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHByZWxvYWRDYXRlZ29yaWVzKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBtc2c6IEdldENhdGVnb3JpZXNNZXNzYWdlID0geyB0eXBlOiBcIkdFVF9DQVRFR09SSUVTXCIgfTtcclxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlPEdldENhdGVnb3JpZXNNZXNzYWdlLCBHZXRDYXRlZ29yaWVzUmVzcG9uc2U+KG1zZyk7XHJcbiAgICBpZiAocmVzPy5zdWNjZXNzICYmIHJlcy5jYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY2FjaGVkQ2F0ZWdvcmllcyA9IHJlcy5jYXRlZ29yaWVzO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gQmFja2dyb3VuZCBtYXkgbm90IGJlIHJlYWR5IG9uIGNvbGQgc3RhcnQ7IG1vZGFsIHdpbGwgc2hvdyBlbXB0eSBkcm9wZG93blxyXG4gIH1cclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFBvc3QgY29udGFpbmVyIHNlbGVjdG9ycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmZ1bmN0aW9uIGdldFBvc3RDb250YWluZXJzKHJvb3Q6IEVsZW1lbnQgfCBEb2N1bWVudCk6IEVsZW1lbnRbXSB7XHJcbiAgaWYgKFBMQVRGT1JNID09PSBcImZhY2Vib29rXCIpIHtcclxuICAgIC8vIFtyb2xlPVwiYXJ0aWNsZVwiXSBjb3ZlcnMgdGhlIG5ld3MgZmVlZCwgZ3JvdXBzLCBhbmQgcGFnZXMgaW4gbW9kZXJuIEZCLlxyXG4gICAgLy8gW2RhdGEtcGFnZWxldF49XCJGZWVkVW5pdFwiXSBjYXRjaGVzIEZCJ3MgaW50ZXJuYWwgZmVlZCB1bml0IHdyYXBwZXJzIGFzIGEgYmFja3VwLlxyXG4gICAgcmV0dXJuIEFycmF5LmZyb20oXHJcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnW3JvbGU9XCJhcnRpY2xlXCJdLCBbZGF0YS1wYWdlbGV0Xj1cIkZlZWRVbml0XCJdJylcclxuICAgICk7XHJcbiAgfVxyXG4gIC8vIExpbmtlZEluIGN5Y2xlcyB0aHJvdWdoIHNldmVyYWwgY2xhc3MgbmFtZXMgYW5kIGRhdGEtKiBhdHRyaWJ1dGVzIGFjcm9zcyBVSSB2ZXJzaW9ucy5cclxuICAvLyBXZSBjYXN0IGEgd2lkZSBuZXQgYW5kIHJlbHkgb24gZGVkdXBsaWNhdGlvbiArIGRldGVjdEpvYlBvc3QgdG8gZmlsdGVyIG5vaXNlLlxyXG4gIHJldHVybiBBcnJheS5mcm9tKFxyXG4gICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKFxyXG4gICAgICBbXHJcbiAgICAgICAgXCIuZmVlZC1zaGFyZWQtdXBkYXRlLXYyXCIsICAgICAgICAgIC8vIGNsYXNzaWMgZmVlZCBwb3N0IHdyYXBwZXJcclxuICAgICAgICBcIi5vY2NsdWRhYmxlLXVwZGF0ZVwiLCAgICAgICAgICAgICAgIC8vIGltcHJlc3Npb24tdHJhY2tlZCB3cmFwcGVyXHJcbiAgICAgICAgJ1tjbGFzcyo9XCJvY2NsdWRhYmxlLXVwZGF0ZVwiXScsICAgICAvLyB2YXJpYXRpb25zIG9mIG9jY2x1ZGFibGUgY2xhc3NcclxuICAgICAgICAnW2NsYXNzKj1cImZlZWQtc2hhcmVkLXVwZGF0ZVwiXScsICAgIC8vIGJyb2FkZXIgY2xhc3MgbWF0Y2hcclxuICAgICAgICBcImxpLmZpZS1pbXByZXNzaW9uLWNvbnRhaW5lclwiLCAgICAgIC8vIG5ld2VyIExpbmtlZEluIGZlZWQgaXRlbVxyXG4gICAgICAgICdbY2xhc3MqPVwiZmllLWltcHJlc3Npb24tY29udGFpbmVyXCJdJyxcclxuICAgICAgICBcIltkYXRhLWlkXVwiLCAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBvc3RzIHdpdGggYSBkYXRhLWlkIGF0dHJpYnV0ZVxyXG4gICAgICAgIFwiW2RhdGEtdXJuXVwiLCAgICAgICAgICAgICAgICAgICAgICAgLy8gcG9zdHMgd2l0aCBhIGRhdGEtdXJuIGF0dHJpYnV0ZVxyXG4gICAgICBdLmpvaW4oXCIsIFwiKVxyXG4gICAgKVxyXG4gICk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBEZWR1cCB0cmFja2luZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbi8qKlxyXG4gKiBDb250YWluZXJzIHRoYXQgaGF2ZSBiZWVuIGZ1bGx5IHByb2Nlc3NlZCAoYnV0dG9uIGluamVjdGVkIG9yIGNvbmZpcm1lZCBub3RcclxuICogYSBqb2IgcG9zdCkuIFRoZXNlIGFyZSBuZXZlciByZXZpc2l0ZWQuXHJcbiAqL1xyXG5jb25zdCBwcm9jZXNzZWRQb3N0cyA9IG5ldyBXZWFrU2V0PEVsZW1lbnQ+KCk7XHJcblxyXG4vKipcclxuICogQ29udGFpbmVycyB0aGF0IHdlcmUgc2VlbiBidXQgd2VyZSBvZmYtc2NyZWVuIGF0IHNjYW4gdGltZS5cclxuICogVGhleSBhcmUgcmUtY2hlY2tlZCBvbiBzY3JvbGwgdW50aWwgdGhleSBlbnRlciB0aGUgdmlld3BvcnQuXHJcbiAqL1xyXG5jb25zdCBvZmZTY3JlZW5Qb3N0cyA9IG5ldyBXZWFrU2V0PEVsZW1lbnQ+KCk7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ29yZSBzY2FuIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gc2NhbkZvckpvYlBvc3RzKHJvb3Q6IEVsZW1lbnQgfCBEb2N1bWVudCA9IGRvY3VtZW50KTogdm9pZCB7XHJcbiAgY29uc3QgY29udGFpbmVycyA9IGdldFBvc3RDb250YWluZXJzKHJvb3QpO1xyXG5cclxuICBmb3IgKGNvbnN0IGNvbnRhaW5lciBvZiBjb250YWluZXJzKSB7XHJcbiAgICAvLyBBbHJlYWR5IGZ1bGx5IGhhbmRsZWQgXHUyMDE0IHNraXAgaW1tZWRpYXRlbHkuXHJcbiAgICBpZiAocHJvY2Vzc2VkUG9zdHMuaGFzKGNvbnRhaW5lcikpIGNvbnRpbnVlO1xyXG5cclxuICAgIC8vIFNraXAgb2ZmLXNjcmVlbiBlbGVtZW50cywgYnV0IGRvIE5PVCBtYXJrIHRoZW0gYXMgcHJvY2Vzc2VkIHNvIHRoZVxyXG4gICAgLy8gc2Nyb2xsIGhhbmRsZXIgY2FuIHJldHJ5IHRoZW0gb25jZSB0aGV5IGVudGVyIHRoZSB2aWV3cG9ydC5cclxuICAgIGlmICghaXNOZWFyVmlld3BvcnQoY29udGFpbmVyKSkge1xyXG4gICAgICBvZmZTY3JlZW5Qb3N0cy5hZGQoY29udGFpbmVyKTtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSW4gdmlld3BvcnQgXHUyMDE0IG1hcmsgZnVsbHkgcHJvY2Vzc2VkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdCBpcyBhIGpvYiBwb3N0LFxyXG4gICAgLy8gc28gd2UgZG9uJ3QgcmUtc2NvcmUgaXQgb24gZXZlcnkgc2Nyb2xsIGV2ZW50LlxyXG4gICAgcHJvY2Vzc2VkUG9zdHMuYWRkKGNvbnRhaW5lcik7XHJcbiAgICBvZmZTY3JlZW5Qb3N0cy5kZWxldGUoY29udGFpbmVyKTtcclxuXHJcbiAgICBpZiAoIWRldGVjdEpvYlBvc3QoY29udGFpbmVyKSkgY29udGludWU7XHJcblxyXG4gICAgY29uc3Qgam9iOiBKb2JQb3N0ID0gZXh0cmFjdEpvYkRhdGEoY29udGFpbmVyLCBQTEFURk9STSEpO1xyXG5cclxuICAgIGluamVjdEltcG9ydEJ1dHRvbihjb250YWluZXIsIGpvYiwgKGNsaWNrZWRKb2IpID0+IHtcclxuICAgICAgaGFuZGxlSW1wb3J0Q2xpY2soY2xpY2tlZEpvYik7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8qKiBPcGVucyB0aGUgbW9kYWwgYWZ0ZXIgb3B0aW9uYWxseSBmZXRjaGluZyBhbiBBSSBjYXRlZ29yeSBzdWdnZXN0aW9uLiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVJbXBvcnRDbGljayhqb2I6IEpvYlBvc3QpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAvLyBTaG93IG1vZGFsIGltbWVkaWF0ZWx5IHdpdGggd2hhdGV2ZXIgY2F0ZWdvcmllcyB3ZSBoYXZlXHJcbiAgLy8gQXR0ZW1wdCBBSSBjbGFzc2lmaWNhdGlvbiBpbiBwYXJhbGxlbFxyXG4gIGxldCBhaUNhdGVnb3J5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gIGlmIChjYWNoZWRDYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1zZzogQ2xhc3NpZnlDYXRlZ29yeU1lc3NhZ2UgPSB7XHJcbiAgICAgICAgdHlwZTogXCJDTEFTU0lGWV9DQVRFR09SWVwiLFxyXG4gICAgICAgIHRpdGxlOiBqb2IudGl0bGUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGpvYi5kZXNjcmlwdGlvbixcclxuICAgICAgICBhdmFpbGFibGVDYXRlZ29yaWVzOiBjYWNoZWRDYXRlZ29yaWVzLm1hcCgoYykgPT4gYy5uYW1lKSxcclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZTxDbGFzc2lmeUNhdGVnb3J5TWVzc2FnZSwgQ2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlPihtc2cpLFxyXG4gICAgICAgIC8vIFRpbWVvdXQgYWZ0ZXIgNCBzIHNvIHdlIGRvbid0IGJsb2NrIHRoZSBtb2RhbFxyXG4gICAgICAgIG5ldyBQcm9taXNlPENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZT4oKHJlc29sdmUpID0+XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSB9KSwgNDAwMClcclxuICAgICAgICApLFxyXG4gICAgICBdKTtcclxuICAgICAgaWYgKHJlcz8uc3VjY2VzcyAmJiByZXMuY2F0ZWdvcnkpIHtcclxuICAgICAgICBhaUNhdGVnb3J5ID0gcmVzLmNhdGVnb3J5O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgLy8gTm9uLWZhdGFsIFx1MjAxNCBmYWxsIGJhY2sgdG8gbG9jYWwgZGV0ZWN0aW9uXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzaG93Sm9iTW9kYWwoam9iLCBjYWNoZWRDYXRlZ29yaWVzLCBhaUNhdGVnb3J5KTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFZpZXdwb3J0IGNoZWNrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gaXNOZWFyVmlld3BvcnQoZWw6IEVsZW1lbnQpOiBib29sZWFuIHtcclxuICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgcmV0dXJuIChcclxuICAgIHJlY3QudG9wIDwgd2luZG93LmlubmVySGVpZ2h0ICsgMTIwMCAmJlxyXG4gICAgcmVjdC5ib3R0b20gPiAtNDAwICYmXHJcbiAgICByZWN0LndpZHRoID4gMCAmJlxyXG4gICAgcmVjdC5oZWlnaHQgPiAwXHJcbiAgKTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIERlYm91bmNlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZGVib3VuY2U8VCBleHRlbmRzIHVua25vd25bXT4oZm46ICguLi5hcmdzOiBUKSA9PiB2b2lkLCBtczogbnVtYmVyKSB7XHJcbiAgbGV0IHRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xyXG4gIHJldHVybiAoLi4uYXJnczogVCkgPT4ge1xyXG4gICAgaWYgKHRpbWVyKSBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgdGltZXIgPSBudWxsO1xyXG4gICAgICBmbiguLi5hcmdzKTtcclxuICAgIH0sIG1zKTtcclxuICB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgTXV0YXRpb25PYnNlcnZlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNvbnN0IGRlYm91bmNlZFNjYW4gPSBkZWJvdW5jZSgobm9kZXM6IEVsZW1lbnRbXSkgPT4ge1xyXG4gIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgc2NhbkZvckpvYlBvc3RzKG5vZGUpO1xyXG4gIH1cclxuICBzY2FuRm9ySm9iUG9zdHMoZG9jdW1lbnQpO1xyXG59LCAzMDApO1xyXG5cclxuY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XHJcbiAgY29uc3QgYWRkZWQ6IEVsZW1lbnRbXSA9IFtdO1xyXG4gIGZvciAoY29uc3QgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XHJcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgbXV0YXRpb24uYWRkZWROb2Rlcykge1xyXG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcclxuICAgICAgICBhZGRlZC5wdXNoKG5vZGUgYXMgRWxlbWVudCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgaWYgKGFkZGVkLmxlbmd0aCA+IDApIGRlYm91bmNlZFNjYW4oYWRkZWQpO1xyXG59KTtcclxuXHJcbi8vIFNjcm9sbCB0cmlnZ2VycyByZS1zY2FuIHNvIG5lYXItdmlld3BvcnQgcG9zdHMgZ2V0IHByb2Nlc3NlZCB3aGVuIHNjcm9sbGVkIHRvXHJcbmNvbnN0IGRlYm91bmNlZFNjcm9sbFNjYW4gPSBkZWJvdW5jZSgoKSA9PiBzY2FuRm9ySm9iUG9zdHMoZG9jdW1lbnQpLCA1MDApO1xyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBkZWJvdW5jZWRTY3JvbGxTY2FuLCB7IHBhc3NpdmU6IHRydWUgfSk7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQm9vdHN0cmFwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAvLyBQcmUtbG9hZCBjYXRlZ29yaWVzIGluIGJhY2tncm91bmQ7IFVJIHNjYW4gcHJvY2VlZHMgaW4gcGFyYWxsZWxcclxuICBwcmVsb2FkQ2F0ZWdvcmllcygpOyAvLyBpbnRlbnRpb25hbGx5IG5vdCBhd2FpdGVkIFx1MjAxNCBmaXJlIGFuZCBmb3JnZXRcclxuXHJcbiAgc2NhbkZvckpvYlBvc3RzKGRvY3VtZW50KTtcclxuXHJcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcclxuXHJcbiAgY29uc29sZS5sb2coYFtMb2NhbFByb10gQ29udGVudCBzY3JpcHQgYWN0aXZlIG9uICR7UExBVEZPUk19YCk7XHJcbn1cclxuXHJcbmlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImxvYWRpbmdcIikge1xyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHsgdm9pZCBpbml0KCk7IH0pO1xyXG59IGVsc2Uge1xyXG4gIHZvaWQgaW5pdCgpO1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7OztBQUlBLE1BQU0sZUFBdUM7QUFBQTtBQUFBLElBRTNDLFFBQVE7QUFBQSxJQUNSLGdCQUFnQjtBQUFBLElBQ2hCLGlCQUFpQjtBQUFBLElBQ2pCLGNBQWM7QUFBQSxJQUNkLGVBQWU7QUFBQSxJQUNmLG1CQUFtQjtBQUFBLElBQ25CLGVBQWU7QUFBQSxJQUNmLGFBQWE7QUFBQSxJQUNiLGlCQUFpQjtBQUFBLElBQ2pCLG9CQUFvQjtBQUFBLElBQ3BCLG1CQUFtQjtBQUFBLElBQ25CLGlCQUFpQjtBQUFBLElBQ2pCLGtCQUFrQjtBQUFBLElBQ2xCLDBCQUEwQjtBQUFBLElBQzFCLGVBQWU7QUFBQSxJQUNmLFVBQVU7QUFBQSxJQUNWLG1CQUFtQjtBQUFBLElBQ25CLFFBQVE7QUFBQSxJQUNSLFNBQVM7QUFBQSxJQUNULFdBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxJQUNiLGNBQWM7QUFBQSxJQUNkLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLGdCQUFnQjtBQUFBLElBQ2hCLFdBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxJQUNiLG9CQUFvQjtBQUFBLElBQ3BCLG1CQUFtQjtBQUFBO0FBQUEsSUFHbkIsYUFBYTtBQUFBLElBQ2IsVUFBVTtBQUFBLElBQ1YsYUFBYTtBQUFBLElBQ2IsVUFBVTtBQUFBLElBQ1Ysa0JBQWtCO0FBQUEsSUFDbEIsb0JBQW9CO0FBQUEsSUFDcEIsS0FBSztBQUFBLElBQ0wsZUFBZTtBQUFBLElBQ2YsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsWUFBWTtBQUFBLElBQ1osaUJBQWlCO0FBQUE7QUFBQSxJQUdqQixRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixXQUFXO0FBQUEsSUFDWCxZQUFZO0FBQUEsSUFDWixRQUFRO0FBQUEsSUFDUixjQUFjO0FBQUEsSUFDZCxhQUFhO0FBQUEsSUFDYixXQUFXO0FBQUEsSUFDWCxVQUFVO0FBQUEsSUFDVixpQkFBaUI7QUFBQTtBQUFBLElBR2pCLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULFlBQVk7QUFBQSxJQUNaLGNBQWM7QUFBQSxJQUNkLGNBQWM7QUFBQSxJQUNkLHlCQUF5QjtBQUFBLElBQ3pCLHlCQUF5QjtBQUFBLElBQ3pCLFlBQVk7QUFBQSxJQUNaLFlBQVk7QUFBQTtBQUFBLElBR1osdUJBQXVCO0FBQUEsSUFDdkIsb0JBQW9CO0FBQUEsSUFDcEIsdUJBQXVCO0FBQUEsSUFDdkIsc0JBQXNCO0FBQUEsSUFDdEIsWUFBWTtBQUFBLElBQ1osUUFBUTtBQUFBLElBQ1IsZ0JBQWdCO0FBQUEsSUFDaEIsY0FBYztBQUFBLElBQ2Qsa0JBQWtCO0FBQUEsSUFDbEIsYUFBYTtBQUFBLElBQ2IsV0FBVztBQUFBLElBQ1gsYUFBYTtBQUFBO0FBQUEsSUFHYixVQUFVO0FBQUEsSUFDVixNQUFNO0FBQUEsSUFDTixhQUFhO0FBQUEsSUFDYixNQUFNO0FBQUE7QUFBQSxJQUdOLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFdBQVc7QUFBQSxJQUNYLFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNULFFBQVE7QUFBQSxJQUNSLFlBQVk7QUFBQSxJQUNaLFVBQVU7QUFBQSxJQUNWLFFBQVE7QUFBQSxJQUNSLE9BQU87QUFBQSxJQUNQLFNBQVM7QUFBQSxJQUNULFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLFNBQVM7QUFBQSxJQUNULFVBQVU7QUFBQSxJQUNWLFdBQVc7QUFBQSxJQUNYLFVBQVU7QUFBQSxJQUNWLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLFVBQVU7QUFBQSxJQUNWLFlBQVk7QUFBQSxJQUNaLGdCQUFnQjtBQUFBLElBQ2hCLFNBQVM7QUFBQSxJQUNULHdCQUF3QjtBQUFBLElBQ3hCLGVBQWU7QUFBQSxJQUNmLHFCQUFxQjtBQUFBLElBQ3JCLGNBQWM7QUFBQSxJQUNkLFNBQVM7QUFBQSxJQUNULG9CQUFvQjtBQUFBLElBQ3BCLGlCQUFpQjtBQUFBLElBQ2pCLGNBQWM7QUFBQSxJQUNkLGVBQWU7QUFBQSxJQUNmLE9BQU87QUFBQTtBQUFBLElBR1AsaUJBQWlCO0FBQUE7QUFBQSxJQUNqQixlQUFlO0FBQUE7QUFBQSxJQUNmLGVBQWU7QUFBQTtBQUFBLElBQ2YsZ0JBQWdCO0FBQUE7QUFBQSxJQUNoQixvQkFBb0I7QUFBQSxJQUNwQixtQkFBbUI7QUFBQSxJQUNuQixnQkFBZ0I7QUFBQSxJQUNoQixxQkFBcUI7QUFBQSxJQUNyQixxQkFBcUI7QUFBQSxJQUNyQixZQUFZO0FBQUEsSUFDWix3QkFBd0I7QUFBQSxJQUN4QixLQUFLO0FBQUEsSUFDTCxrQkFBa0I7QUFBQSxJQUNsQixlQUFlO0FBQUEsSUFDZixxQkFBcUI7QUFBQSxFQUN2QjtBQUVBLE1BQU0sY0FBYztBQUNwQixNQUFNLGlCQUFpQjtBQUN2QixNQUFNLGNBQWM7QUFHcEIsTUFBTSxzQkFBc0I7QUFJNUIsTUFBTSxvQkFBOEM7QUFBQSxJQUNsRCxVQUFVLENBQUMsV0FBVyxZQUFZLFFBQVEsU0FBUyxVQUFVLFVBQVUsWUFBWTtBQUFBLElBQ25GLFlBQVksQ0FBQyxlQUFlLGNBQWMsVUFBVSxXQUFXLFNBQVMsVUFBVSxTQUFTO0FBQUEsSUFDM0YsV0FBVyxDQUFDLGFBQWEsYUFBYSxRQUFRLGFBQWEsV0FBVyxVQUFVO0FBQUEsSUFDaEYsVUFBVSxDQUFDLFdBQVcsWUFBWSxTQUFTLFdBQVcsYUFBYSxXQUFXO0FBQUEsSUFDOUUsVUFBVSxDQUFDLFdBQVcsWUFBWSxnQkFBZ0IsY0FBYyxjQUFjLE1BQU07QUFBQSxJQUNwRixTQUFTLENBQUMsVUFBVSxXQUFXLFlBQVksV0FBVyxhQUFhLGFBQWEsTUFBTTtBQUFBLElBQ3RGLE1BQU0sQ0FBQyxRQUFRLFVBQVUsb0JBQW9CLG1CQUFtQixpQkFBaUIsV0FBVyxTQUFTO0FBQUEsSUFDckcsU0FBUyxDQUFDLFVBQVUsV0FBVyxlQUFlLFNBQVMsT0FBTztBQUFBLElBQzlELGNBQWMsQ0FBQyxTQUFTLFdBQVcsZ0JBQWdCLFdBQVcsWUFBWSxXQUFXLGFBQWE7QUFBQSxJQUNsRyxZQUFZLENBQUMsWUFBWSxjQUFjLFVBQVUsU0FBUyxjQUFjLFdBQVcsUUFBUTtBQUFBLElBQzNGLElBQUksQ0FBQyxhQUFhLGNBQWMsWUFBWSxVQUFVLE9BQU8sT0FBTyxjQUFjLFNBQVM7QUFBQSxJQUMzRixRQUFRLENBQUMsWUFBWSxXQUFXLE1BQU0sTUFBTSxZQUFZLGVBQWUsV0FBVztBQUFBLElBQ2xGLFlBQVksQ0FBQyxTQUFTLGFBQWEsV0FBVyxjQUFjLFVBQVUsV0FBVztBQUFBLElBQ2pGLFdBQVcsQ0FBQyxXQUFXLFNBQVMsY0FBYyxZQUFZLFdBQVcsVUFBVTtBQUFBLElBQy9FLFVBQVUsQ0FBQyxrQkFBa0Isb0JBQW9CLGFBQWEsUUFBUSxRQUFRO0FBQUEsRUFDaEY7QUFFQSxXQUFTLGdCQUFnQixNQUFrQztBQUN6RCxVQUFNLFFBQVEsS0FBSyxZQUFZO0FBQy9CLFFBQUk7QUFDSixRQUFJLFlBQVk7QUFFaEIsZUFBVyxDQUFDLFVBQVUsUUFBUSxLQUFLLE9BQU8sUUFBUSxpQkFBaUIsR0FBRztBQUNwRSxZQUFNLFFBQVEsU0FBUyxPQUFPLENBQUMsT0FBTyxNQUFNLFNBQVMsRUFBRSxDQUFDLEVBQUU7QUFDMUQsVUFBSSxRQUFRLFdBQVc7QUFDckIsb0JBQVk7QUFDWix1QkFBZTtBQUFBLE1BQ2pCO0FBQUEsSUFDRjtBQUVBLFdBQU8sWUFBWSxJQUFJLGVBQWU7QUFBQSxFQUN4QztBQVlBLFdBQVMsVUFBVSxNQUE2QjtBQUM5QyxVQUFNLFFBQVEsS0FBSyxZQUFZO0FBQy9CLFFBQUksUUFBUTtBQUVaLGVBQVcsQ0FBQyxTQUFTLE1BQU0sS0FBSyxPQUFPLFFBQVEsWUFBWSxHQUFHO0FBQzVELFVBQUksTUFBTSxTQUFTLE9BQU8sR0FBRztBQUMzQixpQkFBUztBQUFBLE1BQ1g7QUFBQSxJQUNGO0FBRUEsVUFBTSxXQUFXLFlBQVksS0FBSyxJQUFJO0FBQ3RDLFVBQU0sY0FBYyxlQUFlLEtBQUssSUFBSTtBQUM1QyxVQUFNLFdBQVcsWUFBWSxLQUFLLElBQUk7QUFHdEMsZ0JBQVksWUFBWTtBQUN4QixtQkFBZSxZQUFZO0FBQzNCLGdCQUFZLFlBQVk7QUFFeEIsUUFBSTtBQUFVLGVBQVM7QUFDdkIsUUFBSTtBQUFhLGVBQVM7QUFDMUIsUUFBSTtBQUFVLGVBQVM7QUFHdkIsVUFBTSxhQUFhLEtBQUssSUFBSSxRQUFRLElBQUksQ0FBQztBQUV6QyxXQUFPLEVBQUUsT0FBTyxZQUFZLFVBQVUsYUFBYSxTQUFTO0FBQUEsRUFDOUQ7QUFRTyxXQUFTLGNBQWMsU0FBMkI7QUFDdkQsVUFBTSxPQUFPLFFBQVEsZUFBZTtBQUNwQyxVQUFNLEVBQUUsTUFBTSxJQUFJLFVBQVUsSUFBSTtBQUNoQyxXQUFPLFNBQVM7QUFBQSxFQUNsQjtBQU1PLFdBQVMsZUFBZSxTQUFrQixVQUE2QjtBQUM1RSxVQUFNLE9BQU8sUUFBUSxlQUFlO0FBQ3BDLFVBQU0sRUFBRSxZQUFZLFlBQVksSUFBSSxVQUFVLElBQUk7QUFFbEQsUUFBSSxRQUFRO0FBQ1osUUFBSSxjQUFjO0FBQ2xCLFFBQUksV0FBVztBQUNmLFFBQUksWUFBWTtBQUNoQixVQUFNLE1BQU0sT0FBTyxTQUFTO0FBRTVCLFFBQUksYUFBYSxZQUFZO0FBQzNCLGNBQVEscUJBQXFCLFNBQVMsSUFBSTtBQUMxQyxvQkFBYywyQkFBMkIsU0FBUyxJQUFJO0FBQ3RELGlCQUFXLHNCQUFzQixPQUFPO0FBQ3hDLGtCQUFZLHlCQUF5QixPQUFPO0FBQUEsSUFDOUMsT0FBTztBQUNMLGNBQVEscUJBQXFCLFNBQVMsSUFBSTtBQUMxQyxvQkFBYywyQkFBMkIsU0FBUyxJQUFJO0FBQ3RELGlCQUFXLHNCQUFzQixPQUFPO0FBQ3hDLGtCQUFZLHlCQUF5QixPQUFPO0FBQUEsSUFDOUM7QUFHQSxRQUFJLENBQUMsT0FBTztBQUNWLFlBQU0sUUFBUSxLQUNYLE1BQU0sSUFBSSxFQUNWLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQ25CLE9BQU8sQ0FBQyxNQUFNLEVBQUUsU0FBUyxNQUFNLEVBQUUsU0FBUyxHQUFHO0FBQ2hELGNBQVEsTUFBTSxDQUFDLEtBQUs7QUFBQSxJQUN0QjtBQUVBLFVBQU0sU0FBUyxjQUFjLFlBQVksSUFBSSxJQUFJO0FBQ2pELFVBQU0sV0FBVyxnQkFBZ0IsSUFBSTtBQUNyQyxVQUFNLFdBQVcsZ0JBQWdCLElBQUk7QUFFckMsV0FBTztBQUFBLE1BQ0wsT0FBTyxTQUFTLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQztBQUFBLE1BQ25DLGFBQWEsU0FBUyxZQUFZLE1BQU0sR0FBRyxHQUFJLENBQUM7QUFBQSxNQUNoRCxRQUFRO0FBQUEsTUFDUixZQUFZLGVBQWUsU0FBUyxRQUFRLEtBQUs7QUFBQSxNQUNqRCxXQUFXLFNBQVMsU0FBUyxNQUFNLEdBQUcsR0FBRyxDQUFDO0FBQUEsTUFDMUMsV0FBVyxjQUFhLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsTUFDL0MsVUFBVSxXQUFXLFNBQVMsUUFBUSxJQUFJO0FBQUEsTUFDMUM7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBSUEsV0FBUyxxQkFBcUIsU0FBa0IsVUFBMEI7QUFFeEUsVUFBTSxTQUFTLFFBQVEsY0FBYyxRQUFRO0FBQzdDLFFBQUksUUFBUTtBQUFhLGFBQU8sT0FBTyxZQUFZLEtBQUs7QUFHeEQsZUFBVyxPQUFPLENBQUMsTUFBTSxNQUFNLElBQUksR0FBRztBQUNwQyxZQUFNLFVBQVUsUUFBUSxjQUFjLEdBQUc7QUFDekMsVUFBSSxTQUFTO0FBQWEsZUFBTyxRQUFRLFlBQVksS0FBSztBQUFBLElBQzVEO0FBR0EsVUFBTSxRQUFRLFNBQVMsTUFBTSw0Q0FBNEM7QUFDekUsUUFBSTtBQUFPLGFBQU8sTUFBTSxDQUFDLEVBQUUsS0FBSztBQUVoQyxXQUFPO0FBQUEsRUFDVDtBQUVBLFdBQVMsMkJBQTJCLFNBQWtCLFVBQTBCO0FBRTlFLFVBQU0sV0FDSixRQUFRLGNBQWMsNkJBQTZCLEtBQ25ELFFBQVEsY0FBYyw4QkFBOEIsS0FDcEQsUUFBUSxjQUFjLFVBQVU7QUFBQSxJQUNoQyxRQUFRLGNBQWMsY0FBYztBQUV0QyxRQUFJLFVBQVU7QUFBYSxhQUFPLFNBQVMsWUFBWSxLQUFLO0FBRTVELFdBQU8sU0FBUyxLQUFLO0FBQUEsRUFDdkI7QUFFQSxXQUFTLHNCQUFzQixTQUEwQjtBQUV2RCxVQUFNLFlBQ0osUUFBUSxjQUFjLHFDQUFxQyxLQUMzRCxRQUFRLGNBQWMsa0NBQWtDLEtBQ3hELFFBQVEsY0FBYyxNQUFNLEtBQzVCLFFBQVEsY0FBYyxNQUFNO0FBRTlCLFdBQU8sV0FBVyxhQUFhLEtBQUssS0FBSztBQUFBLEVBQzNDO0FBRUEsV0FBUyx5QkFBeUIsU0FBMEI7QUFDMUQsVUFBTSxTQUFTLFFBQVEsY0FBYyxrQkFBa0I7QUFDdkQsUUFBSSxRQUFRO0FBQ1YsWUFBTSxRQUFRLE9BQU8sYUFBYSxZQUFZO0FBQzlDLFVBQUk7QUFBTyxlQUFPLElBQUksS0FBSyxTQUFTLEtBQUssSUFBSSxHQUFJLEVBQUUsWUFBWTtBQUFBLElBQ2pFO0FBRUEsVUFBTSxVQUFVLFFBQVEsY0FBYyxNQUFNO0FBQzVDLFFBQUksU0FBUztBQUNYLFlBQU0sS0FBSyxRQUFRLGFBQWEsVUFBVTtBQUMxQyxVQUFJO0FBQUksZUFBTyxJQUFJLEtBQUssRUFBRSxFQUFFLFlBQVk7QUFDeEMsVUFBSSxRQUFRO0FBQWEsZUFBTyxRQUFRLFlBQVksS0FBSztBQUFBLElBQzNEO0FBRUEsWUFBTyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLEVBQ2hDO0FBRUEsV0FBUyxlQUFlLFNBQWtCLFVBQTRCO0FBQ3BFLFFBQUksYUFBYSxZQUFZO0FBQzNCLFlBQU0sUUFBUSxRQUFRLGlCQUFvQyxTQUFTO0FBQ25FLGlCQUFXLFFBQVEsT0FBTztBQUN4QixjQUFNLE9BQU8sS0FBSztBQUNsQixZQUFJLEtBQUssU0FBUyxTQUFTLEtBQUssS0FBSyxTQUFTLFlBQVksS0FBSyxLQUFLLFNBQVMsV0FBVyxHQUFHO0FBQ3pGLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGLE9BQU87QUFDTCxZQUFNLFFBQVEsUUFBUSxpQkFBb0MsU0FBUztBQUNuRSxpQkFBVyxRQUFRLE9BQU87QUFDeEIsY0FBTSxPQUFPLEtBQUs7QUFDbEIsWUFBSSxLQUFLLFNBQVMsZUFBZSxLQUFLLEtBQUssU0FBUyxTQUFTLEtBQUssS0FBSyxTQUFTLFNBQVMsR0FBRztBQUMxRixpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLFdBQU8sT0FBTyxTQUFTO0FBQUEsRUFDekI7QUFJQSxXQUFTLHFCQUFxQixTQUFrQixVQUEwQjtBQUV4RSxVQUFNLFNBQ0osUUFBUSxjQUFjLDBCQUEwQixLQUNoRCxRQUFRLGNBQWMsZ0NBQWdDO0FBQ3hELFFBQUksUUFBUTtBQUFhLGFBQU8sT0FBTyxZQUFZLEtBQUs7QUFHeEQsVUFBTSxXQUFXLFFBQVE7QUFBQSxNQUN2QjtBQUFBLElBQ0Y7QUFDQSxRQUFJLFVBQVU7QUFBYSxhQUFPLFNBQVMsWUFBWSxLQUFLO0FBRTVELFVBQU0sUUFBUSxTQUFTLE1BQU0sNENBQTRDO0FBQ3pFLFFBQUk7QUFBTyxhQUFPLE1BQU0sQ0FBQyxFQUFFLEtBQUs7QUFFaEMsV0FBTztBQUFBLEVBQ1Q7QUFFQSxXQUFTLDJCQUEyQixTQUFrQixVQUEwQjtBQUM5RSxVQUFNLFdBQ0osUUFBUSxjQUFjLG1CQUFtQixLQUN6QyxRQUFRLGNBQWMseUJBQXlCLEtBQy9DLFFBQVEsY0FBYyxxQ0FBcUM7QUFFN0QsUUFBSSxVQUFVO0FBQWEsYUFBTyxTQUFTLFlBQVksS0FBSztBQUU1RCxXQUFPLFNBQVMsS0FBSztBQUFBLEVBQ3ZCO0FBRUEsV0FBUyxzQkFBc0IsU0FBMEI7QUFDdkQsVUFBTSxRQUNKLFFBQVEsY0FBYyx5REFBeUQsS0FDL0UsUUFBUSxjQUFjLDBCQUEwQixLQUNoRCxRQUFRLGNBQWMsZ0NBQWdDO0FBRXhELFdBQU8sT0FBTyxhQUFhLEtBQUssS0FBSztBQUFBLEVBQ3ZDO0FBRUEsV0FBUyx5QkFBeUIsU0FBMEI7QUFDMUQsVUFBTSxTQUFTLFFBQVEsY0FBYyxNQUFNO0FBQzNDLFFBQUksUUFBUTtBQUNWLFlBQU0sS0FBSyxPQUFPLGFBQWEsVUFBVTtBQUN6QyxVQUFJO0FBQUksZUFBTyxJQUFJLEtBQUssRUFBRSxFQUFFLFlBQVk7QUFBQSxJQUMxQztBQUVBLFVBQU0sZUFBZSxRQUFRO0FBQUEsTUFDM0I7QUFBQSxJQUNGO0FBQ0EsUUFBSSxjQUFjO0FBQWEsYUFBTyxhQUFhLFlBQVksS0FBSztBQUVwRSxZQUFPLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsRUFDaEM7QUFJQSxXQUFTLFlBQVksTUFBa0M7QUFDckQsbUJBQWUsWUFBWTtBQUMzQixVQUFNLFFBQVEsZUFBZSxLQUFLLElBQUk7QUFDdEMsUUFBSSxDQUFDO0FBQU8sYUFBTztBQUVuQixVQUFNLFNBQVMsTUFBTSxDQUFDLEVBQUUsUUFBUSxXQUFXLEVBQUU7QUFDN0MsVUFBTSxNQUFNLFNBQVMsUUFBUSxFQUFFO0FBQy9CLFdBQU8sTUFBTSxHQUFHLElBQUksU0FBWTtBQUFBLEVBQ2xDO0FBRUEsTUFBTSxvQkFBb0I7QUFBQSxJQUN4QjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFFQSxXQUFTLGdCQUFnQixNQUFrQztBQUN6RCxlQUFXLFdBQVcsbUJBQW1CO0FBQ3ZDLFlBQU0sUUFBUSxLQUFLLE1BQU0sT0FBTztBQUNoQyxVQUFJLFFBQVEsQ0FBQztBQUFHLGVBQU8sTUFBTSxDQUFDLEVBQUUsS0FBSztBQUFBLElBQ3ZDO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFHQSxXQUFTLFNBQVMsT0FBdUI7QUFDdkMsV0FBTyxNQUFNLFFBQVEsWUFBWSxFQUFFLEVBQUUsUUFBUSxRQUFRLEdBQUcsRUFBRSxLQUFLO0FBQUEsRUFDakU7OztBQzFjQSxNQUFNLGVBQWU7QUFDckIsTUFBTSxnQkFBZ0I7QUFJdEIsTUFBTSxnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFzT2YsV0FBUyxtQkFDZCxhQUNBLEtB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
