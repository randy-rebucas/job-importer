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
  // Prefill
  | { type: "SET_PREFILL"; key: string; value: string }
  | { type: "GET_PREFILL"; keys: string[] }
  // Auth
  | { type: "GET_AUTH" }
  | { type: "LOGIN"; email: string; password: string }
  | { type: "LOGOUT" }
  // Notifications
  | { type: "GET_NOTIFICATIONS" }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  // Jobs
  | { type: "GET_JOBS"; aiRank?: boolean; limit?: number }
  | { type: "POST_JOB"; payload: JobPayload }
  | { type: "GET_MY_JOBS"; status?: string }
  | { type: "GET_JOB_MILESTONES"; jobId: string }
  | { type: "MARK_JOB_COMPLETE"; jobId: string }
  | { type: "GET_COMPLETED_JOBS" }
  // Quotes
  | { type: "POST_QUOTE"; payload: QuotePayload }
  | { type: "GET_QUOTE_TEMPLATES" }
  // Messaging
  | { type: "GET_THREADS" }
  | { type: "GET_MESSAGES"; threadId: string }
  | { type: "SEND_MESSAGE"; threadId: string; body: string }
  // Payments
  | { type: "GET_PAYMENT"; sessionId: string; jobId?: string }
  | { type: "TRACK_PAYMENT"; sessionId: string; jobId?: string }
  | { type: "STOP_TRACKING_PAYMENT"; sessionId: string }
  // PESO Referral
  | { type: "POST_REFERRAL"; payload: ReferralPayload }
  // Recurring Jobs
  | { type: "GET_RECURRING_JOBS" }
  // Wallet
  | { type: "GET_WALLET" }
  | { type: "GET_WALLET_TRANSACTIONS" }
  // Reviews
  | { type: "POST_REVIEW"; payload: ReviewPayload }
  // Provider Search
  | { type: "SEARCH_PROVIDERS"; q: string }
  | { type: "ADD_FAVORITE"; providerId: string }
  | { type: "REMOVE_FAVORITE"; providerId: string }
  // Omni-Search
  | { type: "OMNI_SEARCH"; q: string }
  // Announcements
  | { type: "GET_ANNOUNCEMENTS" }
  // Support Tickets
  | { type: "GET_SUPPORT_TICKETS" }
  | { type: "POST_SUPPORT_TICKET"; payload: SupportTicketPayload }
  // Loyalty
  | { type: "GET_LOYALTY" }
  | { type: "POST_LOYALTY_REDEEM"; points: number }
  | { type: "GET_LOYALTY_REFERRAL" }
  // Disputes
  | { type: "GET_DISPUTES" }
  | { type: "POST_DISPUTE"; payload: DisputePayload }
  // Provider Availability
  | { type: "GET_PROVIDER_PROFILE" }
  | { type: "SET_AVAILABILITY"; isAvailable: boolean }
  // KYC
  | { type: "GET_KYC" };

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

export interface ReviewPayload {
  jobId: string;
  providerId: string;
  rating: number;
  comment?: string;
}

export interface SupportTicketPayload {
  subject: string;
  category: string;
  description: string;
}

export interface DisputePayload {
  jobId: string;
  category: string;
  description: string;
  evidenceUrl?: string;
  urgent?: boolean;
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
