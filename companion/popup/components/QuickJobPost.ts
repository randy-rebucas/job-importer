import { send, el } from "../utils";
import type { JobPayload } from "../../utils/api";

export function renderQuickJobPost(container: HTMLElement, prefill?: string): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Post a Job</h2>
    </div>
    <form id="job-form" class="form" novalidate>
      <div class="field">
        <label for="job-title">Title</label>
        <input id="job-title" type="text" placeholder="e.g. Fix kitchen sink" required maxlength="100" />
      </div>
      <div class="field">
        <label for="job-desc">Description</label>
        <textarea id="job-desc" rows="3" placeholder="Describe the job…" required maxlength="2000"></textarea>
      </div>
      <div class="field">
        <label for="job-category">Category</label>
        <input id="job-category" type="text" placeholder="e.g. Plumbing" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="budget-min">Min Budget (₱)</label>
          <input id="budget-min" type="number" min="0" placeholder="500" required />
        </div>
        <div class="field">
          <label for="budget-max">Max Budget (₱)</label>
          <input id="budget-max" type="number" min="0" placeholder="2000" required />
        </div>
      </div>
      <div class="field">
        <label for="job-address">Address</label>
        <input id="job-address" type="text" placeholder="Street / Barangay" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="job-city">City</label>
          <input id="job-city" type="text" placeholder="City" required />
        </div>
        <div class="field">
          <label for="job-province">Province</label>
          <input id="job-province" type="text" placeholder="Province" required />
        </div>
      </div>
      <div id="job-error" class="error hidden"></div>
      <div id="job-success" class="success hidden"></div>
      <button type="submit" id="job-btn" class="btn-primary">Post Job</button>
    </form>
  `;

  const form = container.querySelector<HTMLFormElement>("#job-form")!;
  const titleEl = container.querySelector<HTMLInputElement>("#job-title")!;
  const descEl = container.querySelector<HTMLTextAreaElement>("#job-desc")!;
  const catEl = container.querySelector<HTMLInputElement>("#job-category")!;
  const minEl = container.querySelector<HTMLInputElement>("#budget-min")!;
  const maxEl = container.querySelector<HTMLInputElement>("#budget-max")!;
  const addrEl = container.querySelector<HTMLInputElement>("#job-address")!;
  const cityEl = container.querySelector<HTMLInputElement>("#job-city")!;
  const provEl = container.querySelector<HTMLInputElement>("#job-province")!;
  const errorEl = container.querySelector<HTMLDivElement>("#job-error")!;
  const successEl = container.querySelector<HTMLDivElement>("#job-success")!;
  const btn = container.querySelector<HTMLButtonElement>("#job-btn")!;

  // Pre-fill from text selection (Feature 2)
  if (prefill) {
    titleEl.value = prefill.slice(0, 100);
    descEl.value = prefill.slice(0, 2000);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    const min = Number(minEl.value);
    const max = Number(maxEl.value);
    if (max < min) {
      errorEl.textContent = "Max budget must be ≥ min budget";
      errorEl.classList.remove("hidden");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Posting…";

    const payload: JobPayload = {
      title: titleEl.value.trim(),
      description: descEl.value.trim(),
      category: catEl.value.trim(),
      budget: { min, max },
      location: {
        address: addrEl.value.trim(),
        city: cityEl.value.trim(),
        province: provEl.value.trim(),
      },
    };

    const res = await send<{ ok: boolean; job?: { _id: string }; error?: string }>({
      type: "POST_JOB",
      payload,
    });

    if (res.ok) {
      const link = el("a", {
        href: `https://www.localpro.asia/client/my-jobs`,
        target: "_blank",
        rel: "noopener",
        class: "success-link",
      });
      link.textContent = "View my jobs →";
      successEl.textContent = "Job posted! ";
      successEl.appendChild(link);
      successEl.classList.remove("hidden");
      form.reset();
    } else {
      errorEl.textContent = res.error ?? "Failed to post job";
      errorEl.classList.remove("hidden");
    }

    btn.disabled = false;
    btn.textContent = "Post Job";
  });
}
