import { send } from "../utils";
import type { MeResponse } from "../../utils/api";

export function renderLoginView(
  container: HTMLElement,
  onLogin: (user: MeResponse) => void
): void {
  container.innerHTML = `
    <div class="login-wrap">

      <!-- Hero header -->
      <div class="login-hero">
        <div class="login-hero-bg"></div>
        <div class="login-hero-content">
          <div class="login-logo-ring">
            <img src="icons/icon48.png" alt="LocalPro" width="32" height="32" />
          </div>
          <h1 class="login-brand">LocalPro</h1>
          <p class="login-tagline">Your work, at your fingertips</p>
        </div>
      </div>

      <!-- Form card -->
      <div class="login-card">
        <p class="login-welcome">Welcome back — sign in to continue</p>

        <form id="login-form" novalidate>

          <!-- Email -->
          <div class="lf-field" id="field-email">
            <label class="lf-label" for="email">Email address</label>
            <div class="lf-input-wrap">
              <span class="lf-icon">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M2 7l8 5 8-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
              </span>
              <input
                id="email"
                class="lf-input"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
              <span class="lf-valid-icon hidden" aria-hidden="true">✓</span>
            </div>
            <span class="lf-hint hidden" id="email-hint"></span>
          </div>

          <!-- Password -->
          <div class="lf-field" id="field-password">
            <label class="lf-label" for="password">Password</label>
            <div class="lf-input-wrap">
              <span class="lf-icon">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="9" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="10" cy="13.5" r="1.25" fill="currentColor"/>
                </svg>
              </span>
              <input
                id="password"
                class="lf-input"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="lf-eye-btn" id="toggle-pw" tabindex="-1" aria-label="Show password">
                <svg id="eye-show" width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6S1.5 10 1.5 10z" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <svg id="eye-hide" width="15" height="15" viewBox="0 0 20 20" fill="none" class="hidden">
                  <path d="M3 3l14 14M8.5 8.6A2.5 2.5 0 0012.4 12M6.7 5.7C4.5 7 2.5 9.5 2.5 10c.8 1.6 3.5 5.5 7.5 5.5 1.5 0 2.9-.5 4-1.3M10 4.5C14.5 4.5 17 8.5 17.5 10c-.4 1-1.3 2.5-2.7 3.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <span class="lf-hint hidden" id="pw-hint"></span>
          </div>

          <!-- Error banner -->
          <div id="login-error" class="lf-error hidden" role="alert">
            <span class="lf-error-icon">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 6v5M10 14v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <span id="login-error-text"></span>
          </div>

          <!-- Submit -->
          <button type="submit" id="login-btn" class="lf-submit">
            <span class="lf-btn-text">Sign in</span>
            <span class="lf-spinner hidden" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
          </button>

        </form>

        <div class="login-footer">
          <a href="#" class="login-forgot" id="forgot-link">Forgot password?</a>
          <span class="login-footer-sep">·</span>
          <a href="https://www.localpro.asia/register" class="login-register" target="_blank" rel="noopener">Create account</a>
        </div>
      </div>

    </div>
  `;

  // ── Element refs ──────────────────────────────────────────────────────────
  const form       = container.querySelector<HTMLFormElement>("#login-form")!;
  const emailEl    = container.querySelector<HTMLInputElement>("#email")!;
  const passEl     = container.querySelector<HTMLInputElement>("#password")!;
  const errorEl    = container.querySelector<HTMLDivElement>("#login-error")!;
  const errorText  = container.querySelector<HTMLSpanElement>("#login-error-text")!;
  const btn        = container.querySelector<HTMLButtonElement>("#login-btn")!;
  const btnText    = container.querySelector<HTMLSpanElement>(".lf-btn-text")!;
  const spinner    = container.querySelector<HTMLSpanElement>(".lf-spinner")!;
  const togglePw   = container.querySelector<HTMLButtonElement>("#toggle-pw")!;
  const eyeShow    = container.querySelector<SVGElement>("#eye-show")!;
  const eyeHide    = container.querySelector<SVGElement>("#eye-hide")!;
  const emailHint  = container.querySelector<HTMLSpanElement>("#email-hint")!;
  const emailValid = container.querySelector<HTMLSpanElement>("#field-email .lf-valid-icon")!;
  const forgotLink = container.querySelector<HTMLAnchorElement>("#forgot-link")!;

  // ── Password visibility toggle ────────────────────────────────────────────
  togglePw.addEventListener("click", () => {
    const isHidden = passEl.type === "password";
    passEl.type = isHidden ? "text" : "password";
    eyeShow.classList.toggle("hidden", isHidden);
    eyeHide.classList.toggle("hidden", !isHidden);
    togglePw.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });

  // ── Real-time email validation ────────────────────────────────────────────
  emailEl.addEventListener("blur", () => {
    const val = emailEl.value.trim();
    const fieldEl = container.querySelector<HTMLDivElement>("#field-email")!;
    if (!val) {
      setFieldState(fieldEl, emailHint, emailValid, "idle");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setFieldState(fieldEl, emailHint, emailValid, "error", "Enter a valid email address");
    } else {
      setFieldState(fieldEl, emailHint, emailValid, "ok");
    }
  });

  emailEl.addEventListener("input", () => {
    const fieldEl = container.querySelector<HTMLDivElement>("#field-email")!;
    if (emailEl.value.trim() === "") {
      setFieldState(fieldEl, emailHint, emailValid, "idle");
    }
    hideError();
  });

  passEl.addEventListener("input", () => hideError());

  // ── Forgot password ───────────────────────────────────────────────────────
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.open("https://www.localpro.asia/forgot-password", "_blank");
  });

  // ── Form submit ───────────────────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      showError("Please enter your email and password.");
      if (!email) emailEl.focus();
      else        passEl.focus();
      return;
    }

    setLoading(true);

    const res = await send<{ ok: boolean; user?: MeResponse; error?: string }>({
      type: "LOGIN",
      email,
      password,
    });

    if (res.ok && res.user) {
      onLogin(res.user);
    } else {
      setLoading(false);
      showError(res.error ?? "Incorrect email or password. Please try again.");
      shakeCard();
      passEl.value = "";
      passEl.focus();
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setLoading(on: boolean): void {
    btn.disabled = on;
    btnText.classList.toggle("hidden", on);
    spinner.classList.toggle("hidden", !on);
  }

  function showError(msg: string): void {
    errorText.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  function hideError(): void {
    errorEl.classList.add("hidden");
  }

  function shakeCard(): void {
    const card = container.querySelector<HTMLElement>(".login-card")!;
    card.classList.remove("shake");
    void card.offsetWidth; // reflow
    card.classList.add("shake");
  }

  function setFieldState(
    field: HTMLElement,
    hint: HTMLElement,
    validIcon: HTMLElement,
    state: "idle" | "ok" | "error",
    message = ""
  ): void {
    field.classList.remove("lf-field-ok", "lf-field-error");
    hint.classList.add("hidden");
    validIcon.classList.add("hidden");
    if (state === "ok") {
      field.classList.add("lf-field-ok");
      validIcon.classList.remove("hidden");
    } else if (state === "error") {
      field.classList.add("lf-field-error");
      hint.textContent = message;
      hint.classList.remove("hidden");
    }
  }
}
