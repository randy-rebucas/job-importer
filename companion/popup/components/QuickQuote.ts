import { send, formatPHP, el } from "../utils";
import type { Job, QuotePayload, QuoteTemplate } from "../../utils/api";

interface JobsResponse      { ok: boolean; jobs?: Job[]; error?: string }
interface QuoteResponse     { ok: boolean; error?: string }
interface TemplatesResponse { ok: boolean; templates?: QuoteTemplate[]; error?: string }

// Active template shared across all quote forms on this render
let activeTemplate: QuoteTemplate | null = null;

export function renderQuickQuote(container: HTMLElement): void {
  activeTemplate = null;
  container.innerHTML = `
    <div class="section-header">
      <h2>Job Alerts</h2>
      <span class="subtitle-sm">Top AI-ranked open jobs</span>
    </div>
    <div id="template-bar" class="template-bar hidden">
      <label class="template-label">Template:</label>
      <select id="template-select" class="template-select">
        <option value="">— None —</option>
      </select>
    </div>
    <div id="quote-list" class="list-container">
      <div class="loading">Loading jobs…</div>
    </div>
  `;

  void loadTemplates(container);
  void loadJobs(container);
}

async function loadTemplates(container: HTMLElement): Promise<void> {
  const bar    = container.querySelector<HTMLElement>("#template-bar")!;
  const select = container.querySelector<HTMLSelectElement>("#template-select")!;

  const res = await send<TemplatesResponse>({ type: "GET_QUOTE_TEMPLATES" });
  if (!res.ok || !res.templates?.length) return;

  res.templates.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t._id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });

  bar.classList.remove("hidden");

  select.addEventListener("change", () => {
    const id = select.value;
    activeTemplate = res.templates!.find((t) => t._id === id) ?? null;
    // Dispatch a custom event so open quote forms can react
    container.dispatchEvent(new CustomEvent("templatechange", { detail: activeTemplate }));
  });
}

async function loadJobs(container: HTMLElement): Promise<void> {
  const listEl = container.querySelector<HTMLElement>("#quote-list")!;

  const res = await send<JobsResponse>({ type: "GET_JOBS", aiRank: true, limit: 3 });

  if (!res.ok) {
    listEl.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load jobs"}</div>`;
    return;
  }

  const jobs = res.jobs ?? [];

  if (jobs.length === 0) {
    listEl.innerHTML = `<div class="empty">No open jobs right now.</div>`;
    return;
  }

  listEl.innerHTML = "";
  jobs.forEach((job) => {
    const card = el("div", { class: "job-card" });

    const header = el("div", { class: "job-card-header" });
    const titleEl = el("p", { class: "job-title" });
    titleEl.textContent = job.title;

    const budget = el("span", { class: "job-budget" });
    budget.textContent = `${formatPHP(job.budget.min)}–${formatPHP(job.budget.max)}`;

    header.append(titleEl, budget);

    const desc = el("p", { class: "job-desc-preview" });
    desc.textContent = job.description.slice(0, 80) + (job.description.length > 80 ? "…" : "");

    const toggleBtn = el("button", { class: "btn-ghost btn-sm" });
    toggleBtn.textContent = "Quote this job";

    const quoteForm = buildQuoteForm(job._id, card, container);
    quoteForm.classList.add("hidden");

    toggleBtn.addEventListener("click", () => {
      quoteForm.classList.toggle("hidden");
      toggleBtn.textContent = quoteForm.classList.contains("hidden")
        ? "Quote this job"
        : "Cancel";
    });

    card.append(header, desc, toggleBtn, quoteForm);
    listEl.appendChild(card);
  });
}

function buildQuoteForm(jobId: string, card: HTMLElement, root: HTMLElement): HTMLElement {
  const form = el("form", { class: "quote-form" });

  const amountField = el("div", { class: "field" });
  const amountLabel = el("label");
  amountLabel.textContent = "Your Amount (₱)";
  const amountInput = el("input", { type: "number", min: "0", placeholder: "1500", required: "" });
  amountField.append(amountLabel, amountInput);

  const daysField = el("div", { class: "field" });
  const daysLabel = el("label");
  daysLabel.textContent = "Estimated Days";
  const daysInput = el("input", { type: "number", min: "1", placeholder: "3", required: "" });
  daysField.append(daysLabel, daysInput);

  const notesField = el("div", { class: "field" });
  const notesLabel = el("label");
  notesLabel.textContent = "Message (optional)";
  const notesInput = el("textarea", { rows: "2", placeholder: "Why you're the right fit…" });
  notesField.append(notesLabel, notesInput);

  // Apply active template if one is already selected when form opens
  function applyTemplate(t: QuoteTemplate | null): void {
    if (!t) return;
    (amountInput as HTMLInputElement).value = String(t.proposedAmount);
    (daysInput as HTMLInputElement).value   = String(t.timeline);
    (notesInput as HTMLTextAreaElement).value = t.notes ?? "";
  }
  applyTemplate(activeTemplate);

  // React to future template changes while this form exists in the DOM
  const onTemplateChange = (e: Event) => applyTemplate((e as CustomEvent<QuoteTemplate | null>).detail);
  root.addEventListener("templatechange", onTemplateChange);
  form.addEventListener("submit", () => root.removeEventListener("templatechange", onTemplateChange), { once: true });

  const errorEl = el("div", { class: "error hidden" });
  const successEl = el("div", { class: "success hidden" });

  const submitBtn = el("button", { type: "submit", class: "btn-primary btn-sm" });
  submitBtn.textContent = "Send Quote";

  form.append(amountField, daysField, notesField, errorEl, successEl, submitBtn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    const payload: QuotePayload = {
      jobId,
      proposedAmount: Number(amountInput.value),
      timeline: Number(daysInput.value),
      notes: (notesInput as HTMLTextAreaElement).value.trim() || undefined,
    };

    const res = await send<QuoteResponse>({ type: "POST_QUOTE", payload });

    if (res.ok) {
      successEl.textContent = "Quote sent!";
      successEl.classList.remove("hidden");
      form.classList.add("hidden");
      // Mark the card as quoted
      card.classList.add("quoted");
    } else {
      errorEl.textContent = res.error ?? "Failed to send quote";
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Quote";
    }
  });

  return form;
}
