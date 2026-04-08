import { send, formatRelative } from "../utils";
import type { SupportTicket } from "../../utils/api";

interface TicketsResponse { ok: boolean; tickets?: SupportTicket[]; error?: string }
interface CreateResponse  { ok: boolean; ticket?: SupportTicket; error?: string }

const CATEGORIES = [
  "General Inquiry",
  "Payment Issue",
  "Job Dispute",
  "Account Problem",
  "Technical Bug",
  "Other",
];

const STATUS_META: Record<SupportTicket["status"], { label: string; cls: string }> = {
  "waiting":     { label: "Waiting",     cls: "ticket-status-waiting" },
  "in-progress": { label: "In Progress", cls: "ticket-status-inprogress" },
  "resolved":    { label: "Resolved",    cls: "ticket-status-resolved" },
};

export function renderSupportTickets(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Support</h2>
    </div>
    <div class="support-tabs">
      <button class="support-tab-btn active" data-view="new">New Ticket</button>
      <button class="support-tab-btn" data-view="list">My Tickets</button>
    </div>
    <div id="support-new-view">
      <form id="ticket-form" class="form" novalidate>
        <div class="field">
          <label for="ticket-subject">Subject</label>
          <input id="ticket-subject" type="text" placeholder="Brief summary of your issue" required />
        </div>
        <div class="field">
          <label for="ticket-category">Category</label>
          <select id="ticket-category">
            ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="ticket-desc">Description</label>
          <textarea id="ticket-desc" rows="4" placeholder="Describe your issue in detail…" required></textarea>
        </div>
        <div id="ticket-error" class="error hidden"></div>
        <div id="ticket-success" class="success hidden"></div>
        <button type="submit" id="ticket-submit" class="btn-primary">Submit Ticket</button>
      </form>
    </div>
    <div id="support-list-view" class="hidden">
      <div id="ticket-list" class="list-container">
        <p class="loading">Loading tickets…</p>
      </div>
    </div>
  `;

  const tabBtns   = container.querySelectorAll<HTMLButtonElement>(".support-tab-btn");
  const newView   = container.querySelector<HTMLDivElement>("#support-new-view")!;
  const listView  = container.querySelector<HTMLDivElement>("#support-list-view")!;
  const form      = container.querySelector<HTMLFormElement>("#ticket-form")!;
  const subjectEl = container.querySelector<HTMLInputElement>("#ticket-subject")!;
  const catEl     = container.querySelector<HTMLSelectElement>("#ticket-category")!;
  const descEl    = container.querySelector<HTMLTextAreaElement>("#ticket-desc")!;
  const errorEl   = container.querySelector<HTMLDivElement>("#ticket-error")!;
  const successEl = container.querySelector<HTMLDivElement>("#ticket-success")!;
  const submitBtn = container.querySelector<HTMLButtonElement>("#ticket-submit")!;

  function switchView(view: "new" | "list"): void {
    tabBtns.forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));
    newView.classList.toggle("hidden", view !== "new");
    listView.classList.toggle("hidden", view !== "list");
    if (view === "list") void loadTickets();
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () =>
      switchView(btn.getAttribute("data-view") as "new" | "list")
    );
  });

  // ── Submit new ticket ─────────────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    const subject     = subjectEl.value.trim();
    const category    = catEl.value;
    const description = descEl.value.trim();

    if (!subject || !description) {
      errorEl.textContent = "Subject and description are required.";
      errorEl.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const res = await send<CreateResponse>({
      type: "POST_SUPPORT_TICKET",
      payload: { subject, category, description },
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Ticket";

    if (!res.ok) {
      errorEl.textContent = res.error ?? "Failed to submit ticket.";
      errorEl.classList.remove("hidden");
      return;
    }

    successEl.textContent = "Ticket submitted! We'll get back to you shortly.";
    successEl.classList.remove("hidden");
    form.reset();
  });

  // ── Load tickets list ─────────────────────────────────────────────────────
  async function loadTickets(): Promise<void> {
    const listEl = container.querySelector<HTMLDivElement>("#ticket-list")!;
    listEl.innerHTML = `<p class="loading">Loading tickets…</p>`;

    const res = await send<TicketsResponse>({ type: "GET_SUPPORT_TICKETS" });

    if (!res.ok || !res.tickets) {
      listEl.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load tickets."}</p>`;
      return;
    }

    if (res.tickets.length === 0) {
      listEl.innerHTML = `<p class="empty">No tickets yet.</p>`;
      return;
    }

    listEl.innerHTML = "";
    res.tickets.forEach((ticket) => {
      const meta = STATUS_META[ticket.status] ?? { label: ticket.status, cls: "ticket-status-waiting" };
      const row = document.createElement("div");
      row.className = "ticket-row";
      row.innerHTML = `
        <div class="ticket-row-top">
          <span class="ticket-subject">${ticket.subject}</span>
          <span class="ticket-status-badge ${meta.cls}">${meta.label}</span>
        </div>
        <div class="ticket-row-meta">
          <span class="ticket-category">${ticket.category}</span>
          <span class="ticket-time">${formatRelative(ticket.createdAt)}</span>
        </div>
      `;
      listEl.appendChild(row);
    });
  }
}
