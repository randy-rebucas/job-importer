/**
 * Background service worker (Manifest V3).
 *
 * Responsibilities:
 *  1. LOGIN / LOGOUT / GET_AUTH_STATUS
 *  2. GET_CATEGORIES with 24-hour in-memory cache
 *  3. CLASSIFY_CATEGORY via POST /api/ai/classify-category
 *  4. ESTIMATE_BUDGET via POST /api/ai/estimate-budget
 *  5. GENERATE_DESCRIPTION via POST /api/ai/generate-description
 *  6. IMPORT_JOB → POST /api/jobs + save to history + update badge
 *  6. GET_IMPORT_HISTORY / GET_IMPORT_STATS from chrome.storage.local
 */

import {
  login,
  logout,
  getCurrentUser,
  getCategories,
  classifyCategory,
  estimateBudget,
  generateDescription,
  createJob,
  API_BASE_URL,
} from "./utils/api";
import type {
  ExtensionMessage,
  Category,
  ImportJobResponse,
  AuthStatusResponse,
  LoginResponse,
  GetCategoriesResponse,
  ClassifyCategoryResponse,
  EstimateBudgetResponse,
  GenerateDescriptionResponse,
  GetImportHistoryResponse,
  GetImportStatsResponse,
  JobImportPayload,
  ImportHistoryItem,
} from "./types";

// ── Category cache ─────────────────────────────────────────────────────────────

interface CategoryCache {
  categories: Category[];
  fetchedAt: number;
}

const CATEGORY_CACHE_TTL = 24 * 60 * 60 * 1000;
let categoryCache: CategoryCache | null = null;

async function getCachedCategories(): Promise<Category[]> {
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

// ── Import history & badge ─────────────────────────────────────────────────────

const HISTORY_KEY   = "import_history";
const MAX_HISTORY   = 50;

async function saveImportRecord(item: ImportHistoryItem): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    const history: ImportHistoryItem[] = (stored[HISTORY_KEY] as ImportHistoryItem[]) ?? [];
    history.unshift(item);
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
    await chrome.storage.local.set({ [HISTORY_KEY]: history });
  } catch {
    // Non-fatal
  }
}

async function getImportHistory(): Promise<ImportHistoryItem[]> {
  try {
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    return (stored[HISTORY_KEY] as ImportHistoryItem[]) ?? [];
  } catch {
    return [];
  }
}

async function updateBadge(): Promise<void> {
  try {
    const history = await getImportHistory();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = history.filter(
      (h) => new Date(h.importedAt) >= todayStart
    ).length;

    await chrome.action.setBadgeText({ text: todayCount > 0 ? String(todayCount) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#1a56db" });
  } catch {
    // setBadgeText may not be available in all contexts
  }
}

// ── Main message listener ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message, sendResponse);
    return true;
  }
);

async function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
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
      const unknownType = (message as { type?: unknown }).type;
      console.warn(`[LocalPro] Unhandled message type: ${String(unknownType)}`);
      sendResponse({ error: `Unknown message type: ${String(unknownType)}` });
    }
  }
}

// ── Handler implementations ───────────────────────────────────────────────────

async function handleLogin(
  email: string,
  password: string,
  sendResponse: (res: LoginResponse) => void
): Promise<void> {
  try {
    const apiRes = await login({ email, password });
    const user: AuthStatusResponse["user"] = {
      _id: (apiRes.user as unknown as { id?: string }).id ?? "",
      name: apiRes.user.name,
      email,
      role: apiRes.user.role as import("./utils/api").MeResponse["role"],
    };
    await chrome.storage.local.set({ cached_user: user });
    sendResponse({ success: true, user });
  } catch (err) {
    sendResponse({ success: false, error: errorMessage(err) });
  }
}

async function handleLogout(sendResponse: (res: { success: boolean }) => void): Promise<void> {
  try {
    await logout();
  } catch {
    // Clear local cache even on API error
  }
  await chrome.storage.local.remove("cached_user");
  sendResponse({ success: true });
}

async function handleGetAuthStatus(
  sendResponse: (res: AuthStatusResponse) => void
): Promise<void> {
  const stored = await chrome.storage.local.get("cached_user");
  const cachedUser = stored["cached_user"] as AuthStatusResponse["user"] | undefined;

  try {
    const me = await getCurrentUser();
    const user = { _id: me._id, name: me.name, email: me.email, role: me.role };
    await chrome.storage.local.set({ cached_user: user });
    sendResponse({ authenticated: true, user });
  } catch (err) {
    const errObj = err as { code?: string };
    if (errObj.code === "SESSION_EXPIRED" || !cachedUser) {
      await chrome.storage.local.remove("cached_user");
      sendResponse({ authenticated: false });
    } else {
      sendResponse({ authenticated: true, user: cachedUser });
    }
  }
}

async function handleGetCategories(
  sendResponse: (res: GetCategoriesResponse) => void
): Promise<void> {
  try {
    const cats = await getCachedCategories();
    sendResponse({ success: true, categories: cats });
  } catch (err) {
    sendResponse({ success: false, categories: [], error: errorMessage(err) });
  }
}

async function handleClassifyCategory(
  title: string,
  description: string,
  availableCategories: string[],
  sendResponse: (res: ClassifyCategoryResponse) => void
): Promise<void> {
  try {
    const result = await classifyCategory({ title, description, availableCategories });
    sendResponse({ success: true, category: result.category });
  } catch (err) {
    sendResponse({ success: false, error: errorMessage(err) });
  }
}

async function handleEstimateBudget(
  title: string,
  category: string,
  description: string | undefined,
  sendResponse: (res: EstimateBudgetResponse) => void
): Promise<void> {
  try {
    const result = await estimateBudget({ title, category, description });
    sendResponse({
      success: true,
      min: result.min,
      max: result.max,
      midpoint: result.midpoint,
      note: result.note,
    });
  } catch (err) {
    sendResponse({ success: false, error: errorMessage(err) });
  }
}

async function handleGenerateDescription(
  title: string,
  category: string | undefined,
  sendResponse: (res: GenerateDescriptionResponse) => void
): Promise<void> {
  try {
    const result = await generateDescription({ title, category });
    sendResponse({ success: true, description: result.description });
  } catch (err) {
    sendResponse({ success: false, error: errorMessage(err) });
  }
}

async function handleGetImportHistory(
  sendResponse: (res: GetImportHistoryResponse) => void
): Promise<void> {
  const history = await getImportHistory();
  sendResponse({ success: true, history });
}

async function handleGetImportStats(
  sendResponse: (res: GetImportStatsResponse) => void
): Promise<void> {
  const history = await getImportHistory();
  sendResponse({ count: history.length });
}

async function handleImportJob(
  job: import("./types").JobPost,
  sendResponse: (res: ImportJobResponse) => void
): Promise<void> {
  let categoryId = job.categoryId;

  if (!categoryId && job.category) {
    const cats = await getCachedCategories();
    const matched = cats.find(
      (c) => c.name.toLowerCase() === (job.category ?? "").toLowerCase()
    );
    categoryId = matched?._id;
  }

  const sourceNote = [
    `\n\n---`,
    `Imported from ${job.source === "facebook" ? "Facebook" : job.source === "linkedin" ? "LinkedIn" : job.source === "jobstreet" ? "JobStreet" : "Indeed"}: ${job.source_url}`,
    job.posted_by ? `Posted by: ${job.posted_by}` : null,
    job.timestamp ? `Original timestamp: ${job.timestamp}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const fallbackScheduleDate = new Date(Date.now() + 86_400_000).toISOString();

  const payload: JobImportPayload = {
    title: job.title,
    description: job.description + sourceNote,
    category: categoryId ?? "",
    budget: job.budget ?? 0,
    location: job.location ?? "",
    scheduleDate: job.scheduleDate
      ? new Date(job.scheduleDate).toISOString()
      : fallbackScheduleDate,
    tags: [
      `imported_from_${job.source}`,
      ...(job.category ? [job.category.toLowerCase().replace(/\s+/g, "_")] : []),
    ],
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

    // Persist to history + update today's badge count
    await saveImportRecord({
      job_id: result._id,
      title: job.title,
      source: job.source,
      source_url: job.source_url,
      importedAt: new Date().toISOString(),
    });
    await updateBadge();

    sendResponse({ success: true, job_id: result._id });
  } catch (err) {
    const errObj = err as { code?: string; error?: string };
    if (errObj.code === "SESSION_EXPIRED") {
      sendResponse({ success: false, error: "Session expired. Please sign in again via the extension." });
    } else {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
}

async function handleInjectAndScan(
  tabId: number,
  autoScroll: boolean,
  sendResponse: (res: { ok: boolean; error?: string }) => void
): Promise<void> {
  // Check if content script is already alive
  let alive = false;
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    alive = !!(ping as { ok?: boolean })?.ok;
  } catch {
    alive = false;
  }

  if (!alive) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      // Wait for the content script to register its message listener
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

// ── Utility ───────────────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const obj = err as { error?: string; message?: string };
  return obj?.error ?? obj?.message ?? String(err);
}

// Refresh badge on service worker startup
void updateBadge();

console.log(`[LocalPro] Background service worker started. API: ${API_BASE_URL}`);
