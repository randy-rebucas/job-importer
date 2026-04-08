import { send } from "../utils";
import type { RecurringJob } from "../../utils/api";

interface RecurringResponse { ok: boolean; jobs?: RecurringJob[]; error?: string }

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function renderRecurringJobs(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Recurring Jobs</h2>
    </div>
    <div id="cal-strip" class="cal-strip">
      ${buildCalendarStrip()}
    </div>
    <div id="recurring-list" class="list-container">
      <p class="loading">Loading…</p>
    </div>
  `;

  void loadRecurring(container);
}

function buildCalendarStrip(): string {
  const today = new Date();
  const cols: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isToday = i === 0;
    cols.push(`
      <div class="cal-day${isToday ? " cal-today" : ""}" data-date="${d.toISOString().slice(0, 10)}">
        <span class="cal-day-name">${DAY_LABELS[d.getDay()]}</span>
        <span class="cal-day-num">${d.getDate()}</span>
        <div class="cal-dots" id="dots-${d.toISOString().slice(0, 10)}"></div>
      </div>
    `);
  }
  return cols.join("");
}

async function loadRecurring(container: HTMLElement): Promise<void> {
  const listEl = container.querySelector<HTMLElement>("#recurring-list")!;
  const res = await send<RecurringResponse>({ type: "GET_RECURRING_JOBS" });

  if (!res.ok) {
    listEl.innerHTML = `<p class="error-msg">${res.error ?? "Failed to load recurring jobs."}</p>`;
    return;
  }

  const jobs = res.jobs ?? [];

  if (jobs.length === 0) {
    listEl.innerHTML = `<p class="empty">No upcoming recurring jobs this week.</p>`;
    return;
  }

  // Place dots on the calendar strip for days that have a job
  jobs.forEach((job) => {
    const date = job.nextOccurrence.slice(0, 10);
    const dotsEl = container.querySelector<HTMLElement>(`#dots-${date}`);
    if (dotsEl) {
      const dot = document.createElement("div");
      dot.className = "cal-dot";
      dotsEl.appendChild(dot);
    }
  });

  // Render job cards sorted by next occurrence
  listEl.innerHTML = "";
  jobs
    .slice()
    .sort((a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime())
    .forEach((job) => listEl.appendChild(buildJobRow(job)));
}

function buildJobRow(job: RecurringJob): HTMLElement {
  const next   = new Date(job.nextOccurrence);
  const isToday = next.toDateString() === new Date().toDateString();
  const minsUntil = Math.round((next.getTime() - Date.now()) / 60_000);

  let timeLabel: string;
  if (minsUntil < 0) {
    timeLabel = "Overdue";
  } else if (minsUntil < 60) {
    timeLabel = `In ${minsUntil}m`;
  } else if (isToday) {
    timeLabel = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    timeLabel = next.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  const row = document.createElement("div");
  row.className = `recurring-row${isToday ? " recurring-today" : ""}`;

  const info = document.createElement("div");
  info.className = "recurring-info";

  const title = document.createElement("span");
  title.className = "recurring-title";
  title.textContent = job.title;

  const freq = document.createElement("span");
  freq.className = "recurring-freq";
  freq.textContent = job.frequency;

  const time = document.createElement("span");
  time.className = `recurring-time${minsUntil < 0 ? " overdue" : ""}`;
  time.textContent = timeLabel;

  info.append(title, freq);
  row.append(info, time);

  if (job.url) {
    const startBtn = document.createElement("button");
    startBtn.className = "btn-primary btn-xs";
    startBtn.textContent = "Start Now";
    startBtn.addEventListener("click", () => window.open(job.url!, "_blank"));
    row.appendChild(startBtn);
  }

  return row;
}
