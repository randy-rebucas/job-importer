import type { MeResponse } from "./utils/api";

export type Platform = "facebook" | "linkedin" | "jobstreet" | "indeed";

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  name: string;
  icon: string;
  description: string;
}

export interface JobPost {
  title: string;
  description: string;
  source: Platform;
  source_url: string;
  posted_by: string;
  timestamp: string;
  location?: string;
  budget?: number;
  scheduleDate?: string;
  category?: string;
  categoryId?: string;
  confidence?: number;
}

/** Shared defaults applied to every sequential modal during a bulk import. */
export interface BulkDefaults {
  location?: string;
  budget?: number;
  scheduleDate?: string;
  urgency?: "standard" | "same_day" | "rush";
}

/** A record stored in chrome.storage.local after a successful import. */
export interface ImportHistoryItem {
  job_id: string;
  title: string;
  source: Platform;
  source_url: string;
  importedAt: string;
}

export interface JobImportPayload {
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  scheduleDate: string;
  tags?: string[];
}

export interface JobCreatedResponse {
  _id: string;
  title: string;
  status: string;
  [key: string]: unknown;
}

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

export interface EstimateBudgetMessage {
  type: "ESTIMATE_BUDGET";
  title: string;
  category: string;
  description?: string;
}

export interface GetImportHistoryMessage {
  type: "GET_IMPORT_HISTORY";
}

export interface GetImportStatsMessage {
  type: "GET_IMPORT_STATS";
}

export interface InjectAndScanMessage {
  type: "INJECT_AND_SCAN";
  tabId: number;
  autoScroll: boolean;
}

export type ExtensionMessage =
  | ImportJobMessage
  | GetAuthStatusMessage
  | LoginMessage
  | LogoutMessage
  | GetCategoriesMessage
  | ClassifyCategoryMessage
  | EstimateBudgetMessage
  | GetImportHistoryMessage
  | GetImportStatsMessage
  | InjectAndScanMessage;

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

export interface EstimateBudgetResponse {
  success: boolean;
  min?: number;
  max?: number;
  midpoint?: number;
  note?: string;
  error?: string;
}

export interface GetImportHistoryResponse {
  success: boolean;
  history: ImportHistoryItem[];
}

export interface GetImportStatsResponse {
  count: number;
}
