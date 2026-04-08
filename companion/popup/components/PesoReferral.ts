import { send, el } from "../utils";
import type { ReferralPayload } from "../../utils/api";

interface ReferralResponse { ok: boolean; error?: string }

export function renderPesoReferral(container: HTMLElement, prefill?: string): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Refer a Provider</h2>
      <span class="subtitle-sm">PESO Officer Tool</span>
    </div>
    <form id="referral-form" class="form" novalidate>
      <div class="field">
        <label for="ref-name">Full Name</label>
        <input id="ref-name" type="text" placeholder="Juan dela Cruz" required />
      </div>
      <div class="field">
        <label for="ref-email">Email <span class="optional">(optional)</span></label>
        <input id="ref-email" type="email" placeholder="juan@example.com" />
      </div>
      <div class="field">
        <label for="ref-phone">Phone <span class="optional">(optional)</span></label>
        <input id="ref-phone" type="tel" placeholder="+63 9XX XXX XXXX" />
      </div>
      <div class="field">
        <label for="ref-barangay">Barangay</label>
        <input id="ref-barangay" type="text" placeholder="Barangay" required />
      </div>
      <div class="field">
        <label for="ref-skills">Skills <span class="help">(comma-separated)</span></label>
        <input id="ref-skills" type="text" placeholder="Carpentry, Painting, Welding" required />
      </div>
      <div class="field">
        <label for="ref-program">Livelihood Program <span class="optional">(optional)</span></label>
        <input id="ref-program" type="text" placeholder="TUPAD, DOLE, etc." />
      </div>
      <div id="ref-error" class="error hidden"></div>
      <div id="ref-success" class="success hidden"></div>
      <button type="submit" id="ref-btn" class="btn-primary">Submit Referral</button>
    </form>
  `;

  const form = container.querySelector<HTMLFormElement>("#referral-form")!;
  const nameEl = container.querySelector<HTMLInputElement>("#ref-name")!;
  const emailEl = container.querySelector<HTMLInputElement>("#ref-email")!;
  const phoneEl = container.querySelector<HTMLInputElement>("#ref-phone")!;
  const barangayEl = container.querySelector<HTMLInputElement>("#ref-barangay")!;
  const skillsEl = container.querySelector<HTMLInputElement>("#ref-skills")!;
  const programEl = container.querySelector<HTMLInputElement>("#ref-program")!;
  const errorEl = container.querySelector<HTMLDivElement>("#ref-error")!;
  const successEl = container.querySelector<HTMLDivElement>("#ref-success")!;
  const btn = container.querySelector<HTMLButtonElement>("#ref-btn")!;

  // Pre-fill from text selection (Feature 6 — highlight name/contact on any page)
  if (prefill) nameEl.value = prefill.slice(0, 100);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    const skills = skillsEl.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      errorEl.textContent = "Please enter at least one skill";
      errorEl.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Submit Referral";
      return;
    }

    const payload: ReferralPayload = {
      name: nameEl.value.trim(),
      email: emailEl.value.trim() || undefined,
      phone: phoneEl.value.trim() || undefined,
      barangay: barangayEl.value.trim(),
      skills,
      livelihoodProgram: programEl.value.trim() || undefined,
    };

    const res = await send<ReferralResponse>({ type: "POST_REFERRAL", payload });

    if (res.ok) {
      const link = el("a", {
        href: "https://www.localpro.asia/peso/providers",
        target: "_blank",
        rel: "noopener",
        class: "success-link",
      });
      link.textContent = "View Provider Registry →";
      successEl.textContent = "Referral submitted! ";
      successEl.appendChild(link);
      successEl.classList.remove("hidden");
      form.reset();
    } else {
      errorEl.textContent = res.error ?? "Failed to submit referral";
      errorEl.classList.remove("hidden");
    }

    btn.disabled = false;
    btn.textContent = "Submit Referral";
  });
}
