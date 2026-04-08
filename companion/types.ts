// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthStorage {
  token: string;
  role: UserRole;
  name: string;
  userId: string;
}

export type UserRole = "client" | "provider" | "peso" | "admin" | "staff";

// ── Messages between popup / content-script / service-worker ─────────────────

export type ExtMessage =
  | { type: "GET_AUTH" }
  | { type: "LOGIN"; email: string; password: string }
  | { type: "LOGOUT" }
  | { type: "GET_NOTIFICATIONS" }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "GET_JOBS"; aiRank?: boolean; limit?: number }
  | { type: "POST_JOB"; payload: JobPayload }
  | { type: "POST_QUOTE"; payload: QuotePayload }
  | { type: "GET_THREADS" }
  | { type: "GET_MESSAGES"; threadId: string }
  | { type: "SEND_MESSAGE"; threadId: string; body: string }
  | { type: "GET_PAYMENT"; sessionId: string; jobId?: string }
  | { type: "TRACK_PAYMENT"; sessionId: string; jobId?: string }
  | { type: "STOP_TRACKING_PAYMENT"; sessionId: string }
  | { type: "POST_REFERRAL"; payload: ReferralPayload }
  | { type: "QUICK_JOB_PREFILL"; text: string }
  | { type: "PESO_REFERRAL_PREFILL"; text: string };

// ── Domain payloads ───────────────────────────────────────────────────────────

export interface JobPayload {
  title: string;
  description: string;
  category: string;
  budget: { min: number; max: number };
  location: { address: string; city: string; province: string };
  scheduleDate?: string;
}

export interface QuotePayload {
  jobId: string;
  proposedAmount: number;
  timeline: number;
  notes?: string;
}

export interface ReferralPayload {
  name: string;
  email?: string;
  phone?: string;
  barangay: string;
  skills: string[];
  livelihoodProgram?: string;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: { min: number; max: number };
  location: { address: string; city: string };
  status: string;
  createdAt: string;
  aiScore?: number;
}

export interface Thread {
  _id: string;
  jobId: string;
  jobTitle: string;
  otherParty: { name: string; _id: string };
  lastMessage?: string;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  _id: string;
  body: string;
  sender: { _id: string; name: string };
  createdAt: string;
}

export interface Payment {
  _id: string;
  sessionId: string;
  status: string;
  amount: number;
  jobId?: string;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  AUTH: "lp_auth",
  LAST_SEEN_JOB_IDS: "lp_last_job_ids",
  TRACKED_PAYMENTS: "lp_tracked_payments",
  NOTIFICATION_BADGE: "lp_notif_badge",
} as const;

// ── Alarm names ───────────────────────────────────────────────────────────────

export const ALARMS = {
  JOB_POLL: "lp_job_poll",
  PAYMENT_POLL: "lp_payment_poll",
  TOKEN_REFRESH_CHECK: "lp_token_refresh",
} as const;
