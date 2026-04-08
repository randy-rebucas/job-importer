import { send, formatPHP, formatRelative } from "../utils";
import type { MyJob, Milestone, MeResponse } from "../../utils/api";

interface MyJobsResponse   { ok: boolean; jobs?: MyJob[]; error?: string }
interface MilestonesResponse { ok: boolean; milestones?: Milestone[]; error?: string }
interface CompleteResponse   { ok: boolean; error?: string }

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  "open":        { label: "Open",        cls: "js-open" },
  "assigned":    { label: "Assigned",    cls: "js-assigned" },
  "in-progress": { label: "In Progress", cls: "js-inprogress" },
  "complete":    { label: "Complete",    cls: "js-complete" },
};

export function renderJobTracker(container: HTMLElement, user: MeResponse): void {
  const isClient   = user.role === "client";
  const isProvider = user.role === "provider";

  container.innerHTML = `
    <div class="section-header">
      <h2>My Jobs</h2>
    </div>
    ${(isClient || isProvider) ? `
    <div class="jt-filter-bar">
      <button class="jt-filter-btn active" data-status="">All Active</button>
      <button class="jt-filter-btn" data-status="in-progress">In Progress</button>
      ${isClient ? `<button class="jt-filter-btn" data-status="assigned">Assigned</button>` : ""}
      <button class="jt-filter-btn" data-status="complete">Complete</button>
    </div>` : ""}
    <div id="jt-list" class="list-container">
      <p class="loading">Loading…</p>
    </div>
  `;

  const filterBtns = container.querySelectorAll<HTMLButtonElement>(".jt-filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      void loadJobs(container, user, btn.getAttribute("data-status") ?? undefined);
    });
  });

  void loadJobs(container, user, undefined);
}

async function loadJobs(container: HTMLElement, user: MeResponse, status?: string): Promise<void> {
  const listEl = container.querySelector<HTMLElement>("#jt-list")!;
  listEl.innerHTML = `<p class="loading">Loading…</p>`;

  const res = await send<MyJobsResponse>({ type: "GET_MY_JOBS", status: status || undefined });

  if (!res.ok) {
    listEl.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load jobs."}</p>`;
    return;
  }

  const jobs = res.jobs ?? [];
  if (jobs.length === 0) {
    listEl.innerHTML = `<p class="empty">No jobs found.</p>`;
    return;
  }

  listEl.innerHTML = "";
  jobs.forEach((job) => listEl.appendChild(buildJobCard(job, user)));
}

function buildJobCard(job: MyJob, user: MeResponse): HTMLElement {
  const cfg   = STATUS_CFG[job.status] ?? { label: job.status, cls: "js-open" };
  const isClient = user.role === "client";

  const card = document.createElement("div");
  card.className = "jt-card";

  // ── Header row ─────────────────────────────────────────────────────────────
  const headerRow = document.createElement("div");
  headerRow.className = "jt-card-header";

  const titleEl = document.createElement("span");
  titleEl.className = "jt-title";
  titleEl.textContent = job.title;

  const pill = document.createElement("span");
  pill.className = `jt-status-pill ${cfg.cls}`;
  pill.textContent = cfg.label;

  headerRow.append(titleEl, pill);

  // ── Meta row ───────────────────────────────────────────────────────────────
  const metaRow = document.createElement("div");
  metaRow.className = "jt-meta";

  if (job.budget) {
    const budgetEl = document.createElement("span");
    budgetEl.className = "jt-budget";
    budgetEl.textContent = `${formatPHP(job.budget.min)}–${formatPHP(job.budget.max)}`;
    metaRow.appendChild(budgetEl);
  }

  if (job.assignedProvider && isClient) {
    const provEl = document.createElement("span");
    provEl.className = "jt-provider";
    provEl.textContent = `Provider: ${job.assignedProvider.name}`;
    metaRow.appendChild(provEl);
  }

  const timeEl = document.createElement("span");
  timeEl.className = "jt-time";
  timeEl.textContent = formatRelative(job.updatedAt ?? job.createdAt);
  metaRow.appendChild(timeEl);

  // ── Milestones (lazy) ──────────────────────────────────────────────────────
  const milestonesWrap = document.createElement("div");
  milestonesWrap.className = "jt-milestones hidden";

  // ── Actions row ────────────────────────────────────────────────────────────
  const actionsRow = document.createElement("div");
  actionsRow.className = "jt-actions";

  const detailBtn = document.createElement("button");
  detailBtn.className = "btn-secondary btn-xs";
  detailBtn.textContent = "Milestones";
  let milestonesLoaded = false;

  detailBtn.addEventListener("click", async () => {
    const isHidden = milestonesWrap.classList.contains("hidden");
    milestonesWrap.classList.toggle("hidden", !isHidden);
    detailBtn.textContent = isHidden ? "Hide" : "Milestones";

    if (isHidden && !milestonesLoaded) {
      milestonesLoaded = true;
      milestonesWrap.innerHTML = `<p class="loading" style="font-size:11px">Loading…</p>`;
      const res = await send<MilestonesResponse>({ type: "GET_JOB_MILESTONES", jobId: job._id });
      renderMilestones(milestonesWrap, res.ok ? (res.milestones ?? []) : []);
    }
  });

  actionsRow.appendChild(detailBtn);

  if (isClient && (job.status === "in-progress" || job.status === "assigned")) {
    const completeBtn = document.createElement("button");
    completeBtn.className = "btn-primary btn-xs";
    completeBtn.textContent = "Mark Complete";
    completeBtn.addEventListener("click", async () => {
      completeBtn.disabled = true;
      completeBtn.textContent = "Marking…";
      const res = await send<CompleteResponse>({ type: "MARK_JOB_COMPLETE", jobId: job._id });
      if (res.ok) {
        pill.textContent = "Complete";
        pill.className = "jt-status-pill js-complete";
        completeBtn.remove();
      } else {
        completeBtn.disabled = false;
        completeBtn.textContent = "Mark Complete";
      }
    });
    actionsRow.appendChild(completeBtn);
  }

  card.append(headerRow, metaRow, milestonesWrap, actionsRow);
  return card;
}

function renderMilestones(wrap: HTMLElement, milestones: Milestone[]): void {
  if (milestones.length === 0) {
    wrap.innerHTML = `<p style="font-size:11px;color:var(--gray-400)">No milestones defined.</p>`;
    return;
  }

  const done  = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const pct   = Math.round((done / total) * 100);

  wrap.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "milestone-bar-wrap";
  bar.innerHTML = `
    <div class="milestone-bar-track">
      <div class="milestone-bar-fill" style="width:${pct}%"></div>
    </div>
    <span class="milestone-bar-label">${done}/${total} done</span>
  `;
  wrap.appendChild(bar);

  milestones
    .sort((a, b) => a.order - b.order)
    .forEach((m) => {
      const row = document.createElement("div");
      row.className = `milestone-row${m.completed ? " done" : ""}`;
      row.innerHTML = `
        <span class="milestone-check">${m.completed ? "✓" : "○"}</span>
        <span class="milestone-title">${m.title}</span>
      `;
      wrap.appendChild(row);
    });
}
