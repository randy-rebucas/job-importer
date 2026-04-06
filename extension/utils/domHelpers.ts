import type { Category, ImportJobMessage, ImportJobResponse, JobPost } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const BUTTON_CLASS = "localpro-import-btn";
const MODAL_HOST_ID = "localpro-modal-host";

// ── Shadow DOM styles ─────────────────────────────────────────────────────────

const SHADOW_STYLES = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  /* ── Import Button ── */
  .lp-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 8px 0 4px;
    padding: 7px 14px;
    background: #1a56db;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
    line-height: 1;
  }
  .lp-btn:hover { background: #1e429f; }
  .lp-btn:active { transform: scale(0.97); }
  .lp-btn svg { flex-shrink: 0; }
  .lp-badge {
    display: inline-block;
    background: rgba(255,255,255,.25);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 11px;
  }

  /* ── Modal overlay ── */
  .lp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.5);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: lp-fade-in .15s ease;
  }
  @keyframes lp-fade-in { from { opacity: 0 } to { opacity: 1 } }

  /* ── Modal card ── */
  .lp-modal {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
    animation: lp-slide-up .2s ease;
  }
  @keyframes lp-slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .lp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e5e7eb;
  }
  .lp-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lp-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }
  .lp-close-btn:hover { background: #f3f4f6; color: #111827; }

  .lp-modal-body { padding: 20px 24px; }

  /* Confidence badge */
  .lp-confidence {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: #eff6ff;
    border-radius: 8px;
    font-size: 12px;
    color: #1e40af;
  }
  .lp-confidence-bar-bg {
    flex: 1;
    height: 6px;
    background: #bfdbfe;
    border-radius: 3px;
    overflow: hidden;
  }
  .lp-confidence-bar {
    height: 100%;
    background: #1a56db;
    border-radius: 3px;
    transition: width .4s ease;
  }

  /* Form fields */
  .lp-field { margin-bottom: 14px; }
  .lp-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .lp-label .lp-required { color: #ef4444; margin-left: 2px; }
  .lp-input, .lp-textarea, .lp-select {
    width: 100%;
    padding: 9px 12px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  .lp-input:focus, .lp-textarea:focus, .lp-select:focus { border-color: #1a56db; }
  .lp-textarea { resize: vertical; min-height: 100px; }
  .lp-select:disabled { background: #f3f4f6; color: #9ca3af; }

  .lp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .lp-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  input[type="date"].lp-input { color-scheme: light; }

  /* Category loading hint */
  .lp-cat-hint {
    font-size: 11px;
    color: #6b7280;
    margin-top: 3px;
  }
  .lp-cat-hint.ai { color: #7c3aed; }

  /* Footer */
  .lp-modal-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
  }
  .lp-cancel-btn {
    padding: 9px 18px;
    border: 1.5px solid #d1d5db;
    background: #fff;
    color: #374151;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-cancel-btn:hover { background: #f9fafb; }

  .lp-submit-btn {
    padding: 9px 20px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
  }
  .lp-submit-btn:hover { background: #1e429f; }
  .lp-submit-btn:disabled { background: #9ca3af; cursor: not-allowed; }

  /* Status messages */
  .lp-status {
    margin: 0 24px 16px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    display: none;
  }
  .lp-status.success { display: block; background: #d1fae5; color: #065f46; }
  .lp-status.error   { display: block; background: #fee2e2; color: #991b1b; }
  .lp-status.loading { display: block; background: #eff6ff; color: #1e40af; }

  /* Source chip */
  .lp-source-chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .lp-source-chip.facebook { background: #dbeafe; color: #1d4ed8; }
  .lp-source-chip.linkedin { background: #cffafe; color: #0e7490; }
`;

// ── Button injection ──────────────────────────────────────────────────────────

/**
 * Appends an "Import to LocalPro" button inside a Shadow DOM host
 * attached to the post element.
 */
export function injectImportButton(
  postElement: Element,
  job: JobPost,
  onImport: (job: JobPost) => void
): void {
  if (postElement.querySelector(`.${BUTTON_CLASS}`)) return;

  const host = document.createElement("div");
  host.className = BUTTON_CLASS;
  host.style.display = "block";

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = SHADOW_STYLES;
  shadow.appendChild(style);

  const confidencePct = Math.round((job.confidence ?? 0) * 100);
  const confidenceLabel =
    confidencePct >= 80 ? "High" : confidencePct >= 50 ? "Medium" : "Low";

  const btn = document.createElement("button");
  btn.className = "lp-btn";
  btn.setAttribute("aria-label", "Import this job post to LocalPro");
  btn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    Import to LocalPro
    <span class="lp-badge">${confidencePct}% ${confidenceLabel}</span>
  `;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onImport(job);
  });

  shadow.appendChild(btn);

  const textBlock =
    postElement.querySelector('[data-ad-preview="message"]') ??
    postElement.querySelector(".feed-shared-text") ??
    postElement.querySelector('[dir="auto"]');

  if (textBlock?.parentElement) {
    textBlock.parentElement.insertBefore(host, textBlock.nextSibling);
  } else {
    postElement.appendChild(host);
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Shows the job preview modal.
 * @param initialJob   - Extracted job data
 * @param categories   - Real category list from GET /api/categories (may be empty)
 * @param aiCategory   - AI-classified category name (optional, pre-selects dropdown)
 */
export function showJobModal(
  initialJob: JobPost,
  categories: import("../types").Category[],
  aiCategory?: string
): void {
  document.getElementById(MODAL_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = MODAL_HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = SHADOW_STYLES;
  shadow.appendChild(style);

  const overlay = buildModalOverlay(initialJob, categories, aiCategory ?? null, shadow, host);
  shadow.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(host);
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal(host);
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
}

function closeModal(host: HTMLElement): void {
  host.remove();
}

function buildModalOverlay(
  job: JobPost,
  categories: import("../types").Category[],
  aiCategory: string | null,
  shadow: ShadowRoot,
  host: HTMLElement
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "lp-overlay";

  const modal = document.createElement("div");
  modal.className = "lp-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Import Job to LocalPro");

  // ── Header ──
  const header = document.createElement("div");
  header.className = "lp-modal-header";
  header.innerHTML = `
    <div class="lp-modal-title">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
      </svg>
      Import Job to LocalPro
      <span class="lp-source-chip ${job.source}">${job.source}</span>
    </div>
  `;
  const closeBtn = document.createElement("button");
  closeBtn.className = "lp-close-btn";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
  closeBtn.addEventListener("click", () => closeModal(host));
  header.appendChild(closeBtn);

  // ── Body ──
  const body = document.createElement("div");
  body.className = "lp-modal-body";

  // Confidence bar
  const confidencePct = Math.round((job.confidence ?? 0) * 100);
  const confDiv = document.createElement("div");
  confDiv.className = "lp-confidence";
  confDiv.innerHTML = `
    <span>Detection confidence:</span>
    <div class="lp-confidence-bar-bg">
      <div class="lp-confidence-bar" style="width:${confidencePct}%"></div>
    </div>
    <strong>${confidencePct}%</strong>
  `;
  body.appendChild(confDiv);

  // ── Form ──
  const form = document.createElement("form");
  form.noValidate = true;

  // Determine initial category selection
  // Priority: aiCategory > job.category (from local keyword detection)
  const effectiveCategory = aiCategory ?? job.category ?? "";

  // Find matching category object
  const findCatByName = (name: string) =>
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase());

  const matchedCat = findCatByName(effectiveCategory);

  // Build category <select>
  const catOptions = categories.length
    ? [
        `<option value="">-- Select category --</option>`,
        ...categories.map((c) => {
          const sel = matchedCat?._id === c._id ? "selected" : "";
          return `<option value="${escapeAttr(c._id)}" data-name="${escapeAttr(c.name)}" ${sel}>${escapeText(c.icon ?? "")} ${escapeText(c.name)}</option>`;
        }),
      ].join("")
    : `<option value="">Loading categories…</option>`;

  const catHint = aiCategory
    ? `<div class="lp-cat-hint ai">✦ AI-classified as "${escapeText(aiCategory)}"</div>`
    : effectiveCategory && matchedCat
    ? `<div class="lp-cat-hint">Auto-detected: "${escapeText(effectiveCategory)}"</div>`
    : "";

  // Default schedule date: tomorrow (sensible default; user can adjust)
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  const initialScheduleDate = job.scheduleDate ?? tomorrowStr;

  form.innerHTML = `
    <div class="lp-field">
      <label class="lp-label" for="lp-title">Job Title <span class="lp-required">*</span></label>
      <input class="lp-input" id="lp-title" type="text" value="${escapeAttr(job.title)}" required maxlength="150" />
    </div>
    <div class="lp-field">
      <label class="lp-label" for="lp-description">Description <span class="lp-required">*</span></label>
      <textarea class="lp-textarea" id="lp-description" maxlength="2000" required>${escapeText(job.description)}</textarea>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-category">Category <span class="lp-required">*</span></label>
        <select class="lp-select" id="lp-category" ${categories.length === 0 ? "disabled" : ""}>
          ${catOptions}
        </select>
        ${catHint}
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-poster">Posted By</label>
        <input class="lp-input" id="lp-poster" type="text" value="${escapeAttr(job.posted_by)}" maxlength="100" />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-location">Location <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-location" type="text" value="${escapeAttr(job.location ?? "")}" maxlength="100" placeholder="e.g. Makati City, Metro Manila" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${job.budget ?? ""}" min="1" step="1" placeholder="e.g. 1500" required />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${escapeAttr(initialScheduleDate)}" min="${todayStr}" required />
        <div class="lp-cat-hint">Requested work date</div>
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" selected>Standard</option>
          <option value="same_day">Same Day</option>
          <option value="rush">Rush</option>
        </select>
      </div>
    </div>
  `;

  body.appendChild(form);

  // ── Status ──
  const status = document.createElement("div");
  status.className = "lp-status";

  // ── Footer ──
  const footer = document.createElement("div");
  footer.className = "lp-modal-footer";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "lp-cancel-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => closeModal(host));

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "lp-submit-btn";
  submitBtn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    Submit to LocalPro
  `;

  footer.appendChild(cancelBtn);
  footer.appendChild(submitBtn);

  // ── Submit handler ──
  submitBtn.addEventListener("click", async () => {
    const titleEl    = shadow.getElementById("lp-title")    as HTMLInputElement;
    const descEl     = shadow.getElementById("lp-description") as HTMLTextAreaElement;
    const categoryEl = shadow.getElementById("lp-category") as HTMLSelectElement;
    const posterEl   = shadow.getElementById("lp-poster")   as HTMLInputElement;
    const locationEl = shadow.getElementById("lp-location") as HTMLInputElement;
    const budgetEl   = shadow.getElementById("lp-budget")   as HTMLInputElement;
    const scheduleEl = shadow.getElementById("lp-schedule") as HTMLInputElement;
    const urgencyEl  = shadow.getElementById("lp-urgency")  as HTMLSelectElement;

    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    const categoryId = categoryEl.value;
    const categoryName =
      categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";
    const location = locationEl.value.trim();
    const budget = parseFloat(budgetEl.value);
    const scheduleDate = scheduleEl.value;
    const urgency = urgencyEl.value as "standard" | "same_day" | "rush";

    if (!title) {
      showStatus(status, "error", "Job title is required.");
      titleEl.focus();
      return;
    }
    if (!description) {
      showStatus(status, "error", "Description is required.");
      descEl.focus();
      return;
    }
    if (!categoryId) {
      showStatus(status, "error", "Please select a category.");
      categoryEl.focus();
      return;
    }
    if (!location) {
      showStatus(status, "error", "Location is required.");
      locationEl.focus();
      return;
    }
    if (!budget || budget <= 0 || isNaN(budget)) {
      showStatus(status, "error", "Budget is required and must be greater than 0 (PHP).");
      budgetEl.focus();
      return;
    }
    if (!scheduleDate) {
      showStatus(status, "error", "Schedule date is required.");
      scheduleEl.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    showStatus(status, "loading", "Sending to LocalPro…");

    const updatedJob: JobPost = {
      ...job,
      title,
      description,
      posted_by: posterEl.value.trim(),
      location,
      budget,
      scheduleDate,
      category: categoryName,
      categoryId,
    };

    const msg: ImportJobMessage = { type: "IMPORT_JOB", payload: updatedJob };

    try {
      const response = await chrome.runtime.sendMessage<ImportJobMessage, ImportJobResponse>(msg);

      if (response?.success) {
        showStatus(status, "success", `Job imported successfully! ID: ${response.job_id ?? "—"}`);
        submitBtn.textContent = "Submitted!";
        setTimeout(() => closeModal(host), 2500);
      } else {
        const errText = response?.error ?? "Import failed. Please try again.";
        if (
          errText.toLowerCase().includes("session") ||
          errText.toLowerCase().includes("sign in")
        ) {
          showStatus(
            status,
            "error",
            "Session expired. Please sign in again via the extension icon."
          );
        } else {
          showStatus(status, "error", errText);
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Submit to LocalPro`;
      }
    } catch (err) {
      showStatus(status, "error", `Extension error: ${String(err)}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Submit to LocalPro`;
    }
  });

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(status);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  return overlay;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showStatus(el: HTMLElement, type: "success" | "error" | "loading", msg: string): void {
  el.className = `lp-status ${type}`;
  el.textContent = msg;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
