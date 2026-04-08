import { send } from "../utils";
import type { MeResponse } from "../../utils/api";

export function renderLoginView(
  container: HTMLElement,
  onLogin: (user: MeResponse) => void
): void {
  container.innerHTML = `
    <div class="login-view">
      <div class="logo">
        <img src="icons/icon48.png" alt="LocalPro" width="40" height="40" />
        <h1>LocalPro</h1>
      </div>
      <p class="subtitle">Sign in to access your companion</p>
      <form id="login-form" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
        </div>
        <div id="login-error" class="error hidden"></div>
        <button type="submit" id="login-btn" class="btn-primary">Sign in</button>
      </form>
    </div>
  `;

  const form = container.querySelector<HTMLFormElement>("#login-form")!;
  const emailEl = container.querySelector<HTMLInputElement>("#email")!;
  const passEl = container.querySelector<HTMLInputElement>("#password")!;
  const errorEl = container.querySelector<HTMLDivElement>("#login-error")!;
  const btn = container.querySelector<HTMLButtonElement>("#login-btn")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Signing in…";

    const res = await send<{ ok: boolean; user?: MeResponse; error?: string }>({
      type: "LOGIN",
      email: emailEl.value.trim(),
      password: passEl.value,
    });

    if (res.ok && res.user) {
      onLogin(res.user);
    } else {
      errorEl.textContent = res.error ?? "Login failed";
      errorEl.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
}
