import { send, formatRelative, el } from "../utils";
import type { Thread, Message } from "../../utils/api";
import type { MeResponse } from "../../utils/api";

interface ThreadsResponse { ok: boolean; threads?: Thread[]; error?: string }
interface MessagesResponse { ok: boolean; messages?: Message[]; error?: string }
interface SendResponse { ok: boolean; error?: string }

export function renderChatView(container: HTMLElement, auth: MeResponse): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Messages</h2>
    </div>
    <div id="chat-content">
      <div id="thread-list" class="list-container">
        <div class="loading">Loading threads…</div>
      </div>
    </div>
  `;

  void loadThreads(container, auth);
}

async function loadThreads(container: HTMLElement, auth: MeResponse): Promise<void> {
  const listEl = container.querySelector<HTMLElement>("#thread-list")!;

  const res = await send<ThreadsResponse>({ type: "GET_THREADS" });

  if (!res.ok) {
    listEl.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load"}</div>`;
    return;
  }

  const threads = res.threads ?? [];

  if (threads.length === 0) {
    listEl.innerHTML = `<div class="empty">No active message threads.</div>`;
    return;
  }

  listEl.innerHTML = "";
  threads.forEach((thread) => {
    const row = el("div", { class: `thread-row${thread.unreadCount > 0 ? " unread" : ""}` });

    const name = el("p", { class: "thread-name" });
    name.textContent = thread.otherParty.name;

    const preview = el("p", { class: "thread-preview" });
    preview.textContent = thread.lastMessage
      ? thread.lastMessage.slice(0, 50) + (thread.lastMessage.length > 50 ? "…" : "")
      : "No messages yet";

    const meta = el("div", { class: "thread-meta" });

    if (thread.unreadCount > 0) {
      const badge = el("span", { class: "badge" });
      badge.textContent = String(thread.unreadCount);
      meta.appendChild(badge);
    }

    const time = el("span", { class: "thread-time" });
    time.textContent = formatRelative(thread.updatedAt);
    meta.appendChild(time);

    row.append(name, preview, meta);
    row.addEventListener("click", () => openThread(container, thread, auth));
    listEl.appendChild(row);
  });
}

function openThread(container: HTMLElement, thread: Thread, auth: MeResponse): void {
  const chatContent = container.querySelector<HTMLElement>("#chat-content")!;
  chatContent.innerHTML = `
    <div class="chat-header">
      <button id="back-btn" class="btn-ghost btn-sm">← Back</button>
      <span class="chat-title">${thread.jobTitle}</span>
    </div>
    <div id="message-list" class="message-list">
      <div class="loading">Loading…</div>
    </div>
    <form id="chat-form" class="chat-input-row">
      <input id="chat-input" type="text" placeholder="Type a message…" required autocomplete="off" />
      <button type="submit" class="btn-primary btn-sm">Send</button>
    </form>
  `;

  const backBtn = chatContent.querySelector<HTMLButtonElement>("#back-btn")!;
  backBtn.addEventListener("click", () => {
    chatContent.innerHTML = `<div id="thread-list" class="list-container"><div class="loading">Loading…</div></div>`;
    void loadThreads(container, auth);
  });

  void loadMessages(chatContent, thread._id, auth._id);

  const form = chatContent.querySelector<HTMLFormElement>("#chat-form")!;
  const input = chatContent.querySelector<HTMLInputElement>("#chat-input")!;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    input.value = "";
    input.disabled = true;

    const res = await send<SendResponse>({ type: "SEND_MESSAGE", threadId: thread._id, body });
    input.disabled = false;
    input.focus();

    if (res.ok) {
      void loadMessages(chatContent, thread._id, auth._id);
    }
  });
}

async function loadMessages(
  chatContent: HTMLElement,
  threadId: string,
  myUserId: string
): Promise<void> {
  const msgList = chatContent.querySelector<HTMLElement>("#message-list")!;

  const res = await send<MessagesResponse>({ type: "GET_MESSAGES", threadId });

  if (!res.ok) {
    msgList.innerHTML = `<div class="error-msg">${res.error ?? "Failed to load"}</div>`;
    return;
  }

  const messages = (res.messages ?? []).slice(-10);
  msgList.innerHTML = "";

  messages.forEach((m) => {
    const isMine = m.sender._id === myUserId;
    const row = el("div", { class: `msg-row ${isMine ? "mine" : "theirs"}` });

    const bubble = el("div", { class: "msg-bubble" });
    bubble.textContent = m.body;

    const time = el("span", { class: "msg-time" });
    time.textContent = formatRelative(m.createdAt);

    row.append(bubble, time);
    msgList.appendChild(row);
  });

  // Scroll to bottom
  msgList.scrollTop = msgList.scrollHeight;
}
