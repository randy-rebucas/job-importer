/**
 * LocalPro Companion — Background Service Worker
 *
 * Auth model: identical to the Job Importer extension.
 * Uses HttpOnly cookie sessions (credentials: "include") — no Bearer tokens.
 * Cached user stored in chrome.storage.local["companion_user"].
 */

import {
  login, logout, getCurrentUser, tryRefreshToken,
  getNotifications, markNotificationRead,
  getJobs, createJob,
  createQuote,
  getThreads, getMessages, sendMessage,
  getPayment, createReferral,
  getMyJobs, getJobMilestones, markJobComplete,
  getQuoteTemplates,
  omniSearch,
  getRecurringJobs,
  getWallet, getWalletTransactions,
  createReview, getCompletedJobs,
  searchProviders, addFavorite, removeFavorite,
  getAnnouncements,
  getSupportTickets, createSupportTicket,
  getLoyalty, redeemLoyalty, getLoyaltyReferral,
  getDisputes, createDispute,
  getProviderProfile, updateProviderAvailability,
  getKycStatus,
  MeResponse, ApiError,
} from "../utils/api";

// ── Storage keys (namespaced to avoid collision with Job Importer) ─────────────

const KEYS = {
  USER:              "companion_user",
  NOTIF_BADGE:       "companion_notif_badge",
  LAST_JOB_IDS:     "companion_last_job_ids",
  TRACKED_PAYMENTS:  "companion_tracked_payments",
  JOB_STATUS_CACHE:  "companion_job_status_cache",
} as const;

const ALARMS = {
  JOB_POLL:        "companion_job_poll",
  PAYMENT_POLL:    "companion_payment_poll",
  TOKEN_CHECK:     "companion_token_check",
  RECURRING_POLL:  "companion_recurring_poll",
  JOB_STATUS_POLL: "companion_job_status_poll",
} as const;

// ── Cached user (mirrors working extension pattern) ───────────────────────────

let cachedUser: MeResponse | null = null;

async function loadCachedUser(): Promise<MeResponse | null> {
  if (cachedUser) return cachedUser;
  const stored = await chrome.storage.local.get(KEYS.USER);
  cachedUser = (stored[KEYS.USER] as MeResponse) ?? null;
  return cachedUser;
}

async function saveUser(user: MeResponse): Promise<void> {
  cachedUser = user;
  await chrome.storage.local.set({ [KEYS.USER]: user });
}

async function clearUser(): Promise<void> {
  cachedUser = null;
  await chrome.storage.local.remove(KEYS.USER);
  sseClose();
  await setBadgeCount(0);
}

// ── SSE (same fetch+ReadableStream pattern as spec) ───────────────────────────

let sseAbort: AbortController | null = null;

function sseClose() {
  sseAbort?.abort();
  sseAbort = null;
}

async function sseOpen(): Promise<void> {
  sseClose();
  const user = await loadCachedUser();
  if (!user) return;

  sseAbort = new AbortController();

  try {
    const res = await fetch("https://www.localpro.asia/api/notifications/stream", {
      credentials: "include",
      signal: sseAbort.signal,
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
            const data = JSON.parse(line.slice(5).trim()) as { type?: string };
            if (data.type !== "heartbeat") await incrementBadge();
          } catch { /* ignore malformed */ }
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string }).name !== "AbortError") {
      console.warn("[LocalPro Companion] SSE dropped, alarm will reconnect");
    }
  }
}

// ── Badge ─────────────────────────────────────────────────────────────────────

async function refreshBadge(): Promise<void> {
  try {
    const { unreadCount } = await getNotifications();
    await setBadgeCount(unreadCount);
  } catch { /* keep existing badge on error */ }
}

async function setBadgeCount(count: number): Promise<void> {
  const text = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: count > 0 ? "#e53e3e" : "#1a56db" });
  await chrome.storage.local.set({ [KEYS.NOTIF_BADGE]: count });
}

async function incrementBadge(): Promise<void> {
  const stored = await chrome.storage.local.get(KEYS.NOTIF_BADGE);
  const current = (stored[KEYS.NOTIF_BADGE] as number) ?? 0;
  await setBadgeCount(current + 1);
}

// ── Job polling ───────────────────────────────────────────────────────────────

async function pollJobs(): Promise<void> {
  const user = await loadCachedUser();
  if (!user || user.role !== "provider") return;

  try {
    const { jobs } = await getJobs({ aiRank: true, limit: 5 });
    const stored = await chrome.storage.local.get(KEYS.LAST_JOB_IDS);
    const seenIds = new Set<string>((stored[KEYS.LAST_JOB_IDS] as string[]) ?? []);
    const newJobs = jobs.filter((j) => !seenIds.has(j._id));

    if (newJobs.length > 0) {
      const label = newJobs.length === 1
        ? newJobs[0].title
        : `${newJobs.length} new jobs available`;
      chrome.notifications.create(`lp-jobs-${Date.now()}`, {
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "New Jobs on LocalPro",
        message: label,
      });
    }

    await chrome.storage.local.set({ [KEYS.LAST_JOB_IDS]: jobs.map((j) => j._id) });
  } catch { /* network error */ }
}

// ── Payment polling ───────────────────────────────────────────────────────────

interface TrackedPayment { sessionId: string; jobId?: string }

async function pollPayments(): Promise<void> {
  const user = await loadCachedUser();
  if (!user) return;

  const stored = await chrome.storage.local.get(KEYS.TRACKED_PAYMENTS);
  const tracked = (stored[KEYS.TRACKED_PAYMENTS] as TrackedPayment[]) ?? [];
  if (tracked.length === 0) return;

  const remaining: TrackedPayment[] = [];

  for (const { sessionId, jobId } of tracked) {
    try {
      const { payment } = await getPayment(sessionId, jobId);
      if (payment.status === "paid") {
        chrome.notifications.create(`lp-pay-${sessionId}`, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Payment Confirmed",
          message: "Payment confirmed — escrow funded!",
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

// ── Alarm setup ───────────────────────────────────────────────────────────────

async function setupAlarms(): Promise<void> {
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

// ── Recurring job reminder ────────────────────────────────────────────────────

async function pollRecurringJobs(): Promise<void> {
  const user = await loadCachedUser();
  if (!user) return;
  try {
    const { jobs } = await getRecurringJobs();
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;
    jobs.forEach((job) => {
      const next = new Date(job.nextOccurrence).getTime();
      if (next > now && next - now <= thirtyMin) {
        chrome.notifications.create(`lp-recurring-${job._id}`, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Upcoming Job Reminder",
          message: `"${job.title}" starts in 30 minutes.`,
        });
      }
    });
  } catch { /* network error */ }
}

// ── Job status change polling ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open:        "Open",
  assigned:    "Assigned",
  "in-progress": "In Progress",
  complete:    "Complete",
};

async function pollJobStatuses(): Promise<void> {
  const user = await loadCachedUser();
  if (!user || (user.role !== "client" && user.role !== "provider")) return;

  try {
    const { jobs } = await getMyJobs();
    const stored = await chrome.storage.local.get(KEYS.JOB_STATUS_CACHE);
    const cache: Record<string, string> = (stored[KEYS.JOB_STATUS_CACHE] as Record<string, string>) ?? {};

    const newCache: Record<string, string> = {};
    for (const job of jobs) {
      const prev = cache[job._id];
      newCache[job._id] = job.status;
      if (prev && prev !== job.status) {
        chrome.notifications.create(`lp-jobstatus-${job._id}-${Date.now()}`, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Job Status Updated",
          message: `"${job.title}" changed to ${STATUS_LABELS[job.status] ?? job.status}.`,
        });
      }
    }
    await chrome.storage.local.set({ [KEYS.JOB_STATUS_CACHE]: newCache });
  } catch { /* network error — keep existing cache */ }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARMS.JOB_POLL) {
    await pollJobs();
    if (!sseAbort) void sseOpen(); // reconnect if worker was killed
  }
  if (alarm.name === ALARMS.PAYMENT_POLL)    await pollPayments();
  if (alarm.name === ALARMS.RECURRING_POLL)  await pollRecurringJobs();
  if (alarm.name === ALARMS.JOB_STATUS_POLL) await pollJobStatuses();
  if (alarm.name === ALARMS.TOKEN_CHECK) {
    // Re-verify session is still alive; clear on 401
    const user = await loadCachedUser();
    if (!user) return;
    try {
      await getCurrentUser();
    } catch (err) {
      const code = (err as ApiError).code;
      if (code === "SESSION_EXPIRED") {
        // Try refresh first (mirrors working extension)
        const refreshed = await tryRefreshToken();
        if (!refreshed) await clearUser();
      }
    }
  }
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (msg: { type: string; [k: string]: unknown }, sender: { id?: string }, sendResponse: (r: unknown) => void) => {
    if (sender.id !== chrome.runtime.id) return;
    void handleMessage(msg, sendResponse);
    return true; // keep port open for async response
  }
);

async function handleMessage(
  msg: { type: string; [k: string]: unknown },
  respond: (r: unknown) => void
): Promise<void> {

  const errResp = (error: string) => respond({ ok: false, error });

  switch (msg.type) {

    // ── Prefill (cross-context storage for content script → popup) ───────────
    case "SET_PREFILL": {
      await chrome.storage.session.set({ [`lp_prefill_${msg.key as string}`]: msg.value });
      respond({ ok: true });
      break;
    }

    case "GET_PREFILL": {
      const keys = (msg.keys as string[]).map((k) => `lp_prefill_${k}`);
      const data = await chrome.storage.session.get(keys);
      // Clear after reading (one-shot prefill)
      await chrome.storage.session.remove(keys);
      const result: Record<string, unknown> = {};
      for (const k of msg.keys as string[]) {
        result[k] = data[`lp_prefill_${k}`] ?? null;
      }
      respond({ ok: true, ...result });
      break;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    case "GET_AUTH": {
      const user = await loadCachedUser();
      respond({ user });
      break;
    }

    case "LOGIN": {
      try {
        const { user } = await login(msg.email as string, msg.password as string);
        // Fetch full profile (role, _id) — same as working extension pattern
        const me = await getCurrentUser();
        await saveUser(me);
        await setupAlarms();
        await refreshBadge();
        void sseOpen();
        respond({ ok: true, user: me });
      } catch (err) {
        errResp((err as ApiError).error ?? String(err));
      }
      break;
    }

    case "LOGOUT": {
      try { await logout(); } catch { /* ignore */ }
      await clearUser();
      respond({ ok: true });
      break;
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    case "GET_NOTIFICATIONS": {
      try {
        const data = await getNotifications();
        await setBadgeCount(data.unreadCount);
        respond({ ok: true, ...data });
      } catch (err) {
        errResp((err as ApiError).error ?? String(err));
      }
      break;
    }

    case "MARK_NOTIFICATION_READ": {
      try {
        await markNotificationRead(msg.id as string);
        await refreshBadge();
        respond({ ok: true });
      } catch { respond({ ok: false }); }
      break;
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────
    case "GET_JOBS": {
      try {
        const data = await getJobs({ aiRank: msg.aiRank as boolean, limit: msg.limit as number });
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "POST_JOB": {
      try {
        const data = await createJob(msg.payload as Parameters<typeof createJob>[0]);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Quotes ────────────────────────────────────────────────────────────────
    case "POST_QUOTE": {
      try {
        await createQuote(msg.payload as Parameters<typeof createQuote>[0]);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Messaging ─────────────────────────────────────────────────────────────
    case "GET_THREADS": {
      try {
        const data = await getThreads();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "GET_MESSAGES": {
      try {
        const data = await getMessages(msg.threadId as string);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "SEND_MESSAGE": {
      try {
        await sendMessage(msg.threadId as string, msg.body as string);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Payments ──────────────────────────────────────────────────────────────
    case "GET_PAYMENT": {
      try {
        const data = await getPayment(msg.sessionId as string, msg.jobId as string | undefined);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "TRACK_PAYMENT": {
      const stored = await chrome.storage.local.get(KEYS.TRACKED_PAYMENTS);
      const tracked = (stored[KEYS.TRACKED_PAYMENTS] as TrackedPayment[]) ?? [];
      if (!tracked.find((t) => t.sessionId === msg.sessionId)) {
        tracked.push({ sessionId: msg.sessionId as string, jobId: msg.jobId as string | undefined });
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
      const filtered = ((stored[KEYS.TRACKED_PAYMENTS] as TrackedPayment[]) ?? [])
        .filter((t) => t.sessionId !== msg.sessionId);
      await chrome.storage.local.set({ [KEYS.TRACKED_PAYMENTS]: filtered });
      if (filtered.length === 0) await chrome.alarms.clear(ALARMS.PAYMENT_POLL);
      respond({ ok: true });
      break;
    }

    // ── PESO Referral ─────────────────────────────────────────────────────────
    case "POST_REFERRAL": {
      try {
        await createReferral(msg.payload as Parameters<typeof createReferral>[0]);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Job Tracker ───────────────────────────────────────────────────────────
    case "GET_MY_JOBS": {
      try {
        const data = await getMyJobs(msg.status as string | undefined);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "GET_JOB_MILESTONES": {
      try {
        const data = await getJobMilestones(msg.jobId as string);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "MARK_JOB_COMPLETE": {
      try {
        await markJobComplete(msg.jobId as string);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Quote Templates ───────────────────────────────────────────────────────
    case "GET_QUOTE_TEMPLATES": {
      try {
        const data = await getQuoteTemplates();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Omni-Search ───────────────────────────────────────────────────────────
    case "OMNI_SEARCH": {
      try {
        const data = await omniSearch(msg.q as string);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Recurring Jobs ────────────────────────────────────────────────────────
    case "GET_RECURRING_JOBS": {
      try {
        const data = await getRecurringJobs();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Wallet ────────────────────────────────────────────────────────────────
    case "GET_WALLET": {
      try {
        const data = await getWallet();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "GET_WALLET_TRANSACTIONS": {
      try {
        const data = await getWalletTransactions();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Reviews ───────────────────────────────────────────────────────────────
    case "POST_REVIEW": {
      try {
        await createReview(msg.payload as Parameters<typeof createReview>[0]);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "GET_COMPLETED_JOBS": {
      try {
        const data = await getCompletedJobs();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Provider Search ───────────────────────────────────────────────────────
    case "SEARCH_PROVIDERS": {
      try {
        const data = await searchProviders(msg.q as string);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "ADD_FAVORITE": {
      try {
        await addFavorite(msg.providerId as string);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "REMOVE_FAVORITE": {
      try {
        await removeFavorite(msg.providerId as string);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Announcements ─────────────────────────────────────────────────────────
    case "GET_ANNOUNCEMENTS": {
      try {
        const data = await getAnnouncements();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Support Tickets ───────────────────────────────────────────────────────
    case "GET_SUPPORT_TICKETS": {
      try {
        const data = await getSupportTickets();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "POST_SUPPORT_TICKET": {
      try {
        const data = await createSupportTicket(msg.payload as Parameters<typeof createSupportTicket>[0]);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Loyalty Points ────────────────────────────────────────────────────────
    case "GET_LOYALTY": {
      try {
        const data = await getLoyalty();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "POST_LOYALTY_REDEEM": {
      try {
        const data = await redeemLoyalty(msg.points as number);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "GET_LOYALTY_REFERRAL": {
      try {
        const data = await getLoyaltyReferral();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Disputes ──────────────────────────────────────────────────────────────
    case "GET_DISPUTES": {
      try {
        const data = await getDisputes();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "POST_DISPUTE": {
      try {
        const data = await createDispute(msg.payload as Parameters<typeof createDispute>[0]);
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── Provider Availability ─────────────────────────────────────────────────
    case "GET_PROVIDER_PROFILE": {
      try {
        const data = await getProviderProfile();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    case "SET_AVAILABILITY": {
      try {
        await updateProviderAvailability(msg.isAvailable as boolean);
        respond({ ok: true });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    // ── KYC ───────────────────────────────────────────────────────────────────
    case "GET_KYC": {
      try {
        const data = await getKycStatus();
        respond({ ok: true, ...data });
      } catch (err) { errResp((err as ApiError).error ?? String(err)); }
      break;
    }

    default:
      respond({ ok: false, error: "Unknown message type" });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  await setupAlarms();
  const user = await loadCachedUser();
  if (user) {
    await refreshBadge();
    void sseOpen();
  }
}

chrome.runtime.onInstalled.addListener(() => void boot());
chrome.runtime.onStartup.addListener(() => void boot());
