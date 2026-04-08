import type {
  AuthStatusResponse,
  GetImportHistoryResponse,
  GetImportStatsResponse,
  ImportHistoryItem,
  LoginMessage,
  LoginResponse,
  LogoutMessage,
} from "./types";

// ── DOM references ────────────────────────────────────────────────────────────

const loadingSection   = document.getElementById("loading-section")!;
const authSection      = document.getElementById("auth-section")!;
const loggedInSection  = document.getElementById("logged-in-section")!;

const userNameEl   = document.getElementById("user-name")!;
const userEmailEl  = document.getElementById("user-email")!;
const userRoleEl   = document.getElementById("user-role")!;

const emailInput       = document.getElementById("email")     as HTMLInputElement;
const passwordInput    = document.getElementById("password")  as HTMLInputElement;
const togglePasswordBtn= document.getElementById("toggle-password") as HTMLButtonElement;
const loginBtn         = document.getElementById("login-btn") as HTMLButtonElement;
const loginBtnText     = document.getElementById("login-btn-text")!;
const loginSpinner     = document.getElementById("login-spinner")!;
const authError        = document.getElementById("auth-error")!;
const logoutBtn        = document.getElementById("logout-btn") as HTMLButtonElement;

const scanBtn          = document.getElementById("scan-btn")         as HTMLButtonElement;
const scrollScanBtn    = document.getElementById("scroll-scan-btn")  as HTMLButtonElement;
const scanBtnText      = document.getElementById("scan-btn-text")!;
const scrollScanBtnText= document.getElementById("scroll-scan-btn-text")!;
const scanError        = document.getElementById("scan-error")!;

const statTotal        = document.getElementById("stat-total")!;
const statToday        = document.getElementById("stat-today")!;
const importBadge      = document.getElementById("import-badge")!;

const historyList      = document.getElementById("history-list")!;
const clearHistoryBtn  = document.getElementById("clear-history-btn") as HTMLButtonElement;

// ── Section helpers ───────────────────────────────────────────────────────────

function showSection(id: "loading" | "auth" | "loggedIn"): void {
  loadingSection.classList.add("hidden");
  authSection.classList.add("hidden");
  loggedInSection.classList.add("hidden");
  if      (id === "loading")  loadingSection.classList.remove("hidden");
  else if (id === "auth")     authSection.classList.remove("hidden");
  else                        loggedInSection.classList.remove("hidden");
}

function showError(msg: string): void {
  authError.textContent = msg;
  authError.classList.remove("hidden");
}

function clearError(): void {
  authError.textContent = "";
  authError.classList.add("hidden");
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  showSection("loading");
  try {
    const status = await chrome.runtime.sendMessage<{ type: "GET_AUTH_STATUS" }, AuthStatusResponse>(
      { type: "GET_AUTH_STATUS" }
    );

    if (status?.authenticated && status.user) {
      populateLoggedIn(status.user);
      showSection("loggedIn");
      void loadStats();
      void loadHistory();
    } else {
      showSection("auth");
      emailInput.focus();
    }
  } catch (err) {
    console.warn("[LocalPro] Background not ready:", err);
    showSection("auth");
    emailInput.focus();
  }
}

function populateLoggedIn(user: NonNullable<AuthStatusResponse["user"]>): void {
  userNameEl.textContent  = user.name;
  userEmailEl.textContent = user.email;
  userRoleEl.textContent  = user.role;
  userRoleEl.className    = `user-role-badge role-${user.role}`;
}

// ── Import stats ──────────────────────────────────────────────────────────────

async function loadStats(): Promise<void> {
  try {
    const [statsRes, histRes] = await Promise.all([
      chrome.runtime.sendMessage<{ type: "GET_IMPORT_STATS" }, GetImportStatsResponse>({ type: "GET_IMPORT_STATS" }),
      chrome.runtime.sendMessage<{ type: "GET_IMPORT_HISTORY" }, GetImportHistoryResponse>({ type: "GET_IMPORT_HISTORY" }),
    ]);

    const total = statsRes?.count ?? 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = (histRes?.history ?? []).filter(
      (h) => new Date(h.importedAt) >= todayStart
    ).length;

    statTotal.textContent = String(total);
    statToday.textContent = String(todayCount);

    if (todayCount > 0) {
      importBadge.textContent = String(todayCount);
      importBadge.classList.remove("hidden");
    }
  } catch {
    statTotal.textContent = "—";
    statToday.textContent = "—";
  }
}

// ── Import history ────────────────────────────────────────────────────────────

async function loadHistory(): Promise<void> {
  try {
    const res = await chrome.runtime.sendMessage<{ type: "GET_IMPORT_HISTORY" }, GetImportHistoryResponse>(
      { type: "GET_IMPORT_HISTORY" }
    );
    renderHistory(res?.history ?? []);
  } catch {
    renderHistory([]);
  }
}

function renderHistory(history: ImportHistoryItem[]): void {
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = `<div class="history-empty">No imports yet.</div>`;
    return;
  }

  history.slice(0, 8).forEach((item) => {
    const row = document.createElement("a");
    row.className = "history-item";
    row.href = `https://www.localpro.asia/jobs/${item.job_id}`;
    row.target = "_blank";
    row.rel = "noopener";

    const timeAgo = formatRelative(item.importedAt);

    const chip = document.createElement("span");
    chip.className = `history-chip ${item.source}`;
    chip.textContent = item.source.slice(0, 2).toUpperCase();

    const title = document.createElement("span");
    title.className = "history-job-title";
    title.textContent = item.title.length > 38
      ? item.title.slice(0, 38) + "…"
      : item.title;

    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = timeAgo;

    row.append(chip, title, time);
    historyList.appendChild(row);
  });
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

clearHistoryBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("import_history");
  statTotal.textContent = "0";
  statToday.textContent = "0";
  importBadge.classList.add("hidden");
  await chrome.action.setBadgeText({ text: "" });
  renderHistory([]);
});

// ── Quick scan (sends SCAN_TAB message to content script) ─────────────────────

async function triggerScan(autoScroll: boolean): Promise<void> {
  const btn     = autoScroll ? scrollScanBtn     : scanBtn;
  const btnText = autoScroll ? scrollScanBtnText : scanBtnText;

  scanError.classList.add("hidden");
  btn.disabled = true;
  btnText.textContent = autoScroll ? "Injecting…" : "Injecting…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      showScanError("No active tab found.");
      return;
    }

    const url = tab.url ?? "";
    const isSupported =
      url.includes("facebook.com") ||
      url.includes("linkedin.com") ||
      url.includes("jobstreet.com") ||
      url.includes("indeed.com");

    if (!isSupported) {
      showScanError("Navigate to Facebook, LinkedIn, JobStreet, or Indeed first.");
      return;
    }

    btnText.textContent = autoScroll ? "Scrolling & Scanning…" : "Scanning…";

    // Delegate to background — it handles injection + scan via chrome.scripting
    const result = await chrome.runtime.sendMessage<
      { type: "INJECT_AND_SCAN"; tabId: number; autoScroll: boolean },
      { ok: boolean; error?: string }
    >({ type: "INJECT_AND_SCAN", tabId: tab.id, autoScroll });

    if (result?.ok) {
      window.close();
    } else {
      showScanError(result?.error ?? "Scan failed. Please refresh the page and try again.");
    }
  } catch (err) {
    showScanError(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    btn.disabled = false;
    btnText.textContent = autoScroll ? "Scroll & Scan" : "Scan Current Tab";
  }
}

function showScanError(msg: string): void {
  scanError.textContent = msg;
  scanError.classList.remove("hidden");
}

scanBtn.addEventListener("click",       () => void triggerScan(false));
scrollScanBtn.addEventListener("click", () => void triggerScan(true));

// ── Login ─────────────────────────────────────────────────────────────────────

loginBtn.addEventListener("click", async () => {
  clearError();

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email)              { showError("Email is required.");              emailInput.focus();    return; }
  if (!password)           { showError("Password is required.");           passwordInput.focus(); return; }
  if (!email.includes("@")){ showError("Enter a valid email address.");   emailInput.focus();    return; }

  setLoginLoading(true);

  try {
    const msg: LoginMessage = { type: "LOGIN", email, password };
    const res = await chrome.runtime.sendMessage<LoginMessage, LoginResponse>(msg);

    if (!res) {
      showError("Extension background is not responding. Close and reopen the popup.");
      return;
    }

    if (res.success && res.user) {
      passwordInput.value = "";
      populateLoggedIn(res.user);
      showSection("loggedIn");
      void loadStats();
      void loadHistory();
    } else {
      showError(res.error ?? "Login failed. Check your credentials.");
    }
  } catch (err) {
    showError(`Connection error: ${String(err)}`);
  } finally {
    setLoginLoading(false);
  }
});

passwordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });
emailInput.addEventListener(   "keydown", (e) => { if (e.key === "Enter") passwordInput.focus(); });

function setLoginLoading(loading: boolean): void {
  loginBtn.disabled = loading;
  loginBtnText.textContent = loading ? "Signing in…" : "Sign In";
  loginSpinner.classList.toggle("hidden", !loading);
}

// ── Toggle password visibility ────────────────────────────────────────────────

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  document.getElementById("eye-icon")!.innerHTML = isPassword
    ? `<path stroke-linecap="round" stroke-linejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`
    : `<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
       <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
});

// ── Logout ────────────────────────────────────────────────────────────────────

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  logoutBtn.textContent = "Signing out…";

  try {
    const msg: LogoutMessage = { type: "LOGOUT" };
    await chrome.runtime.sendMessage(msg);
  } catch {
    // Proceed regardless
  }

  emailInput.value    = "";
  passwordInput.value = "";
  clearError();
  showSection("auth");
  emailInput.focus();
  logoutBtn.disabled = false;
  logoutBtn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    Sign Out`;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeText(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Run ───────────────────────────────────────────────────────────────────────

void init();
