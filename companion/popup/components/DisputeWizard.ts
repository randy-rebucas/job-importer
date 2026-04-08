import { send, el } from "../utils";
import { API_BASE_URL } from "../../utils/api";
import type { MyJob, Dispute, DisputePayload } from "../../utils/api";

interface JobsResponse     { ok: boolean; jobs?: MyJob[]; error?: string }
interface DisputesResponse { ok: boolean; disputes?: Dispute[]; error?: string }
interface DisputeResponse  { ok: boolean; dispute?: Dispute; error?: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "Payment Issue",   icon: "💰", label: "Payment Issue",
    hint: "Include the amount, date of payment, and what went wrong (not released, overcharged, etc.)." },
  { value: "Service Quality", icon: "⭐", label: "Service Quality",
    hint: "Describe what was agreed vs what was delivered. Mention specific defects or missed work." },
  { value: "No-show",         icon: "🚫", label: "No-show",
    hint: "State the scheduled date/time and when you realised the provider did not arrive or respond." },
  { value: "Fraud",           icon: "⚠️", label: "Fraud",
    hint: "Describe the fraudulent behaviour clearly. Attach screenshots of suspicious messages or transactions." },
  { value: "Other",           icon: "📝", label: "Other",
    hint: "Be as specific as possible so our team can investigate promptly." },
];

const STATUS_META: Record<string, { label: string; icon: string; cls: string }> = {
  "open":         { label: "Open",         icon: "🔵", cls: "ds-open" },
  "under-review": { label: "Under Review", icon: "🟡", cls: "ds-under-review" },
  "resolved":     { label: "Resolved",     icon: "🟢", cls: "ds-resolved" },
  "closed":       { label: "Closed",       icon: "⚪", cls: "ds-closed" },
};

const STATUS_TIMELINE = [
  { key: "open",         label: "Opened" },
  { key: "under-review", label: "In Review" },
  { key: "resolved",     label: "Resolved" },
];

const MIN_DESC_CHARS = 30;
const MAX_FILE_MB    = 5;
const DRAFT_KEY      = "lp_dispute_draft";

// ── Wizard draft (in-memory + sessionStorage) ─────────────────────────────────

interface WizardDraft {
  job:         MyJob | null;
  category:    string;
  description: string;
  urgent:      boolean;
  file:        File | null;
  previewUrl:  string | null;
}

const draft: WizardDraft = {
  job: null, category: CATEGORIES[0].value,
  description: "", urgent: false, file: null, previewUrl: null,
};

function saveDraft(): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
    job: draft.job, category: draft.category,
    description: draft.description, urgent: draft.urgent,
  }));
}

function loadDraft(): boolean {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as Partial<WizardDraft>;
    if (d.job)         draft.job         = d.job;
    if (d.category)    draft.category    = d.category;
    if (d.description) draft.description = d.description;
    if (typeof d.urgent === "boolean") draft.urgent = d.urgent;
    return !!(draft.job || draft.description);
  } catch { return false; }
}

function clearDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
  Object.assign(draft, { job: null, category: CATEGORIES[0].value, description: "", urgent: false, file: null, previewUrl: null });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Activate = (t: "new" | "list") => void;

// ── Entry point ───────────────────────────────────────────────────────────────

export function renderDisputeWizard(container: HTMLElement): void {
  container.innerHTML = "";

  const header = el("div", { class: "section-header" });
  const h2 = el("h2"); h2.textContent = "Disputes";
  header.appendChild(h2);

  const pills = el("div", { class: "tab-pills" });
  const newPill  = el("button", { class: "tab-pill tab-pill-active" }); newPill.textContent  = "File Dispute";
  const listPill = el("button", { class: "tab-pill" });                 listPill.textContent = "My Disputes";
  pills.append(newPill, listPill);

  const panel = el("div", { class: "dsp-panel" });
  container.append(header, pills, panel);

  const activate: Activate = (tab) => {
    newPill.classList.toggle("tab-pill-active",  tab === "new");
    listPill.classList.toggle("tab-pill-active", tab === "list");
    if (tab === "new") renderStep1(panel, activate);
    else               void renderDisputeList(panel, activate);
  };

  newPill.addEventListener("click",  () => activate("new"));
  listPill.addEventListener("click", () => activate("list"));

  // Restore draft if available, otherwise fresh start
  const hasDraft = loadDraft();
  if (hasDraft) {
    renderDraftBanner(panel, activate);
  } else {
    Object.assign(draft, { job: null, category: CATEGORIES[0].value, description: "", urgent: false, file: null, previewUrl: null });
    renderStep1(panel, activate);
  }
}

// ── Standalone tab entry points ───────────────────────────────────────────────

export function renderFileDispute(container: HTMLElement): void {
  container.innerHTML = "";
  const panel = el("div", { class: "dsp-panel" });
  container.appendChild(panel);

  const activate: Activate = (tab) => {
    if (tab === "list") renderMyDisputes(container);
    else {
      container.innerHTML = "";
      container.appendChild(panel);
      renderStep1(panel, activate);
    }
  };

  const hasDraft = loadDraft();
  if (hasDraft) {
    renderDraftBanner(panel, activate);
  } else {
    Object.assign(draft, { job: null, category: CATEGORIES[0].value, description: "", urgent: false, file: null, previewUrl: null });
    renderStep1(panel, activate);
  }
}

export function renderMyDisputes(container: HTMLElement): void {
  container.innerHTML = "";
  const panel = el("div", { class: "dsp-panel" });
  container.appendChild(panel);

  const activate: Activate = (tab) => {
    if (tab === "new") renderFileDispute(container);
    else               void renderDisputeList(panel, activate);
  };

  void renderDisputeList(panel, activate);
}

// ── Draft restore banner ──────────────────────────────────────────────────────

function renderDraftBanner(panel: HTMLElement, activate: Activate): void {
  panel.innerHTML = "";

  const banner = el("div", { class: "dsp-draft-banner" });

  const icon = el("span", { class: "dsp-draft-icon" }); icon.textContent = "✏️";
  const text = el("div", { class: "dsp-draft-text" });
  const title = el("p", { class: "dsp-draft-title" }); title.textContent = "Resume saved draft?";
  const sub   = el("p", { class: "dsp-draft-sub" });
  sub.textContent = draft.job
    ? `Job: ${draft.job.title}`
    : draft.description
      ? `"${draft.description.slice(0, 50)}…"`
      : "You have an unfinished dispute.";
  text.append(title, sub);

  const btns = el("div", { class: "dsp-draft-btns" });
  const resumeBtn = el("button", { class: "btn-primary btn-sm" }); resumeBtn.textContent = "Resume";
  const freshBtn  = el("button", { class: "btn-ghost btn-sm" });   freshBtn.textContent  = "Start fresh";

  resumeBtn.addEventListener("click", () => {
    // If job already selected, go to step 2; otherwise step 1
    if (draft.job) renderStep2(panel, activate);
    else           renderStep1(panel, activate);
  });

  freshBtn.addEventListener("click", () => {
    clearDraft();
    renderStep1(panel, activate);
  });

  btns.append(resumeBtn, freshBtn);
  banner.append(icon, text, btns);
  panel.appendChild(banner);
}

// ── Progress bar (clickable for done steps) ────────────────────────────────────

function buildProgressBar(
  current: number,
  panel: HTMLElement,
  activate: Activate
): HTMLElement {
  const steps = ["Job", "Details", "Evidence", "Review"];
  const bar   = el("div", { class: "dsp-progress" });

  const goTo = [
    () => renderStep1(panel, activate),
    () => renderStep2(panel, activate),
    () => renderStep3(panel, activate),
    () => renderStep4(panel, activate),
  ];

  steps.forEach((label, i) => {
    const n    = i + 1;
    const done = n < current;
    const item = el("div", {
      class: `dsp-prog-item${done ? " done" : n === current ? " active" : ""}${done ? " clickable" : ""}`,
    });
    if (done) item.setAttribute("title", `Go back to ${label}`);

    const dot = el("span", { class: "dsp-prog-dot" });
    dot.textContent = done ? "✓" : String(n);
    const lbl = el("span", { class: "dsp-prog-label" });
    lbl.textContent = label;
    item.append(dot, lbl);

    if (done) item.addEventListener("click", () => goTo[i]());

    if (i < steps.length - 1) {
      const line = el("div", { class: `dsp-prog-line${done ? " done" : ""}` });
      bar.append(item, line);
    } else {
      bar.append(item);
    }
  });

  return bar;
}

// ── Step 1: Select Job ────────────────────────────────────────────────────────

function renderStep1(panel: HTMLElement, activate: Activate): void {
  panel.innerHTML = "";
  panel.append(buildProgressBar(1, panel, activate));

  const hint = el("p", { class: "wizard-hint" });
  hint.textContent = "Which job is this dispute about?";
  panel.appendChild(hint);

  const searchWrap = el("div", { class: "dsp-search-wrap" });
  const searchIcon = el("span", { class: "dsp-search-icon" }); searchIcon.textContent = "🔍";
  const searchInput = el("input", {
    type: "text", class: "dsp-search", placeholder: "Filter jobs…",
  }) as HTMLInputElement;
  searchWrap.append(searchIcon, searchInput);
  panel.appendChild(searchWrap);

  const listEl = el("div", { class: "list-container dsp-job-list" });
  renderSkeletons(listEl, 3);
  panel.appendChild(listEl);

  void (async () => {
    const res = await send<JobsResponse>({ type: "GET_MY_JOBS" });

    if (!res.ok) {
      showRetry(listEl, res.error ?? "Failed to load jobs.", () => renderStep1(panel, activate));
      return;
    }

    if (!res.jobs?.length) {
      listEl.innerHTML = "";
      const empty = el("div", { class: "dsp-empty-state" });
      empty.innerHTML = `<span class="dsp-empty-icon">📋</span><p>No jobs found. Jobs appear here once you have active or completed work.</p>`;
      listEl.appendChild(empty);
      return;
    }

    const jobs = res.jobs;

    const renderJobs = (filter: string): void => {
      listEl.innerHTML = "";
      const filtered = filter
        ? jobs.filter((j) => j.title.toLowerCase().includes(filter.toLowerCase()))
        : jobs;

      if (!filtered.length) {
        const msg = el("p", { class: "empty" }); msg.textContent = "No jobs match your search.";
        listEl.appendChild(msg); return;
      }

      filtered.forEach((job) => {
        const row = el("button", { class: "dsp-job-row" });

        const top = el("div", { class: "dsp-job-top" });
        const title = el("span", { class: "dsp-job-title" }); title.textContent = job.title;
        const pill  = el("span", { class: `status-pill js-${job.status}` }); pill.textContent = job.status;
        top.append(title, pill);

        const meta = el("div", { class: "dsp-job-meta" });
        const cat = el("span", { class: "dsp-job-chip" }); cat.textContent = job.category; meta.appendChild(cat);
        if (job.assignedProvider?.name) {
          const prov = el("span", { class: "dsp-job-chip dsp-job-chip-prov" });
          prov.textContent = `👤 ${job.assignedProvider.name}`; meta.appendChild(prov);
        }
        const date = el("span", { class: "dsp-job-date" }); date.textContent = relativeTime(job.createdAt); meta.appendChild(date);

        row.append(top, meta);
        row.addEventListener("click", () => {
          draft.job = job; saveDraft();
          renderStep2(panel, activate);
        });
        listEl.appendChild(row);
      });
    };

    renderJobs("");
    searchInput.addEventListener("input", () => renderJobs(searchInput.value.trim()));
  })();
}

// ── Step 2: Describe Issue ────────────────────────────────────────────────────

function renderStep2(panel: HTMLElement, activate: Activate): void {
  panel.innerHTML = "";
  panel.append(buildProgressBar(2, panel, activate));

  // Job badge
  const jobBadge = el("div", { class: "dsp-job-badge" });
  jobBadge.textContent = `📋 ${draft.job!.title}`;
  panel.appendChild(jobBadge);

  // ── Category cards ────────────────────────────────────────────────────────
  const catLabel = el("p", { class: "dsp-field-label" }); catLabel.textContent = "Category";
  panel.appendChild(catLabel);

  const cardGrid = el("div", { class: "dsp-cat-grid" });
  let selectedCat = draft.category;

  const catHint = el("p", { class: "cat-hint" });
  catHint.textContent = CATEGORIES.find((c) => c.value === selectedCat)?.hint ?? "";

  const cards: HTMLButtonElement[] = [];

  CATEGORIES.forEach((cat, i) => {
    const card = el("button", {
      class: `dsp-cat-card${cat.value === selectedCat ? " selected" : ""}`,
    }) as HTMLButtonElement;
    if (i === CATEGORIES.length - 1) card.classList.add("dsp-cat-card-full"); // "Other" spans full width

    const icon = el("span", { class: "dsp-cat-icon" }); icon.textContent = cat.icon;
    const lbl  = el("span", { class: "dsp-cat-label" }); lbl.textContent  = cat.label;
    card.append(icon, lbl);

    card.addEventListener("click", () => {
      selectedCat = cat.value;
      draft.category = cat.value;
      cards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      catHint.textContent = cat.hint;
      saveDraft();
    });

    cards.push(card);
    cardGrid.appendChild(card);
  });

  panel.append(cardGrid, catHint);

  // ── Urgency toggle ────────────────────────────────────────────────────────
  const urgencyRow = el("div", { class: "dsp-urgency-row" });
  const urgLabel   = el("label", { class: "dsp-urgency-label" });
  const urgCheck   = el("input", { type: "checkbox" }) as HTMLInputElement;
  urgCheck.checked = draft.urgent;
  const urgText = el("span"); urgText.textContent = "⚡ Mark as urgent";
  urgLabel.append(urgCheck, urgText);
  const urgNote = el("span", { class: "dsp-urgency-note" }); urgNote.textContent = "For serious cases needing priority review";
  urgencyRow.append(urgLabel, urgNote);
  urgCheck.addEventListener("change", () => { draft.urgent = urgCheck.checked; saveDraft(); });
  panel.appendChild(urgencyRow);

  // ── Description ───────────────────────────────────────────────────────────
  const descField = el("div", { class: "field" });
  const descLabelRow = el("div", { class: "field-label-row" });
  const descLabel = el("label"); descLabel.textContent = "Describe the issue";
  const charCount = el("span", { class: "char-count" });
  descLabelRow.append(descLabel, charCount);

  const descInput = el("textarea", {
    rows: "5",
    placeholder: "What happened? Include dates, amounts, names, and specific details…",
  }) as HTMLTextAreaElement;
  descInput.value = draft.description;

  // Char progress bar
  const charBar     = el("div", { class: "char-bar" });
  const charBarFill = el("div", { class: "char-bar-fill" });
  charBar.appendChild(charBarFill);

  const updateCount = (): void => {
    const len = descInput.value.trim().length;
    const pct = Math.min((len / MIN_DESC_CHARS) * 100, 100);
    charCount.textContent = len >= MIN_DESC_CHARS ? `✓ ${len} chars` : `${len} / ${MIN_DESC_CHARS} min`;
    charCount.className   = `char-count${len >= MIN_DESC_CHARS ? " char-ok" : ""}`;
    charBarFill.style.width = `${pct}%`;
    charBarFill.className   = `char-bar-fill${len >= MIN_DESC_CHARS ? " full" : pct > 50 ? " mid" : ""}`;
  };
  updateCount();
  descInput.addEventListener("input", () => { draft.description = descInput.value; saveDraft(); updateCount(); });

  descField.append(descLabelRow, descInput, charBar);

  const errorEl = el("div", { class: "error hidden" });

  const actions = el("div", { class: "wizard-actions" });
  const backBtn = el("button", { class: "btn-ghost btn-sm" }); backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => renderStep1(panel, activate));

  const nextBtn = el("button", { class: "btn-primary btn-sm" }); nextBtn.textContent = "Next: Add Evidence";
  nextBtn.addEventListener("click", () => {
    draft.category    = selectedCat;
    draft.description = descInput.value.trim();
    if (draft.description.length < MIN_DESC_CHARS) {
      errorEl.textContent = `Please write at least ${MIN_DESC_CHARS} characters.`;
      errorEl.classList.remove("hidden");
      descInput.focus(); return;
    }
    saveDraft();
    renderStep3(panel, activate);
  });

  actions.append(backBtn, nextBtn);
  panel.append(descField, errorEl, actions);
}

// ── Step 3: Evidence ──────────────────────────────────────────────────────────

function renderStep3(panel: HTMLElement, activate: Activate): void {
  panel.innerHTML = "";
  panel.append(buildProgressBar(3, panel, activate));

  const jobBadge = el("div", { class: "dsp-job-badge" });
  jobBadge.textContent = `📋 ${draft.job!.title}`;
  panel.appendChild(jobBadge);

  const hint = el("p", { class: "wizard-hint" });
  hint.textContent = "Attach a screenshot or photo as evidence (optional but recommended).";
  panel.appendChild(hint);

  // Drop zone
  const dropZone = el("div", { class: "dsp-drop-zone" });
  const dropIcon = el("div", { class: "dsp-drop-icon" }); dropIcon.textContent = "📎";
  const dropText = el("p", { class: "dsp-drop-text" }); dropText.textContent = "Drag & drop here or click to choose";
  const dropSub  = el("p", { class: "dsp-drop-sub" });  dropSub.textContent  = `Images only · max ${MAX_FILE_MB} MB`;
  const fileInput = el("input", { type: "file", accept: "image/*,application/pdf" }) as HTMLInputElement;
  fileInput.style.display = "none";
  dropZone.append(dropIcon, dropText, dropSub, fileInput);

  // Preview
  const previewWrap = el("div", { class: "dsp-preview-wrap hidden" });
  const previewImg  = el("img", { class: "dsp-preview-img", alt: "evidence" }) as HTMLImageElement;
  const previewInfo = el("div", { class: "dsp-preview-info" });
  const previewName = el("span", { class: "dsp-preview-name" });
  const previewSize = el("span", { class: "dsp-preview-size" });
  const removeBtn   = el("button", { class: "dsp-preview-remove", title: "Remove" }); removeBtn.textContent = "×";
  previewInfo.append(previewName, previewSize);
  previewWrap.append(previewImg, previewInfo, removeBtn);

  const sizeWarning = el("p", { class: "error hidden" });
  sizeWarning.textContent = `File is too large. Maximum size is ${MAX_FILE_MB} MB.`;
  const typeWarning = el("p", { class: "error hidden" });
  typeWarning.textContent = "Only image files and PDFs are accepted.";

  if (draft.file && draft.previewUrl) applyPreview(draft.file, draft.previewUrl);

  function applyPreview(file: File, url: string): void {
    if (file.type.startsWith("image/")) {
      previewImg.src = url;
      previewImg.style.display = "";
    } else {
      previewImg.style.display = "none";
    }
    previewName.textContent = file.name;
    previewSize.textContent = formatBytes(file.size);
    previewWrap.classList.remove("hidden");
    dropZone.classList.add("has-file");
  }

  function clearPreview(): void {
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    draft.file = null; draft.previewUrl = null;
    previewImg.src = ""; previewName.textContent = ""; previewSize.textContent = "";
    previewWrap.classList.add("hidden");
    dropZone.classList.remove("has-file");
    fileInput.value = "";
    sizeWarning.classList.add("hidden");
    typeWarning.classList.add("hidden");
  }

  function handleFile(file: File): void {
    sizeWarning.classList.add("hidden");
    typeWarning.classList.add("hidden");
    const validType = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!validType) { typeWarning.classList.remove("hidden"); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { sizeWarning.classList.remove("hidden"); clearPreview(); return; }
    if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    draft.file = file;
    draft.previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    applyPreview(file, draft.previewUrl);
  }

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { if (fileInput.files?.[0]) handleFile(fileInput.files[0]); });
  dropZone.addEventListener("dragover",  (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", ()  => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault(); dropZone.classList.remove("drag-over");
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  });
  removeBtn.addEventListener("click", (e) => { e.stopPropagation(); clearPreview(); });

  const actions = el("div", { class: "wizard-actions" });
  const backBtn = el("button", { class: "btn-ghost btn-sm" }); backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => renderStep2(panel, activate));

  const nextBtn = el("button", { class: "btn-primary btn-sm" }); nextBtn.textContent = "Review & Submit";
  nextBtn.addEventListener("click", () => renderStep4(panel, activate));

  const skipLink = el("button", { class: "btn-link btn-sm" }); skipLink.textContent = "Skip — no evidence to attach";
  skipLink.addEventListener("click", () => { clearPreview(); renderStep4(panel, activate); });

  actions.append(backBtn, nextBtn);
  panel.append(dropZone, previewWrap, sizeWarning, typeWarning, actions, skipLink);
}

// ── Step 4: Review & Submit ────────────────────────────────────────────────────

function renderStep4(panel: HTMLElement, activate: Activate): void {
  panel.innerHTML = "";
  panel.append(buildProgressBar(4, panel, activate));

  const heading = el("p", { class: "wizard-hint" }); heading.textContent = "Review your dispute before submitting.";
  panel.appendChild(heading);

  const summary = el("div", { class: "dsp-summary" });

  const mkRow = (lbl: string, val: string): HTMLElement => {
    const row = el("div", { class: "dsp-summary-row" });
    const l = el("span", { class: "dsp-summary-label" }); l.textContent = lbl;
    const v = el("span", { class: "dsp-summary-value" }); v.textContent = val;
    row.append(l, v); return row;
  };

  summary.append(mkRow("Job", draft.job!.title), mkRow("Category", draft.category));

  if (draft.urgent) summary.append(mkRow("Priority", "⚡ Urgent"));

  const descRow = el("div", { class: "dsp-summary-row dsp-summary-desc-row" });
  const descLbl = el("span", { class: "dsp-summary-label" }); descLbl.textContent = "Description";
  const descVal = el("p", { class: "dsp-summary-desc" }); descVal.textContent = draft.description;
  descRow.append(descLbl, descVal); summary.appendChild(descRow);

  if (draft.file) {
    const evidRow = el("div", { class: "dsp-summary-row" });
    const evidLbl = el("span", { class: "dsp-summary-label" }); evidLbl.textContent = "Evidence";
    const evidVal = el("div", { class: "dsp-summary-evid" });
    if (draft.previewUrl) {
      const thumb = el("img", { class: "dsp-summary-thumb", alt: "evidence", src: draft.previewUrl }) as HTMLImageElement;
      evidVal.appendChild(thumb);
    }
    const fname = el("span"); fname.textContent = `${draft.file.name} (${formatBytes(draft.file.size)})`;
    evidVal.appendChild(fname);
    evidRow.append(evidLbl, evidVal); summary.appendChild(evidRow);
  } else {
    summary.append(mkRow("Evidence", "None attached"));
  }

  const errorEl = el("div", { class: "error hidden" });

  const actions = el("div", { class: "wizard-actions" });
  const backBtn   = el("button", { class: "btn-ghost btn-sm" }); backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => renderStep3(panel, activate));

  const submitBtn = el("button", { class: "btn-primary btn-sm" }); submitBtn.textContent = "Submit Dispute";

  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true; errorEl.classList.add("hidden");

    let evidenceUrl: string | undefined;

    if (draft.file) {
      submitBtn.textContent = "Uploading evidence…";
      try {
        const form = new FormData(); form.append("file", draft.file);
        const upRes = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: form, credentials: "include" });
        if (upRes.ok) { const d = await upRes.json() as { url?: string }; evidenceUrl = d.url; }
      } catch { /* non-fatal */ }
    }

    submitBtn.textContent = "Submitting dispute…";

    const payload: DisputePayload = {
      jobId: draft.job!._id, category: draft.category,
      description: draft.description, evidenceUrl, urgent: draft.urgent,
    };

    const res = await send<DisputeResponse>({ type: "POST_DISPUTE", payload });

    if (res.ok) {
      clearDraft();
      renderSuccess(panel, activate);
    } else {
      errorEl.textContent = res.error ?? "Failed to submit dispute.";
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Dispute";
    }
  });

  actions.append(backBtn, submitBtn);
  panel.append(summary, errorEl, actions);
}

// ── Confirmation ──────────────────────────────────────────────────────────────

function renderSuccess(panel: HTMLElement, activate: Activate): void {
  panel.innerHTML = "";
  const wrap = el("div", { class: "wizard-step wizard-success" });

  const iconEl  = el("div", { class: "success-icon" }); iconEl.textContent = "✅";
  const titleEl = el("p", { class: "success-title" });   titleEl.textContent = "Dispute Submitted";
  const subEl   = el("p", { class: "success-sub" });
  subEl.textContent = "Our team will review your case within 2–3 business days. You'll be notified of any updates.";

  const viewBtn = el("button", { class: "btn-primary btn-sm" });
  viewBtn.style.marginTop = "16px";
  viewBtn.textContent = "View My Disputes";
  viewBtn.addEventListener("click", () => activate("list"));

  wrap.append(iconEl, titleEl, subEl, viewBtn);
  panel.appendChild(wrap);
}

// ── Disputes List ─────────────────────────────────────────────────────────────

async function renderDisputeList(panel: HTMLElement, activate: Activate): Promise<void> {
  panel.innerHTML = "";
  renderSkeletons(panel, 2);

  const res = await send<DisputesResponse>({ type: "GET_DISPUTES" });

  if (!res.ok) {
    showRetry(panel, res.error ?? "Failed to load disputes.", () => void renderDisputeList(panel, activate));
    return;
  }

  const disputes = (res.disputes ?? []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  panel.innerHTML = "";

  if (disputes.length === 0) {
    const empty = el("div", { class: "dsp-empty-state" });
    const eIcon = el("span", { class: "dsp-empty-icon" }); eIcon.textContent = "⚖️";
    const eText = el("p"); eText.textContent = "No disputes filed yet.";
    const eLink = el("button", { class: "btn-primary btn-sm" });
    eLink.style.marginTop = "12px";
    eLink.textContent = "File a Dispute";
    eLink.addEventListener("click", () => activate("new"));
    empty.append(eIcon, eText, eLink);
    panel.appendChild(empty); return;
  }

  // Search
  const searchWrap  = el("div", { class: "dsp-search-wrap" });
  const searchIcon  = el("span", { class: "dsp-search-icon" }); searchIcon.textContent = "🔍";
  const searchInput = el("input", { type: "text", class: "dsp-search", placeholder: "Search disputes…" }) as HTMLInputElement;
  searchWrap.append(searchIcon, searchInput);

  // Status filter
  const statuses = ["all", ...Array.from(new Set(disputes.map((d) => d.status)))];
  let activeFilter = "all";
  let searchQuery  = "";

  const filterRow = el("div", { class: "dsp-filter-row" });
  const filterBtns: HTMLButtonElement[] = [];

  statuses.forEach((s) => {
    const btn = el("button", { class: `dsp-filter-btn${s === "all" ? " active" : ""}` }) as HTMLButtonElement;
    btn.textContent = s === "all" ? "All" : (STATUS_META[s]?.label ?? s);
    btn.dataset["status"] = s;
    filterBtns.push(btn);
    filterRow.appendChild(btn);
  });

  const listEl = el("div", { class: "dsp-list" });

  const applyFilters = (): void => {
    filterBtns.forEach((b) => b.classList.toggle("active", b.dataset["status"] === activeFilter));
    listEl.innerHTML = "";
    const filtered = disputes
      .filter((d) => activeFilter === "all" || d.status === activeFilter)
      .filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (d.jobTitle ?? d.jobId).toLowerCase().includes(q) ||
               d.description.toLowerCase().includes(q) ||
               d.category.toLowerCase().includes(q);
      });

    if (!filtered.length) {
      const msg = el("p", { class: "empty" });
      msg.textContent = searchQuery ? "No disputes match your search." : "No disputes with this status.";
      listEl.appendChild(msg); return;
    }

    filtered.forEach((d) => listEl.appendChild(buildDisputeCard(d)));
  };

  filterBtns.forEach((b) => b.addEventListener("click", () => { activeFilter = b.dataset["status"]!; applyFilters(); }));
  searchInput.addEventListener("input", () => { searchQuery = searchInput.value.trim(); applyFilters(); });

  applyFilters();
  panel.append(searchWrap, filterRow, listEl);
}

function buildDisputeCard(d: Dispute): HTMLElement {
  const meta = STATUS_META[d.status] ?? { label: d.status, icon: "⚪", cls: "ds-closed" };

  const card = el("div", { class: "dispute-card" });

  // Header: title + status badge
  const header = el("div", { class: "dispute-card-header" });
  const titleRow = el("div", { class: "dispute-title-row" });
  const iconEl   = el("span", { class: "dispute-icon" }); iconEl.textContent = meta.icon;
  const titleEl  = el("span", { class: "dispute-job-title" }); titleEl.textContent = d.jobTitle ?? d.jobId;
  titleRow.append(iconEl, titleEl);
  const statusEl = el("span", { class: `dispute-status ${meta.cls}` }); statusEl.textContent = meta.label;
  header.append(titleRow, statusEl);

  // Category + date row
  const subRow = el("div", { class: "dispute-sub-row" });
  const catEl  = el("span", { class: "dispute-category" }); catEl.textContent = d.category;
  const dateEl = el("span", { class: "dispute-date" });     dateEl.textContent = relativeTime(d.createdAt);
  subRow.append(catEl, dateEl);

  // Description with expand
  const isLong = d.description.length > 90;
  const descEl = el("p", { class: "dispute-desc" });
  descEl.textContent = isLong ? d.description.slice(0, 90) + "…" : d.description;
  let expanded = false;
  let expandBtn: HTMLButtonElement | null = null;
  if (isLong) {
    expandBtn = el("button", { class: "btn-link btn-xs" }) as HTMLButtonElement;
    expandBtn.textContent = "Read more";
    expandBtn.addEventListener("click", () => {
      expanded = !expanded;
      descEl.textContent   = expanded ? d.description : d.description.slice(0, 90) + "…";
      expandBtn!.textContent = expanded ? "Show less" : "Read more";
    });
  }

  // Evidence link
  const footer = el("div", { class: "dispute-footer" });
  if (d.evidenceUrl) {
    const evidLink = el("a", { class: "dispute-evid-link", href: d.evidenceUrl, target: "_blank" });
    evidLink.textContent = "📎 View Evidence";
    footer.appendChild(evidLink);
  }

  // Status timeline
  const timeline = buildStatusTimeline(d.status);

  card.append(header, subRow, descEl);
  if (expandBtn) card.appendChild(expandBtn);
  card.append(footer, timeline);

  return card;
}

function buildStatusTimeline(currentStatus: string): HTMLElement {
  const resolvedIdx = STATUS_TIMELINE.findIndex((s) => s.key === "resolved");
  const currentIdx  = currentStatus === "closed"
    ? resolvedIdx
    : STATUS_TIMELINE.findIndex((s) => s.key === currentStatus);

  const tl = el("div", { class: "dsp-timeline" });

  STATUS_TIMELINE.forEach((step, i) => {
    const reached = i <= currentIdx;
    const dotWrap = el("div", { class: "dsp-tl-item" });
    const dot     = el("span", { class: `dsp-tl-dot${reached ? " reached" : ""}` });
    const lbl     = el("span", { class: `dsp-tl-label${reached ? " reached" : ""}` });
    lbl.textContent = step.label;
    dotWrap.append(dot, lbl);
    tl.appendChild(dotWrap);

    if (i < STATUS_TIMELINE.length - 1) {
      const line = el("div", { class: `dsp-tl-line${i < currentIdx ? " reached" : ""}` });
      tl.appendChild(line);
    }
  });

  return tl;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSkeletons(container: HTMLElement, count: number): void {
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const s = el("div", { class: "dsp-skeleton" });
    s.innerHTML = `
      <div class="skel skel-title"></div>
      <div class="skel skel-meta"></div>
    `;
    container.appendChild(s);
  }
}

function showRetry(container: HTMLElement, message: string, onRetry: () => void): void {
  container.innerHTML = "";
  const wrap = el("div", { class: "dsp-empty-state" });
  const msg  = el("p", { class: "error-msg" }); msg.textContent = message;
  const btn  = el("button", { class: "btn-ghost btn-sm" }); btn.textContent = "↺ Retry";
  btn.style.marginTop = "8px";
  btn.addEventListener("click", onRetry);
  wrap.append(msg, btn);
  container.appendChild(wrap);
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
