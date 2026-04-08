import { send, formatRelative, el } from "../utils";
import type { Notification, CompletedJob } from "../../utils/api";

interface NotifResponse {
  ok: boolean;
  notifications?: Notification[];
  unreadCount?: number;
  error?: string;
}

interface CompletedJobsResponse {
  ok: boolean;
  jobs?: CompletedJob[];
}

interface ReviewResponse { ok: boolean; error?: string }

export function renderNotificationList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Notifications</h2>
      <span id="notif-count" class="badge hidden"></span>
    </div>
    <div id="review-prompts"></div>
    <div id="notif-list" class="list-container">
      <div class="loading">Loading…</div>
    </div>
  `;

  void loadReviewPrompts(container);
  void loadNotifications(container);
}

async function loadReviewPrompts(container: HTMLElement): Promise<void> {
  const promptsEl = container.querySelector<HTMLElement>("#review-prompts")!;
  const res = await send<CompletedJobsResponse>({ type: "GET_COMPLETED_JOBS" });
  if (!res.ok || !res.jobs?.length) return;

  const unreviewed = res.jobs.filter((j) => !j.hasReview && j.assignedProvider);
  if (!unreviewed.length) return;

  unreviewed.forEach((job) => {
    const card = buildReviewCard(job, () => card.remove());
    promptsEl.appendChild(card);
  });
}

function buildReviewCard(job: CompletedJob, onDone: () => void): HTMLElement {
  const card = el("div", { class: "review-prompt-card" });

  const heading = el("p", { class: "review-prompt-title" });
  heading.textContent = `Rate your experience with ${job.assignedProvider!.name}`;

  const sub = el("p", { class: "review-prompt-sub" });
  sub.textContent = job.title;

  const stars = el("div", { class: "star-row" });
  let selectedRating = 0;
  const starBtns: HTMLButtonElement[] = [];

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "star-btn";
    btn.textContent = "★";
    btn.setAttribute("data-star", String(i));
    btn.addEventListener("click", () => {
      selectedRating = i;
      starBtns.forEach((b, idx) =>
        b.classList.toggle("selected", idx < i)
      );
    });
    starBtns.push(btn);
    stars.appendChild(btn);
  }

  const commentEl = document.createElement("textarea");
  commentEl.className = "review-comment";
  commentEl.placeholder = "Optional comment…";
  commentEl.rows = 2;

  const errEl = el("div", { class: "error hidden" });

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn-primary btn-sm";
  submitBtn.textContent = "Submit Review";

  const skipBtn = document.createElement("button");
  skipBtn.className = "btn-ghost-inline";
  skipBtn.textContent = "Skip";
  skipBtn.addEventListener("click", onDone);

  const btnRow = el("div", { class: "review-btn-row" });
  btnRow.append(submitBtn, skipBtn);

  submitBtn.addEventListener("click", async () => {
    errEl.classList.add("hidden");
    if (selectedRating === 0) {
      errEl.textContent = "Please select a star rating.";
      errEl.classList.remove("hidden");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const res = await send<ReviewResponse>({
      type: "POST_REVIEW",
      payload: {
        jobId: job._id,
        providerId: job.assignedProvider!._id,
        rating: selectedRating,
        comment: commentEl.value.trim() || undefined,
      },
    });

    if (!res.ok) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Review";
      errEl.textContent = res.error ?? "Failed to submit review.";
      errEl.classList.remove("hidden");
      return;
    }

    card.innerHTML = `<p class="review-submitted">Thanks for your review!</p>`;
    setTimeout(onDone, 1500);
  });

  card.append(heading, sub, stars, commentEl, errEl, btnRow);
  return card;
}

async function loadNotifications(container: HTMLElement): Promise<void> {
  const listEl = container.querySelector<HTMLElement>("#notif-list")!;
  const countEl = container.querySelector<HTMLElement>("#notif-count")!;

  const res = await send<NotifResponse>({ type: "GET_NOTIFICATIONS" });

  if (!res.ok) {
    listEl.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load"}</div>`;
    return;
  }

  const notifications = res.notifications ?? [];
  const unread = res.unreadCount ?? 0;

  if (unread > 0) {
    countEl.textContent = String(unread);
    countEl.classList.remove("hidden");
  }

  if (notifications.length === 0) {
    listEl.innerHTML = `<div class="empty">No notifications yet.</div>`;
    return;
  }

  listEl.innerHTML = "";
  notifications.forEach((n) => {
    const row = el("div", { class: `notif-row${n.read ? "" : " unread"}` });

    const dot = el("span", { class: "notif-dot" });
    const content = el("div", { class: "notif-content" });

    const title = el("p", { class: "notif-title" });
    title.textContent = n.title;

    const msg = el("p", { class: "notif-msg" });
    msg.textContent = n.message;

    const time = el("span", { class: "notif-time" });
    time.textContent = formatRelative(n.createdAt);

    content.append(title, msg, time);
    row.append(dot, content);

    if (!n.read) {
      row.addEventListener("click", async () => {
        await send({ type: "MARK_NOTIFICATION_READ", id: n._id });
        row.classList.remove("unread");
        dot.style.visibility = "hidden";
        if (n.link) window.open(n.link, "_blank");
      });
    } else if (n.link) {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => window.open(n.link, "_blank"));
    }

    listEl.appendChild(row);
  });
}
