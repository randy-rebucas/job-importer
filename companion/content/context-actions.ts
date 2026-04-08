/**
 * LocalPro Companion — Context-Aware Page Actions (Feature 13)
 *
 * This script runs ONLY on:
 *   - *://*.localpro.asia/*
 *   - *://*.paymongo.com/checkout/*
 *
 * It injects a floating action button (FAB) based on the current URL:
 *   - paymongo.com/checkout/*        → "Track this payment"
 *   - localpro.asia/jobs/[id]        → "Quick Quote" (providers)
 *   - localpro.asia/client/my-jobs   → "Rate Provider" (clients)
 *
 * Security: All DOM built via createElement/textContent — no innerHTML.
 */

interface AuthResponse { user: { role: string; _id: string } | null }

async function init(): Promise<void> {
  let userRole: string | null = null;

  try {
    const res = await chrome.runtime.sendMessage<object, AuthResponse>({ type: "GET_AUTH" });
    userRole = res?.user?.role ?? null;
  } catch {
    return; // Extension context not ready — bail silently
  }

  if (!userRole) return; // Not logged in — no FABs

  injectContextFab(userRole);
}

function injectContextFab(userRole: string): void {
  const url      = window.location.href;
  const hostname = window.location.hostname;

  // ── paymongo.com/checkout/* → Track this payment ──────────────────────────
  if (hostname.includes("paymongo.com") && url.includes("/checkout/")) {
    const sessionId = extractPaymongoSessionId(url);
    if (!sessionId) return;

    injectFab("💳 Track this payment", () => {
      void chrome.runtime.sendMessage({ type: "TRACK_PAYMENT", sessionId });
      showFabFeedback("Payment is now being tracked!");
    });
    return;
  }

  // ── localpro.asia/jobs/[id] → Quick Quote (providers only) ────────────────
  const jobMatch = url.match(/localpro\.asia\/jobs\/([a-zA-Z0-9]+)/);
  if (jobMatch && userRole === "provider") {
    const jobId = jobMatch[1];
    injectFab("📋 Quick Quote", () => {
      void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "quote_job_id", value: jobId });
      showFabFeedback("Open the LocalPro extension to send your quote.");
    });
    return;
  }

  // ── localpro.asia/client/my-jobs → Rate Provider (clients only) ───────────
  if (url.includes("/client/my-jobs") && userRole === "client") {
    injectFab("⭐ Rate Provider", () => {
      showFabFeedback("Open the LocalPro extension to rate your provider.");
    });
    return;
  }
}

function extractPaymongoSessionId(url: string): string | null {
  const parts = url.split("/checkout/");
  if (parts.length < 2) return null;
  const segment = parts[1].split("?")[0].split("#")[0];
  return segment || null;
}

function injectFab(label: string, onClick: () => void): void {
  if (document.getElementById("lp-context-fab")) return; // prevent duplicates

  const fab = document.createElement("button");
  fab.id = "lp-context-fab";
  fab.textContent = label;
  fab.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 24px;
    padding: 10px 18px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(26,86,219,0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity .2s, transform .2s;
  `;
  fab.addEventListener("mouseenter", () => { fab.style.opacity = "0.9"; fab.style.transform = "scale(1.04)"; });
  fab.addEventListener("mouseleave", () => { fab.style.opacity = "1";   fab.style.transform = "scale(1)"; });
  fab.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  document.body.appendChild(fab);
}

function showFabFeedback(message: string): void {
  const fab = document.getElementById("lp-context-fab");
  if (fab) {
    fab.textContent = "✓ " + message;
    fab.style.background = "#16a34a";
    fab.style.maxWidth = "320px";
    setTimeout(() => fab.remove(), 3000);
  }
}

void init();
