import { send, formatPHP, el } from "../utils";
import type { Payment } from "../../utils/api";

interface PaymentResponse { ok: boolean; payment?: Payment; error?: string }
interface TrackResponse { ok: boolean; error?: string }

export function renderPaymentStatus(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Payment Tracker</h2>
    </div>
    <p class="help-text">
      Paste the PayMongo session ID from your checkout URL to track payment status.
    </p>
    <form id="payment-form" class="form" novalidate>
      <div class="field">
        <label for="session-id">Session ID</label>
        <input id="session-id" type="text" placeholder="cs_live_…" required />
      </div>
      <div class="field">
        <label for="job-id">Job ID <span class="optional">(optional)</span></label>
        <input id="job-id" type="text" placeholder="Job ID for escrow confirmation" />
      </div>
      <div id="pay-error" class="error hidden"></div>
      <div id="pay-result" class="pay-result hidden"></div>
      <div class="btn-row">
        <button type="submit" id="check-btn" class="btn-primary">Check Status</button>
        <button type="button" id="track-btn" class="btn-secondary">Track (30s)</button>
      </div>
    </form>
  `;

  const form = container.querySelector<HTMLFormElement>("#payment-form")!;
  const sessionEl = container.querySelector<HTMLInputElement>("#session-id")!;
  const jobEl = container.querySelector<HTMLInputElement>("#job-id")!;
  const errorEl = container.querySelector<HTMLDivElement>("#pay-error")!;
  const resultEl = container.querySelector<HTMLDivElement>("#pay-result")!;
  const checkBtn = container.querySelector<HTMLButtonElement>("#check-btn")!;
  const trackBtn = container.querySelector<HTMLButtonElement>("#track-btn")!;

  // Auto-fill from active tab URL if it looks like a PayMongo redirect
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url ?? "";
    const match = url.match(/[?&]session_id=([^&]+)/);
    if (match) sessionEl.value = match[1];
  });

  async function checkPayment(): Promise<void> {
    errorEl.classList.add("hidden");
    resultEl.classList.add("hidden");

    const sessionId = sessionEl.value.trim();
    const jobId = jobEl.value.trim() || undefined;

    if (!sessionId) {
      errorEl.textContent = "Please enter a session ID";
      errorEl.classList.remove("hidden");
      return;
    }

    checkBtn.disabled = true;
    checkBtn.textContent = "Checking…";

    const res = await send<PaymentResponse>({ type: "GET_PAYMENT", sessionId, jobId });

    checkBtn.disabled = false;
    checkBtn.textContent = "Check Status";

    if (!res.ok || !res.payment) {
      errorEl.textContent = res.error ?? "Payment not found";
      errorEl.classList.remove("hidden");
      return;
    }

    showPaymentResult(resultEl, res.payment);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await checkPayment();
  });

  trackBtn.addEventListener("click", async () => {
    const sessionId = sessionEl.value.trim();
    const jobId = jobEl.value.trim() || undefined;

    if (!sessionId) {
      errorEl.textContent = "Please enter a session ID";
      errorEl.classList.remove("hidden");
      return;
    }

    const res = await send<TrackResponse>({ type: "TRACK_PAYMENT", sessionId, jobId });
    if (res.ok) {
      trackBtn.textContent = "Tracking…";
      trackBtn.disabled = true;
      resultEl.innerHTML = `<div class="success">Tracking started. You'll get a notification when payment is confirmed.</div>`;
      resultEl.classList.remove("hidden");
    }
  });
}

function showPaymentResult(resultEl: HTMLElement, payment: Payment): void {
  const statusClass = payment.status === "paid" ? "status-paid" : "status-pending";
  resultEl.innerHTML = "";

  const statusRow = el("div", { class: "pay-status-row" });

  const label = el("span", { class: "pay-label" });
  label.textContent = "Status:";

  const badge = el("span", { class: `pay-status-badge ${statusClass}` });
  badge.textContent = payment.status.toUpperCase();

  const amountEl = el("p", { class: "pay-amount" });
  amountEl.textContent = `Amount: ${formatPHP(payment.amount)}`;

  statusRow.append(label, badge);
  resultEl.append(statusRow, amountEl);
  resultEl.classList.remove("hidden");
}
