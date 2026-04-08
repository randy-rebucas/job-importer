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
    const request = { ...init, headers, credentials: "include" };
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
  async function login(email, password) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      retry: false
    });
  }
  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST", retry: false });
  }
  async function getCurrentUser() {
    return apiFetch("/api/auth/me");
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
  async function getNotifications() {
    return apiFetch("/api/notifications?limit=20");
  }
  async function markNotificationRead(id) {
    await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }
  async function getJobs(params = {}) {
    const q = new URLSearchParams({ status: "open", limit: String(params.limit ?? 5) });
    if (params.aiRank) q.set("aiRank", "true");
    return apiFetch(`/api/jobs?${q}`);
  }
  async function createJob(payload) {
    return apiFetch("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
  }
  async function createQuote(payload) {
    return apiFetch("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
  }
  async function getThreads() {
    return apiFetch("/api/messages/threads");
  }
  async function getMessages(threadId) {
    return apiFetch(`/api/messages/${threadId}`);
  }
  async function sendMessage(threadId, body) {
    await apiFetch(`/api/messages/${threadId}`, {
      method: "POST",
      body: JSON.stringify({ body })
    });
  }
  async function getPayment(sessionId, jobId) {
    const q = jobId ? `?jobId=${jobId}` : "";
    return apiFetch(`/api/payments/${sessionId}${q}`);
  }
  async function createReferral(payload) {
    return apiFetch("/api/peso/referrals", { method: "POST", body: JSON.stringify(payload) });
  }
  async function getMyJobs(status) {
    const q = new URLSearchParams({ mine: "true", limit: "10" });
    if (status) q.set("status", status);
    return apiFetch(`/api/jobs?${q}`);
  }
  async function getJobMilestones(jobId) {
    return apiFetch(`/api/jobs/${jobId}/milestones`);
  }
  async function getQuoteTemplates() {
    return apiFetch("/api/quote-templates");
  }
  async function omniSearch(q) {
    return apiFetch(`/api/search?q=${encodeURIComponent(q)}&omni=true&limit=15`);
  }
  async function getRecurringJobs() {
    return apiFetch("/api/recurring");
  }
  async function getWallet() {
    return apiFetch("/api/wallet");
  }
  async function getWalletTransactions() {
    return apiFetch("/api/wallet/transactions?limit=10");
  }
  async function createReview(payload) {
    return apiFetch("/api/reviews", { method: "POST", body: JSON.stringify(payload) });
  }
  async function markJobComplete(jobId) {
    return apiFetch(`/api/jobs/${jobId}/mark-complete`, { method: "POST" });
  }
  async function getCompletedJobs() {
    return apiFetch("/api/jobs?status=complete&limit=5&needsReview=true");
  }
  async function searchProviders(q) {
    return apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=providers&limit=10`);
  }
  async function addFavorite(providerId) {
    return apiFetch(`/api/favorites/${providerId}`, { method: "POST" });
  }
  async function removeFavorite(providerId) {
    return apiFetch(`/api/favorites/${providerId}`, { method: "DELETE" });
  }
  async function getAnnouncements() {
    return apiFetch("/api/announcements");
  }
  async function getSupportTickets() {
    return apiFetch("/api/support/tickets");
  }
  async function createSupportTicket(payload) {
    return apiFetch("/api/support/tickets", { method: "POST", body: JSON.stringify(payload) });
  }
  async function getLoyalty() {
    return apiFetch("/api/loyalty");
  }
  async function redeemLoyalty(points) {
    return apiFetch("/api/loyalty/redeem", { method: "POST", body: JSON.stringify({ points }) });
  }
  async function getLoyaltyReferral() {
    return apiFetch("/api/loyalty/referral");
  }
  async function getDisputes() {
    return apiFetch("/api/disputes");
  }
  async function createDispute(payload) {
    return apiFetch("/api/disputes", { method: "POST", body: JSON.stringify(payload) });
  }
  async function getProviderProfile() {
    return apiFetch("/api/provider/profile");
  }
  async function updateProviderAvailability(isAvailable) {
    return apiFetch("/api/provider", { method: "PATCH", body: JSON.stringify({ isAvailable }) });
  }
  async function getKycStatus() {
    return apiFetch("/api/kyc");
  }

  // background/service-worker.ts
  var KEYS = {
    USER: "companion_user",
    NOTIF_BADGE: "companion_notif_badge",
    LAST_JOB_IDS: "companion_last_job_ids",
    TRACKED_PAYMENTS: "companion_tracked_payments",
    JOB_STATUS_CACHE: "companion_job_status_cache"
  };
  var ALARMS = {
    JOB_POLL: "companion_job_poll",
    PAYMENT_POLL: "companion_payment_poll",
    TOKEN_CHECK: "companion_token_check",
    RECURRING_POLL: "companion_recurring_poll",
    JOB_STATUS_POLL: "companion_job_status_poll"
  };
  var cachedUser = null;
  async function loadCachedUser() {
    if (cachedUser) return cachedUser;
    const stored = await chrome.storage.local.get(KEYS.USER);
    cachedUser = stored[KEYS.USER] ?? null;
    return cachedUser;
  }
  async function saveUser(user) {
    cachedUser = user;
    await chrome.storage.local.set({ [KEYS.USER]: user });
  }
  async function clearUser() {
    cachedUser = null;
    await chrome.storage.local.remove(KEYS.USER);
    sseClose();
    await setBadgeCount(0);
  }
  var sseAbort = null;
  function sseClose() {
    sseAbort?.abort();
    sseAbort = null;
  }
  async function sseOpen() {
    sseClose();
    const user = await loadCachedUser();
    if (!user) return;
    sseAbort = new AbortController();
    try {
      const res = await fetch("https://www.localpro.asia/api/notifications/stream", {
        credentials: "include",
        signal: sseAbort.signal
      });
      if (!res.ok || !res.body) {
        if (res.status === 401) await clearUser();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              if (data.type !== "heartbeat") await incrementBadge();
            } catch {
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("[LocalPro Companion] SSE dropped, alarm will reconnect");
      }
    }
  }
  async function refreshBadge() {
    try {
      const { unreadCount } = await getNotifications();
      await setBadgeCount(unreadCount);
    } catch {
    }
  }
  async function setBadgeCount(count) {
    const text = count > 0 ? count > 99 ? "99+" : String(count) : "";
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: count > 0 ? "#e53e3e" : "#1a56db" });
    await chrome.storage.local.set({ [KEYS.NOTIF_BADGE]: count });
  }
  async function incrementBadge() {
    const stored = await chrome.storage.local.get(KEYS.NOTIF_BADGE);
    const current = stored[KEYS.NOTIF_BADGE] ?? 0;
    await setBadgeCount(current + 1);
  }
  async function pollJobs() {
    const user = await loadCachedUser();
    if (!user || user.role !== "provider") return;
    try {
      const { jobs } = await getJobs({ aiRank: true, limit: 5 });
      const stored = await chrome.storage.local.get(KEYS.LAST_JOB_IDS);
      const seenIds = new Set(stored[KEYS.LAST_JOB_IDS] ?? []);
      const newJobs = jobs.filter((j) => !seenIds.has(j._id));
      if (newJobs.length > 0) {
        const label = newJobs.length === 1 ? newJobs[0].title : `${newJobs.length} new jobs available`;
        chrome.notifications.create(`lp-jobs-${Date.now()}`, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "New Jobs on LocalPro",
          message: label
        });
      }
      await chrome.storage.local.set({ [KEYS.LAST_JOB_IDS]: jobs.map((j) => j._id) });
    } catch {
    }
  }
  async function pollPayments() {
    const user = await loadCachedUser();
    if (!user) return;
    const stored = await chrome.storage.local.get(KEYS.TRACKED_PAYMENTS);
    const tracked = stored[KEYS.TRACKED_PAYMENTS] ?? [];
    if (tracked.length === 0) return;
    const remaining = [];
    for (const { sessionId, jobId } of tracked) {
      try {
        const { payment } = await getPayment(sessionId, jobId);
        if (payment.status === "paid") {
          chrome.notifications.create(`lp-pay-${sessionId}`, {
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "Payment Confirmed",
            message: "Payment confirmed \u2014 escrow funded!"
          });
        } else {
          remaining.push({ sessionId, jobId });
        }
      } catch {
        remaining.push({ sessionId, jobId });
      }
    }
    await chrome.storage.local.set({ [KEYS.TRACKED_PAYMENTS]: remaining });
    if (remaining.length === 0) await chrome.alarms.clear(ALARMS.PAYMENT_POLL);
  }
  async function setupAlarms() {
    if (!await chrome.alarms.get(ALARMS.JOB_POLL)) {
      chrome.alarms.create(ALARMS.JOB_POLL, { periodInMinutes: 5 });
    }
    if (!await chrome.alarms.get(ALARMS.TOKEN_CHECK)) {
      chrome.alarms.create(ALARMS.TOKEN_CHECK, { periodInMinutes: 10 });
    }
    if (!await chrome.alarms.get(ALARMS.RECURRING_POLL)) {
      chrome.alarms.create(ALARMS.RECURRING_POLL, { periodInMinutes: 30 });
    }
    if (!await chrome.alarms.get(ALARMS.JOB_STATUS_POLL)) {
      chrome.alarms.create(ALARMS.JOB_STATUS_POLL, { periodInMinutes: 3 });
    }
  }
  async function pollRecurringJobs() {
    const user = await loadCachedUser();
    if (!user) return;
    try {
      const { jobs } = await getRecurringJobs();
      const now = Date.now();
      const thirtyMin = 30 * 60 * 1e3;
      jobs.forEach((job) => {
        const next = new Date(job.nextOccurrence).getTime();
        if (next > now && next - now <= thirtyMin) {
          chrome.notifications.create(`lp-recurring-${job._id}`, {
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "Upcoming Job Reminder",
            message: `"${job.title}" starts in 30 minutes.`
          });
        }
      });
    } catch {
    }
  }
  var STATUS_LABELS = {
    open: "Open",
    assigned: "Assigned",
    "in-progress": "In Progress",
    complete: "Complete"
  };
  async function pollJobStatuses() {
    const user = await loadCachedUser();
    if (!user || user.role !== "client" && user.role !== "provider") return;
    try {
      const { jobs } = await getMyJobs();
      const stored = await chrome.storage.local.get(KEYS.JOB_STATUS_CACHE);
      const cache = stored[KEYS.JOB_STATUS_CACHE] ?? {};
      const newCache = {};
      for (const job of jobs) {
        const prev = cache[job._id];
        newCache[job._id] = job.status;
        if (prev && prev !== job.status) {
          chrome.notifications.create(`lp-jobstatus-${job._id}-${Date.now()}`, {
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "Job Status Updated",
            message: `"${job.title}" changed to ${STATUS_LABELS[job.status] ?? job.status}.`
          });
        }
      }
      await chrome.storage.local.set({ [KEYS.JOB_STATUS_CACHE]: newCache });
    } catch {
    }
  }
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARMS.JOB_POLL) {
      await pollJobs();
      if (!sseAbort) void sseOpen();
    }
    if (alarm.name === ALARMS.PAYMENT_POLL) await pollPayments();
    if (alarm.name === ALARMS.RECURRING_POLL) await pollRecurringJobs();
    if (alarm.name === ALARMS.JOB_STATUS_POLL) await pollJobStatuses();
    if (alarm.name === ALARMS.TOKEN_CHECK) {
      const user = await loadCachedUser();
      if (!user) return;
      try {
        await getCurrentUser();
      } catch (err) {
        const code = err.code;
        if (code === "SESSION_EXPIRED") {
          const refreshed = await tryRefreshToken();
          if (!refreshed) await clearUser();
        }
      }
    }
  });
  chrome.runtime.onMessage.addListener(
    (msg, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id) return;
      void handleMessage(msg, sendResponse);
      return true;
    }
  );
  async function handleMessage(msg, respond) {
    const errResp = (error) => respond({ ok: false, error });
    switch (msg.type) {
      case "SET_PREFILL": {
        await chrome.storage.session.set({ [`lp_prefill_${msg.key}`]: msg.value });
        respond({ ok: true });
        break;
      }
      case "GET_PREFILL": {
        const keys = msg.keys.map((k) => `lp_prefill_${k}`);
        const data = await chrome.storage.session.get(keys);
        await chrome.storage.session.remove(keys);
        const result = {};
        for (const k of msg.keys) {
          result[k] = data[`lp_prefill_${k}`] ?? null;
        }
        respond({ ok: true, ...result });
        break;
      }
      case "GET_AUTH": {
        const user = await loadCachedUser();
        respond({ user });
        break;
      }
      case "LOGIN": {
        try {
          const { user } = await login(msg.email, msg.password);
          const me = await getCurrentUser();
          await saveUser(me);
          await setupAlarms();
          await refreshBadge();
          void sseOpen();
          respond({ ok: true, user: me });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "LOGOUT": {
        try {
          await logout();
        } catch {
        }
        await clearUser();
        respond({ ok: true });
        break;
      }
      case "GET_NOTIFICATIONS": {
        try {
          const data = await getNotifications();
          await setBadgeCount(data.unreadCount);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "MARK_NOTIFICATION_READ": {
        try {
          await markNotificationRead(msg.id);
          await refreshBadge();
          respond({ ok: true });
        } catch {
          respond({ ok: false });
        }
        break;
      }
      case "GET_JOBS": {
        try {
          const data = await getJobs({ aiRank: msg.aiRank, limit: msg.limit });
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "POST_JOB": {
        try {
          const data = await createJob(msg.payload);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "POST_QUOTE": {
        try {
          await createQuote(msg.payload);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_THREADS": {
        try {
          const data = await getThreads();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_MESSAGES": {
        try {
          const data = await getMessages(msg.threadId);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "SEND_MESSAGE": {
        try {
          await sendMessage(msg.threadId, msg.body);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_PAYMENT": {
        try {
          const data = await getPayment(msg.sessionId, msg.jobId);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "TRACK_PAYMENT": {
        const stored = await chrome.storage.local.get(KEYS.TRACKED_PAYMENTS);
        const tracked = stored[KEYS.TRACKED_PAYMENTS] ?? [];
        if (!tracked.find((t) => t.sessionId === msg.sessionId)) {
          tracked.push({ sessionId: msg.sessionId, jobId: msg.jobId });
          await chrome.storage.local.set({ [KEYS.TRACKED_PAYMENTS]: tracked });
        }
        if (!await chrome.alarms.get(ALARMS.PAYMENT_POLL)) {
          chrome.alarms.create(ALARMS.PAYMENT_POLL, { periodInMinutes: 0.5 });
        }
        respond({ ok: true });
        break;
      }
      case "STOP_TRACKING_PAYMENT": {
        const stored = await chrome.storage.local.get(KEYS.TRACKED_PAYMENTS);
        const filtered = (stored[KEYS.TRACKED_PAYMENTS] ?? []).filter((t) => t.sessionId !== msg.sessionId);
        await chrome.storage.local.set({ [KEYS.TRACKED_PAYMENTS]: filtered });
        if (filtered.length === 0) await chrome.alarms.clear(ALARMS.PAYMENT_POLL);
        respond({ ok: true });
        break;
      }
      case "POST_REFERRAL": {
        try {
          await createReferral(msg.payload);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_MY_JOBS": {
        try {
          const data = await getMyJobs(msg.status);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_JOB_MILESTONES": {
        try {
          const data = await getJobMilestones(msg.jobId);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "MARK_JOB_COMPLETE": {
        try {
          await markJobComplete(msg.jobId);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_QUOTE_TEMPLATES": {
        try {
          const data = await getQuoteTemplates();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "OMNI_SEARCH": {
        try {
          const data = await omniSearch(msg.q);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_RECURRING_JOBS": {
        try {
          const data = await getRecurringJobs();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_WALLET": {
        try {
          const data = await getWallet();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_WALLET_TRANSACTIONS": {
        try {
          const data = await getWalletTransactions();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "POST_REVIEW": {
        try {
          await createReview(msg.payload);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_COMPLETED_JOBS": {
        try {
          const data = await getCompletedJobs();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "SEARCH_PROVIDERS": {
        try {
          const data = await searchProviders(msg.q);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "ADD_FAVORITE": {
        try {
          await addFavorite(msg.providerId);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "REMOVE_FAVORITE": {
        try {
          await removeFavorite(msg.providerId);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_ANNOUNCEMENTS": {
        try {
          const data = await getAnnouncements();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_SUPPORT_TICKETS": {
        try {
          const data = await getSupportTickets();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "POST_SUPPORT_TICKET": {
        try {
          const data = await createSupportTicket(msg.payload);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_LOYALTY": {
        try {
          const data = await getLoyalty();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "POST_LOYALTY_REDEEM": {
        try {
          const data = await redeemLoyalty(msg.points);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_LOYALTY_REFERRAL": {
        try {
          const data = await getLoyaltyReferral();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_DISPUTES": {
        try {
          const data = await getDisputes();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "POST_DISPUTE": {
        try {
          const data = await createDispute(msg.payload);
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_PROVIDER_PROFILE": {
        try {
          const data = await getProviderProfile();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "SET_AVAILABILITY": {
        try {
          await updateProviderAvailability(msg.isAvailable);
          respond({ ok: true });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      case "GET_KYC": {
        try {
          const data = await getKycStatus();
          respond({ ok: true, ...data });
        } catch (err) {
          errResp(err.error ?? String(err));
        }
        break;
      }
      default:
        respond({ ok: false, error: "Unknown message type" });
    }
  }
  async function boot() {
    await setupAlarms();
    const user = await loadCachedUser();
    if (user) {
      await refreshBadge();
      void sseOpen();
    }
  }
  chrome.runtime.onInstalled.addListener(() => void boot());
  chrome.runtime.onStartup.addListener(() => void boot());
})();
