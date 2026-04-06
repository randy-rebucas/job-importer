import type { MeResponse } from "./utils/api";

export type Platform = "facebook" | "linkedin";

// ── Domain types ──────────────────────────────────────────────────────────────

/** A service category as returned by GET /api/categories */
export interface Category {
  _id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Locally-extracted job post data (before it is submitted to the API).
 * `categoryId` is populated after the user selects a category in the modal.
 */
export interface JobPost {
  title: string;
  description: string;
  source: Platform;
  source_url: string;
  posted_by: string;
  timestamp: string;
  location?: string;
  budget?: number;
  /** ISO date string (YYYY-MM-DD) set by the user in the import modal */
  scheduleDate?: string;
  /** Human-readable category name used for display and AI classification */
  category?: string;
  /** The `_id` of the LocalPro Category document — required for POST /api/jobs */
  categoryId?: string;
  /** Confidence score 0–1 from the detection heuristic */
  confidence?: number;
}

/**
 * Payload sent to POST /api/jobs.
 * Source metadata is appended to the description.
 * All fields match the IJob entity requirements.
 */
export interface JobImportPayload {
  title: string;
  description: string;
  category: string;    // Category _id — required
  budget: number;      // PHP amount — required per IJob entity
  location: string;    // Human-readable address — required per IJob entity
  scheduleDate: string; // ISO date string — required per IJob entity
  tags?: string[];
}

/** Response from POST /api/jobs (job created) */
export interface JobCreatedResponse {
  _id: string;
  title: string;
  status: string;
  [key: string]: unknown;
}

/** Consistent error shape from the LocalPro API */
export interface ApiError {
  error: string;
  code?: string;
}

// ── Chrome extension message types ───────────────────────────────────────────

export interface ImportJobMessage {
  type: "IMPORT_JOB";
  payload: JobPost;
}

export interface GetAuthStatusMessage {
  type: "GET_AUTH_STATUS";
}

export interface LoginMessage {
  type: "LOGIN";
  email: string;
  password: string;
}

export interface LogoutMessage {
  type: "LOGOUT";
}

export interface GetCategoriesMessage {
  type: "GET_CATEGORIES";
}

export interface ClassifyCategoryMessage {
  type: "CLASSIFY_CATEGORY";
  title: string;
  description: string;
  availableCategories: string[];
}

export type ExtensionMessage =
  | ImportJobMessage
  | GetAuthStatusMessage
  | LoginMessage
  | LogoutMessage
  | GetCategoriesMessage
  | ClassifyCategoryMessage;

// ── Message response types ────────────────────────────────────────────────────

export interface ImportJobResponse {
  success: boolean;
  job_id?: string;
  error?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user?: Pick<MeResponse, "_id" | "name" | "email" | "role">;
}

export interface LoginResponse {
  success: boolean;
  user?: Pick<MeResponse, "_id" | "name" | "email" | "role">;
  error?: string;
}

export interface GetCategoriesResponse {
  success: boolean;
  categories: Category[];
  error?: string;
}

export interface ClassifyCategoryResponse {
  success: boolean;
  category?: string;
  error?: string;
}
