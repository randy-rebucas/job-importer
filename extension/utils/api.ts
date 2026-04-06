/**
 * LocalPro API wrapper.
 *
 * Auth model: HttpOnly cookie-based sessions (access_token + refresh_token).
 * All requests must include `credentials: 'include'` so the browser
 * automatically attaches cookies set by the server.
 *
 * On 401 the wrapper automatically calls POST /api/auth/refresh and retries.
 * If the refresh also fails, it throws an error with code "SESSION_EXPIRED".
 */

import type { Category, JobImportPayload, JobCreatedResponse, ApiError } from "../types";

/**
 * Base URL for the LocalPro API.
 * Change to your production domain before deploying.
 */
export const API_BASE_URL = "https://www.localpro.asia";

// ── Low-level fetch wrapper ───────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  /** Set to false to suppress the automatic 401→refresh→retry logic. */
  retry?: boolean;
}

/**
 * Core fetch helper.
 * - Always sends `credentials: 'include'` (HttpOnly cookies).
 * - On 401, attempts one silent token refresh and retries the request.
 */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { retry = true, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string>),
  };

  const request: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, request);
  } catch (networkErr) {
    throw new Error(`Network error: ${String(networkErr)}`);
  }

  if (response.status === 401 && retry) {
    // Try to silently refresh the session
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      const err: ApiError = { error: "Session expired. Please log in again.", code: "SESSION_EXPIRED" };
      throw err;
    }
    // One retry after successful refresh
    return apiFetch<T>(path, { ...options, retry: false });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return undefined as unknown as T;
  }

  if (!response.ok) {
    const serverError = data as { error?: string; message?: string; code?: string };
    const err: ApiError = {
      error: serverError.error ?? serverError.message ?? `HTTP ${response.status}`,
      code: serverError.code,
    };
    throw err;
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: { id: string; name: string; role: string };
}

export interface MeResponse {
  _id: string;
  name: string;
  email: string;
  role: "client" | "provider" | "admin" | "peso";
  isEmailVerified: boolean;
  avatar: string | null;
}

/**
 * POST /api/auth/login
 * Sets access_token + refresh_token cookies on success.
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    retry: false, // never refresh on a login attempt
  });
}

/**
 * POST /api/auth/logout
 * Clears session cookies server-side.
 */
export async function logout(): Promise<void> {
  await apiFetch<{ message: string }>("/api/auth/logout", {
    method: "POST",
    retry: false,
  });
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile, or throws on 401.
 */
export async function getCurrentUser(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/auth/me", { retry: true });
}

/**
 * POST /api/auth/refresh
 * Exchanges the refresh_token cookie for a new access_token cookie.
 * Returns true on success, false on failure.
 */
export async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Returns all active service categories. Cached 24 h by the server.
 */
export async function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/categories");
}

// ── AI helpers ────────────────────────────────────────────────────────────────

export interface ClassifyCategoryPayload {
  title: string;
  description?: string;
  availableCategories: string[];
}

export interface ClassifyCategoryResponse {
  category: string;
}

/**
 * POST /api/ai/classify-category
 * Uses GPT-4o-mini to classify the job into one of the provided categories.
 */
export async function classifyCategory(
  payload: ClassifyCategoryPayload
): Promise<ClassifyCategoryResponse> {
  return apiFetch<ClassifyCategoryResponse>("/api/ai/classify-category", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface EstimateBudgetPayload {
  title: string;
  category: string;
  description?: string;
}

export interface EstimateBudgetResponse {
  min: number;
  max: number;
  midpoint: number;
  note: string;
}

/**
 * POST /api/ai/estimate-budget
 * Returns an AI-estimated budget range.
 */
export async function estimateBudget(
  payload: EstimateBudgetPayload
): Promise<EstimateBudgetResponse> {
  return apiFetch<EstimateBudgetResponse>("/api/ai/estimate-budget", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/jobs
 * Creates a new job. The caller is responsible for passing a valid categoryId.
 */
export async function createJob(payload: JobImportPayload): Promise<JobCreatedResponse> {
  return apiFetch<JobCreatedResponse>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
