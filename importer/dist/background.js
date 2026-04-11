"use strict";
(() => {
  // utils/api.ts
  var API_BASE_URL = "https://www.localpro.asia";
  async function apiFetch(path, options = {}) {
    const { retry = true, ...init } = options;
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers
    };
    const request = {
      ...init,
      headers,
      credentials: "include"
    };
    const url = `${API_BASE_URL}${path}`;
    let response;
    try {
      response = await fetch(url, request);
    } catch (networkErr) {
      throw new Error(`Network error: ${String(networkErr)}`);
    }
    if (response.status === 401 && retry) {
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        const err = { error: "Session expired. Please log in again.", code: "SESSION_EXPIRED" };
        throw err;
      }
      return apiFetch(path, { ...options, retry: false });
    }
    let data;
    try {
      data = await response.json();
    } catch {
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      return void 0;
    }
    if (!response.ok) {
      const serverError = data;
      const err = {
        error: serverError.error ?? serverError.message ?? `HTTP ${response.status}`,
        code: serverError.code
      };
      throw err;
    }
    return data;
  }
  async function login(payload) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      retry: false
      // never refresh on a login attempt
    });
  }
  async function logout() {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      retry: false
    });
  }
  async function getCurrentUser() {
    return apiFetch("/api/auth/me", { retry: true });
  }
  async function tryRefreshToken() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  async function getCategories() {
    return apiFetch("/api/categories");
  }
  async function classifyCategory(payload) {
    return apiFetch("/api/ai/classify-category", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
  async function estimateBudget(payload) {
    return apiFetch("/api/ai/estimate-budget", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
  async function generateDescription(payload) {
    return apiFetch("/api/ai/generate-description", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
  async function createJob(payload) {
    return apiFetch("/api/jobs", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  // utils/leadClassifier.ts
  var SERVICE_TYPE_KEYWORDS = {
    plumbing: [
      "pipe",
      "leak",
      "drain",
      "faucet",
      "toilet",
      "water",
      "plumber",
      "plumbing",
      "sewage",
      "tap",
      "sink",
      "shower"
    ],
    cleaning: [
      "clean",
      "cleaning",
      "cleaner",
      "mop",
      "sweep",
      "vacuum",
      "dust",
      "laundry",
      "housekeeping",
      "surface",
      "sanitize"
    ],
    repair: [
      "repair",
      "fix",
      "broken",
      "maintenance",
      "service",
      "issue",
      "damage",
      "problem",
      "install",
      "replacement"
    ],
    electrical: [
      "electrical",
      "wire",
      "circuit",
      "light",
      "power",
      "outlet",
      "plug",
      "breaker",
      "electric",
      "voltage",
      "electrician"
    ],
    hvac: [
      "hvac",
      "air conditioning",
      "ac",
      "heating",
      "cool",
      "furnace",
      "thermostat",
      "temperature",
      "duct",
      "ventilation"
    ],
    landscaping: [
      "lawn",
      "garden",
      "landscape",
      "grass",
      "mowing",
      "tree",
      "shrub",
      "plant",
      "yard",
      "outdoor",
      "trimming"
    ],
    painting: [
      "paint",
      "painting",
      "painter",
      "color",
      "wall",
      "interior",
      "exterior",
      "brushing",
      "coat",
      "primer"
    ],
    carpentry: [
      "carpenter",
      "wood",
      "cabinet",
      "door",
      "frame",
      "flooring",
      "deck",
      "joist",
      "carpentry",
      "woodwork",
      "install"
    ],
    roofing: [
      "roof",
      "roofing",
      "shingle",
      "leak",
      "gutter",
      "tile",
      "structure",
      "roofer",
      "weatherproofing"
    ],
    other: ["service", "work", "help", "need"]
  };
  var URGENCY_INDICATORS = {
    "same-day": [
      "urgent",
      "asap",
      "today",
      "emergency",
      "immediately",
      "right now",
      "now",
      "cannot wait",
      "urgent",
      "critical"
    ],
    urgent: [
      "urgent",
      "soon",
      "tomorrow",
      "next day",
      "quickly",
      "hurry",
      "rush",
      "important"
    ],
    high: [
      "need soon",
      "this week",
      "priority",
      "quick",
      "fast",
      "tight",
      "deadline"
    ],
    medium: [
      "flexible",
      "whenever",
      "next week",
      "can schedule",
      "anytime",
      "soon"
    ],
    low: [
      "no rush",
      "when available",
      "flexible",
      "whenever",
      "low priority",
      "future"
    ]
  };
  var DEFAULT_BUDGET_RANGES = {
    plumbing: { min: 50, max: 500 },
    cleaning: { min: 30, max: 200 },
    repair: { min: 40, max: 300 },
    electrical: { min: 60, max: 400 },
    hvac: { min: 100, max: 1e3 },
    landscaping: { min: 50, max: 500 },
    painting: { min: 100, max: 800 },
    carpentry: { min: 80, max: 600 },
    roofing: { min: 200, max: 2e3 },
    other: { min: 50, max: 500 }
  };
  function extractBudgetFromText(text) {
    const patterns = [
      /(?:\$|budget[:\s]*)?(\d+)\s*-\s*(\d+)/gi,
      // 100-200 or $100-200
      /(?:\$|budget[:\s]*)(\d+)\s*(?:per|\/|hour|hours)?/gi,
      // $100 or $100/hour
      /(?:costs?\s*(?:around|about|approx|~)?\s*)?(?:\$)?(\d+)/gi
      // costs around $100
    ];
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[2]) {
          return {
            min: parseInt(match[1], 10),
            max: parseInt(match[2], 10)
          };
        } else if (match[1]) {
          const value = parseInt(match[1], 10);
          return {
            min: Math.max(10, value - Math.floor(value * 0.2)),
            max: value + Math.floor(value * 0.3)
          };
        }
      }
    }
    return null;
  }
  function classifyServiceType(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const scores = {
      plumbing: 0,
      cleaning: 0,
      repair: 0,
      electrical: 0,
      hvac: 0,
      landscaping: 0,
      painting: 0,
      carpentry: 0,
      roofing: 0,
      other: 0
    };
    for (const [serviceType, keywords] of Object.entries(SERVICE_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = text.match(regex);
        if (matches) {
          scores[serviceType] += matches.length;
        }
      }
    }
    const bestMatch = Object.entries(scores).reduce(
      (prev, current) => prev[1] > current[1] ? prev : current
    );
    const [service_type, score] = bestMatch;
    const totalWords = text.split(/\s+/).length;
    const confidence = Math.min(100, score / totalWords * 100);
    return {
      service_type,
      confidence: Math.round(confidence) / 100
    };
  }
  function extractUrgency(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const scores = {
      "same-day": 0,
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    for (const [urgency, keywords] of Object.entries(URGENCY_INDICATORS)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = text.match(regex);
        if (matches) {
          scores[urgency] += matches.length;
        }
      }
    }
    const priorities = ["same-day", "urgent", "high", "medium", "low"];
    for (const urgency of priorities) {
      if (scores[urgency] > 0) {
        return {
          urgency,
          confidence: Math.min(1, scores[urgency] / 10)
        };
      }
    }
    return { urgency: "medium", confidence: 0.5 };
  }
  function classifyLead(lead) {
    const { service_type, confidence: serviceConfidence } = classifyServiceType(
      lead.title,
      lead.description
    );
    const { urgency, confidence: urgencyConfidence } = extractUrgency(
      lead.title,
      lead.description
    );
    const extractedBudget = extractBudgetFromText(lead.description);
    const budgetRange = extractedBudget || DEFAULT_BUDGET_RANGES[service_type];
    const matchConfidence = (serviceConfidence + urgencyConfidence) / 2;
    return {
      ...lead,
      service_type,
      urgency,
      estimated_budget: {
        min: budgetRange.min,
        max: budgetRange.max,
        currency: lead.estimated_budget?.currency || "USD"
      },
      match_confidence: matchConfidence,
      classification_analysis: `Classified as ${service_type} (${Math.round(
        serviceConfidence * 100
      )}% confidence) with ${urgency} urgency. Estimated budget: $${budgetRange.min}-${budgetRange.max}.`
    };
  }

  // background.ts
  var CATEGORY_CACHE_TTL = 24 * 60 * 60 * 1e3;
  var categoryCache = null;
  async function getCachedCategories() {
    const now = Date.now();
    if (categoryCache && now - categoryCache.fetchedAt < CATEGORY_CACHE_TTL) {
      return categoryCache.categories;
    }
    try {
      const cats = await getCategories();
      categoryCache = { categories: cats, fetchedAt: now };
      return cats;
    } catch {
      return categoryCache?.categories ?? [];
    }
  }
  var HISTORY_KEY = "import_history";
  var LEAD_HISTORY_KEY = "lead_history";
  var MAX_HISTORY = 50;
  async function saveImportRecord(item) {
    try {
      const stored = await chrome.storage.local.get(HISTORY_KEY);
      const history = stored[HISTORY_KEY] ?? [];
      history.unshift(item);
      if (history.length > MAX_HISTORY)
        history.splice(MAX_HISTORY);
      await chrome.storage.local.set({ [HISTORY_KEY]: history });
    } catch {
    }
  }
  async function getImportHistory() {
    try {
      const stored = await chrome.storage.local.get(HISTORY_KEY);
      return stored[HISTORY_KEY] ?? [];
    } catch {
      return [];
    }
  }
  async function saveLeadRecord(item) {
    try {
      const stored = await chrome.storage.local.get(LEAD_HISTORY_KEY);
      const history = stored[LEAD_HISTORY_KEY] ?? [];
      history.unshift(item);
      if (history.length > MAX_HISTORY)
        history.splice(MAX_HISTORY);
      await chrome.storage.local.set({ [LEAD_HISTORY_KEY]: history });
    } catch {
    }
  }
  async function getLeadHistory() {
    try {
      const stored = await chrome.storage.local.get(LEAD_HISTORY_KEY);
      return stored[LEAD_HISTORY_KEY] ?? [];
    } catch {
      return [];
    }
  }
  async function updateBadge() {
    try {
      const history = await getImportHistory();
      const todayStart = /* @__PURE__ */ new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayCount = history.filter(
        (h) => new Date(h.importedAt) >= todayStart
      ).length;
      await chrome.action.setBadgeText({ text: todayCount > 0 ? String(todayCount) : "" });
      await chrome.action.setBadgeBackgroundColor({ color: "#1a56db" });
    } catch {
    }
  }
  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      handleMessage(message, sendResponse);
      return true;
    }
  );
  async function handleMessage(message, sendResponse) {
    switch (message.type) {
      case "LOGIN":
        await handleLogin(message.email, message.password, sendResponse);
        break;
      case "LOGOUT":
        await handleLogout(sendResponse);
        break;
      case "GET_AUTH_STATUS":
        await handleGetAuthStatus(sendResponse);
        break;
      case "GET_CATEGORIES":
        await handleGetCategories(sendResponse);
        break;
      case "CLASSIFY_CATEGORY":
        await handleClassifyCategory(message.title, message.description, message.availableCategories, sendResponse);
        break;
      case "CLASSIFY_LEAD":
        await handleClassifyLead(message.title, message.description, message.location, sendResponse);
        break;
      case "MATCH_PROVIDERS":
        await handleMatchProviders(message.lead, message.limit, sendResponse);
        break;
      case "ESTIMATE_BUDGET":
        await handleEstimateBudget(message.title, message.category, message.description, sendResponse);
        break;
      case "GENERATE_DESCRIPTION":
        await handleGenerateDescription(message.title, message.category, sendResponse);
        break;
      case "IMPORT_JOB":
        await handleImportJob(message.payload, sendResponse);
        break;
      case "CAPTURE_LEAD":
        await handleCaptureLead(message.payload, sendResponse);
        break;
      case "GET_IMPORT_HISTORY":
        await handleGetImportHistory(sendResponse);
        break;
      case "GET_LEAD_HISTORY":
        await handleGetLeadHistory(sendResponse);
        break;
      case "GET_IMPORT_STATS":
        await handleGetImportStats(sendResponse);
        break;
      case "GET_LEAD_STATS":
        await handleGetLeadStats(sendResponse);
        break;
      case "INJECT_AND_SCAN":
        await handleInjectAndScan(message.tabId, message.autoScroll, sendResponse);
        break;
      default: {
        const unknownType = message.type;
        console.warn(`[LocalPro] Unhandled message type: ${String(unknownType)}`);
        sendResponse({ error: `Unknown message type: ${String(unknownType)}` });
      }
    }
  }
  async function handleLogin(email, password, sendResponse) {
    try {
      const apiRes = await login({ email, password });
      const user = {
        _id: apiRes.user.id ?? "",
        name: apiRes.user.name,
        email,
        role: apiRes.user.role
      };
      await chrome.storage.local.set({ cached_user: user });
      sendResponse({ success: true, user });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleLogout(sendResponse) {
    try {
      await logout();
    } catch {
    }
    await chrome.storage.local.remove("cached_user");
    sendResponse({ success: true });
  }
  async function handleGetAuthStatus(sendResponse) {
    const stored = await chrome.storage.local.get("cached_user");
    const cachedUser = stored["cached_user"];
    try {
      const me = await getCurrentUser();
      const user = { _id: me._id, name: me.name, email: me.email, role: me.role };
      await chrome.storage.local.set({ cached_user: user });
      sendResponse({ authenticated: true, user });
    } catch (err) {
      const errObj = err;
      if (errObj.code === "SESSION_EXPIRED" || !cachedUser) {
        await chrome.storage.local.remove("cached_user");
        sendResponse({ authenticated: false });
      } else {
        sendResponse({ authenticated: true, user: cachedUser });
      }
    }
  }
  async function handleGetCategories(sendResponse) {
    try {
      const cats = await getCachedCategories();
      sendResponse({ success: true, categories: cats });
    } catch (err) {
      sendResponse({ success: false, categories: [], error: errorMessage(err) });
    }
  }
  async function handleClassifyCategory(title, description, availableCategories, sendResponse) {
    try {
      const result = await classifyCategory({ title, description, availableCategories });
      sendResponse({ success: true, category: result.category });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleEstimateBudget(title, category, description, sendResponse) {
    try {
      const result = await estimateBudget({ title, category, description });
      sendResponse({
        success: true,
        min: result.min,
        max: result.max,
        midpoint: result.midpoint,
        note: result.note
      });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleGenerateDescription(title, category, sendResponse) {
    try {
      const result = await generateDescription({ title, category });
      sendResponse({ success: true, description: result.description });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleGetImportHistory(sendResponse) {
    const history = await getImportHistory();
    sendResponse({ success: true, history });
  }
  async function handleGetImportStats(sendResponse) {
    const history = await getImportHistory();
    sendResponse({ count: history.length });
  }
  async function handleClassifyLead(title, description, location, sendResponse) {
    try {
      const lead = {
        title,
        description,
        location,
        source: "facebook",
        // Default source, could be passed in
        source_url: "",
        posted_by: "Unknown",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      const classifiedLead = classifyLead(lead);
      sendResponse({
        success: true,
        classified_lead: classifiedLead,
        service_type: classifiedLead.service_type,
        urgency: classifiedLead.urgency,
        estimated_budget: classifiedLead.estimated_budget,
        confidence: classifiedLead.match_confidence,
        analysis: classifiedLead.classification_analysis
      });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleMatchProviders(lead, limit = 5, sendResponse) {
    try {
      sendResponse({
        success: true,
        providers: []
      });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleCaptureLead(payload, sendResponse) {
    try {
      const classifiedLead = classifyLead(payload);
      const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await saveLeadRecord({
        lead_id: leadId,
        title: classifiedLead.title,
        service_type: classifiedLead.service_type,
        urgency: classifiedLead.urgency,
        source: classifiedLead.source,
        source_url: classifiedLead.source_url,
        capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
        matched_providers_count: classifiedLead.matched_providers?.length ?? 0
      });
      await updateBadge();
      sendResponse({ success: true, lead_id: leadId });
    } catch (err) {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
  async function handleGetLeadHistory(sendResponse) {
    const history = await getLeadHistory();
    sendResponse({ success: true, history });
  }
  async function handleGetLeadStats(sendResponse) {
    const history = await getLeadHistory();
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const todayLeads = history.filter(
      (h) => new Date(h.capturedAt) >= today
    );
    const byServiceType = {};
    const byUrgency = {};
    for (const lead of history) {
      byServiceType[lead.service_type] = (byServiceType[lead.service_type] ?? 0) + 1;
      byUrgency[lead.urgency] = (byUrgency[lead.urgency] ?? 0) + 1;
    }
    sendResponse({
      total_leads: history.length,
      leads_today: todayLeads.length,
      pending_matches: todayLeads.filter((l) => !l.matched_providers_count).length,
      by_service_type: byServiceType,
      by_urgency: byUrgency
    });
  }
  async function handleImportJob(job, sendResponse) {
    let categoryId = job.categoryId;
    if (!categoryId && job.category) {
      const cats = await getCachedCategories();
      const matched = cats.find(
        (c) => c.name.toLowerCase() === (job.category ?? "").toLowerCase()
      );
      categoryId = matched?._id;
    }
    const sourceNote = [
      `

---`,
      `Imported from ${job.source === "facebook" ? "Facebook" : job.source === "linkedin" ? "LinkedIn" : job.source === "jobstreet" ? "JobStreet" : "Indeed"}: ${job.source_url}`,
      job.posted_by ? `Posted by: ${job.posted_by}` : null,
      job.timestamp ? `Original timestamp: ${job.timestamp}` : null
    ].filter(Boolean).join("\n");
    const fallbackScheduleDate = new Date(Date.now() + 864e5).toISOString();
    const payload = {
      title: job.title,
      description: job.description + sourceNote,
      category: categoryId ?? "",
      budget: job.budget ?? 0,
      location: job.location ?? "",
      scheduleDate: job.scheduleDate ? new Date(job.scheduleDate).toISOString() : fallbackScheduleDate,
      tags: [
        `imported_from_${job.source}`,
        ...job.category ? [job.category.toLowerCase().replace(/\s+/g, "_")] : []
      ]
    };
    if (!payload.category) {
      sendResponse({ success: false, error: "Please select a category before submitting." });
      return;
    }
    if (!payload.location) {
      sendResponse({ success: false, error: "Location is required." });
      return;
    }
    if (!payload.budget || payload.budget <= 0) {
      sendResponse({ success: false, error: "Budget is required (PHP)." });
      return;
    }
    try {
      const result = await createJob(payload);
      await saveImportRecord({
        job_id: result._id,
        title: job.title,
        source: job.source,
        source_url: job.source_url,
        importedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await updateBadge();
      sendResponse({ success: true, job_id: result._id });
    } catch (err) {
      const errObj = err;
      if (errObj.code === "SESSION_EXPIRED") {
        sendResponse({ success: false, error: "Session expired. Please sign in again via the extension." });
      } else {
        sendResponse({ success: false, error: errorMessage(err) });
      }
    }
  }
  var SUPPORTED_HOSTS = ["facebook.com", "messenger.com", "google.com", "maps.google.com", "business.google.com"];
  async function handleInjectAndScan(tabId, autoScroll, sendResponse) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || !SUPPORTED_HOSTS.some((h) => tab.url.includes(h))) {
        sendResponse({ ok: false, error: "Tab is not a supported lead source (Facebook, Messenger, Google Business)." });
        return;
      }
    } catch {
      sendResponse({ ok: false, error: "Could not verify tab URL." });
      return;
    }
    let alive = false;
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { type: "PING" });
      alive = !!ping?.ok;
    } catch {
      alive = false;
    }
    if (!alive) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"]
        });
        await new Promise((r) => setTimeout(r, 700));
      } catch (injectErr) {
        sendResponse({ ok: false, error: `Injection failed: ${errorMessage(injectErr)}` });
        return;
      }
    }
    try {
      await chrome.tabs.sendMessage(tabId, { type: "SCAN_TAB", autoScroll });
      sendResponse({ ok: true });
    } catch (err) {
      sendResponse({ ok: false, error: errorMessage(err) });
    }
  }
  function errorMessage(err) {
    if (err instanceof Error)
      return err.message;
    const obj = err;
    return obj?.error ?? obj?.message ?? String(err);
  }
  void updateBadge();
  console.log(`[LocalPro] Lead Engine background service worker started. API: ${API_BASE_URL}`);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdXRpbHMvYXBpLnRzIiwgIi4uL3V0aWxzL2xlYWRDbGFzc2lmaWVyLnRzIiwgIi4uL2JhY2tncm91bmQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxyXG4gKiBMb2NhbFBybyBBUEkgd3JhcHBlci5cclxuICpcclxuICogQXV0aCBtb2RlbDogSHR0cE9ubHkgY29va2llLWJhc2VkIHNlc3Npb25zIChhY2Nlc3NfdG9rZW4gKyByZWZyZXNoX3Rva2VuKS5cclxuICogQWxsIHJlcXVlc3RzIG11c3QgaW5jbHVkZSBgY3JlZGVudGlhbHM6ICdpbmNsdWRlJ2Agc28gdGhlIGJyb3dzZXJcclxuICogYXV0b21hdGljYWxseSBhdHRhY2hlcyBjb29raWVzIHNldCBieSB0aGUgc2VydmVyLlxyXG4gKlxyXG4gKiBPbiA0MDEgdGhlIHdyYXBwZXIgYXV0b21hdGljYWxseSBjYWxscyBQT1NUIC9hcGkvYXV0aC9yZWZyZXNoIGFuZCByZXRyaWVzLlxyXG4gKiBJZiB0aGUgcmVmcmVzaCBhbHNvIGZhaWxzLCBpdCB0aHJvd3MgYW4gZXJyb3Igd2l0aCBjb2RlIFwiU0VTU0lPTl9FWFBJUkVEXCIuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHR5cGUgeyBDYXRlZ29yeSwgTGVhZENyZWF0ZWRSZXNwb25zZSwgQXBpRXJyb3IgfSBmcm9tIFwiLi4vdHlwZXNcIjtcclxuXHJcbi8qKlxyXG4gKiBCYXNlIFVSTCBmb3IgdGhlIExvY2FsUHJvIEFQSS5cclxuICogQ2hhbmdlIHRvIHlvdXIgcHJvZHVjdGlvbiBkb21haW4gYmVmb3JlIGRlcGxveWluZy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBBUElfQkFTRV9VUkwgPSBcImh0dHBzOi8vd3d3LmxvY2FscHJvLmFzaWFcIjtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBMb3ctbGV2ZWwgZmV0Y2ggd3JhcHBlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmludGVyZmFjZSBGZXRjaE9wdGlvbnMgZXh0ZW5kcyBSZXF1ZXN0SW5pdCB7XHJcbiAgLyoqIFNldCB0byBmYWxzZSB0byBzdXBwcmVzcyB0aGUgYXV0b21hdGljIDQwMVx1MjE5MnJlZnJlc2hcdTIxOTJyZXRyeSBsb2dpYy4gKi9cclxuICByZXRyeT86IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb3JlIGZldGNoIGhlbHBlci5cclxuICogLSBBbHdheXMgc2VuZHMgYGNyZWRlbnRpYWxzOiAnaW5jbHVkZSdgIChIdHRwT25seSBjb29raWVzKS5cclxuICogLSBPbiA0MDEsIGF0dGVtcHRzIG9uZSBzaWxlbnQgdG9rZW4gcmVmcmVzaCBhbmQgcmV0cmllcyB0aGUgcmVxdWVzdC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcGlGZXRjaDxUPihwYXRoOiBzdHJpbmcsIG9wdGlvbnM6IEZldGNoT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxUPiB7XHJcbiAgY29uc3QgeyByZXRyeSA9IHRydWUsIC4uLmluaXQgfSA9IG9wdGlvbnM7XHJcblxyXG4gIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcbiAgICAuLi4oaW5pdC5oZWFkZXJzIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pLFxyXG4gIH07XHJcblxyXG4gIGNvbnN0IHJlcXVlc3Q6IFJlcXVlc3RJbml0ID0ge1xyXG4gICAgLi4uaW5pdCxcclxuICAgIGhlYWRlcnMsXHJcbiAgICBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgdXJsID0gYCR7QVBJX0JBU0VfVVJMfSR7cGF0aH1gO1xyXG5cclxuICBsZXQgcmVzcG9uc2U6IFJlc3BvbnNlO1xyXG4gIHRyeSB7XHJcbiAgICByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwgcmVxdWVzdCk7XHJcbiAgfSBjYXRjaCAobmV0d29ya0Vycikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBOZXR3b3JrIGVycm9yOiAke1N0cmluZyhuZXR3b3JrRXJyKX1gKTtcclxuICB9XHJcblxyXG4gIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSAmJiByZXRyeSkge1xyXG4gICAgLy8gVHJ5IHRvIHNpbGVudGx5IHJlZnJlc2ggdGhlIHNlc3Npb25cclxuICAgIGNvbnN0IHJlZnJlc2hlZCA9IGF3YWl0IHRyeVJlZnJlc2hUb2tlbigpO1xyXG4gICAgaWYgKCFyZWZyZXNoZWQpIHtcclxuICAgICAgY29uc3QgZXJyOiBBcGlFcnJvciA9IHsgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkLiBQbGVhc2UgbG9nIGluIGFnYWluLlwiLCBjb2RlOiBcIlNFU1NJT05fRVhQSVJFRFwiIH07XHJcbiAgICAgIHRocm93IGVycjtcclxuICAgIH1cclxuICAgIC8vIE9uZSByZXRyeSBhZnRlciBzdWNjZXNzZnVsIHJlZnJlc2hcclxuICAgIHJldHVybiBhcGlGZXRjaDxUPihwYXRoLCB7IC4uLm9wdGlvbnMsIHJldHJ5OiBmYWxzZSB9KTtcclxuICB9XHJcblxyXG4gIGxldCBkYXRhOiB1bmtub3duO1xyXG4gIHRyeSB7XHJcbiAgICBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZCBhcyB1bmtub3duIGFzIFQ7XHJcbiAgfVxyXG5cclxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICBjb25zdCBzZXJ2ZXJFcnJvciA9IGRhdGEgYXMgeyBlcnJvcj86IHN0cmluZzsgbWVzc2FnZT86IHN0cmluZzsgY29kZT86IHN0cmluZyB9O1xyXG4gICAgY29uc3QgZXJyOiBBcGlFcnJvciA9IHtcclxuICAgICAgZXJyb3I6IHNlcnZlckVycm9yLmVycm9yID8/IHNlcnZlckVycm9yLm1lc3NhZ2UgPz8gYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCxcclxuICAgICAgY29kZTogc2VydmVyRXJyb3IuY29kZSxcclxuICAgIH07XHJcbiAgICB0aHJvdyBlcnI7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGF0YSBhcyBUO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQXV0aCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9naW5QYXlsb2FkIHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHBhc3N3b3JkOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9naW5SZXNwb25zZSB7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIHVzZXI6IHsgaWQ6IHN0cmluZzsgbmFtZTogc3RyaW5nOyByb2xlOiBzdHJpbmcgfTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNZVJlc3BvbnNlIHtcclxuICBfaWQ6IHN0cmluZztcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICByb2xlOiBcImNsaWVudFwiIHwgXCJwcm92aWRlclwiIHwgXCJhZG1pblwiIHwgXCJwZXNvXCI7XHJcbiAgaXNFbWFpbFZlcmlmaWVkOiBib29sZWFuO1xyXG4gIGF2YXRhcjogc3RyaW5nIHwgbnVsbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBPU1QgL2FwaS9hdXRoL2xvZ2luXHJcbiAqIFNldHMgYWNjZXNzX3Rva2VuICsgcmVmcmVzaF90b2tlbiBjb29raWVzIG9uIHN1Y2Nlc3MuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9naW4ocGF5bG9hZDogTG9naW5QYXlsb2FkKTogUHJvbWlzZTxMb2dpblJlc3BvbnNlPiB7XHJcbiAgcmV0dXJuIGFwaUZldGNoPExvZ2luUmVzcG9uc2U+KFwiL2FwaS9hdXRoL2xvZ2luXCIsIHtcclxuICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcclxuICAgIHJldHJ5OiBmYWxzZSwgLy8gbmV2ZXIgcmVmcmVzaCBvbiBhIGxvZ2luIGF0dGVtcHRcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBPU1QgL2FwaS9hdXRoL2xvZ291dFxyXG4gKiBDbGVhcnMgc2Vzc2lvbiBjb29raWVzIHNlcnZlci1zaWRlLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ291dCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBhd2FpdCBhcGlGZXRjaDx7IG1lc3NhZ2U6IHN0cmluZyB9PihcIi9hcGkvYXV0aC9sb2dvdXRcIiwge1xyXG4gICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgIHJldHJ5OiBmYWxzZSxcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdFVCAvYXBpL2F1dGgvbWVcclxuICogUmV0dXJucyB0aGUgYXV0aGVudGljYXRlZCB1c2VyJ3MgcHJvZmlsZSwgb3IgdGhyb3dzIG9uIDQwMS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPE1lUmVzcG9uc2U+IHtcclxuICByZXR1cm4gYXBpRmV0Y2g8TWVSZXNwb25zZT4oXCIvYXBpL2F1dGgvbWVcIiwgeyByZXRyeTogdHJ1ZSB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBPU1QgL2FwaS9hdXRoL3JlZnJlc2hcclxuICogRXhjaGFuZ2VzIHRoZSByZWZyZXNoX3Rva2VuIGNvb2tpZSBmb3IgYSBuZXcgYWNjZXNzX3Rva2VuIGNvb2tpZS5cclxuICogUmV0dXJucyB0cnVlIG9uIHN1Y2Nlc3MsIGZhbHNlIG9uIGZhaWx1cmUuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJ5UmVmcmVzaFRva2VuKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChgJHtBUElfQkFTRV9VUkx9L2FwaS9hdXRoL3JlZnJlc2hgLCB7XHJcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcmVzLm9rO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENhdGVnb3JpZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4vKipcclxuICogR0VUIC9hcGkvY2F0ZWdvcmllc1xyXG4gKiBSZXR1cm5zIGFsbCBhY3RpdmUgc2VydmljZSBjYXRlZ29yaWVzLiBDYWNoZWQgMjQgaCBieSB0aGUgc2VydmVyLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhdGVnb3JpZXMoKTogUHJvbWlzZTxDYXRlZ29yeVtdPiB7XHJcbiAgcmV0dXJuIGFwaUZldGNoPENhdGVnb3J5W10+KFwiL2FwaS9jYXRlZ29yaWVzXCIpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQUkgaGVscGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NpZnlDYXRlZ29yeVBheWxvYWQge1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbiAgYXZhaWxhYmxlQ2F0ZWdvcmllczogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlIHtcclxuICBjYXRlZ29yeTogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpL2NsYXNzaWZ5LWNhdGVnb3J5XHJcbiAqIFVzZXMgR1BULTRvLW1pbmkgdG8gY2xhc3NpZnkgdGhlIGpvYiBpbnRvIG9uZSBvZiB0aGUgcHJvdmlkZWQgY2F0ZWdvcmllcy5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGFzc2lmeUNhdGVnb3J5KFxyXG4gIHBheWxvYWQ6IENsYXNzaWZ5Q2F0ZWdvcnlQYXlsb2FkXHJcbik6IFByb21pc2U8Q2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlPiB7XHJcbiAgcmV0dXJuIGFwaUZldGNoPENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZT4oXCIvYXBpL2FpL2NsYXNzaWZ5LWNhdGVnb3J5XCIsIHtcclxuICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFc3RpbWF0ZUJ1ZGdldFBheWxvYWQge1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgY2F0ZWdvcnk6IHN0cmluZztcclxuICBkZXNjcmlwdGlvbj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFc3RpbWF0ZUJ1ZGdldFJlc3BvbnNlIHtcclxuICBtaW46IG51bWJlcjtcclxuICBtYXg6IG51bWJlcjtcclxuICBtaWRwb2ludDogbnVtYmVyO1xyXG4gIG5vdGU6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIFBPU1QgL2FwaS9haS9lc3RpbWF0ZS1idWRnZXRcclxuICogUmV0dXJucyBhbiBBSS1lc3RpbWF0ZWQgYnVkZ2V0IHJhbmdlLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVzdGltYXRlQnVkZ2V0KFxyXG4gIHBheWxvYWQ6IEVzdGltYXRlQnVkZ2V0UGF5bG9hZFxyXG4pOiBQcm9taXNlPEVzdGltYXRlQnVkZ2V0UmVzcG9uc2U+IHtcclxuICByZXR1cm4gYXBpRmV0Y2g8RXN0aW1hdGVCdWRnZXRSZXNwb25zZT4oXCIvYXBpL2FpL2VzdGltYXRlLWJ1ZGdldFwiLCB7XHJcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVEZXNjcmlwdGlvblBheWxvYWQge1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgY2F0ZWdvcnk/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVEZXNjcmlwdGlvbkFwaVJlc3BvbnNlIHtcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpL2dlbmVyYXRlLWRlc2NyaXB0aW9uXHJcbiAqIEdlbmVyYXRlcyBhIGNsZWFuLCBwcm9mZXNzaW9uYWwgam9iIGRlc2NyaXB0aW9uIGZyb20gYSB0aXRsZSBhbmQgb3B0aW9uYWwgY2F0ZWdvcnkuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVEZXNjcmlwdGlvbihcclxuICBwYXlsb2FkOiBHZW5lcmF0ZURlc2NyaXB0aW9uUGF5bG9hZFxyXG4pOiBQcm9taXNlPEdlbmVyYXRlRGVzY3JpcHRpb25BcGlSZXNwb25zZT4ge1xyXG4gIHJldHVybiBhcGlGZXRjaDxHZW5lcmF0ZURlc2NyaXB0aW9uQXBpUmVzcG9uc2U+KFwiL2FwaS9haS9nZW5lcmF0ZS1kZXNjcmlwdGlvblwiLCB7XHJcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXHJcbiAgfSk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBKb2JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBKb2JJbXBvcnRQYXlsb2FkIHtcclxuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2pvYnNcclxuICogQ3JlYXRlcyBhIG5ldyBqb2IuIFRoZSBjYWxsZXIgaXMgcmVzcG9uc2libGUgZm9yIHBhc3NpbmcgYSB2YWxpZCBjYXRlZ29yeUlkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUpvYihwYXlsb2FkOiBKb2JJbXBvcnRQYXlsb2FkKTogUHJvbWlzZTxMZWFkQ3JlYXRlZFJlc3BvbnNlPiB7XHJcbiAgcmV0dXJuIGFwaUZldGNoPExlYWRDcmVhdGVkUmVzcG9uc2U+KFwiL2FwaS9qb2JzXCIsIHtcclxuICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcclxuICB9KTtcclxufVxyXG4iLCAiLyoqXHJcbiAqIExlYWQgY2xhc3NpZmljYXRpb24gdXRpbGl0aWVzIGZvciBBSSBMZWFkIEVuZ2luZVxyXG4gKiBcclxuICogUmVzcG9uc2liaWxpdGllczpcclxuICogMS4gQ2xhc3NpZnkgc2VydmljZSB0eXBlIGZyb20gcmVxdWVzdCB0ZXh0XHJcbiAqIDIuIEV4dHJhY3QgdXJnZW5jeSBsZXZlbFxyXG4gKiAzLiBFc3RpbWF0ZSBwcmljZSByYW5nZVxyXG4gKiA0LiBFeHRyYWN0IGNvbnRhY3QgaW5mb3JtYXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgdHlwZSB7IExlYWQsIENsYXNzaWZpZWRMZWFkLCBTZXJ2aWNlVHlwZSwgVXJnZW5jeUxldmVsIH0gZnJvbSBcIi4uL3R5cGVzXCI7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgU2VydmljZSB0eXBlIGtleXdvcmRzIG1hcHBpbmcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5jb25zdCBTRVJWSUNFX1RZUEVfS0VZV09SRFM6IFJlY29yZDxTZXJ2aWNlVHlwZSwgc3RyaW5nW10+ID0ge1xyXG4gIHBsdW1iaW5nOiBbXHJcbiAgICBcInBpcGVcIiwgXCJsZWFrXCIsIFwiZHJhaW5cIiwgXCJmYXVjZXRcIiwgXCJ0b2lsZXRcIiwgXCJ3YXRlclwiLFxyXG4gICAgXCJwbHVtYmVyXCIsIFwicGx1bWJpbmdcIiwgXCJzZXdhZ2VcIiwgXCJ0YXBcIiwgXCJzaW5rXCIsIFwic2hvd2VyXCJcclxuICBdLFxyXG4gIGNsZWFuaW5nOiBbXHJcbiAgICBcImNsZWFuXCIsIFwiY2xlYW5pbmdcIiwgXCJjbGVhbmVyXCIsIFwibW9wXCIsIFwic3dlZXBcIiwgXCJ2YWN1dW1cIixcclxuICAgIFwiZHVzdFwiLCBcImxhdW5kcnlcIiwgXCJob3VzZWtlZXBpbmdcIiwgXCJzdXJmYWNlXCIsIFwic2FuaXRpemVcIlxyXG4gIF0sXHJcbiAgcmVwYWlyOiBbXHJcbiAgICBcInJlcGFpclwiLCBcImZpeFwiLCBcImJyb2tlblwiLCBcIm1haW50ZW5hbmNlXCIsIFwic2VydmljZVwiLCBcImlzc3VlXCIsXHJcbiAgICBcImRhbWFnZVwiLCBcInByb2JsZW1cIiwgXCJpbnN0YWxsXCIsIFwicmVwbGFjZW1lbnRcIlxyXG4gIF0sXHJcbiAgZWxlY3RyaWNhbDogW1xyXG4gICAgXCJlbGVjdHJpY2FsXCIsIFwid2lyZVwiLCBcImNpcmN1aXRcIiwgXCJsaWdodFwiLCBcInBvd2VyXCIsIFwib3V0bGV0XCIsXHJcbiAgICBcInBsdWdcIiwgXCJicmVha2VyXCIsIFwiZWxlY3RyaWNcIiwgXCJ2b2x0YWdlXCIsIFwiZWxlY3RyaWNpYW5cIlxyXG4gIF0sXHJcbiAgaHZhYzogW1xyXG4gICAgXCJodmFjXCIsIFwiYWlyIGNvbmRpdGlvbmluZ1wiLCBcImFjXCIsIFwiaGVhdGluZ1wiLCBcImNvb2xcIiwgXCJmdXJuYWNlXCIsXHJcbiAgICBcInRoZXJtb3N0YXRcIiwgXCJ0ZW1wZXJhdHVyZVwiLCBcImR1Y3RcIiwgXCJ2ZW50aWxhdGlvblwiXHJcbiAgXSxcclxuICBsYW5kc2NhcGluZzogW1xyXG4gICAgXCJsYXduXCIsIFwiZ2FyZGVuXCIsIFwibGFuZHNjYXBlXCIsIFwiZ3Jhc3NcIiwgXCJtb3dpbmdcIiwgXCJ0cmVlXCIsXHJcbiAgICBcInNocnViXCIsIFwicGxhbnRcIiwgXCJ5YXJkXCIsIFwib3V0ZG9vclwiLCBcInRyaW1taW5nXCJcclxuICBdLFxyXG4gIHBhaW50aW5nOiBbXHJcbiAgICBcInBhaW50XCIsIFwicGFpbnRpbmdcIiwgXCJwYWludGVyXCIsIFwiY29sb3JcIiwgXCJ3YWxsXCIsIFwiaW50ZXJpb3JcIixcclxuICAgIFwiZXh0ZXJpb3JcIiwgXCJicnVzaGluZ1wiLCBcImNvYXRcIiwgXCJwcmltZXJcIlxyXG4gIF0sXHJcbiAgY2FycGVudHJ5OiBbXHJcbiAgICBcImNhcnBlbnRlclwiLCBcIndvb2RcIiwgXCJjYWJpbmV0XCIsIFwiZG9vclwiLCBcImZyYW1lXCIsIFwiZmxvb3JpbmdcIixcclxuICAgIFwiZGVja1wiLCBcImpvaXN0XCIsIFwiY2FycGVudHJ5XCIsIFwid29vZHdvcmtcIiwgXCJpbnN0YWxsXCJcclxuICBdLFxyXG4gIHJvb2Zpbmc6IFtcclxuICAgIFwicm9vZlwiLCBcInJvb2ZpbmdcIiwgXCJzaGluZ2xlXCIsIFwibGVha1wiLCBcImd1dHRlclwiLCBcInRpbGVcIixcclxuICAgIFwic3RydWN0dXJlXCIsIFwicm9vZmVyXCIsIFwid2VhdGhlcnByb29maW5nXCJcclxuICBdLFxyXG4gIG90aGVyOiBbXCJzZXJ2aWNlXCIsIFwid29ya1wiLCBcImhlbHBcIiwgXCJuZWVkXCJdXHJcbn07XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgVXJnZW5jeSBsZXZlbCBpbmRpY2F0b3JzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuY29uc3QgVVJHRU5DWV9JTkRJQ0FUT1JTOiBSZWNvcmQ8VXJnZW5jeUxldmVsLCBzdHJpbmdbXT4gPSB7XHJcbiAgXCJzYW1lLWRheVwiOiBbXHJcbiAgICBcInVyZ2VudFwiLCBcImFzYXBcIiwgXCJ0b2RheVwiLCBcImVtZXJnZW5jeVwiLCBcImltbWVkaWF0ZWx5XCIsXHJcbiAgICBcInJpZ2h0IG5vd1wiLCBcIm5vd1wiLCBcImNhbm5vdCB3YWl0XCIsIFwidXJnZW50XCIsIFwiY3JpdGljYWxcIlxyXG4gIF0sXHJcbiAgdXJnZW50OiBbXHJcbiAgICBcInVyZ2VudFwiLCBcInNvb25cIiwgXCJ0b21vcnJvd1wiLCBcIm5leHQgZGF5XCIsIFwicXVpY2tseVwiLFxyXG4gICAgXCJodXJyeVwiLCBcInJ1c2hcIiwgXCJpbXBvcnRhbnRcIlxyXG4gIF0sXHJcbiAgaGlnaDogW1xyXG4gICAgXCJuZWVkIHNvb25cIiwgXCJ0aGlzIHdlZWtcIiwgXCJwcmlvcml0eVwiLCBcInF1aWNrXCIsIFwiZmFzdFwiLFxyXG4gICAgXCJ0aWdodFwiLCBcImRlYWRsaW5lXCJcclxuICBdLFxyXG4gIG1lZGl1bTogW1xyXG4gICAgXCJmbGV4aWJsZVwiLCBcIndoZW5ldmVyXCIsIFwibmV4dCB3ZWVrXCIsIFwiY2FuIHNjaGVkdWxlXCIsXHJcbiAgICBcImFueXRpbWVcIiwgXCJzb29uXCJcclxuICBdLFxyXG4gIGxvdzogW1xyXG4gICAgXCJubyBydXNoXCIsIFwid2hlbiBhdmFpbGFibGVcIiwgXCJmbGV4aWJsZVwiLCBcIndoZW5ldmVyXCIsXHJcbiAgICBcImxvdyBwcmlvcml0eVwiLCBcImZ1dHVyZVwiXHJcbiAgXVxyXG59O1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEJ1ZGdldCByYW5nZSBlc3RpbWF0aW9ucyBieSBzZXJ2aWNlIHR5cGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5jb25zdCBERUZBVUxUX0JVREdFVF9SQU5HRVM6IFJlY29yZDxTZXJ2aWNlVHlwZSwgeyBtaW46IG51bWJlcjsgbWF4OiBudW1iZXIgfT4gPSB7XHJcbiAgcGx1bWJpbmc6IHsgbWluOiA1MCwgbWF4OiA1MDAgfSxcclxuICBjbGVhbmluZzogeyBtaW46IDMwLCBtYXg6IDIwMCB9LFxyXG4gIHJlcGFpcjogeyBtaW46IDQwLCBtYXg6IDMwMCB9LFxyXG4gIGVsZWN0cmljYWw6IHsgbWluOiA2MCwgbWF4OiA0MDAgfSxcclxuICBodmFjOiB7IG1pbjogMTAwLCBtYXg6IDEwMDAgfSxcclxuICBsYW5kc2NhcGluZzogeyBtaW46IDUwLCBtYXg6IDUwMCB9LFxyXG4gIHBhaW50aW5nOiB7IG1pbjogMTAwLCBtYXg6IDgwMCB9LFxyXG4gIGNhcnBlbnRyeTogeyBtaW46IDgwLCBtYXg6IDYwMCB9LFxyXG4gIHJvb2Zpbmc6IHsgbWluOiAyMDAsIG1heDogMjAwMCB9LFxyXG4gIG90aGVyOiB7IG1pbjogNTAsIG1heDogNTAwIH1cclxufTtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBCdWRnZXQgZXh0cmFjdGlvbiBmcm9tIHRleHQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBleHRyYWN0QnVkZ2V0RnJvbVRleHQodGV4dDogc3RyaW5nKTogeyBtaW46IG51bWJlcjsgbWF4OiBudW1iZXIgfSB8IG51bGwge1xyXG4gIC8vIE1hdGNoIHBhdHRlcm5zIGxpa2U6IFwiJDEwMFwiLCBcIiQxMDAtMjAwXCIsIFwiMTAwLTIwMFwiLCBcImJ1ZGdldDogMTAwXCJcclxuICBjb25zdCBwYXR0ZXJucyA9IFtcclxuICAgIC8oPzpcXCR8YnVkZ2V0WzpcXHNdKik/KFxcZCspXFxzKi1cXHMqKFxcZCspL2dpLCAgICAgLy8gMTAwLTIwMCBvciAkMTAwLTIwMFxyXG4gICAgLyg/OlxcJHxidWRnZXRbOlxcc10qKShcXGQrKVxccyooPzpwZXJ8XFwvfGhvdXJ8aG91cnMpPy9naSwgLy8gJDEwMCBvciAkMTAwL2hvdXJcclxuICAgIC8oPzpjb3N0cz9cXHMqKD86YXJvdW5kfGFib3V0fGFwcHJveHx+KT9cXHMqKT8oPzpcXCQpPyhcXGQrKS9naSAvLyBjb3N0cyBhcm91bmQgJDEwMFxyXG4gIF07XHJcblxyXG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xyXG4gICAgY29uc3QgbWF0Y2hlcyA9IHRleHQubWF0Y2hBbGwocGF0dGVybik7XHJcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIG1hdGNoZXMpIHtcclxuICAgICAgaWYgKG1hdGNoWzJdKSB7XHJcbiAgICAgICAgLy8gUmFuZ2UgcGF0dGVyblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBtaW46IHBhcnNlSW50KG1hdGNoWzFdLCAxMCksXHJcbiAgICAgICAgICBtYXg6IHBhcnNlSW50KG1hdGNoWzJdLCAxMClcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2UgaWYgKG1hdGNoWzFdKSB7XHJcbiAgICAgICAgLy8gU2luZ2xlIHZhbHVlIHBhdHRlcm5cclxuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XHJcbiAgICAgICAgLy8gQXNzdW1lIGl0J3MgYSByb3VnaCBlc3RpbWF0ZSBhbmQgcHJvdmlkZSBhIHJhbmdlXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIG1pbjogTWF0aC5tYXgoMTAsIHZhbHVlIC0gTWF0aC5mbG9vcih2YWx1ZSAqIDAuMikpLFxyXG4gICAgICAgICAgbWF4OiB2YWx1ZSArIE1hdGguZmxvb3IodmFsdWUgKiAwLjMpXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBTZXJ2aWNlIHR5cGUgY2xhc3NpZmljYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5mdW5jdGlvbiBjbGFzc2lmeVNlcnZpY2VUeXBlKHRpdGxlOiBzdHJpbmcsIGRlc2NyaXB0aW9uOiBzdHJpbmcpOiB7XHJcbiAgc2VydmljZV90eXBlOiBTZXJ2aWNlVHlwZTtcclxuICBjb25maWRlbmNlOiBudW1iZXI7XHJcbn0ge1xyXG4gIGNvbnN0IHRleHQgPSBgJHt0aXRsZX0gJHtkZXNjcmlwdGlvbn1gLnRvTG93ZXJDYXNlKCk7XHJcbiAgY29uc3Qgc2NvcmVzOiBSZWNvcmQ8U2VydmljZVR5cGUsIG51bWJlcj4gPSB7XHJcbiAgICBwbHVtYmluZzogMCxcclxuICAgIGNsZWFuaW5nOiAwLFxyXG4gICAgcmVwYWlyOiAwLFxyXG4gICAgZWxlY3RyaWNhbDogMCxcclxuICAgIGh2YWM6IDAsXHJcbiAgICBsYW5kc2NhcGluZzogMCxcclxuICAgIHBhaW50aW5nOiAwLFxyXG4gICAgY2FycGVudHJ5OiAwLFxyXG4gICAgcm9vZmluZzogMCxcclxuICAgIG90aGVyOiAwXHJcbiAgfTtcclxuXHJcbiAgLy8gU2NvcmUgZWFjaCBzZXJ2aWNlIHR5cGUgYmFzZWQgb24ga2V5d29yZCBtYXRjaGVzXHJcbiAgZm9yIChjb25zdCBbc2VydmljZVR5cGUsIGtleXdvcmRzXSBvZiBPYmplY3QuZW50cmllcyhTRVJWSUNFX1RZUEVfS0VZV09SRFMpKSB7XHJcbiAgICBmb3IgKGNvbnN0IGtleXdvcmQgb2Yga2V5d29yZHMpIHtcclxuICAgICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBcXFxcYiR7a2V5d29yZH1cXFxcYmAsIFwiZ2lcIik7XHJcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSB0ZXh0Lm1hdGNoKHJlZ2V4KTtcclxuICAgICAgaWYgKG1hdGNoZXMpIHtcclxuICAgICAgICBzY29yZXNbc2VydmljZVR5cGUgYXMgU2VydmljZVR5cGVdICs9IG1hdGNoZXMubGVuZ3RoO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBGaW5kIHRoZSBoaWdoZXN0IHNjb3JlZCBzZXJ2aWNlIHR5cGVcclxuICBjb25zdCBiZXN0TWF0Y2ggPSBPYmplY3QuZW50cmllcyhzY29yZXMpLnJlZHVjZSgocHJldiwgY3VycmVudCkgPT5cclxuICAgIHByZXZbMV0gPiBjdXJyZW50WzFdID8gcHJldiA6IGN1cnJlbnRcclxuICApO1xyXG5cclxuICBjb25zdCBbc2VydmljZV90eXBlLCBzY29yZV0gPSBiZXN0TWF0Y2ggYXMgW1NlcnZpY2VUeXBlLCBudW1iZXJdO1xyXG4gIGNvbnN0IHRvdGFsV29yZHMgPSB0ZXh0LnNwbGl0KC9cXHMrLykubGVuZ3RoO1xyXG4gIGNvbnN0IGNvbmZpZGVuY2UgPSBNYXRoLm1pbigxMDAsIChzY29yZSAvIHRvdGFsV29yZHMpICogMTAwKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNlcnZpY2VfdHlwZSxcclxuICAgIGNvbmZpZGVuY2U6IE1hdGgucm91bmQoY29uZmlkZW5jZSkgLyAxMDBcclxuICB9O1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgVXJnZW5jeSBleHRyYWN0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFVyZ2VuY3kodGl0bGU6IHN0cmluZywgZGVzY3JpcHRpb246IHN0cmluZyk6IHtcclxuICB1cmdlbmN5OiBVcmdlbmN5TGV2ZWw7XHJcbiAgY29uZmlkZW5jZTogbnVtYmVyO1xyXG59IHtcclxuICBjb25zdCB0ZXh0ID0gYCR7dGl0bGV9ICR7ZGVzY3JpcHRpb259YC50b0xvd2VyQ2FzZSgpO1xyXG4gIGNvbnN0IHNjb3JlczogUmVjb3JkPFVyZ2VuY3lMZXZlbCwgbnVtYmVyPiA9IHtcclxuICAgIFwic2FtZS1kYXlcIjogMCxcclxuICAgIHVyZ2VudDogMCxcclxuICAgIGhpZ2g6IDAsXHJcbiAgICBtZWRpdW06IDAsXHJcbiAgICBsb3c6IDBcclxuICB9O1xyXG5cclxuICAvLyBTY29yZSBlYWNoIHVyZ2VuY3kgbGV2ZWxcclxuICBmb3IgKGNvbnN0IFt1cmdlbmN5LCBrZXl3b3Jkc10gb2YgT2JqZWN0LmVudHJpZXMoVVJHRU5DWV9JTkRJQ0FUT1JTKSkge1xyXG4gICAgZm9yIChjb25zdCBrZXl3b3JkIG9mIGtleXdvcmRzKSB7XHJcbiAgICAgIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXFxcXGIke2tleXdvcmR9XFxcXGJgLCBcImdpXCIpO1xyXG4gICAgICBjb25zdCBtYXRjaGVzID0gdGV4dC5tYXRjaChyZWdleCk7XHJcbiAgICAgIGlmIChtYXRjaGVzKSB7XHJcbiAgICAgICAgc2NvcmVzW3VyZ2VuY3kgYXMgVXJnZW5jeUxldmVsXSArPSBtYXRjaGVzLmxlbmd0aDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gUHJpb3JpdHk6IHNhbWUtZGF5ID4gdXJnZW50ID4gaGlnaCA+IG1lZGl1bSA+IGxvd1xyXG4gIGNvbnN0IHByaW9yaXRpZXM6IFVyZ2VuY3lMZXZlbFtdID0gW1wic2FtZS1kYXlcIiwgXCJ1cmdlbnRcIiwgXCJoaWdoXCIsIFwibWVkaXVtXCIsIFwibG93XCJdO1xyXG4gIGZvciAoY29uc3QgdXJnZW5jeSBvZiBwcmlvcml0aWVzKSB7XHJcbiAgICBpZiAoc2NvcmVzW3VyZ2VuY3ldID4gMCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHVyZ2VuY3ksXHJcbiAgICAgICAgY29uZmlkZW5jZTogTWF0aC5taW4oMSwgc2NvcmVzW3VyZ2VuY3ldIC8gMTApXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBEZWZhdWx0IHRvIG1lZGl1bSBpZiBubyBpbmRpY2F0b3JzIGZvdW5kXHJcbiAgcmV0dXJuIHsgdXJnZW5jeTogXCJtZWRpdW1cIiwgY29uZmlkZW5jZTogMC41IH07XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBNYWluIGNsYXNzaWZpY2F0aW9uIGZ1bmN0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5TGVhZChsZWFkOiBMZWFkKTogQ2xhc3NpZmllZExlYWQge1xyXG4gIGNvbnN0IHsgc2VydmljZV90eXBlLCBjb25maWRlbmNlOiBzZXJ2aWNlQ29uZmlkZW5jZSB9ID0gY2xhc3NpZnlTZXJ2aWNlVHlwZShcclxuICAgIGxlYWQudGl0bGUsXHJcbiAgICBsZWFkLmRlc2NyaXB0aW9uXHJcbiAgKTtcclxuXHJcbiAgY29uc3QgeyB1cmdlbmN5LCBjb25maWRlbmNlOiB1cmdlbmN5Q29uZmlkZW5jZSB9ID0gZXh0cmFjdFVyZ2VuY3koXHJcbiAgICBsZWFkLnRpdGxlLFxyXG4gICAgbGVhZC5kZXNjcmlwdGlvblxyXG4gICk7XHJcblxyXG4gIC8vIEV4dHJhY3QgYnVkZ2V0IGZyb20gdGV4dCBvciB1c2UgZGVmYXVsdCByYW5nZVxyXG4gIGNvbnN0IGV4dHJhY3RlZEJ1ZGdldCA9IGV4dHJhY3RCdWRnZXRGcm9tVGV4dChsZWFkLmRlc2NyaXB0aW9uKTtcclxuICBjb25zdCBidWRnZXRSYW5nZSA9IGV4dHJhY3RlZEJ1ZGdldCB8fCBERUZBVUxUX0JVREdFVF9SQU5HRVNbc2VydmljZV90eXBlXTtcclxuXHJcbiAgLy8gQ2FsY3VsYXRlIG92ZXJhbGwgY29uZmlkZW5jZVxyXG4gIGNvbnN0IG1hdGNoQ29uZmlkZW5jZSA9IChzZXJ2aWNlQ29uZmlkZW5jZSArIHVyZ2VuY3lDb25maWRlbmNlKSAvIDI7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICAuLi5sZWFkLFxyXG4gICAgc2VydmljZV90eXBlLFxyXG4gICAgdXJnZW5jeSxcclxuICAgIGVzdGltYXRlZF9idWRnZXQ6IHtcclxuICAgICAgbWluOiBidWRnZXRSYW5nZS5taW4sXHJcbiAgICAgIG1heDogYnVkZ2V0UmFuZ2UubWF4LFxyXG4gICAgICBjdXJyZW5jeTogbGVhZC5lc3RpbWF0ZWRfYnVkZ2V0Py5jdXJyZW5jeSB8fCBcIlVTRFwiXHJcbiAgICB9LFxyXG4gICAgbWF0Y2hfY29uZmlkZW5jZTogbWF0Y2hDb25maWRlbmNlLFxyXG4gICAgY2xhc3NpZmljYXRpb25fYW5hbHlzaXM6IGBDbGFzc2lmaWVkIGFzICR7c2VydmljZV90eXBlfSAoJHtNYXRoLnJvdW5kKFxyXG4gICAgICBzZXJ2aWNlQ29uZmlkZW5jZSAqIDEwMFxyXG4gICAgKX0lIGNvbmZpZGVuY2UpIHdpdGggJHt1cmdlbmN5fSB1cmdlbmN5LiBFc3RpbWF0ZWQgYnVkZ2V0OiAkJHtidWRnZXRSYW5nZS5taW59LSR7YnVkZ2V0UmFuZ2UubWF4fS5gXHJcbiAgfTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFByb3ZpZGVyIG1hdGNoaW5nIHNjb3JpbmcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlUHJvdmlkZXJNYXRjaFNjb3JlKFxyXG4gIGxlYWQ6IENsYXNzaWZpZWRMZWFkLFxyXG4gIHByb3ZpZGVyU2VydmljZVR5cGVzOiBTZXJ2aWNlVHlwZVtdLFxyXG4gIHByb3ZpZGVyTG9jYXRpb24/OiBzdHJpbmdcclxuKTogbnVtYmVyIHtcclxuICBsZXQgc2NvcmUgPSAwO1xyXG5cclxuICAvLyBTZXJ2aWNlIHR5cGUgbWF0Y2ggKDYwJSB3ZWlnaHQpXHJcbiAgaWYgKHByb3ZpZGVyU2VydmljZVR5cGVzLmluY2x1ZGVzKGxlYWQuc2VydmljZV90eXBlKSkge1xyXG4gICAgc2NvcmUgKz0gNjA7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIFBhcnRpYWwgY3JlZGl0IGZvciByZWxhdGVkIHNlcnZpY2VzXHJcbiAgICBzY29yZSArPSAyMDtcclxuICB9XHJcblxyXG4gIC8vIExvY2F0aW9uIG1hdGNoICgyMCUgd2VpZ2h0KVxyXG4gIGlmIChwcm92aWRlckxvY2F0aW9uICYmIGxlYWQubG9jYXRpb24pIHtcclxuICAgIGNvbnN0IGxlYWRDaXR5ID0gbGVhZC5sb2NhdGlvbi5zcGxpdChcIixcIilbMF0udG9Mb3dlckNhc2UoKTtcclxuICAgIGNvbnN0IHByb3ZpZGVyQ2l0eSA9IHByb3ZpZGVyTG9jYXRpb24uc3BsaXQoXCIsXCIpWzBdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAobGVhZENpdHkgPT09IHByb3ZpZGVyQ2l0eSB8fCBsZWFkQ2l0eS5pbmNsdWRlcyhwcm92aWRlckNpdHkpKSB7XHJcbiAgICAgIHNjb3JlICs9IDIwO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gVXJnZW5jeSBtYXRjaCAoMjAlIHdlaWdodClcclxuICAvLyBQcm92aWRlcnMgd2l0aCByZWNlbnQgYWN0aXZpdHkgYXJlIGJldHRlciBmb3IgdXJnZW50IGxlYWRzXHJcbiAgaWYgKGxlYWQudXJnZW5jeSA9PT0gXCJzYW1lLWRheVwiIHx8IGxlYWQudXJnZW5jeSA9PT0gXCJ1cmdlbnRcIikge1xyXG4gICAgLy8gVGhpcyB3b3VsZCByZXF1aXJlIHByb3ZpZGVyIGF2YWlsYWJpbGl0eSBkYXRhXHJcbiAgICBzY29yZSArPSAxMDsgLy8gRGVmYXVsdCBwYXJ0aWFsIHNjb3JlXHJcbiAgfSBlbHNlIHtcclxuICAgIHNjb3JlICs9IDIwO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIE1hdGgubWluKDEwMCwgc2NvcmUpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgTGVhZCB2YWxpZGF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRMZWFkKGxlYWQ6IExlYWQpOiB7IHZhbGlkOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9IHtcclxuICBpZiAoIWxlYWQudGl0bGU/LnRyaW0oKSkge1xyXG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogXCJUaXRsZSBpcyByZXF1aXJlZFwiIH07XHJcbiAgfVxyXG5cclxuICBpZiAoIWxlYWQuZGVzY3JpcHRpb24/LnRyaW0oKSkge1xyXG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogXCJEZXNjcmlwdGlvbiBpcyByZXF1aXJlZFwiIH07XHJcbiAgfVxyXG5cclxuICBpZiAoIWxlYWQubG9jYXRpb24/LnRyaW0oKSkge1xyXG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogXCJMb2NhdGlvbiBpcyByZXF1aXJlZFwiIH07XHJcbiAgfVxyXG5cclxuICBpZiAoIWxlYWQuc291cmNlKSB7XHJcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIGVycm9yOiBcIlNvdXJjZSBwbGF0Zm9ybSBpcyByZXF1aXJlZFwiIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4geyB2YWxpZDogdHJ1ZSB9O1xyXG59XHJcbiIsICIvKipcclxuICogQmFja2dyb3VuZCBzZXJ2aWNlIHdvcmtlciAoTWFuaWZlc3QgVjMpLlxyXG4gKlxyXG4gKiBSZXNwb25zaWJpbGl0aWVzOlxyXG4gKiAgMS4gTE9HSU4gLyBMT0dPVVQgLyBHRVRfQVVUSF9TVEFUVVNcclxuICogIDIuIENMQVNTSUZZX0xFQUQ6IENsYXNzaWZ5IHNlcnZpY2UgdHlwZSwgdXJnZW5jeSwgYW5kIGJ1ZGdldFxyXG4gKiAgMy4gTUFUQ0hfUFJPVklERVJTOiBNYXRjaCBsZWFkcyB0byBzZXJ2aWNlIHByb3ZpZGVyc1xyXG4gKiAgNC4gQ0FQVFVSRV9MRUFEOiBTYXZlIGNsYXNzaWZpZWQgbGVhZCB0byBzeXN0ZW1cclxuICogIDUuIEdFVF9MRUFEX0hJU1RPUlkgLyBHRVRfTEVBRF9TVEFUUyBmcm9tIGNocm9tZS5zdG9yYWdlLmxvY2FsXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuICBsb2dpbixcclxuICBsb2dvdXQsXHJcbiAgZ2V0Q3VycmVudFVzZXIsXHJcbiAgZ2V0Q2F0ZWdvcmllcyxcclxuICBjbGFzc2lmeUNhdGVnb3J5LFxyXG4gIGVzdGltYXRlQnVkZ2V0LFxyXG4gIGdlbmVyYXRlRGVzY3JpcHRpb24sXHJcbiAgY3JlYXRlSm9iLFxyXG4gIEFQSV9CQVNFX1VSTCxcclxufSBmcm9tIFwiLi91dGlscy9hcGlcIjtcclxuaW1wb3J0IHsgY2xhc3NpZnlMZWFkIH0gZnJvbSBcIi4vdXRpbHMvbGVhZENsYXNzaWZpZXJcIjtcclxuaW1wb3J0IHR5cGUge1xyXG4gIEV4dGVuc2lvbk1lc3NhZ2UsXHJcbiAgQ2F0ZWdvcnksXHJcbiAgSW1wb3J0Sm9iUmVzcG9uc2UsXHJcbiAgQXV0aFN0YXR1c1Jlc3BvbnNlLFxyXG4gIExvZ2luUmVzcG9uc2UsXHJcbiAgR2V0Q2F0ZWdvcmllc1Jlc3BvbnNlLFxyXG4gIENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZSxcclxuICBFc3RpbWF0ZUJ1ZGdldFJlc3BvbnNlLFxyXG4gIEdlbmVyYXRlRGVzY3JpcHRpb25SZXNwb25zZSxcclxuICBHZXRJbXBvcnRIaXN0b3J5UmVzcG9uc2UsXHJcbiAgR2V0TGVhZEhpc3RvcnlSZXNwb25zZSxcclxuICBHZXRJbXBvcnRTdGF0c1Jlc3BvbnNlLFxyXG4gIEdldExlYWRTdGF0c1Jlc3BvbnNlLFxyXG4gIENsYXNzaWZ5TGVhZFJlc3BvbnNlLFxyXG4gIE1hdGNoUHJvdmlkZXJzUmVzcG9uc2UsXHJcbiAgSm9iSW1wb3J0UGF5bG9hZCxcclxuICBMZWFkQ2FwdHVyZVBheWxvYWQsXHJcbiAgSW1wb3J0SGlzdG9yeUl0ZW0sXHJcbiAgTGVhZEhpc3RvcnlJdGVtLFxyXG4gIExlYWQsXHJcbiAgQ2xhc3NpZmllZExlYWQsXHJcbn0gZnJvbSBcIi4vdHlwZXNcIjtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBDYXRlZ29yeSBjYWNoZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmludGVyZmFjZSBDYXRlZ29yeUNhY2hlIHtcclxuICBjYXRlZ29yaWVzOiBDYXRlZ29yeVtdO1xyXG4gIGZldGNoZWRBdDogbnVtYmVyO1xyXG59XHJcblxyXG5jb25zdCBDQVRFR09SWV9DQUNIRV9UVEwgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xyXG5sZXQgY2F0ZWdvcnlDYWNoZTogQ2F0ZWdvcnlDYWNoZSB8IG51bGwgPSBudWxsO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0Q2FjaGVkQ2F0ZWdvcmllcygpOiBQcm9taXNlPENhdGVnb3J5W10+IHtcclxuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gIGlmIChjYXRlZ29yeUNhY2hlICYmIG5vdyAtIGNhdGVnb3J5Q2FjaGUuZmV0Y2hlZEF0IDwgQ0FURUdPUllfQ0FDSEVfVFRMKSB7XHJcbiAgICByZXR1cm4gY2F0ZWdvcnlDYWNoZS5jYXRlZ29yaWVzO1xyXG4gIH1cclxuICB0cnkge1xyXG4gICAgY29uc3QgY2F0cyA9IGF3YWl0IGdldENhdGVnb3JpZXMoKTtcclxuICAgIGNhdGVnb3J5Q2FjaGUgPSB7IGNhdGVnb3JpZXM6IGNhdHMsIGZldGNoZWRBdDogbm93IH07XHJcbiAgICByZXR1cm4gY2F0cztcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiBjYXRlZ29yeUNhY2hlPy5jYXRlZ29yaWVzID8/IFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEltcG9ydCBoaXN0b3J5ICYgYmFkZ2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5jb25zdCBISVNUT1JZX0tFWSAgID0gXCJpbXBvcnRfaGlzdG9yeVwiO1xyXG5jb25zdCBMRUFEX0hJU1RPUllfS0VZID0gXCJsZWFkX2hpc3RvcnlcIjtcclxuY29uc3QgTUFYX0hJU1RPUlkgICA9IDUwO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gc2F2ZUltcG9ydFJlY29yZChpdGVtOiBJbXBvcnRIaXN0b3J5SXRlbSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzdG9yZWQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoSElTVE9SWV9LRVkpO1xyXG4gICAgY29uc3QgaGlzdG9yeTogSW1wb3J0SGlzdG9yeUl0ZW1bXSA9IChzdG9yZWRbSElTVE9SWV9LRVldIGFzIEltcG9ydEhpc3RvcnlJdGVtW10pID8/IFtdO1xyXG4gICAgaGlzdG9yeS51bnNoaWZ0KGl0ZW0pO1xyXG4gICAgaWYgKGhpc3RvcnkubGVuZ3RoID4gTUFYX0hJU1RPUlkpIGhpc3Rvcnkuc3BsaWNlKE1BWF9ISVNUT1JZKTtcclxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtISVNUT1JZX0tFWV06IGhpc3RvcnkgfSk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBOb24tZmF0YWxcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEltcG9ydEhpc3RvcnkoKTogUHJvbWlzZTxJbXBvcnRIaXN0b3J5SXRlbVtdPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChISVNUT1JZX0tFWSk7XHJcbiAgICByZXR1cm4gKHN0b3JlZFtISVNUT1JZX0tFWV0gYXMgSW1wb3J0SGlzdG9yeUl0ZW1bXSkgPz8gW107XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgTGVhZCBoaXN0b3J5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc2F2ZUxlYWRSZWNvcmQoaXRlbTogTGVhZEhpc3RvcnlJdGVtKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChMRUFEX0hJU1RPUllfS0VZKTtcclxuICAgIGNvbnN0IGhpc3Rvcnk6IExlYWRIaXN0b3J5SXRlbVtdID0gKHN0b3JlZFtMRUFEX0hJU1RPUllfS0VZXSBhcyBMZWFkSGlzdG9yeUl0ZW1bXSkgPz8gW107XHJcbiAgICBoaXN0b3J5LnVuc2hpZnQoaXRlbSk7XHJcbiAgICBpZiAoaGlzdG9yeS5sZW5ndGggPiBNQVhfSElTVE9SWSkgaGlzdG9yeS5zcGxpY2UoTUFYX0hJU1RPUlkpO1xyXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW0xFQURfSElTVE9SWV9LRVldOiBoaXN0b3J5IH0pO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gTm9uLWZhdGFsXHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBnZXRMZWFkSGlzdG9yeSgpOiBQcm9taXNlPExlYWRIaXN0b3J5SXRlbVtdPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChMRUFEX0hJU1RPUllfS0VZKTtcclxuICAgIHJldHVybiAoc3RvcmVkW0xFQURfSElTVE9SWV9LRVldIGFzIExlYWRIaXN0b3J5SXRlbVtdKSA/PyBbXTtcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUJhZGdlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBoaXN0b3J5ID0gYXdhaXQgZ2V0SW1wb3J0SGlzdG9yeSgpO1xyXG4gICAgY29uc3QgdG9kYXlTdGFydCA9IG5ldyBEYXRlKCk7XHJcbiAgICB0b2RheVN0YXJ0LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG4gICAgY29uc3QgdG9kYXlDb3VudCA9IGhpc3RvcnkuZmlsdGVyKFxyXG4gICAgICAoaCkgPT4gbmV3IERhdGUoaC5pbXBvcnRlZEF0KSA+PSB0b2RheVN0YXJ0XHJcbiAgICApLmxlbmd0aDtcclxuXHJcbiAgICBhd2FpdCBjaHJvbWUuYWN0aW9uLnNldEJhZGdlVGV4dCh7IHRleHQ6IHRvZGF5Q291bnQgPiAwID8gU3RyaW5nKHRvZGF5Q291bnQpIDogXCJcIiB9KTtcclxuICAgIGF3YWl0IGNocm9tZS5hY3Rpb24uc2V0QmFkZ2VCYWNrZ3JvdW5kQ29sb3IoeyBjb2xvcjogXCIjMWE1NmRiXCIgfSk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBzZXRCYWRnZVRleHQgbWF5IG5vdCBiZSBhdmFpbGFibGUgaW4gYWxsIGNvbnRleHRzXHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgTWFpbiBtZXNzYWdlIGxpc3RlbmVyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKFxyXG4gIChcclxuICAgIG1lc3NhZ2U6IEV4dGVuc2lvbk1lc3NhZ2UsXHJcbiAgICBfc2VuZGVyOiBjaHJvbWUucnVudGltZS5NZXNzYWdlU2VuZGVyLFxyXG4gICAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWRcclxuICApID0+IHtcclxuICAgIGhhbmRsZU1lc3NhZ2UobWVzc2FnZSwgc2VuZFJlc3BvbnNlKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuKTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1lc3NhZ2UoXHJcbiAgbWVzc2FnZTogRXh0ZW5zaW9uTWVzc2FnZSxcclxuICBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogdW5rbm93bikgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xyXG4gICAgY2FzZSBcIkxPR0lOXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUxvZ2luKG1lc3NhZ2UuZW1haWwsIG1lc3NhZ2UucGFzc3dvcmQsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkxPR09VVFwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVMb2dvdXQoc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiR0VUX0FVVEhfU1RBVFVTXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUdldEF1dGhTdGF0dXMoc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiR0VUX0NBVEVHT1JJRVNcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlR2V0Q2F0ZWdvcmllcyhzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJDTEFTU0lGWV9DQVRFR09SWVwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVDbGFzc2lmeUNhdGVnb3J5KG1lc3NhZ2UudGl0bGUsIG1lc3NhZ2UuZGVzY3JpcHRpb24sIG1lc3NhZ2UuYXZhaWxhYmxlQ2F0ZWdvcmllcywgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiQ0xBU1NJRllfTEVBRFwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVDbGFzc2lmeUxlYWQobWVzc2FnZS50aXRsZSwgbWVzc2FnZS5kZXNjcmlwdGlvbiwgbWVzc2FnZS5sb2NhdGlvbiwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiTUFUQ0hfUFJPVklERVJTXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZU1hdGNoUHJvdmlkZXJzKG1lc3NhZ2UubGVhZCwgbWVzc2FnZS5saW1pdCwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiRVNUSU1BVEVfQlVER0VUXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUVzdGltYXRlQnVkZ2V0KG1lc3NhZ2UudGl0bGUsIG1lc3NhZ2UuY2F0ZWdvcnksIG1lc3NhZ2UuZGVzY3JpcHRpb24sIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkdFTkVSQVRFX0RFU0NSSVBUSU9OXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUdlbmVyYXRlRGVzY3JpcHRpb24obWVzc2FnZS50aXRsZSwgbWVzc2FnZS5jYXRlZ29yeSwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiSU1QT1JUX0pPQlwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVJbXBvcnRKb2IobWVzc2FnZS5wYXlsb2FkLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJDQVBUVVJFX0xFQURcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlQ2FwdHVyZUxlYWQobWVzc2FnZS5wYXlsb2FkLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJHRVRfSU1QT1JUX0hJU1RPUllcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlR2V0SW1wb3J0SGlzdG9yeShzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJHRVRfTEVBRF9ISVNUT1JZXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUdldExlYWRIaXN0b3J5KHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkdFVF9JTVBPUlRfU1RBVFNcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlR2V0SW1wb3J0U3RhdHMoc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiR0VUX0xFQURfU1RBVFNcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlR2V0TGVhZFN0YXRzKHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIklOSkVDVF9BTkRfU0NBTlwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVJbmplY3RBbmRTY2FuKG1lc3NhZ2UudGFiSWQsIG1lc3NhZ2UuYXV0b1Njcm9sbCwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OiB7XHJcbiAgICAgIGNvbnN0IHVua25vd25UeXBlID0gKG1lc3NhZ2UgYXMgeyB0eXBlPzogdW5rbm93biB9KS50eXBlO1xyXG4gICAgICBjb25zb2xlLndhcm4oYFtMb2NhbFByb10gVW5oYW5kbGVkIG1lc3NhZ2UgdHlwZTogJHtTdHJpbmcodW5rbm93blR5cGUpfWApO1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBlcnJvcjogYFVua25vd24gbWVzc2FnZSB0eXBlOiAke1N0cmluZyh1bmtub3duVHlwZSl9YCB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBIYW5kbGVyIGltcGxlbWVudGF0aW9ucyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUxvZ2luKFxyXG4gIGVtYWlsOiBzdHJpbmcsXHJcbiAgcGFzc3dvcmQ6IHN0cmluZyxcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IExvZ2luUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGFwaVJlcyA9IGF3YWl0IGxvZ2luKHsgZW1haWwsIHBhc3N3b3JkIH0pO1xyXG4gICAgY29uc3QgdXNlcjogQXV0aFN0YXR1c1Jlc3BvbnNlW1widXNlclwiXSA9IHtcclxuICAgICAgX2lkOiAoYXBpUmVzLnVzZXIgYXMgdW5rbm93biBhcyB7IGlkPzogc3RyaW5nIH0pLmlkID8/IFwiXCIsXHJcbiAgICAgIG5hbWU6IGFwaVJlcy51c2VyLm5hbWUsXHJcbiAgICAgIGVtYWlsLFxyXG4gICAgICByb2xlOiBhcGlSZXMudXNlci5yb2xlIGFzIGltcG9ydChcIi4vdXRpbHMvYXBpXCIpLk1lUmVzcG9uc2VbXCJyb2xlXCJdLFxyXG4gICAgfTtcclxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IGNhY2hlZF91c2VyOiB1c2VyIH0pO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgdXNlciB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycikgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVMb2dvdXQoc2VuZFJlc3BvbnNlOiAocmVzOiB7IHN1Y2Nlc3M6IGJvb2xlYW4gfSkgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBsb2dvdXQoKTtcclxuICB9IGNhdGNoIHtcclxuICAgIC8vIENsZWFyIGxvY2FsIGNhY2hlIGV2ZW4gb24gQVBJIGVycm9yXHJcbiAgfVxyXG4gIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShcImNhY2hlZF91c2VyXCIpO1xyXG4gIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldEF1dGhTdGF0dXMoXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBBdXRoU3RhdHVzUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3Qgc3RvcmVkID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFwiY2FjaGVkX3VzZXJcIik7XHJcbiAgY29uc3QgY2FjaGVkVXNlciA9IHN0b3JlZFtcImNhY2hlZF91c2VyXCJdIGFzIEF1dGhTdGF0dXNSZXNwb25zZVtcInVzZXJcIl0gfCB1bmRlZmluZWQ7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBtZSA9IGF3YWl0IGdldEN1cnJlbnRVc2VyKCk7XHJcbiAgICBjb25zdCB1c2VyID0geyBfaWQ6IG1lLl9pZCwgbmFtZTogbWUubmFtZSwgZW1haWw6IG1lLmVtYWlsLCByb2xlOiBtZS5yb2xlIH07XHJcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBjYWNoZWRfdXNlcjogdXNlciB9KTtcclxuICAgIHNlbmRSZXNwb25zZSh7IGF1dGhlbnRpY2F0ZWQ6IHRydWUsIHVzZXIgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBjb25zdCBlcnJPYmogPSBlcnIgYXMgeyBjb2RlPzogc3RyaW5nIH07XHJcbiAgICBpZiAoZXJyT2JqLmNvZGUgPT09IFwiU0VTU0lPTl9FWFBJUkVEXCIgfHwgIWNhY2hlZFVzZXIpIHtcclxuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwucmVtb3ZlKFwiY2FjaGVkX3VzZXJcIik7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IGF1dGhlbnRpY2F0ZWQ6IGZhbHNlIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgYXV0aGVudGljYXRlZDogdHJ1ZSwgdXNlcjogY2FjaGVkVXNlciB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldENhdGVnb3JpZXMoXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBHZXRDYXRlZ29yaWVzUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNhdHMgPSBhd2FpdCBnZXRDYWNoZWRDYXRlZ29yaWVzKCk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBjYXRlZ29yaWVzOiBjYXRzIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGNhdGVnb3JpZXM6IFtdLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycikgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVDbGFzc2lmeUNhdGVnb3J5KFxyXG4gIHRpdGxlOiBzdHJpbmcsXHJcbiAgZGVzY3JpcHRpb246IHN0cmluZyxcclxuICBhdmFpbGFibGVDYXRlZ29yaWVzOiBzdHJpbmdbXSxcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NpZnlDYXRlZ29yeSh7IHRpdGxlLCBkZXNjcmlwdGlvbiwgYXZhaWxhYmxlQ2F0ZWdvcmllcyB9KTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGNhdGVnb3J5OiByZXN1bHQuY2F0ZWdvcnkgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRXN0aW1hdGVCdWRnZXQoXHJcbiAgdGl0bGU6IHN0cmluZyxcclxuICBjYXRlZ29yeTogc3RyaW5nLFxyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBFc3RpbWF0ZUJ1ZGdldFJlc3BvbnNlKSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBlc3RpbWF0ZUJ1ZGdldCh7IHRpdGxlLCBjYXRlZ29yeSwgZGVzY3JpcHRpb24gfSk7XHJcbiAgICBzZW5kUmVzcG9uc2Uoe1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBtaW46IHJlc3VsdC5taW4sXHJcbiAgICAgIG1heDogcmVzdWx0Lm1heCxcclxuICAgICAgbWlkcG9pbnQ6IHJlc3VsdC5taWRwb2ludCxcclxuICAgICAgbm90ZTogcmVzdWx0Lm5vdGUsXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycikgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZW5lcmF0ZURlc2NyaXB0aW9uKFxyXG4gIHRpdGxlOiBzdHJpbmcsXHJcbiAgY2F0ZWdvcnk6IHN0cmluZyB8IHVuZGVmaW5lZCxcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IEdlbmVyYXRlRGVzY3JpcHRpb25SZXNwb25zZSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGVEZXNjcmlwdGlvbih7IHRpdGxlLCBjYXRlZ29yeSB9KTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRlc2NyaXB0aW9uOiByZXN1bHQuZGVzY3JpcHRpb24gfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0SW1wb3J0SGlzdG9yeShcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IEdldEltcG9ydEhpc3RvcnlSZXNwb25zZSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBoaXN0b3J5ID0gYXdhaXQgZ2V0SW1wb3J0SGlzdG9yeSgpO1xyXG4gIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGhpc3RvcnkgfSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldEltcG9ydFN0YXRzKFxyXG4gIHNlbmRSZXNwb25zZTogKHJlczogR2V0SW1wb3J0U3RhdHNSZXNwb25zZSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBoaXN0b3J5ID0gYXdhaXQgZ2V0SW1wb3J0SGlzdG9yeSgpO1xyXG4gIHNlbmRSZXNwb25zZSh7IGNvdW50OiBoaXN0b3J5Lmxlbmd0aCB9KTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIExlYWQtc3BlY2lmaWMgaGFuZGxlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVDbGFzc2lmeUxlYWQoXHJcbiAgdGl0bGU6IHN0cmluZyxcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nLFxyXG4gIGxvY2F0aW9uOiBzdHJpbmcsXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBDbGFzc2lmeUxlYWRSZXNwb25zZSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgbGVhZDogTGVhZCA9IHtcclxuICAgICAgdGl0bGUsXHJcbiAgICAgIGRlc2NyaXB0aW9uLFxyXG4gICAgICBsb2NhdGlvbixcclxuICAgICAgc291cmNlOiBcImZhY2Vib29rXCIsIC8vIERlZmF1bHQgc291cmNlLCBjb3VsZCBiZSBwYXNzZWQgaW5cclxuICAgICAgc291cmNlX3VybDogXCJcIixcclxuICAgICAgcG9zdGVkX2J5OiBcIlVua25vd25cIixcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY2xhc3NpZmllZExlYWQgPSBjbGFzc2lmeUxlYWQobGVhZCk7XHJcblxyXG4gICAgc2VuZFJlc3BvbnNlKHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgY2xhc3NpZmllZF9sZWFkOiBjbGFzc2lmaWVkTGVhZCxcclxuICAgICAgc2VydmljZV90eXBlOiBjbGFzc2lmaWVkTGVhZC5zZXJ2aWNlX3R5cGUsXHJcbiAgICAgIHVyZ2VuY3k6IGNsYXNzaWZpZWRMZWFkLnVyZ2VuY3ksXHJcbiAgICAgIGVzdGltYXRlZF9idWRnZXQ6IGNsYXNzaWZpZWRMZWFkLmVzdGltYXRlZF9idWRnZXQsXHJcbiAgICAgIGNvbmZpZGVuY2U6IGNsYXNzaWZpZWRMZWFkLm1hdGNoX2NvbmZpZGVuY2UsXHJcbiAgICAgIGFuYWx5c2lzOiBjbGFzc2lmaWVkTGVhZC5jbGFzc2lmaWNhdGlvbl9hbmFseXNpc1xyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlTWF0Y2hQcm92aWRlcnMoXHJcbiAgbGVhZDogQ2xhc3NpZmllZExlYWQsXHJcbiAgbGltaXQ6IG51bWJlciA9IDUsXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBNYXRjaFByb3ZpZGVyc1Jlc3BvbnNlKSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBUT0RPOiBDYWxsIEFQSSB0byBtYXRjaCBwcm92aWRlcnMgYmFzZWQgb24gbGVhZCBjbGFzc2lmaWNhdGlvblxyXG4gICAgLy8gRm9yIG5vdywgcmV0dXJuIGVtcHR5IHByb3ZpZGVycyBsaXN0IC0gdGhpcyB3b3VsZCBjb25uZWN0IHRvIHRoZSBiYWNrZW5kIEFQSVxyXG4gICAgc2VuZFJlc3BvbnNlKHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgcHJvdmlkZXJzOiBbXVxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQ2FwdHVyZUxlYWQoXHJcbiAgcGF5bG9hZDogTGVhZCxcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IHsgc3VjY2VzczogYm9vbGVhbjsgbGVhZF9pZD86IHN0cmluZzsgZXJyb3I/OiBzdHJpbmcgfSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgLy8gQ2xhc3NpZnkgdGhlIGxlYWRcclxuICAgIGNvbnN0IGNsYXNzaWZpZWRMZWFkID0gY2xhc3NpZnlMZWFkKHBheWxvYWQpO1xyXG5cclxuICAgIC8vIFRPRE86IENhbGwgQVBJIHRvIHNhdmUgbGVhZCB0byB0aGUgc3lzdGVtXHJcbiAgICAvLyBGb3Igbm93LCBqdXN0IHNhdmUgdG8gaGlzdG9yeVxyXG4gICAgY29uc3QgbGVhZElkID0gYGxlYWRfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xyXG5cclxuICAgIGF3YWl0IHNhdmVMZWFkUmVjb3JkKHtcclxuICAgICAgbGVhZF9pZDogbGVhZElkLFxyXG4gICAgICB0aXRsZTogY2xhc3NpZmllZExlYWQudGl0bGUsXHJcbiAgICAgIHNlcnZpY2VfdHlwZTogY2xhc3NpZmllZExlYWQuc2VydmljZV90eXBlLFxyXG4gICAgICB1cmdlbmN5OiBjbGFzc2lmaWVkTGVhZC51cmdlbmN5LFxyXG4gICAgICBzb3VyY2U6IGNsYXNzaWZpZWRMZWFkLnNvdXJjZSxcclxuICAgICAgc291cmNlX3VybDogY2xhc3NpZmllZExlYWQuc291cmNlX3VybCxcclxuICAgICAgY2FwdHVyZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBtYXRjaGVkX3Byb3ZpZGVyc19jb3VudDogY2xhc3NpZmllZExlYWQubWF0Y2hlZF9wcm92aWRlcnM/Lmxlbmd0aCA/PyAwXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCB1cGRhdGVCYWRnZSgpO1xyXG5cclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGxlYWRfaWQ6IGxlYWRJZCB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycikgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRMZWFkSGlzdG9yeShcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IEdldExlYWRIaXN0b3J5UmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IGdldExlYWRIaXN0b3J5KCk7XHJcbiAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgaGlzdG9yeSB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0TGVhZFN0YXRzKFxyXG4gIHNlbmRSZXNwb25zZTogKHJlczogR2V0TGVhZFN0YXRzUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IGdldExlYWRIaXN0b3J5KCk7XHJcbiAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gIHRvZGF5LnNldEhvdXJzKDAsIDAsIDAsIDApO1xyXG5cclxuICBjb25zdCB0b2RheUxlYWRzID0gaGlzdG9yeS5maWx0ZXIoXHJcbiAgICAoaCkgPT4gbmV3IERhdGUoaC5jYXB0dXJlZEF0KSA+PSB0b2RheVxyXG4gICk7XHJcblxyXG4gIC8vIEdyb3VwIGJ5IHNlcnZpY2UgdHlwZSBhbmQgdXJnZW5jeVxyXG4gIGNvbnN0IGJ5U2VydmljZVR5cGU6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICBjb25zdCBieVVyZ2VuY3k6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuXHJcbiAgZm9yIChjb25zdCBsZWFkIG9mIGhpc3RvcnkpIHtcclxuICAgIGJ5U2VydmljZVR5cGVbbGVhZC5zZXJ2aWNlX3R5cGVdID0gKGJ5U2VydmljZVR5cGVbbGVhZC5zZXJ2aWNlX3R5cGVdID8/IDApICsgMTtcclxuICAgIGJ5VXJnZW5jeVtsZWFkLnVyZ2VuY3ldID0gKGJ5VXJnZW5jeVtsZWFkLnVyZ2VuY3ldID8/IDApICsgMTtcclxuICB9XHJcblxyXG4gIHNlbmRSZXNwb25zZSh7XHJcbiAgICB0b3RhbF9sZWFkczogaGlzdG9yeS5sZW5ndGgsXHJcbiAgICBsZWFkc190b2RheTogdG9kYXlMZWFkcy5sZW5ndGgsXHJcbiAgICBwZW5kaW5nX21hdGNoZXM6IHRvZGF5TGVhZHMuZmlsdGVyKGwgPT4gIWwubWF0Y2hlZF9wcm92aWRlcnNfY291bnQpLmxlbmd0aCxcclxuICAgIGJ5X3NlcnZpY2VfdHlwZTogYnlTZXJ2aWNlVHlwZSBhcyBSZWNvcmQ8YW55LCBudW1iZXI+LFxyXG4gICAgYnlfdXJnZW5jeTogYnlVcmdlbmN5IGFzIFJlY29yZDxhbnksIG51bWJlcj5cclxuICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlSW1wb3J0Sm9iKFxyXG4gIGpvYjogaW1wb3J0KFwiLi90eXBlc1wiKS5Kb2JQb3N0LFxyXG4gIHNlbmRSZXNwb25zZTogKHJlczogSW1wb3J0Sm9iUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgbGV0IGNhdGVnb3J5SWQgPSBqb2IuY2F0ZWdvcnlJZDtcclxuXHJcbiAgaWYgKCFjYXRlZ29yeUlkICYmIGpvYi5jYXRlZ29yeSkge1xyXG4gICAgY29uc3QgY2F0cyA9IGF3YWl0IGdldENhY2hlZENhdGVnb3JpZXMoKTtcclxuICAgIGNvbnN0IG1hdGNoZWQgPSBjYXRzLmZpbmQoXHJcbiAgICAgIChjKSA9PiBjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gKGpvYi5jYXRlZ29yeSA/PyBcIlwiKS50b0xvd2VyQ2FzZSgpXHJcbiAgICApO1xyXG4gICAgY2F0ZWdvcnlJZCA9IG1hdGNoZWQ/Ll9pZDtcclxuICB9XHJcblxyXG4gIGNvbnN0IHNvdXJjZU5vdGUgPSBbXHJcbiAgICBgXFxuXFxuLS0tYCxcclxuICAgIGBJbXBvcnRlZCBmcm9tICR7am9iLnNvdXJjZSA9PT0gXCJmYWNlYm9va1wiID8gXCJGYWNlYm9va1wiIDogam9iLnNvdXJjZSA9PT0gXCJsaW5rZWRpblwiID8gXCJMaW5rZWRJblwiIDogam9iLnNvdXJjZSA9PT0gXCJqb2JzdHJlZXRcIiA/IFwiSm9iU3RyZWV0XCIgOiBcIkluZGVlZFwifTogJHtqb2Iuc291cmNlX3VybH1gLFxyXG4gICAgam9iLnBvc3RlZF9ieSA/IGBQb3N0ZWQgYnk6ICR7am9iLnBvc3RlZF9ieX1gIDogbnVsbCxcclxuICAgIGpvYi50aW1lc3RhbXAgPyBgT3JpZ2luYWwgdGltZXN0YW1wOiAke2pvYi50aW1lc3RhbXB9YCA6IG51bGwsXHJcbiAgXVxyXG4gICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgLmpvaW4oXCJcXG5cIik7XHJcblxyXG4gIGNvbnN0IGZhbGxiYWNrU2NoZWR1bGVEYXRlID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDg2XzQwMF8wMDApLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gIGNvbnN0IHBheWxvYWQ6IEpvYkltcG9ydFBheWxvYWQgPSB7XHJcbiAgICB0aXRsZTogam9iLnRpdGxlLFxyXG4gICAgZGVzY3JpcHRpb246IGpvYi5kZXNjcmlwdGlvbiArIHNvdXJjZU5vdGUsXHJcbiAgICBjYXRlZ29yeTogY2F0ZWdvcnlJZCA/PyBcIlwiLFxyXG4gICAgYnVkZ2V0OiBqb2IuYnVkZ2V0ID8/IDAsXHJcbiAgICBsb2NhdGlvbjogam9iLmxvY2F0aW9uID8/IFwiXCIsXHJcbiAgICBzY2hlZHVsZURhdGU6IGpvYi5zY2hlZHVsZURhdGVcclxuICAgICAgPyBuZXcgRGF0ZShqb2Iuc2NoZWR1bGVEYXRlKS50b0lTT1N0cmluZygpXHJcbiAgICAgIDogZmFsbGJhY2tTY2hlZHVsZURhdGUsXHJcbiAgICB0YWdzOiBbXHJcbiAgICAgIGBpbXBvcnRlZF9mcm9tXyR7am9iLnNvdXJjZX1gLFxyXG4gICAgICAuLi4oam9iLmNhdGVnb3J5ID8gW2pvYi5jYXRlZ29yeS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccysvZywgXCJfXCIpXSA6IFtdKSxcclxuICAgIF0sXHJcbiAgfTtcclxuXHJcbiAgaWYgKCFwYXlsb2FkLmNhdGVnb3J5KSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUGxlYXNlIHNlbGVjdCBhIGNhdGVnb3J5IGJlZm9yZSBzdWJtaXR0aW5nLlwiIH0pO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZiAoIXBheWxvYWQubG9jYXRpb24pIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJMb2NhdGlvbiBpcyByZXF1aXJlZC5cIiB9KTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKCFwYXlsb2FkLmJ1ZGdldCB8fCBwYXlsb2FkLmJ1ZGdldCA8PSAwKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiQnVkZ2V0IGlzIHJlcXVpcmVkIChQSFApLlwiIH0pO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZUpvYihwYXlsb2FkKTtcclxuXHJcbiAgICAvLyBQZXJzaXN0IHRvIGhpc3RvcnkgKyB1cGRhdGUgdG9kYXkncyBiYWRnZSBjb3VudFxyXG4gICAgYXdhaXQgc2F2ZUltcG9ydFJlY29yZCh7XHJcbiAgICAgIGpvYl9pZDogcmVzdWx0Ll9pZCxcclxuICAgICAgdGl0bGU6IGpvYi50aXRsZSxcclxuICAgICAgc291cmNlOiBqb2Iuc291cmNlLFxyXG4gICAgICBzb3VyY2VfdXJsOiBqb2Iuc291cmNlX3VybCxcclxuICAgICAgaW1wb3J0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgfSk7XHJcbiAgICBhd2FpdCB1cGRhdGVCYWRnZSgpO1xyXG5cclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGpvYl9pZDogcmVzdWx0Ll9pZCB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIGNvbnN0IGVyck9iaiA9IGVyciBhcyB7IGNvZGU/OiBzdHJpbmc7IGVycm9yPzogc3RyaW5nIH07XHJcbiAgICBpZiAoZXJyT2JqLmNvZGUgPT09IFwiU0VTU0lPTl9FWFBJUkVEXCIpIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlNlc3Npb24gZXhwaXJlZC4gUGxlYXNlIHNpZ24gaW4gYWdhaW4gdmlhIHRoZSBleHRlbnNpb24uXCIgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuY29uc3QgU1VQUE9SVEVEX0hPU1RTID0gW1wiZmFjZWJvb2suY29tXCIsIFwibWVzc2VuZ2VyLmNvbVwiLCBcImdvb2dsZS5jb21cIiwgXCJtYXBzLmdvb2dsZS5jb21cIiwgXCJidXNpbmVzcy5nb29nbGUuY29tXCJdO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlSW5qZWN0QW5kU2NhbihcclxuICB0YWJJZDogbnVtYmVyLFxyXG4gIGF1dG9TY3JvbGw6IGJvb2xlYW4sXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiB7IG9rOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9KSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIC8vIFZhbGlkYXRlIHRhYiBVUkwgYmVmb3JlIGluamVjdGlvblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWIgPSBhd2FpdCBjaHJvbWUudGFicy5nZXQodGFiSWQpO1xyXG4gICAgaWYgKCF0YWIudXJsIHx8ICFTVVBQT1JURURfSE9TVFMuc29tZSgoaCkgPT4gdGFiLnVybCEuaW5jbHVkZXMoaCkpKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IG9rOiBmYWxzZSwgZXJyb3I6IFwiVGFiIGlzIG5vdCBhIHN1cHBvcnRlZCBsZWFkIHNvdXJjZSAoRmFjZWJvb2ssIE1lc3NlbmdlciwgR29vZ2xlIEJ1c2luZXNzKS5cIiB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IGZhbHNlLCBlcnJvcjogXCJDb3VsZCBub3QgdmVyaWZ5IHRhYiBVUkwuXCIgfSk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiBjb250ZW50IHNjcmlwdCBpcyBhbHJlYWR5IGFsaXZlXHJcbiAgbGV0IGFsaXZlID0gZmFsc2U7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBpbmcgPSBhd2FpdCBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgeyB0eXBlOiBcIlBJTkdcIiB9KTtcclxuICAgIGFsaXZlID0gISEocGluZyBhcyB7IG9rPzogYm9vbGVhbiB9KT8ub2s7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICBhbGl2ZSA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFhbGl2ZSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcclxuICAgICAgICB0YXJnZXQ6IHsgdGFiSWQgfSxcclxuICAgICAgICBmaWxlczogW1wiY29udGVudC5qc1wiXSxcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIFdhaXQgZm9yIHRoZSBjb250ZW50IHNjcmlwdCB0byByZWdpc3RlciBpdHMgbWVzc2FnZSBsaXN0ZW5lclxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA3MDApKTtcclxuICAgIH0gY2F0Y2ggKGluamVjdEVycikge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBvazogZmFsc2UsIGVycm9yOiBgSW5qZWN0aW9uIGZhaWxlZDogJHtlcnJvck1lc3NhZ2UoaW5qZWN0RXJyKX1gIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogXCJTQ0FOX1RBQlwiLCBhdXRvU2Nyb2xsIH0pO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IHRydWUgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBvazogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyKSB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBVdGlsaXR5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycjogdW5rbm93bik6IHN0cmluZyB7XHJcbiAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gZXJyLm1lc3NhZ2U7XHJcbiAgY29uc3Qgb2JqID0gZXJyIGFzIHsgZXJyb3I/OiBzdHJpbmc7IG1lc3NhZ2U/OiBzdHJpbmcgfTtcclxuICByZXR1cm4gb2JqPy5lcnJvciA/PyBvYmo/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycik7XHJcbn1cclxuXHJcbi8vIFJlZnJlc2ggYmFkZ2Ugb24gc2VydmljZSB3b3JrZXIgc3RhcnR1cFxyXG52b2lkIHVwZGF0ZUJhZGdlKCk7XHJcblxyXG5jb25zb2xlLmxvZyhgW0xvY2FsUHJvXSBMZWFkIEVuZ2luZSBiYWNrZ3JvdW5kIHNlcnZpY2Ugd29ya2VyIHN0YXJ0ZWQuIEFQSTogJHtBUElfQkFTRV9VUkx9YCk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7OztBQWlCTyxNQUFNLGVBQWU7QUFjNUIsaUJBQXNCLFNBQVksTUFBYyxVQUF3QixDQUFDLEdBQWU7QUFDdEYsVUFBTSxFQUFFLFFBQVEsTUFBTSxHQUFHLEtBQUssSUFBSTtB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
