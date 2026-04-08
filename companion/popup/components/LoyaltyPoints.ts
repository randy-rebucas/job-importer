import { send } from "../utils";
import type { LoyaltyData, LoyaltyReferral } from "../../utils/api";

interface LoyaltyResponse  { ok: boolean; points?: number; tier?: string; nextTierPoints?: number; error?: string }
interface ReferralResponse { ok: boolean; referralCode?: string; referralLink?: string; referralCount?: number; error?: string }
interface RedeemResponse   { ok: boolean; message?: string; remaining?: number; error?: string }

export function renderLoyaltyPoints(container: HTMLElement): void {
  container.innerHTML = `
    <div class="section-header">
      <h2>Loyalty Points</h2>
    </div>
    <div id="loyalty-body">
      <p class="loading">Loading…</p>
    </div>
  `;

  void loadAll(container);
}

async function loadAll(container: HTMLElement): Promise<void> {
  const body = container.querySelector<HTMLDivElement>("#loyalty-body")!;

  const [loyaltyRes, referralRes] = await Promise.all([
    send<LoyaltyResponse>({ type: "GET_LOYALTY" }),
    send<ReferralResponse>({ type: "GET_LOYALTY_REFERRAL" }),
  ]);

  if (!loyaltyRes.ok) {
    body.innerHTML = `<p class="error-msg">${loyaltyRes.error ?? "Failed to load loyalty data."}</p>`;
    return;
  }

  const points         = loyaltyRes.points ?? 0;
  const tier           = loyaltyRes.tier;
  const nextTierPoints = loyaltyRes.nextTierPoints;
  const referralCode   = referralRes.ok ? (referralRes.referralCode ?? "") : "";
  const referralLink   = referralRes.ok ? (referralRes.referralLink ?? "") : "";
  const referralCount  = referralRes.ok ? (referralRes.referralCount ?? 0) : 0;

  body.innerHTML = `
    <div class="loyalty-balance-card">
      <div class="loyalty-points-label">Your Points</div>
      <div class="loyalty-points-value">${points.toLocaleString()}</div>
      ${tier ? `<div class="loyalty-tier">${tier} tier</div>` : ""}
      ${nextTierPoints != null
        ? `<div class="loyalty-next">
             <div class="loyalty-progress-bar">
               <div class="loyalty-progress-fill" style="width:${Math.min(100, Math.round((points / nextTierPoints) * 100))}%"></div>
             </div>
             <span class="loyalty-next-label">${nextTierPoints - points} pts to next tier</span>
           </div>`
        : ""}
    </div>

    <div class="loyalty-redeem-section">
      <h3 class="loyalty-section-title">Redeem Points</h3>
      <div class="field">
        <label for="redeem-amount">Points to redeem</label>
        <input id="redeem-amount" type="number" min="1" max="${points}" placeholder="Enter amount" />
      </div>
      <div id="redeem-error" class="error hidden"></div>
      <div id="redeem-success" class="success hidden"></div>
      <button id="redeem-btn" class="btn-primary btn-sm" ${points === 0 ? "disabled" : ""}>
        Redeem
      </button>
    </div>

    ${referralCode ? `
    <div class="loyalty-referral-section">
      <h3 class="loyalty-section-title">Earn More Points</h3>
      <p class="loyalty-referral-info">Share your referral link — earn points for every signup!</p>
      <div class="referral-link-row">
        <input id="referral-link-input" type="text" readonly value="${referralLink || referralCode}" class="referral-link-input" />
        <button id="copy-referral-btn" class="btn-secondary btn-sm">Copy</button>
      </div>
      <p class="loyalty-referral-count">${referralCount} referral${referralCount !== 1 ? "s" : ""} so far</p>
    </div>` : ""}
  `;

  // ── Redeem handler ────────────────────────────────────────────────────────
  const redeemBtn   = body.querySelector<HTMLButtonElement>("#redeem-btn")!;
  const redeemInput = body.querySelector<HTMLInputElement>("#redeem-amount")!;
  const redeemError = body.querySelector<HTMLDivElement>("#redeem-error")!;
  const redeemOk    = body.querySelector<HTMLDivElement>("#redeem-success")!;

  redeemBtn.addEventListener("click", async () => {
    redeemError.classList.add("hidden");
    redeemOk.classList.add("hidden");

    const amount = parseInt(redeemInput.value, 10);
    if (isNaN(amount) || amount < 1) {
      redeemError.textContent = "Enter a valid number of points.";
      redeemError.classList.remove("hidden");
      return;
    }
    if (amount > points) {
      redeemError.textContent = `You only have ${points} points.`;
      redeemError.classList.remove("hidden");
      return;
    }

    redeemBtn.disabled = true;
    redeemBtn.textContent = "Redeeming…";

    const res = await send<RedeemResponse>({ type: "POST_LOYALTY_REDEEM", points: amount });

    redeemBtn.disabled = false;
    redeemBtn.textContent = "Redeem";

    if (!res.ok) {
      redeemError.textContent = res.error ?? "Redemption failed.";
      redeemError.classList.remove("hidden");
      return;
    }

    redeemOk.textContent = res.message ?? "Points redeemed successfully!";
    redeemOk.classList.remove("hidden");
    redeemInput.value = "";
    // Refresh the whole view so the balance updates
    setTimeout(() => void loadAll(container), 1500);
  });

  // ── Copy referral link ────────────────────────────────────────────────────
  const copyBtn = body.querySelector<HTMLButtonElement>("#copy-referral-btn");
  const linkInput = body.querySelector<HTMLInputElement>("#referral-link-input");
  if (copyBtn && linkInput) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(linkInput.value).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      }).catch(() => {
        linkInput.select();
        document.execCommand("copy");
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      });
    });
  }
}
