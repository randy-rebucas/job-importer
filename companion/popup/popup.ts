/**
 * LocalPro Companion — Popup entry point
 *
 * Auth guard: shows LoginView when no cached user.
 * Tab bar is filtered by role (client / provider / peso).
 */

import { renderLoginView } from "./components/LoginView";
import { renderNotificationList } from "./components/NotificationList";
import { renderQuickJobPost } from "./components/QuickJobPost";
import { renderQuickQuote } from "./components/QuickQuote";
import { renderChatView } from "./components/ChatView";
import { renderPaymentStatus } from "./components/PaymentStatus";
import { renderPesoReferral } from "./components/PesoReferral";
import { renderSupportTickets } from "./components/SupportTickets";
import { renderLoyaltyPoints } from "./components/LoyaltyPoints";
import { renderProviderSearch } from "./components/ProviderSearch";
import { renderJobTracker } from "./components/JobTracker";
import { renderRecurringJobs } from "./components/RecurringJobs";
import { renderDisputeWizard, renderFileDispute, renderMyDisputes } from "./components/DisputeWizard";
import { renderAvailabilityToggle } from "./components/AvailabilityToggle";
import { send, formatPHP } from "./utils";
import type { MeResponse, Announcement, KycData } from "../utils/api";

type TabId = "notifications" | "post-job" | "quotes" | "chat" | "payment" | "referral" | "support" | "loyalty" | "providers" | "jobs" | "recurring" | "file-dispute" | "my-disputes" | "availability";

interface Tab {
  id: TabId;
  icon: string;
  name: string;
  roles?: MeResponse["role"][];
  render: (container: HTMLElement, user: MeResponse, prefill?: string) => void;
}

const TABS: Tab[] = [
  { id: "notifications", icon: "🔔", name: "Alerts",
    render: (c) => renderNotificationList(c) },
  { id: "post-job",      icon: "➕", name: "Post Job",  roles: ["client"],
    render: (c, _u, prefill) => renderQuickJobPost(c, prefill) },
  { id: "quotes",        icon: "📋", name: "Quotes",    roles: ["provider"],
    render: (c) => renderQuickQuote(c) },
  { id: "chat",          icon: "💬", name: "Chat",
    render: (c, u) => renderChatView(c, u) },
  { id: "payment",       icon: "💳", name: "Payment",   roles: ["client"],
    render: (c) => renderPaymentStatus(c) },
  { id: "referral",      icon: "👤", name: "Referral",  roles: ["peso"],
    render: (c, _u, prefill) => renderPesoReferral(c, prefill) },
  { id: "jobs",          icon: "🗂️", name: "My Jobs",   roles: ["client", "provider"],
    render: (c, u) => renderJobTracker(c, u) },
  { id: "recurring",     icon: "🔁", name: "Schedule",  roles: ["client", "provider"],
    render: (c) => renderRecurringJobs(c) },
  { id: "providers",     icon: "🔍", name: "Find",      roles: ["client"],
    render: (c) => renderProviderSearch(c) },
  { id: "file-dispute",  icon: "⚖️", name: "File Dispute", roles: ["client", "provider"],
    render: (c) => renderFileDispute(c) },
  { id: "my-disputes",   icon: "📋", name: "My Disputes",  roles: ["client", "provider"],
    render: (c) => renderMyDisputes(c) },
  { id: "availability",  icon: "🟢", name: "Availability", roles: ["provider"],
    render: (c) => renderAvailabilityToggle(c) },
  { id: "support",       icon: "🎫", name: "Support",
    render: (c) => renderSupportTickets(c) },
  { id: "loyalty",       icon: "⭐", name: "Points",
    render: (c) => renderLoyaltyPoints(c) },
];

const app = document.getElementById("app")!;

async function main(): Promise<void> {
  const { user } = await send<{ user: MeResponse | null }>({ type: "GET_AUTH" });

  if (!user) {
    renderLogin();
    return;
  }

  // Prefill values written by the content script via chrome.storage.session
  // (sessionStorage is per-origin and not shared between page and popup)
  const prefillRes = await send<{ ok: boolean; job?: string; referral?: string }>(
    { type: "GET_PREFILL", keys: ["job", "referral"] }
  );
  const prefillJob = prefillRes.job ?? undefined;
  const prefillRef = prefillRes.referral ?? undefined;

  renderShell(user, prefillJob, prefillRef);
}

function renderLogin(): void {
  app.innerHTML = "";
  renderLoginView(app, (user) => renderShell(user));
}

function renderShell(
  user: MeResponse,
  prefillJob?: string,
  prefillRef?: string
): void {
  const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(user.role));

  // ── Header ────────────────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "popup-header";

  const logoWrap = document.createElement("div");
  logoWrap.className = "header-logo";
  const logoImg = document.createElement("img");
  logoImg.src = "icons/icon16.png";
  logoImg.alt = "LP";
  logoImg.width = 16;
  logoImg.height = 16;
  const logoText = document.createElement("span");
  logoText.textContent = "LocalPro";
  logoWrap.append(logoImg, logoText);

  const userInfo = document.createElement("div");
  userInfo.className = "header-user";
  const userName = document.createElement("span");
  userName.className = "user-name";
  userName.textContent = user.name;
  const searchBtn = document.createElement("button");
  searchBtn.className = "btn-ghost btn-xs";
  searchBtn.title = "Search";
  searchBtn.textContent = "🔍";
  const logoutBtn = document.createElement("button");
  logoutBtn.className = "btn-ghost btn-xs";
  logoutBtn.textContent = "Sign out";
  logoutBtn.addEventListener("click", async () => {
    await send({ type: "LOGOUT" });
    renderLogin();
  });
  userInfo.append(userName, searchBtn, logoutBtn);

  const headerRow = document.createElement("div");
  headerRow.className = "header-row";
  headerRow.append(logoWrap, userInfo);
  header.append(headerRow);

  // ── Omni-search panel ─────────────────────────────────────────────────────
  const searchPanel = document.createElement("div");
  searchPanel.className = "omni-panel hidden";
  searchPanel.innerHTML = `
    <input id="omni-input" type="text" placeholder="Search jobs, providers, categories…" class="omni-input" />
    <div id="omni-results" class="omni-results"></div>
  `;

  // ── Banner slot (announcement injected here) ──────────────────────────────
  const bannerSlot = document.createElement("div");
  bannerSlot.id = "banner-slot";

  // ── Main content area ─────────────────────────────────────────────────────
  const mainEl = document.createElement("div");
  mainEl.className = "main-content";

  app.innerHTML = "";
  app.append(header, searchPanel, bannerSlot, mainEl);

  wireOmniSearch(searchBtn, searchPanel);

  if (user.role === "client" || user.role === "provider") {
    void loadWalletBar(header);
  }
  if (user.role === "provider") {
    void loadKycBar(header);
  }
  void loadAnnouncementBanner(bannerSlot);

  // Open prefill targets directly, otherwise show home grid
  if (prefillJob) {
    const tab = visibleTabs.find((t) => t.id === "post-job");
    if (tab) { openFeature(mainEl, user, visibleTabs, tab, prefillJob); return; }
  }
  if (prefillRef) {
    const tab = visibleTabs.find((t) => t.id === "referral");
    if (tab) { openFeature(mainEl, user, visibleTabs, tab, prefillRef); return; }
  }

  showHome(mainEl, user, visibleTabs);
}

// ── Home grid ─────────────────────────────────────────────────────────────────

function showHome(mainEl: HTMLElement, user: MeResponse, tabs: Tab[]): void {
  mainEl.innerHTML = "";
  mainEl.className = "main-content";

  const grid = document.createElement("div");
  grid.className = "home-grid";

  tabs.forEach((tab) => {
    const tile = document.createElement("button");
    tile.className = "home-tile";
    tile.setAttribute("data-tab", tab.id);

    const iconEl = document.createElement("span");
    iconEl.className = "home-tile-icon";
    iconEl.textContent = tab.icon;

    const nameEl = document.createElement("span");
    nameEl.className = "home-tile-name";
    nameEl.textContent = tab.name;

    tile.append(iconEl, nameEl);
    tile.addEventListener("click", () => openFeature(mainEl, user, tabs, tab));
    grid.appendChild(tile);
  });

  mainEl.appendChild(grid);
  void loadHomeBadges(grid);
}

async function loadHomeBadges(grid: HTMLElement): Promise<void> {
  // Show unread notification count on the Alerts tile
  const res = await send<{ ok: boolean; unreadCount?: number }>({ type: "GET_NOTIFICATIONS" });
  if (!res.ok || !res.unreadCount) return;
  const alertTile = grid.querySelector<HTMLElement>('[data-tab="notifications"]');
  if (!alertTile) return;
  const badge = document.createElement("span");
  badge.className = "home-tile-badge";
  badge.textContent = res.unreadCount > 99 ? "99+" : String(res.unreadCount);
  alertTile.appendChild(badge);
}

// ── Feature view ──────────────────────────────────────────────────────────────

function openFeature(
  mainEl: HTMLElement,
  user: MeResponse,
  tabs: Tab[],
  tab: Tab,
  prefill?: string
): void {
  mainEl.innerHTML = "";
  mainEl.className = "main-content feature-view";

  // Nav bar
  const nav = document.createElement("div");
  nav.className = "feature-nav";

  const backBtn = document.createElement("button");
  backBtn.className = "back-btn";
  backBtn.innerHTML = `<span class="back-arrow">‹</span> Back`;
  backBtn.addEventListener("click", () => showHome(mainEl, user, tabs));

  const navTitle = document.createElement("div");
  navTitle.className = "feature-nav-title";
  const titleIcon = document.createElement("span");
  titleIcon.textContent = tab.icon;
  const titleText = document.createElement("span");
  titleText.textContent = tab.name;
  navTitle.append(titleIcon, titleText);

  nav.append(backBtn, navTitle);

  // Feature content
  const featureContent = document.createElement("div");
  featureContent.className = "feature-content";

  mainEl.append(nav, featureContent);
  tab.render(featureContent, user, prefill);
}

// ── Omni-Search ───────────────────────────────────────────────────────────────

interface OmniResponse { ok: boolean; results?: { type: string; _id: string; title: string; subtitle?: string; url: string }[]; error?: string }

function wireOmniSearch(toggleBtn: HTMLButtonElement, panel: HTMLElement): void {
  const input   = panel.querySelector<HTMLInputElement>("#omni-input")!;
  const results = panel.querySelector<HTMLElement>("#omni-results")!;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  toggleBtn.addEventListener("click", () => {
    const open = panel.classList.toggle("hidden") === false;
    if (open) {
      input.focus();
    } else {
      results.innerHTML = "";
      input.value = "";
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      panel.classList.add("hidden");
      results.innerHTML = "";
      input.value = "";
    }
  });

  input.addEventListener("input", () => {
    if (debounce) clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { results.innerHTML = ""; return; }
    debounce = setTimeout(() => void doOmniSearch(q, results), 300);
  });
}

async function doOmniSearch(q: string, results: HTMLElement): Promise<void> {
  results.innerHTML = `<p class="omni-loading">Searching…</p>`;
  const res = await send<OmniResponse>({ type: "OMNI_SEARCH", q });
  if (!res.ok || !res.results?.length) {
    results.innerHTML = `<p class="omni-empty">No results for "${q}"</p>`;
    return;
  }

  const grouped: Record<string, typeof res.results> = {};
  for (const r of res.results) {
    (grouped[r.type] ??= []).push(r);
  }

  results.innerHTML = "";
  const labels: Record<string, string> = { job: "Jobs", provider: "Providers", category: "Categories" };

  for (const [type, items] of Object.entries(grouped)) {
    const groupEl = document.createElement("div");
    groupEl.className = "omni-group";

    const groupLabel = document.createElement("p");
    groupLabel.className = "omni-group-label";
    groupLabel.textContent = labels[type] ?? type;
    groupEl.appendChild(groupLabel);

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "omni-result-row";
      row.innerHTML = `
        <span class="omni-result-title">${item.title}</span>
        ${item.subtitle ? `<span class="omni-result-sub">${item.subtitle}</span>` : ""}
      `;
      row.addEventListener("click", () => window.open(item.url, "_blank"));
      groupEl.appendChild(row);
    });

    results.appendChild(groupEl);
  }
}

// ── Wallet balance bar ────────────────────────────────────────────────────────

async function loadWalletBar(header: HTMLElement): Promise<void> {
  const res = await send<{ ok: boolean; balance?: number; pending?: number }>({
    type: "GET_WALLET",
  });
  if (!res.ok) return;

  const bar = document.createElement("div");
  bar.className = "wallet-bar";

  const balanceEl = document.createElement("span");
  balanceEl.className = "wallet-balance";
  balanceEl.textContent = `${formatPHP(res.balance ?? 0)}`;

  const pendingEl = document.createElement("span");
  pendingEl.className = "wallet-pending";
  pendingEl.textContent = `+${formatPHP(res.pending ?? 0)} escrow`;

  const actions = document.createElement("div");
  actions.className = "wallet-actions";

  const topUpBtn = document.createElement("a");
  topUpBtn.className = "wallet-link";
  topUpBtn.textContent = "Top Up";
  topUpBtn.href = "#";
  topUpBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("https://www.localpro.asia/wallet/topup", "_blank");
  });

  const sepEl = document.createElement("span");
  sepEl.className = "wallet-sep";
  sepEl.textContent = "·";

  const withdrawBtn = document.createElement("a");
  withdrawBtn.className = "wallet-link";
  withdrawBtn.textContent = "Withdraw";
  withdrawBtn.href = "#";
  withdrawBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("https://www.localpro.asia/wallet/withdraw", "_blank");
  });

  actions.append(topUpBtn, sepEl, withdrawBtn);
  bar.append(balanceEl, pendingEl, actions);
  header.appendChild(bar);
}

// ── KYC bar ───────────────────────────────────────────────────────────────────

async function loadKycBar(header: HTMLElement): Promise<void> {
  const res = await send<{ ok: boolean } & KycData>({ type: "GET_KYC" });
  if (!res.ok) return;

  // Only show the bar when action is needed
  if (res.status === "verified" || res.status === "not-submitted") return;

  const bar = document.createElement("div");
  const isRejected = res.status === "rejected";
  bar.className = `kyc-bar ${isRejected ? "kyc-rejected" : "kyc-pending"}`;

  const icon = isRejected ? "❌" : "⏳";
  const text = isRejected
    ? `KYC rejected${res.rejectionReason ? `: ${res.rejectionReason}` : ""}. Please re-upload.`
    : "Identity verification pending — complete KYC to unlock all features.";

  const msgEl = document.createElement("span");
  msgEl.className = "kyc-bar-msg";
  msgEl.textContent = `${icon} ${text}`;

  const link = document.createElement("a");
  link.className = "kyc-bar-link";
  link.textContent = "Upload docs →";
  link.href = "#";
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const uploadUrl = res.uploadUrl ?? "https://www.localpro.asia/kyc/upload";
    window.open(uploadUrl, "_blank");
  });

  bar.append(msgEl, link);
  header.appendChild(bar);
}

// ── Announcement banner ───────────────────────────────────────────────────────

const DISMISSED_KEY = "lp_dismissed_announcements";

async function loadAnnouncementBanner(bannerSlot: HTMLElement): Promise<void> {
  const res = await send<{ ok: boolean; announcements?: Announcement[] }>({
    type: "GET_ANNOUNCEMENTS",
  });

  if (!res.ok || !res.announcements?.length) return;

  const dismissed = new Set<string>(
    JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]
  );

  const active = res.announcements.filter((a) => !dismissed.has(a._id));
  if (!active.length) return;

  // Show only the first undismissed announcement
  const ann = active[0];
  const typeClass = ann.type === "warning"   ? "banner-warning"
                  : ann.type === "promotion" ? "banner-promotion"
                  : "banner-info";

  const banner = document.createElement("div");
  banner.className = `announcement-banner ${typeClass}`;
  banner.innerHTML = `
    <div class="banner-text">
      <span class="banner-title">${ann.title}</span>
      <span class="banner-msg">${ann.message}</span>
    </div>
    <button class="banner-dismiss" title="Dismiss">×</button>
  `;

  banner.querySelector<HTMLButtonElement>(".banner-dismiss")!.addEventListener("click", () => {
    dismissed.add(ann._id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
    banner.remove();
  });

  bannerSlot.appendChild(banner);
}

void main();
