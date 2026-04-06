/**
 * Background service worker (Manifest V3).
 *
 * Auth model: HttpOnly cookie sessions (access_token + refresh_token).
 * The service worker is the only context that makes API calls — it shares
 * the browser's cookie store so credentials: 'include' works correctly.
 *
 * Responsibilities:
 *  1. LOGIN / LOGOUT / GET_AUTH_STATUS via the LocalPro auth API.
 *  2. GET_CATEGORIES with an in-memory 24 h cache.
 *  3. CLASSIFY_CATEGORY using POST /api/ai/classify-category.
 *  4. IMPORT_JOB → POST /api/jobs with the correct category ID.
 */

import {
  login,
  logout,
  getCurrentUser,
  getCategories,
  classifyCategory,
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
  JobImportPayload,
} from "./types";

// ── Category cache ─────────────────────────────────────────────────────────────

interface CategoryCache {
  categories: Category[];
  fetchedAt: number;
}

const CATEGORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
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
    // Return stale cache if available, rather than nothing
    return categoryCache?.categories ?? [];
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
    return true; // keep message channel open for async response
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
      await handleClassifyCategory(
        message.title,
        message.description,
        message.availableCategories,
        sendResponse
      );
      break;

    case "IMPORT_JOB":
      await handleImportJob(message.payload, sendResponse);
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
    // Normalise the login response: the login endpoint returns { id } while
    // /api/auth/me returns { _id }. We unify to _id here for consistency.
    const user: AuthStatusResponse["user"] = {
      _id: (apiRes.user as unknown as { id?: string }).id ?? "",
      name: apiRes.user.name,
      email, // login endpoint doesn't echo email back, use what was submitted
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
    // Even on API error, clear local cache
  }
  await chrome.storage.local.remove("cached_user");
  sendResponse({ success: true });
}

async function handleGetAuthStatus(
  sendResponse: (res: AuthStatusResponse) => void
): Promise<void> {
  // First try the cached user to respond quickly, then verify with the API
  const stored = await chrome.storage.local.get("cached_user");
  const cachedUser = stored["cached_user"] as AuthStatusResponse["user"] | undefined;

  try {
    const me = await getCurrentUser();
    const user = { _id: me._id, name: me.name, email: me.email, role: me.role };
    // Refresh cache
    await chrome.storage.local.set({ cached_user: user });
    sendResponse({ authenticated: true, user });
  } catch (err) {
    const errObj = err as { code?: string };
    if (errObj.code === "SESSION_EXPIRED" || !cachedUser) {
      await chrome.storage.local.remove("cached_user");
      sendResponse({ authenticated: false });
    } else {
      // Network error — trust the cache
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
    // Non-fatal — caller falls back to local keyword detection
    sendResponse({ success: false, error: errorMessage(err) });
  }
}

async function handleImportJob(
  job: import("./types").JobPost,
  sendResponse: (res: ImportJobResponse) => void
): Promise<void> {
  // Resolve category ID: use pre-resolved categoryId, or look it up
  let categoryId = job.categoryId;

  if (!categoryId && job.category) {
    const cats = await getCachedCategories();
    const matched = cats.find(
      (c) => c.name.toLowerCase() === (job.category ?? "").toLowerCase()
    );
    categoryId = matched?._id;
  }

  // Build source attribution appendix added to the description
  const sourceNote = [
    `\n\n---`,
    `Imported from ${job.source === "facebook" ? "Facebook" : "LinkedIn"}: ${job.source_url}`,
    job.posted_by ? `Posted by: ${job.posted_by}` : null,
    job.timestamp ? `Original timestamp: ${job.timestamp}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Fallback schedule date: tomorrow at midnight UTC
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

  // Guards — these fields are required by the IJob entity
  if (!payload.category) {
    sendResponse({
      success: false,
      error:
        "Please select a category before submitting. Could not match a LocalPro category automatically.",
    });
    return;
  }
  if (!payload.location) {
    sendResponse({
      success: false,
      error: "Location is required. Please fill in the location field in the import form.",
    });
    return;
  }
  if (!payload.budget || payload.budget <= 0) {
    sendResponse({
      success: false,
      error: "Budget is required. Please enter a budget amount (PHP) in the import form.",
    });
    return;
  }

  try {
    const result = await createJob(payload);
    sendResponse({ success: true, job_id: result._id });
  } catch (err) {
    const errObj = err as { code?: string; error?: string };
    if (errObj.code === "SESSION_EXPIRED") {
      sendResponse({
        success: false,
        error: "Session expired. Please sign in again via the extension.",
      });
    } else {
      sendResponse({ success: false, error: errorMessage(err) });
    }
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const obj = err as { error?: string; message?: string };
  return obj?.error ?? obj?.message ?? String(err);
}

console.log(`[LocalPro] Background service worker started. API: ${API_BASE_URL}`);
