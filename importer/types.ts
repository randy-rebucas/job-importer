import type { MeResponse } from "./utils/api";

export type Platform = "facebook" | "marketplace" | "google-business" | "fb-groups" | "messenger";

// Service types for lead classification
export type ServiceType = 
  | "plumbing" 
  | "cleaning" 
  | "repair" 
  | "electrical" 
  | "hvac" 
  | "landscaping" 
  | "painting" 
  | "carpentry" 
  | "roofing" 
  | "other";

export type UrgencyLevel = "low" | "medium" | "high" | "urgent" | "same-day";

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  name: string;
  icon: string;
  description: string;
}

/**
 * Raw lead extracted from platform (Facebook Marketplace, Google Business, FB Groups, Messenger)
 */
export interface Lead {
  title: string;
  description: string;
  source: Platform;
  source_url: string;
  posted_by: string;
  timestamp: string;
  location?: string;
  
  // AI-extracted fields
  service_type?: ServiceType;
  urgency?: UrgencyLevel;
  estimated_budget?: {
    min: number;
    max: number;
    currency?: string;
  };
  confidence?: number;
  
  // Contact info
  phone?: string;
  email?: string;
  messenger_id?: string;
}

/**
 * Classified lead with AI analysis and provider suggestions
 */
export interface ClassifiedLead extends Lead {
  service_type: ServiceType;
  urgency: UrgencyLevel;
  estimated_budget: {
    min: number;
    max: number;
    currency: string;
  };
  
  // Provider matching
  matched_providers?: string[]; // Provider IDs
  match_confidence: number;
  classification_analysis?: string;
}

/** Legacy type alias for backward compatibility */
export type JobPost = Lead;

/** Shared defaults applied to every sequential lead capture. */
export interface LeadDefaults {
  location?: string;
  estimated_budget?: number;
  urgency?: UrgencyLevel;
}

/** A record stored in chrome.storage.local after a successful lead capture. */
export interface LeadHistoryItem {
  lead_id: string;
  title: string;
  service_type: ServiceType;
  urgency: UrgencyLevel;
  source: Platform;
  source_url: string;
  capturedAt: string;
  matched_providers_count?: number;
}

/** Payload for creating a lead in the system */
export interface LeadCapturePayload {
  title: string;
  description: string;
  service_type: ServiceType;
  urgency: UrgencyLevel;
  estimated_budget: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  contact_info: {
    phone?: string;
    email?: string;
    messenger_id?: string;
  };
  tags?: string[];
}

export interface LeadCreatedResponse {
  _id: string;
  title: string;
  status: string;
  matched_providers?: string[];
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

export interface CaptureLeadMessage {
  type: "CAPTURE_LEAD";
  payload: Lead;
}

export interface ClassifyLeadMessage {
  type: "CLASSIFY_LEAD";
  title: string;
  description: string;
  location: string;
}

export interface MatchProvidersMessage {
  type: "MATCH_PROVIDERS";
  lead: ClassifiedLead;
  limit?: number;
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

export interface GenerateDescriptionMessage {
  type: "GENERATE_DESCRIPTION";
  title: string;
  category?: string;
}

export interface GetImportHistoryMessage {
  type: "GET_IMPORT_HISTORY";
}

export interface GetLeadHistoryMessage {
  type: "GET_LEAD_HISTORY";
}

export interface GetImportStatsMessage {
  type: "GET_IMPORT_STATS";
}

export interface GetLeadStatsMessage {
  type: "GET_LEAD_STATS";
}

export interface InjectAndScanMessage {
  type: "INJECT_AND_SCAN";
  tabId: number;
  autoScroll: boolean;
}

export type ExtensionMessage =
  | ImportJobMessage
  | CaptureLeadMessage
  | ClassifyLeadMessage
  | MatchProvidersMessage
  | GetAuthStatusMessage
  | LoginMessage
  | LogoutMessage
  | GetCategoriesMessage
  | ClassifyCategoryMessage
  | EstimateBudgetMessage
  | GenerateDescriptionMessage
  | GetImportHistoryMessage
  | GetLeadHistoryMessage
  | GetImportStatsMessage
  | GetLeadStatsMessage
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

export interface GenerateDescriptionResponse {
  success: boolean;
  description?: string;
  error?: string;
}

export interface GetImportHistoryResponse {
  success: boolean;
  history: ImportHistoryItem[];
}

export interface GetLeadHistoryResponse {
  success: boolean;
  history: LeadHistoryItem[];
}

export interface GetImportStatsResponse {
  count: number;
}

export interface GetLeadStatsResponse {
  total_leads: number;
  leads_today: number;
  pending_matches: number;
  by_service_type: Record<ServiceType, number>;
  by_urgency: Record<UrgencyLevel, number>;
}

export interface ClassifyLeadResponse {
  success: boolean;
  classified_lead?: ClassifiedLead;
  service_type?: ServiceType;
  urgency?: UrgencyLevel;
  estimated_budget?: {
    min: number;
    max: number;
    currency: string;
  };
  confidence?: number;
  analysis?: string;
  error?: string;
}

export interface MatchProvidersResponse {
  success: boolean;
  providers?: Array<{
    _id: string;
    name: string;
    service_types?: ServiceType[];
    rating?: number;
    match_score: number;
  }>;
  error?: string;
}
