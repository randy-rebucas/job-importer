"use strict";
(() => {
  // extension/utils/api.ts
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

  // extension/background.ts
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
      case "ESTIMATE_BUDGET":
        await handleEstimateBudget(message.title, message.category, message.description, sendResponse);
        break;
      case "GENERATE_DESCRIPTION":
        await handleGenerateDescription(message.title, message.category, sendResponse);
        break;
      case "IMPORT_JOB":
        await handleImportJob(message.payload, sendResponse);
        break;
      case "GET_IMPORT_HISTORY":
        await handleGetImportHistory(sendResponse);
        break;
      case "GET_IMPORT_STATS":
        await handleGetImportStats(sendResponse);
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
  var SUPPORTED_HOSTS = ["facebook.com", "linkedin.com", "jobstreet.com", "indeed.com"];
  async function handleInjectAndScan(tabId, autoScroll, sendResponse) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || !SUPPORTED_HOSTS.some((h) => tab.url.includes(h))) {
        sendResponse({ ok: false, error: "Tab is not a supported job site." });
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
  console.log(`[LocalPro] Background service worker started. API: ${API_BASE_URL}`);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vdXRpbHMvYXBpLnRzIiwgIi4uL2JhY2tncm91bmQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxyXG4gKiBMb2NhbFBybyBBUEkgd3JhcHBlci5cclxuICpcclxuICogQXV0aCBtb2RlbDogSHR0cE9ubHkgY29va2llLWJhc2VkIHNlc3Npb25zIChhY2Nlc3NfdG9rZW4gKyByZWZyZXNoX3Rva2VuKS5cclxuICogQWxsIHJlcXVlc3RzIG11c3QgaW5jbHVkZSBgY3JlZGVudGlhbHM6ICdpbmNsdWRlJ2Agc28gdGhlIGJyb3dzZXJcclxuICogYXV0b21hdGljYWxseSBhdHRhY2hlcyBjb29raWVzIHNldCBieSB0aGUgc2VydmVyLlxyXG4gKlxyXG4gKiBPbiA0MDEgdGhlIHdyYXBwZXIgYXV0b21hdGljYWxseSBjYWxscyBQT1NUIC9hcGkvYXV0aC9yZWZyZXNoIGFuZCByZXRyaWVzLlxyXG4gKiBJZiB0aGUgcmVmcmVzaCBhbHNvIGZhaWxzLCBpdCB0aHJvd3MgYW4gZXJyb3Igd2l0aCBjb2RlIFwiU0VTU0lPTl9FWFBJUkVEXCIuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHR5cGUgeyBDYXRlZ29yeSwgSm9iSW1wb3J0UGF5bG9hZCwgSm9iQ3JlYXRlZFJlc3BvbnNlLCBBcGlFcnJvciB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5cclxuLyoqXHJcbiAqIEJhc2UgVVJMIGZvciB0aGUgTG9jYWxQcm8gQVBJLlxyXG4gKiBDaGFuZ2UgdG8geW91ciBwcm9kdWN0aW9uIGRvbWFpbiBiZWZvcmUgZGVwbG95aW5nLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IEFQSV9CQVNFX1VSTCA9IFwiaHR0cHM6Ly93d3cubG9jYWxwcm8uYXNpYVwiO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIExvdy1sZXZlbCBmZXRjaCB3cmFwcGVyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuaW50ZXJmYWNlIEZldGNoT3B0aW9ucyBleHRlbmRzIFJlcXVlc3RJbml0IHtcclxuICAvKiogU2V0IHRvIGZhbHNlIHRvIHN1cHByZXNzIHRoZSBhdXRvbWF0aWMgNDAxXHUyMTkycmVmcmVzaFx1MjE5MnJldHJ5IGxvZ2ljLiAqL1xyXG4gIHJldHJ5PzogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvcmUgZmV0Y2ggaGVscGVyLlxyXG4gKiAtIEFsd2F5cyBzZW5kcyBgY3JlZGVudGlhbHM6ICdpbmNsdWRlJ2AgKEh0dHBPbmx5IGNvb2tpZXMpLlxyXG4gKiAtIE9uIDQwMSwgYXR0ZW1wdHMgb25lIHNpbGVudCB0b2tlbiByZWZyZXNoIGFuZCByZXRyaWVzIHRoZSByZXF1ZXN0LlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwaUZldGNoPFQ+KHBhdGg6IHN0cmluZywgb3B0aW9uczogRmV0Y2hPcHRpb25zID0ge30pOiBQcm9taXNlPFQ+IHtcclxuICBjb25zdCB7IHJldHJ5ID0gdHJ1ZSwgLi4uaW5pdCB9ID0gb3B0aW9ucztcclxuXHJcbiAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgIC4uLihpbml0LmhlYWRlcnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiksXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgcmVxdWVzdDogUmVxdWVzdEluaXQgPSB7XHJcbiAgICAuLi5pbml0LFxyXG4gICAgaGVhZGVycyxcclxuICAgIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuICB9O1xyXG5cclxuICBjb25zdCB1cmwgPSBgJHtBUElfQkFTRV9VUkx9JHtwYXRofWA7XHJcblxyXG4gIGxldCByZXNwb25zZTogUmVzcG9uc2U7XHJcbiAgdHJ5IHtcclxuICAgIHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCByZXF1ZXN0KTtcclxuICB9IGNhdGNoIChuZXR3b3JrRXJyKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE5ldHdvcmsgZXJyb3I6ICR7U3RyaW5nKG5ldHdvcmtFcnIpfWApO1xyXG4gIH1cclxuXHJcbiAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxICYmIHJldHJ5KSB7XHJcbiAgICAvLyBUcnkgdG8gc2lsZW50bHkgcmVmcmVzaCB0aGUgc2Vzc2lvblxyXG4gICAgY29uc3QgcmVmcmVzaGVkID0gYXdhaXQgdHJ5UmVmcmVzaFRva2VuKCk7XHJcbiAgICBpZiAoIXJlZnJlc2hlZCkge1xyXG4gICAgICBjb25zdCBlcnI6IEFwaUVycm9yID0geyBlcnJvcjogXCJTZXNzaW9uIGV4cGlyZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uXCIsIGNvZGU6IFwiU0VTU0lPTl9FWFBJUkVEXCIgfTtcclxuICAgICAgdGhyb3cgZXJyO1xyXG4gICAgfVxyXG4gICAgLy8gT25lIHJldHJ5IGFmdGVyIHN1Y2Nlc3NmdWwgcmVmcmVzaFxyXG4gICAgcmV0dXJuIGFwaUZldGNoPFQ+KHBhdGgsIHsgLi4ub3B0aW9ucywgcmV0cnk6IGZhbHNlIH0pO1xyXG4gIH1cclxuXHJcbiAgbGV0IGRhdGE6IHVua25vd247XHJcbiAgdHJ5IHtcclxuICAgIGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCk7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkIGFzIHVua25vd24gYXMgVDtcclxuICB9XHJcblxyXG4gIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgIGNvbnN0IHNlcnZlckVycm9yID0gZGF0YSBhcyB7IGVycm9yPzogc3RyaW5nOyBtZXNzYWdlPzogc3RyaW5nOyBjb2RlPzogc3RyaW5nIH07XHJcbiAgICBjb25zdCBlcnI6IEFwaUVycm9yID0ge1xyXG4gICAgICBlcnJvcjogc2VydmVyRXJyb3IuZXJyb3IgPz8gc2VydmVyRXJyb3IubWVzc2FnZSA/PyBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gLFxyXG4gICAgICBjb2RlOiBzZXJ2ZXJFcnJvci5jb2RlLFxyXG4gICAgfTtcclxuICAgIHRocm93IGVycjtcclxuICB9XHJcblxyXG4gIHJldHVybiBkYXRhIGFzIFQ7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBBdXRoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dpblBheWxvYWQge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dpblJlc3BvbnNlIHtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgdXNlcjogeyBpZDogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IHJvbGU6IHN0cmluZyB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1lUmVzcG9uc2Uge1xyXG4gIF9pZDogc3RyaW5nO1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHJvbGU6IFwiY2xpZW50XCIgfCBcInByb3ZpZGVyXCIgfCBcImFkbWluXCIgfCBcInBlc29cIjtcclxuICBpc0VtYWlsVmVyaWZpZWQ6IGJvb2xlYW47XHJcbiAgYXZhdGFyOiBzdHJpbmcgfCBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2F1dGgvbG9naW5cclxuICogU2V0cyBhY2Nlc3NfdG9rZW4gKyByZWZyZXNoX3Rva2VuIGNvb2tpZXMgb24gc3VjY2Vzcy5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dpbihwYXlsb2FkOiBMb2dpblBheWxvYWQpOiBQcm9taXNlPExvZ2luUmVzcG9uc2U+IHtcclxuICByZXR1cm4gYXBpRmV0Y2g8TG9naW5SZXNwb25zZT4oXCIvYXBpL2F1dGgvbG9naW5cIiwge1xyXG4gICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxyXG4gICAgcmV0cnk6IGZhbHNlLCAvLyBuZXZlciByZWZyZXNoIG9uIGEgbG9naW4gYXR0ZW1wdFxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2F1dGgvbG9nb3V0XHJcbiAqIENsZWFycyBzZXNzaW9uIGNvb2tpZXMgc2VydmVyLXNpZGUuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9nb3V0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGF3YWl0IGFwaUZldGNoPHsgbWVzc2FnZTogc3RyaW5nIH0+KFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7XHJcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgcmV0cnk6IGZhbHNlLFxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogR0VUIC9hcGkvYXV0aC9tZVxyXG4gKiBSZXR1cm5zIHRoZSBhdXRoZW50aWNhdGVkIHVzZXIncyBwcm9maWxlLCBvciB0aHJvd3Mgb24gNDAxLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRVc2VyKCk6IFByb21pc2U8TWVSZXNwb25zZT4ge1xyXG4gIHJldHVybiBhcGlGZXRjaDxNZVJlc3BvbnNlPihcIi9hcGkvYXV0aC9tZVwiLCB7IHJldHJ5OiB0cnVlIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2F1dGgvcmVmcmVzaFxyXG4gKiBFeGNoYW5nZXMgdGhlIHJlZnJlc2hfdG9rZW4gY29va2llIGZvciBhIG5ldyBhY2Nlc3NfdG9rZW4gY29va2llLlxyXG4gKiBSZXR1cm5zIHRydWUgb24gc3VjY2VzcywgZmFsc2Ugb24gZmFpbHVyZS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cnlSZWZyZXNoVG9rZW4oKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKGAke0FQSV9CQVNFX1VSTH0vYXBpL2F1dGgvcmVmcmVzaGAsIHtcclxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZXMub2s7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ2F0ZWdvcmllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbi8qKlxyXG4gKiBHRVQgL2FwaS9jYXRlZ29yaWVzXHJcbiAqIFJldHVybnMgYWxsIGFjdGl2ZSBzZXJ2aWNlIGNhdGVnb3JpZXMuIENhY2hlZCAyNCBoIGJ5IHRoZSBzZXJ2ZXIuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q2F0ZWdvcmllcygpOiBQcm9taXNlPENhdGVnb3J5W10+IHtcclxuICByZXR1cm4gYXBpRmV0Y2g8Q2F0ZWdvcnlbXT4oXCIvYXBpL2NhdGVnb3JpZXNcIik7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBBSSBoZWxwZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDbGFzc2lmeUNhdGVnb3J5UGF5bG9hZCB7XHJcbiAgdGl0bGU6IHN0cmluZztcclxuICBkZXNjcmlwdGlvbj86IHN0cmluZztcclxuICBhdmFpbGFibGVDYXRlZ29yaWVzOiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDbGFzc2lmeUNhdGVnb3J5UmVzcG9uc2Uge1xyXG4gIGNhdGVnb3J5OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQT1NUIC9hcGkvYWkvY2xhc3NpZnktY2F0ZWdvcnlcclxuICogVXNlcyBHUFQtNG8tbWluaSB0byBjbGFzc2lmeSB0aGUgam9iIGludG8gb25lIG9mIHRoZSBwcm92aWRlZCBjYXRlZ29yaWVzLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsYXNzaWZ5Q2F0ZWdvcnkoXHJcbiAgcGF5bG9hZDogQ2xhc3NpZnlDYXRlZ29yeVBheWxvYWRcclxuKTogUHJvbWlzZTxDbGFzc2lmeUNhdGVnb3J5UmVzcG9uc2U+IHtcclxuICByZXR1cm4gYXBpRmV0Y2g8Q2xhc3NpZnlDYXRlZ29yeVJlc3BvbnNlPihcIi9hcGkvYWkvY2xhc3NpZnktY2F0ZWdvcnlcIiwge1xyXG4gICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVzdGltYXRlQnVkZ2V0UGF5bG9hZCB7XHJcbiAgdGl0bGU6IHN0cmluZztcclxuICBjYXRlZ29yeTogc3RyaW5nO1xyXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVzdGltYXRlQnVkZ2V0UmVzcG9uc2Uge1xyXG4gIG1pbjogbnVtYmVyO1xyXG4gIG1heDogbnVtYmVyO1xyXG4gIG1pZHBvaW50OiBudW1iZXI7XHJcbiAgbm90ZTogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpL2VzdGltYXRlLWJ1ZGdldFxyXG4gKiBSZXR1cm5zIGFuIEFJLWVzdGltYXRlZCBidWRnZXQgcmFuZ2UuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXN0aW1hdGVCdWRnZXQoXHJcbiAgcGF5bG9hZDogRXN0aW1hdGVCdWRnZXRQYXlsb2FkXHJcbik6IFByb21pc2U8RXN0aW1hdGVCdWRnZXRSZXNwb25zZT4ge1xyXG4gIHJldHVybiBhcGlGZXRjaDxFc3RpbWF0ZUJ1ZGdldFJlc3BvbnNlPihcIi9hcGkvYWkvZXN0aW1hdGUtYnVkZ2V0XCIsIHtcclxuICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZURlc2NyaXB0aW9uUGF5bG9hZCB7XHJcbiAgdGl0bGU6IHN0cmluZztcclxuICBjYXRlZ29yeT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZURlc2NyaXB0aW9uQXBpUmVzcG9uc2Uge1xyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQT1NUIC9hcGkvYWkvZ2VuZXJhdGUtZGVzY3JpcHRpb25cclxuICogR2VuZXJhdGVzIGEgY2xlYW4sIHByb2Zlc3Npb25hbCBqb2IgZGVzY3JpcHRpb24gZnJvbSBhIHRpdGxlIGFuZCBvcHRpb25hbCBjYXRlZ29yeS5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZURlc2NyaXB0aW9uKFxyXG4gIHBheWxvYWQ6IEdlbmVyYXRlRGVzY3JpcHRpb25QYXlsb2FkXHJcbik6IFByb21pc2U8R2VuZXJhdGVEZXNjcmlwdGlvbkFwaVJlc3BvbnNlPiB7XHJcbiAgcmV0dXJuIGFwaUZldGNoPEdlbmVyYXRlRGVzY3JpcHRpb25BcGlSZXNwb25zZT4oXCIvYXBpL2FpL2dlbmVyYXRlLWRlc2NyaXB0aW9uXCIsIHtcclxuICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcclxuICB9KTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIEpvYnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2pvYnNcclxuICogQ3JlYXRlcyBhIG5ldyBqb2IuIFRoZSBjYWxsZXIgaXMgcmVzcG9uc2libGUgZm9yIHBhc3NpbmcgYSB2YWxpZCBjYXRlZ29yeUlkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUpvYihwYXlsb2FkOiBKb2JJbXBvcnRQYXlsb2FkKTogUHJvbWlzZTxKb2JDcmVhdGVkUmVzcG9uc2U+IHtcclxuICByZXR1cm4gYXBpRmV0Y2g8Sm9iQ3JlYXRlZFJlc3BvbnNlPihcIi9hcGkvam9ic1wiLCB7XHJcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXHJcbiAgfSk7XHJcbn1cclxuIiwgIi8qKlxyXG4gKiBCYWNrZ3JvdW5kIHNlcnZpY2Ugd29ya2VyIChNYW5pZmVzdCBWMykuXHJcbiAqXHJcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XHJcbiAqICAxLiBMT0dJTiAvIExPR09VVCAvIEdFVF9BVVRIX1NUQVRVU1xyXG4gKiAgMi4gR0VUX0NBVEVHT1JJRVMgd2l0aCAyNC1ob3VyIGluLW1lbW9yeSBjYWNoZVxyXG4gKiAgMy4gQ0xBU1NJRllfQ0FURUdPUlkgdmlhIFBPU1QgL2FwaS9haS9jbGFzc2lmeS1jYXRlZ29yeVxyXG4gKiAgNC4gRVNUSU1BVEVfQlVER0VUIHZpYSBQT1NUIC9hcGkvYWkvZXN0aW1hdGUtYnVkZ2V0XHJcbiAqICA1LiBHRU5FUkFURV9ERVNDUklQVElPTiB2aWEgUE9TVCAvYXBpL2FpL2dlbmVyYXRlLWRlc2NyaXB0aW9uXHJcbiAqICA2LiBJTVBPUlRfSk9CIFx1MjE5MiBQT1NUIC9hcGkvam9icyArIHNhdmUgdG8gaGlzdG9yeSArIHVwZGF0ZSBiYWRnZVxyXG4gKiAgNi4gR0VUX0lNUE9SVF9ISVNUT1JZIC8gR0VUX0lNUE9SVF9TVEFUUyBmcm9tIGNocm9tZS5zdG9yYWdlLmxvY2FsXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuICBsb2dpbixcclxuICBsb2dvdXQsXHJcbiAgZ2V0Q3VycmVudFVzZXIsXHJcbiAgZ2V0Q2F0ZWdvcmllcyxcclxuICBjbGFzc2lmeUNhdGVnb3J5LFxyXG4gIGVzdGltYXRlQnVkZ2V0LFxyXG4gIGdlbmVyYXRlRGVzY3JpcHRpb24sXHJcbiAgY3JlYXRlSm9iLFxyXG4gIEFQSV9CQVNFX1VSTCxcclxufSBmcm9tIFwiLi91dGlscy9hcGlcIjtcclxuaW1wb3J0IHR5cGUge1xyXG4gIEV4dGVuc2lvbk1lc3NhZ2UsXHJcbiAgQ2F0ZWdvcnksXHJcbiAgSW1wb3J0Sm9iUmVzcG9uc2UsXHJcbiAgQXV0aFN0YXR1c1Jlc3BvbnNlLFxyXG4gIExvZ2luUmVzcG9uc2UsXHJcbiAgR2V0Q2F0ZWdvcmllc1Jlc3BvbnNlLFxyXG4gIENsYXNzaWZ5Q2F0ZWdvcnlSZXNwb25zZSxcclxuICBFc3RpbWF0ZUJ1ZGdldFJlc3BvbnNlLFxyXG4gIEdlbmVyYXRlRGVzY3JpcHRpb25SZXNwb25zZSxcclxuICBHZXRJbXBvcnRIaXN0b3J5UmVzcG9uc2UsXHJcbiAgR2V0SW1wb3J0U3RhdHNSZXNwb25zZSxcclxuICBKb2JJbXBvcnRQYXlsb2FkLFxyXG4gIEltcG9ydEhpc3RvcnlJdGVtLFxyXG59IGZyb20gXCIuL3R5cGVzXCI7XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgQ2F0ZWdvcnkgY2FjaGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5pbnRlcmZhY2UgQ2F0ZWdvcnlDYWNoZSB7XHJcbiAgY2F0ZWdvcmllczogQ2F0ZWdvcnlbXTtcclxuICBmZXRjaGVkQXQ6IG51bWJlcjtcclxufVxyXG5cclxuY29uc3QgQ0FURUdPUllfQ0FDSEVfVFRMID0gMjQgKiA2MCAqIDYwICogMTAwMDtcclxubGV0IGNhdGVnb3J5Q2FjaGU6IENhdGVnb3J5Q2FjaGUgfCBudWxsID0gbnVsbDtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldENhY2hlZENhdGVnb3JpZXMoKTogUHJvbWlzZTxDYXRlZ29yeVtdPiB7XHJcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICBpZiAoY2F0ZWdvcnlDYWNoZSAmJiBub3cgLSBjYXRlZ29yeUNhY2hlLmZldGNoZWRBdCA8IENBVEVHT1JZX0NBQ0hFX1RUTCkge1xyXG4gICAgcmV0dXJuIGNhdGVnb3J5Q2FjaGUuY2F0ZWdvcmllcztcclxuICB9XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNhdHMgPSBhd2FpdCBnZXRDYXRlZ29yaWVzKCk7XHJcbiAgICBjYXRlZ29yeUNhY2hlID0geyBjYXRlZ29yaWVzOiBjYXRzLCBmZXRjaGVkQXQ6IG5vdyB9O1xyXG4gICAgcmV0dXJuIGNhdHM7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gY2F0ZWdvcnlDYWNoZT8uY2F0ZWdvcmllcyA/PyBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBJbXBvcnQgaGlzdG9yeSAmIGJhZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuY29uc3QgSElTVE9SWV9LRVkgICA9IFwiaW1wb3J0X2hpc3RvcnlcIjtcclxuY29uc3QgTUFYX0hJU1RPUlkgICA9IDUwO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gc2F2ZUltcG9ydFJlY29yZChpdGVtOiBJbXBvcnRIaXN0b3J5SXRlbSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzdG9yZWQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoSElTVE9SWV9LRVkpO1xyXG4gICAgY29uc3QgaGlzdG9yeTogSW1wb3J0SGlzdG9yeUl0ZW1bXSA9IChzdG9yZWRbSElTVE9SWV9LRVldIGFzIEltcG9ydEhpc3RvcnlJdGVtW10pID8/IFtdO1xyXG4gICAgaGlzdG9yeS51bnNoaWZ0KGl0ZW0pO1xyXG4gICAgaWYgKGhpc3RvcnkubGVuZ3RoID4gTUFYX0hJU1RPUlkpIGhpc3Rvcnkuc3BsaWNlKE1BWF9ISVNUT1JZKTtcclxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtISVNUT1JZX0tFWV06IGhpc3RvcnkgfSk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBOb24tZmF0YWxcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEltcG9ydEhpc3RvcnkoKTogUHJvbWlzZTxJbXBvcnRIaXN0b3J5SXRlbVtdPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChISVNUT1JZX0tFWSk7XHJcbiAgICByZXR1cm4gKHN0b3JlZFtISVNUT1JZX0tFWV0gYXMgSW1wb3J0SGlzdG9yeUl0ZW1bXSkgPz8gW107XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVCYWRnZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IGdldEltcG9ydEhpc3RvcnkoKTtcclxuICAgIGNvbnN0IHRvZGF5U3RhcnQgPSBuZXcgRGF0ZSgpO1xyXG4gICAgdG9kYXlTdGFydC5zZXRIb3VycygwLCAwLCAwLCAwKTtcclxuICAgIGNvbnN0IHRvZGF5Q291bnQgPSBoaXN0b3J5LmZpbHRlcihcclxuICAgICAgKGgpID0+IG5ldyBEYXRlKGguaW1wb3J0ZWRBdCkgPj0gdG9kYXlTdGFydFxyXG4gICAgKS5sZW5ndGg7XHJcblxyXG4gICAgYXdhaXQgY2hyb21lLmFjdGlvbi5zZXRCYWRnZVRleHQoeyB0ZXh0OiB0b2RheUNvdW50ID4gMCA/IFN0cmluZyh0b2RheUNvdW50KSA6IFwiXCIgfSk7XHJcbiAgICBhd2FpdCBjaHJvbWUuYWN0aW9uLnNldEJhZGdlQmFja2dyb3VuZENvbG9yKHsgY29sb3I6IFwiIzFhNTZkYlwiIH0pO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgLy8gc2V0QmFkZ2VUZXh0IG1heSBub3QgYmUgYXZhaWxhYmxlIGluIGFsbCBjb250ZXh0c1xyXG4gIH1cclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIE1haW4gbWVzc2FnZSBsaXN0ZW5lciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihcclxuICAoXHJcbiAgICBtZXNzYWdlOiBFeHRlbnNpb25NZXNzYWdlLFxyXG4gICAgX3NlbmRlcjogY2hyb21lLnJ1bnRpbWUuTWVzc2FnZVNlbmRlcixcclxuICAgIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiB1bmtub3duKSA9PiB2b2lkXHJcbiAgKSA9PiB7XHJcbiAgICBoYW5kbGVNZXNzYWdlKG1lc3NhZ2UsIHNlbmRSZXNwb25zZSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbik7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNZXNzYWdlKFxyXG4gIG1lc3NhZ2U6IEV4dGVuc2lvbk1lc3NhZ2UsXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcclxuICAgIGNhc2UgXCJMT0dJTlwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVMb2dpbihtZXNzYWdlLmVtYWlsLCBtZXNzYWdlLnBhc3N3b3JkLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJMT0dPVVRcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlTG9nb3V0KHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkdFVF9BVVRIX1NUQVRVU1wiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVHZXRBdXRoU3RhdHVzKHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkdFVF9DQVRFR09SSUVTXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUdldENhdGVnb3JpZXMoc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiQ0xBU1NJRllfQ0FURUdPUllcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlQ2xhc3NpZnlDYXRlZ29yeShtZXNzYWdlLnRpdGxlLCBtZXNzYWdlLmRlc2NyaXB0aW9uLCBtZXNzYWdlLmF2YWlsYWJsZUNhdGVnb3JpZXMsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIkVTVElNQVRFX0JVREdFVFwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVFc3RpbWF0ZUJ1ZGdldChtZXNzYWdlLnRpdGxlLCBtZXNzYWdlLmNhdGVnb3J5LCBtZXNzYWdlLmRlc2NyaXB0aW9uLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJHRU5FUkFURV9ERVNDUklQVElPTlwiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVHZW5lcmF0ZURlc2NyaXB0aW9uKG1lc3NhZ2UudGl0bGUsIG1lc3NhZ2UuY2F0ZWdvcnksIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSBcIklNUE9SVF9KT0JcIjpcclxuICAgICAgYXdhaXQgaGFuZGxlSW1wb3J0Sm9iKG1lc3NhZ2UucGF5bG9hZCwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiR0VUX0lNUE9SVF9ISVNUT1JZXCI6XHJcbiAgICAgIGF3YWl0IGhhbmRsZUdldEltcG9ydEhpc3Rvcnkoc2VuZFJlc3BvbnNlKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlIFwiR0VUX0lNUE9SVF9TVEFUU1wiOlxyXG4gICAgICBhd2FpdCBoYW5kbGVHZXRJbXBvcnRTdGF0cyhzZW5kUmVzcG9uc2UpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgXCJJTkpFQ1RfQU5EX1NDQU5cIjpcclxuICAgICAgYXdhaXQgaGFuZGxlSW5qZWN0QW5kU2NhbihtZXNzYWdlLnRhYklkLCBtZXNzYWdlLmF1dG9TY3JvbGwsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDoge1xyXG4gICAgICBjb25zdCB1bmtub3duVHlwZSA9IChtZXNzYWdlIGFzIHsgdHlwZT86IHVua25vd24gfSkudHlwZTtcclxuICAgICAgY29uc29sZS53YXJuKGBbTG9jYWxQcm9dIFVuaGFuZGxlZCBtZXNzYWdlIHR5cGU6ICR7U3RyaW5nKHVua25vd25UeXBlKX1gKTtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgZXJyb3I6IGBVbmtub3duIG1lc3NhZ2UgdHlwZTogJHtTdHJpbmcodW5rbm93blR5cGUpfWAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgSGFuZGxlciBpbXBsZW1lbnRhdGlvbnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVMb2dpbihcclxuICBlbWFpbDogc3RyaW5nLFxyXG4gIHBhc3N3b3JkOiBzdHJpbmcsXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBMb2dpblJlc3BvbnNlKSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBhcGlSZXMgPSBhd2FpdCBsb2dpbih7IGVtYWlsLCBwYXNzd29yZCB9KTtcclxuICAgIGNvbnN0IHVzZXI6IEF1dGhTdGF0dXNSZXNwb25zZVtcInVzZXJcIl0gPSB7XHJcbiAgICAgIF9pZDogKGFwaVJlcy51c2VyIGFzIHVua25vd24gYXMgeyBpZD86IHN0cmluZyB9KS5pZCA/PyBcIlwiLFxyXG4gICAgICBuYW1lOiBhcGlSZXMudXNlci5uYW1lLFxyXG4gICAgICBlbWFpbCxcclxuICAgICAgcm9sZTogYXBpUmVzLnVzZXIucm9sZSBhcyBpbXBvcnQoXCIuL3V0aWxzL2FwaVwiKS5NZVJlc3BvbnNlW1wicm9sZVwiXSxcclxuICAgIH07XHJcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBjYWNoZWRfdXNlcjogdXNlciB9KTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHVzZXIgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlTG9nb3V0KHNlbmRSZXNwb25zZTogKHJlczogeyBzdWNjZXNzOiBib29sZWFuIH0pID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgYXdhaXQgbG9nb3V0KCk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICAvLyBDbGVhciBsb2NhbCBjYWNoZSBldmVuIG9uIEFQSSBlcnJvclxyXG4gIH1cclxuICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5yZW1vdmUoXCJjYWNoZWRfdXNlclwiKTtcclxuICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRBdXRoU3RhdHVzKFxyXG4gIHNlbmRSZXNwb25zZTogKHJlczogQXV0aFN0YXR1c1Jlc3BvbnNlKSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IHN0b3JlZCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcImNhY2hlZF91c2VyXCIpO1xyXG4gIGNvbnN0IGNhY2hlZFVzZXIgPSBzdG9yZWRbXCJjYWNoZWRfdXNlclwiXSBhcyBBdXRoU3RhdHVzUmVzcG9uc2VbXCJ1c2VyXCJdIHwgdW5kZWZpbmVkO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgbWUgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xyXG4gICAgY29uc3QgdXNlciA9IHsgX2lkOiBtZS5faWQsIG5hbWU6IG1lLm5hbWUsIGVtYWlsOiBtZS5lbWFpbCwgcm9sZTogbWUucm9sZSB9O1xyXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgY2FjaGVkX3VzZXI6IHVzZXIgfSk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBhdXRoZW50aWNhdGVkOiB0cnVlLCB1c2VyIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgY29uc3QgZXJyT2JqID0gZXJyIGFzIHsgY29kZT86IHN0cmluZyB9O1xyXG4gICAgaWYgKGVyck9iai5jb2RlID09PSBcIlNFU1NJT05fRVhQSVJFRFwiIHx8ICFjYWNoZWRVc2VyKSB7XHJcbiAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnJlbW92ZShcImNhY2hlZF91c2VyXCIpO1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBhdXRoZW50aWNhdGVkOiBmYWxzZSB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IGF1dGhlbnRpY2F0ZWQ6IHRydWUsIHVzZXI6IGNhY2hlZFVzZXIgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRDYXRlZ29yaWVzKFxyXG4gIHNlbmRSZXNwb25zZTogKHJlczogR2V0Q2F0ZWdvcmllc1Jlc3BvbnNlKSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjYXRzID0gYXdhaXQgZ2V0Q2FjaGVkQ2F0ZWdvcmllcygpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgY2F0ZWdvcmllczogY2F0cyB9KTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBjYXRlZ29yaWVzOiBbXSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQ2xhc3NpZnlDYXRlZ29yeShcclxuICB0aXRsZTogc3RyaW5nLFxyXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcsXHJcbiAgYXZhaWxhYmxlQ2F0ZWdvcmllczogc3RyaW5nW10sXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBDbGFzc2lmeUNhdGVnb3J5UmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzaWZ5Q2F0ZWdvcnkoeyB0aXRsZSwgZGVzY3JpcHRpb24sIGF2YWlsYWJsZUNhdGVnb3JpZXMgfSk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBjYXRlZ29yeTogcmVzdWx0LmNhdGVnb3J5IH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyKSB9KTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUVzdGltYXRlQnVkZ2V0KFxyXG4gIHRpdGxlOiBzdHJpbmcsXHJcbiAgY2F0ZWdvcnk6IHN0cmluZyxcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG4gIHNlbmRSZXNwb25zZTogKHJlczogRXN0aW1hdGVCdWRnZXRSZXNwb25zZSkgPT4gdm9pZFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXN0aW1hdGVCdWRnZXQoeyB0aXRsZSwgY2F0ZWdvcnksIGRlc2NyaXB0aW9uIH0pO1xyXG4gICAgc2VuZFJlc3BvbnNlKHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgbWluOiByZXN1bHQubWluLFxyXG4gICAgICBtYXg6IHJlc3VsdC5tYXgsXHJcbiAgICAgIG1pZHBvaW50OiByZXN1bHQubWlkcG9pbnQsXHJcbiAgICAgIG5vdGU6IHJlc3VsdC5ub3RlLFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnIpIH0pO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2VuZXJhdGVEZXNjcmlwdGlvbihcclxuICB0aXRsZTogc3RyaW5nLFxyXG4gIGNhdGVnb3J5OiBzdHJpbmcgfCB1bmRlZmluZWQsXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBHZW5lcmF0ZURlc2NyaXB0aW9uUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdlbmVyYXRlRGVzY3JpcHRpb24oeyB0aXRsZSwgY2F0ZWdvcnkgfSk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkZXNjcmlwdGlvbjogcmVzdWx0LmRlc2NyaXB0aW9uIH0pO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyKSB9KTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldEltcG9ydEhpc3RvcnkoXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiBHZXRJbXBvcnRIaXN0b3J5UmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IGdldEltcG9ydEhpc3RvcnkoKTtcclxuICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBoaXN0b3J5IH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRJbXBvcnRTdGF0cyhcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IEdldEltcG9ydFN0YXRzUmVzcG9uc2UpID0+IHZvaWRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IGdldEltcG9ydEhpc3RvcnkoKTtcclxuICBzZW5kUmVzcG9uc2UoeyBjb3VudDogaGlzdG9yeS5sZW5ndGggfSk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUltcG9ydEpvYihcclxuICBqb2I6IGltcG9ydChcIi4vdHlwZXNcIikuSm9iUG9zdCxcclxuICBzZW5kUmVzcG9uc2U6IChyZXM6IEltcG9ydEpvYlJlc3BvbnNlKSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGxldCBjYXRlZ29yeUlkID0gam9iLmNhdGVnb3J5SWQ7XHJcblxyXG4gIGlmICghY2F0ZWdvcnlJZCAmJiBqb2IuY2F0ZWdvcnkpIHtcclxuICAgIGNvbnN0IGNhdHMgPSBhd2FpdCBnZXRDYWNoZWRDYXRlZ29yaWVzKCk7XHJcbiAgICBjb25zdCBtYXRjaGVkID0gY2F0cy5maW5kKFxyXG4gICAgICAoYykgPT4gYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IChqb2IuY2F0ZWdvcnkgPz8gXCJcIikudG9Mb3dlckNhc2UoKVxyXG4gICAgKTtcclxuICAgIGNhdGVnb3J5SWQgPSBtYXRjaGVkPy5faWQ7XHJcbiAgfVxyXG5cclxuICBjb25zdCBzb3VyY2VOb3RlID0gW1xyXG4gICAgYFxcblxcbi0tLWAsXHJcbiAgICBgSW1wb3J0ZWQgZnJvbSAke2pvYi5zb3VyY2UgPT09IFwiZmFjZWJvb2tcIiA/IFwiRmFjZWJvb2tcIiA6IGpvYi5zb3VyY2UgPT09IFwibGlua2VkaW5cIiA/IFwiTGlua2VkSW5cIiA6IGpvYi5zb3VyY2UgPT09IFwiam9ic3RyZWV0XCIgPyBcIkpvYlN0cmVldFwiIDogXCJJbmRlZWRcIn06ICR7am9iLnNvdXJjZV91cmx9YCxcclxuICAgIGpvYi5wb3N0ZWRfYnkgPyBgUG9zdGVkIGJ5OiAke2pvYi5wb3N0ZWRfYnl9YCA6IG51bGwsXHJcbiAgICBqb2IudGltZXN0YW1wID8gYE9yaWdpbmFsIHRpbWVzdGFtcDogJHtqb2IudGltZXN0YW1wfWAgOiBudWxsLFxyXG4gIF1cclxuICAgIC5maWx0ZXIoQm9vbGVhbilcclxuICAgIC5qb2luKFwiXFxuXCIpO1xyXG5cclxuICBjb25zdCBmYWxsYmFja1NjaGVkdWxlRGF0ZSA9IG5ldyBEYXRlKERhdGUubm93KCkgKyA4Nl80MDBfMDAwKS50b0lTT1N0cmluZygpO1xyXG5cclxuICBjb25zdCBwYXlsb2FkOiBKb2JJbXBvcnRQYXlsb2FkID0ge1xyXG4gICAgdGl0bGU6IGpvYi50aXRsZSxcclxuICAgIGRlc2NyaXB0aW9uOiBqb2IuZGVzY3JpcHRpb24gKyBzb3VyY2VOb3RlLFxyXG4gICAgY2F0ZWdvcnk6IGNhdGVnb3J5SWQgPz8gXCJcIixcclxuICAgIGJ1ZGdldDogam9iLmJ1ZGdldCA/PyAwLFxyXG4gICAgbG9jYXRpb246IGpvYi5sb2NhdGlvbiA/PyBcIlwiLFxyXG4gICAgc2NoZWR1bGVEYXRlOiBqb2Iuc2NoZWR1bGVEYXRlXHJcbiAgICAgID8gbmV3IERhdGUoam9iLnNjaGVkdWxlRGF0ZSkudG9JU09TdHJpbmcoKVxyXG4gICAgICA6IGZhbGxiYWNrU2NoZWR1bGVEYXRlLFxyXG4gICAgdGFnczogW1xyXG4gICAgICBgaW1wb3J0ZWRfZnJvbV8ke2pvYi5zb3VyY2V9YCxcclxuICAgICAgLi4uKGpvYi5jYXRlZ29yeSA/IFtqb2IuY2F0ZWdvcnkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csIFwiX1wiKV0gOiBbXSksXHJcbiAgICBdLFxyXG4gIH07XHJcblxyXG4gIGlmICghcGF5bG9hZC5jYXRlZ29yeSkge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlBsZWFzZSBzZWxlY3QgYSBjYXRlZ29yeSBiZWZvcmUgc3VibWl0dGluZy5cIiB9KTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKCFwYXlsb2FkLmxvY2F0aW9uKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTG9jYXRpb24gaXMgcmVxdWlyZWQuXCIgfSk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmICghcGF5bG9hZC5idWRnZXQgfHwgcGF5bG9hZC5idWRnZXQgPD0gMCkge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkJ1ZGdldCBpcyByZXF1aXJlZCAoUEhQKS5cIiB9KTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVKb2IocGF5bG9hZCk7XHJcblxyXG4gICAgLy8gUGVyc2lzdCB0byBoaXN0b3J5ICsgdXBkYXRlIHRvZGF5J3MgYmFkZ2UgY291bnRcclxuICAgIGF3YWl0IHNhdmVJbXBvcnRSZWNvcmQoe1xyXG4gICAgICBqb2JfaWQ6IHJlc3VsdC5faWQsXHJcbiAgICAgIHRpdGxlOiBqb2IudGl0bGUsXHJcbiAgICAgIHNvdXJjZTogam9iLnNvdXJjZSxcclxuICAgICAgc291cmNlX3VybDogam9iLnNvdXJjZV91cmwsXHJcbiAgICAgIGltcG9ydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIH0pO1xyXG4gICAgYXdhaXQgdXBkYXRlQmFkZ2UoKTtcclxuXHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBqb2JfaWQ6IHJlc3VsdC5faWQgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBjb25zdCBlcnJPYmogPSBlcnIgYXMgeyBjb2RlPzogc3RyaW5nOyBlcnJvcj86IHN0cmluZyB9O1xyXG4gICAgaWYgKGVyck9iai5jb2RlID09PSBcIlNFU1NJT05fRVhQSVJFRFwiKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJTZXNzaW9uIGV4cGlyZWQuIFBsZWFzZSBzaWduIGluIGFnYWluIHZpYSB0aGUgZXh0ZW5zaW9uLlwiIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyKSB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmNvbnN0IFNVUFBPUlRFRF9IT1NUUyA9IFtcImZhY2Vib29rLmNvbVwiLCBcImxpbmtlZGluLmNvbVwiLCBcImpvYnN0cmVldC5jb21cIiwgXCJpbmRlZWQuY29tXCJdO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlSW5qZWN0QW5kU2NhbihcclxuICB0YWJJZDogbnVtYmVyLFxyXG4gIGF1dG9TY3JvbGw6IGJvb2xlYW4sXHJcbiAgc2VuZFJlc3BvbnNlOiAocmVzOiB7IG9rOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9KSA9PiB2b2lkXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIC8vIFZhbGlkYXRlIHRhYiBVUkwgYmVmb3JlIGluamVjdGlvblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWIgPSBhd2FpdCBjaHJvbWUudGFicy5nZXQodGFiSWQpO1xyXG4gICAgaWYgKCF0YWIudXJsIHx8ICFTVVBQT1JURURfSE9TVFMuc29tZSgoaCkgPT4gdGFiLnVybCEuaW5jbHVkZXMoaCkpKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IG9rOiBmYWxzZSwgZXJyb3I6IFwiVGFiIGlzIG5vdCBhIHN1cHBvcnRlZCBqb2Igc2l0ZS5cIiB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2gge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IGZhbHNlLCBlcnJvcjogXCJDb3VsZCBub3QgdmVyaWZ5IHRhYiBVUkwuXCIgfSk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiBjb250ZW50IHNjcmlwdCBpcyBhbHJlYWR5IGFsaXZlXHJcbiAgbGV0IGFsaXZlID0gZmFsc2U7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBpbmcgPSBhd2FpdCBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgeyB0eXBlOiBcIlBJTkdcIiB9KTtcclxuICAgIGFsaXZlID0gISEocGluZyBhcyB7IG9rPzogYm9vbGVhbiB9KT8ub2s7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICBhbGl2ZSA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFhbGl2ZSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcclxuICAgICAgICB0YXJnZXQ6IHsgdGFiSWQgfSxcclxuICAgICAgICBmaWxlczogW1wiY29udGVudC5qc1wiXSxcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIFdhaXQgZm9yIHRoZSBjb250ZW50IHNjcmlwdCB0byByZWdpc3RlciBpdHMgbWVzc2FnZSBsaXN0ZW5lclxyXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA3MDApKTtcclxuICAgIH0gY2F0Y2ggKGluamVjdEVycikge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBvazogZmFsc2UsIGVycm9yOiBgSW5qZWN0aW9uIGZhaWxlZDogJHtlcnJvck1lc3NhZ2UoaW5qZWN0RXJyKX1gIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogXCJTQ0FOX1RBQlwiLCBhdXRvU2Nyb2xsIH0pO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgb2s6IHRydWUgfSk7XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBvazogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyKSB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBVdGlsaXR5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycjogdW5rbm93bik6IHN0cmluZyB7XHJcbiAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gZXJyLm1lc3NhZ2U7XHJcbiAgY29uc3Qgb2JqID0gZXJyIGFzIHsgZXJyb3I/OiBzdHJpbmc7IG1lc3NhZ2U/OiBzdHJpbmcgfTtcclxuICByZXR1cm4gb2JqPy5lcnJvciA/PyBvYmo/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycik7XHJcbn1cclxuXHJcbi8vIFJlZnJlc2ggYmFkZ2Ugb24gc2VydmljZSB3b3JrZXIgc3RhcnR1cFxyXG52b2lkIHVwZGF0ZUJhZGdlKCk7XHJcblxyXG5jb25zb2xlLmxvZyhgW0xvY2FsUHJvXSBCYWNrZ3JvdW5kIHNlcnZpY2Ugd29ya2VyIHN0YXJ0ZWQuIEFQSTogJHtBUElfQkFTRV9VUkx9YCk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7OztBQWlCTyxNQUFNLGVBQWU7QUFjNUIsaUJBQXNCLFNBQVksTUFBYyxVQUF3QixDQUFDLEdBQWU7QUFDdEYsVUFB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
