/**
 * Popup script — runs inside popup.html.
 *
 * Auth model: HttpOnly cookie-based sessions.
 * The popup never touches tokens directly. All API calls go through
 * the background service worker (which has access to the cookie store).
 *
 * Responsibilities:
 *  1. On open: ask background for current auth status via GET /api/auth/me.
 *  2. Login: send LOGIN message → background calls POST /api/auth/login.
 *  3. Logout: send LOGOUT message → background calls POST /api/auth/logout.
 */

import type {
  AuthStatusResponse,
  LoginMessage,
  LoginResponse,
  LogoutMessage,
} from "./types";

// ── DOM references ────────────────────────────────────────────────────────────

const loadingSection = document.getElementById("loading-section")!;
const authSection = document.getElementById("auth-section")!;
const loggedInSection = document.getElementById("logged-in-section")!;

const userNameEl = document.getElementById("user-name")!;
const userEmailEl = document.getElementById("user-email")!;
const userRoleEl = document.getElementById("user-role")!;

const emailInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const togglePasswordBtn = document.getElementById("toggle-password") as HTMLButtonElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const loginBtnText = document.getElementById("login-btn-text")!;
const loginSpinner = document.getElementById("login-spinner")!;
const authError = document.getElementById("auth-error")!;

const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;

// ── Section helpers ───────────────────────────────────────────────────────────

function showSection(id: "loading" | "auth" | "loggedIn"): void {
  loadingSection.classList.add("hidden");
  authSection.classList.add("hidden");
  loggedInSection.classList.add("hidden");
  if (id === "loading") loadingSection.classList.remove("hidden");
  else if (id === "auth") authSection.classList.remove("hidden");
  else loggedInSection.classList.remove("hidden");
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
    const status = await chrome.runtime.sendMessage<
      { type: "GET_AUTH_STATUS" },
      AuthStatusResponse
    >({ type: "GET_AUTH_STATUS" });

    if (status?.authenticated && status.user) {
      populateLoggedIn(status.user);
      showSection("loggedIn");
    } else {
      showSection("auth");
      emailInput.focus();
    }
  } catch (err) {
    // Service worker may not be ready on first load — this is expected.
    console.warn("[LocalPro] Could not reach background service worker during init:", err);
    showSection("auth");
    emailInput.focus();
  }
}

function populateLoggedIn(user: NonNullable<AuthStatusResponse["user"]>): void {
  userNameEl.textContent = user.name;
  userEmailEl.textContent = user.email;
  userRoleEl.textContent = user.role;
  userRoleEl.className = `user-role-badge role-${user.role}`;
}

// ── Login ─────────────────────────────────────────────────────────────────────

loginBtn.addEventListener("click", async () => {
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) { showError("Email is required."); emailInput.focus(); return; }
  if (!password) { showError("Password is required."); passwordInput.focus(); return; }
  if (!email.includes("@")) { showError("Enter a valid email address."); emailInput.focus(); return; }

  setLoginLoading(true);

  try {
    const msg: LoginMessage = { type: "LOGIN", email, password };
    const res = await chrome.runtime.sendMessage<LoginMessage, LoginResponse>(msg);

    if (!res) {
      // Service worker was terminated before it could respond — ask user to retry.
      showError("Extension background is not responding. Please close and reopen the popup and try again.");
      return;
    }

    if (res.success && res.user) {
      passwordInput.value = "";
      populateLoggedIn(res.user);
      showSection("loggedIn");
    } else {
      showError(res.error ?? "Login failed. Check your credentials and try again.");
    }
  } catch (err) {
    showError(`Connection error: ${String(err)}`);
  } finally {
    setLoginLoading(false);
  }
});

// Submit on Enter in password field
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// Submit on Enter in email field (moves to password)
emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") passwordInput.focus();
});

function setLoginLoading(loading: boolean): void {
  loginBtn.disabled = loading;
  loginBtnText.textContent = loading ? "Signing in…" : "Sign In";
  loginSpinner.classList.toggle("hidden", !loading);
}

// ── Toggle password visibility ────────────────────────────────────────────────

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  // Swap icon (open eye vs. slashed eye)
  document.getElementById("eye-icon")!.innerHTML = isPassword
    ? `<path stroke-linecap="round" stroke-linejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`
    : `<path stroke-linecap="round" stroke-linejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
       <path stroke-linecap="round" stroke-linejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
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

  emailInput.value = "";
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

// ── Run ───────────────────────────────────────────────────────────────────────

void init();
