/**
 * LocalPro API wrapper — Companion Extension.
 *
 * Auth model: same as the working Job Importer extension.
 * HttpOnly cookie-based sessions (access_token + refresh_token).
 * All requests send `credentials: "include"` so the browser attaches cookies.
 * On 401 the wrapper silently refreshes and retries once.
 */

export const API_BASE_URL = "https://www.localpro.asia";

export interface ApiError {
  error: string;
  code?: string;
}

interface FetchOptions extends RequestInit {
  retry?: boolean;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { retry = true, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string>),
  };

  const request: RequestInit = { ...init, headers, credentials: "include" };
  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, request);
  } catch (networkErr) {
    throw new Error(`Network error: ${String(networkErr)}`);
  }

  if (response.status === 401 && retry) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      const err: ApiError = { error: "Session expired. Please log in again.", code: "SESSION_EXPIRED" };
      throw err;
    }
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

export interface MeResponse {
  _id: string;
  name: string;
  email: string;
  role: "client" | "provider" | "admin" | "peso" | "staff";
}

export async function login(email: string, password: string): Promise<{ user: MeResponse }> {
  return apiFetch<{ user: MeResponse }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    retry: false,
  });
}

export async function logout(): Promise<void> {
  await apiFetch<unknown>("/api/auth/logout", { method: "POST", retry: false });
}

export async function getCurrentUser(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/auth/me");
}

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

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export async function getNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
  return apiFetch("/api/notifications?limit=20");
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export interface Job {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: { min: number; max: number };
  location: { address: string; city: string };
  status: string;
  createdAt: string;
}

export interface JobPayload {
  title: string;
  description: string;
  category: string;
  budget: { min: number; max: number };
  location: { address: string; city: string; province: string };
  scheduleDate?: string;
}

export async function getJobs(params: { aiRank?: boolean; limit?: number } = {}): Promise<{ jobs: Job[] }> {
  const q = new URLSearchParams({ status: "open", limit: String(params.limit ?? 5) });
  if (params.aiRank) q.set("aiRank", "true");
  return apiFetch(`/api/jobs?${q}`);
}

export async function createJob(payload: JobPayload): Promise<{ job: Job }> {
  return apiFetch("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export interface QuotePayload {
  jobId: string;
  proposedAmount: number;
  timeline: number;
  notes?: string;
}

export async function createQuote(payload: QuotePayload): Promise<unknown> {
  return apiFetch("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
}

// ── Messaging ─────────────────────────────────────────────────────────────────

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

export async function getThreads(): Promise<{ threads: Thread[] }> {
  return apiFetch("/api/messages/threads");
}

export async function getMessages(threadId: string): Promise<{ messages: Message[] }> {
  return apiFetch(`/api/messages/${threadId}`);
}

export async function sendMessage(threadId: string, body: string): Promise<void> {
  await apiFetch(`/api/messages/${threadId}`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface Payment {
  _id: string;
  sessionId: string;
  status: string;
  amount: number;
}

export async function getPayment(sessionId: string, jobId?: string): Promise<{ payment: Payment }> {
  const q = jobId ? `?jobId=${jobId}` : "";
  return apiFetch(`/api/payments/${sessionId}${q}`);
}

// ── PESO Referral ─────────────────────────────────────────────────────────────

export interface ReferralPayload {
  name: string;
  email?: string;
  phone?: string;
  barangay: string;
  skills: string[];
  livelihoodProgram?: string;
}

export async function createReferral(payload: ReferralPayload): Promise<unknown> {
  return apiFetch("/api/peso/referrals", { method: "POST", body: JSON.stringify(payload) });
}

// ── My Jobs (tracker) ────────────────────────────────────────────────────────

export interface MyJob {
  _id: string;
  title: string;
  status: "open" | "assigned" | "in-progress" | "complete" | string;
  category: string;
  budget: { min: number; max: number };
  assignedProvider?: { _id: string; name: string };
  clientId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Milestone {
  _id: string;
  title: string;
  completed: boolean;
  order: number;
}

export async function getMyJobs(status?: string): Promise<{ jobs: MyJob[] }> {
  const q = new URLSearchParams({ mine: "true", limit: "10" });
  if (status) q.set("status", status);
  return apiFetch(`/api/jobs?${q}`);
}

export async function getJobMilestones(jobId: string): Promise<{ milestones: Milestone[] }> {
  return apiFetch(`/api/jobs/${jobId}/milestones`);
}

// ── Quote Templates ───────────────────────────────────────────────────────────

export interface QuoteTemplate {
  _id: string;
  name: string;
  proposedAmount: number;
  timeline: number;
  notes?: string;
}

export async function getQuoteTemplates(): Promise<{ templates: QuoteTemplate[] }> {
  return apiFetch("/api/quote-templates");
}

// ── Omni-Search ───────────────────────────────────────────────────────────────

export interface OmniResult {
  type: "job" | "provider" | "category";
  _id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export async function omniSearch(q: string): Promise<{ results: OmniResult[] }> {
  return apiFetch(`/api/search?q=${encodeURIComponent(q)}&omni=true&limit=15`);
}

// ── Recurring Jobs ────────────────────────────────────────────────────────────

export interface RecurringJob {
  _id: string;
  title: string;
  nextOccurrence: string; // ISO date
  frequency: string;
  url?: string;
}

export async function getRecurringJobs(): Promise<{ jobs: RecurringJob[] }> {
  return apiFetch("/api/recurring");
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export interface WalletData {
  balance: number;
  pending: number;
}

export interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export async function getWallet(): Promise<WalletData> {
  return apiFetch("/api/wallet");
}

export async function getWalletTransactions(): Promise<{ transactions: WalletTransaction[] }> {
  return apiFetch("/api/wallet/transactions?limit=10");
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface ReviewPayload {
  jobId: string;
  providerId: string;
  rating: number;
  comment?: string;
}

export async function createReview(payload: ReviewPayload): Promise<unknown> {
  return apiFetch("/api/reviews", { method: "POST", body: JSON.stringify(payload) });
}

export async function markJobComplete(jobId: string): Promise<unknown> {
  return apiFetch(`/api/jobs/${jobId}/mark-complete`, { method: "POST" });
}

export async function getCompletedJobs(): Promise<{ jobs: CompletedJob[] }> {
  return apiFetch("/api/jobs?status=complete&limit=5&needsReview=true");
}

export interface CompletedJob {
  _id: string;
  title: string;
  assignedProvider?: { _id: string; name: string };
  hasReview?: boolean;
  completedAt?: string;
}

// ── Provider Search ───────────────────────────────────────────────────────────

export interface Provider {
  _id: string;
  name: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  skills?: string[];
  hourlyRate?: number;
  isFavorite?: boolean;
}

export async function searchProviders(q: string): Promise<{ providers: Provider[] }> {
  return apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=providers&limit=10`);
}

export async function addFavorite(providerId: string): Promise<unknown> {
  return apiFetch(`/api/favorites/${providerId}`, { method: "POST" });
}

export async function removeFavorite(providerId: string): Promise<unknown> {
  return apiFetch(`/api/favorites/${providerId}`, { method: "DELETE" });
}

// ── Announcements ─────────────────────────────────────────────────────────────

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "promotion";
  expiresAt?: string;
}

export async function getAnnouncements(): Promise<{ announcements: Announcement[] }> {
  return apiFetch("/api/announcements");
}

// ── Support Tickets ───────────────────────────────────────────────────────────

export interface SupportTicket {
  _id: string;
  subject: string;
  category: string;
  description: string;
  status: "waiting" | "in-progress" | "resolved";
  createdAt: string;
}

export interface SupportTicketPayload {
  subject: string;
  category: string;
  description: string;
}

export async function getSupportTickets(): Promise<{ tickets: SupportTicket[] }> {
  return apiFetch("/api/support/tickets");
}

export async function createSupportTicket(payload: SupportTicketPayload): Promise<{ ticket: SupportTicket }> {
  return apiFetch("/api/support/tickets", { method: "POST", body: JSON.stringify(payload) });
}

// ── Loyalty Points ────────────────────────────────────────────────────────────

export interface LoyaltyData {
  points: number;
  tier?: string;
  nextTierPoints?: number;
}

export interface LoyaltyReferral {
  referralCode: string;
  referralLink: string;
  referralCount: number;
}

export async function getLoyalty(): Promise<LoyaltyData> {
  return apiFetch("/api/loyalty");
}

export async function redeemLoyalty(points: number): Promise<{ message: string; remaining: number }> {
  return apiFetch("/api/loyalty/redeem", { method: "POST", body: JSON.stringify({ points }) });
}

export async function getLoyaltyReferral(): Promise<LoyaltyReferral> {
  return apiFetch("/api/loyalty/referral");
}

// ── Disputes ──────────────────────────────────────────────────────────────────

export interface Dispute {
  _id: string;
  jobId: string;
  jobTitle?: string;
  description: string;
  category: string;
  status: "open" | "under-review" | "resolved" | "closed";
  evidenceUrl?: string;
  createdAt: string;
}

export interface DisputePayload {
  jobId: string;
  category: string;
  description: string;
  evidenceUrl?: string;
  urgent?: boolean;
}

export async function getDisputes(): Promise<{ disputes: Dispute[] }> {
  return apiFetch("/api/disputes");
}

export async function createDispute(payload: DisputePayload): Promise<{ dispute: Dispute }> {
  return apiFetch("/api/disputes", { method: "POST", body: JSON.stringify(payload) });
}

export async function uploadEvidence(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
  return res.json() as Promise<{ url: string }>;
}

// ── Provider Availability ──────────────────────────────────────────────────────

export interface ProviderProfile {
  isAvailable: boolean;
}

export async function getProviderProfile(): Promise<ProviderProfile> {
  return apiFetch("/api/provider/profile");
}

export async function updateProviderAvailability(isAvailable: boolean): Promise<unknown> {
  return apiFetch("/api/provider", { method: "PATCH", body: JSON.stringify({ isAvailable }) });
}

// ── KYC ───────────────────────────────────────────────────────────────────────

export interface KycData {
  status: "verified" | "pending" | "rejected" | "not-submitted";
  uploadUrl?: string;
  rejectionReason?: string;
}

export async function getKycStatus(): Promise<KycData> {
  return apiFetch("/api/kyc");
}
