/**
 * LocalPro Companion — Content Script  (<all_urls>)
 *
 * Feature 2 — Quick Job Post:
 *   Any user highlights text → floating button "Post as Job on LocalPro" appears.
 *   Click → stores prefill via chrome.storage.session, popup reads it on open.
 *
 * Feature 6 — PESO Referral:
 *   PESO officers see a second floating button "Refer to LocalPro".
 *
 * Feature 5 — Payment redirect detection:
 *   Detects paymongo success redirects and stores the session_id.
 *
 * NOTE: Context-Aware Page Actions (Feature 13) live in context-actions.ts,
 *       which runs only on localpro.asia and paymongo.com.
 *
 * Security: No innerHTML; all DOM built via createElement / textContent.
 */

interface AuthResponse { user: { role: string; _id: string } | null }

// ── State ─────────────────────────────────────────────────────────────────────

let userRole: string | null = null;
let floatMenu: HTMLElement | null = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  try {
    const res = await chrome.runtime.sendMessage<object, AuthResponse>({ type: "GET_AUTH" });
    userRole = res?.user?.role ?? null;
  } catch {
    // Extension context may not be ready — proceed without role (no PESO button)
  }

  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousedown", onMouseDown);
  detectPaymentRedirect();
}

// ── Text selection ────────────────────────────────────────────────────────────

function onMouseDown(e: MouseEvent): void {
  if (floatMenu && !floatMenu.contains(e.target as Node)) removeMenu();
}

function onMouseUp(e: MouseEvent): void {
  setTimeout(() => handleSelection(e), 50);
}

function handleSelection(e: MouseEvent): void {
  const text = window.getSelection()?.toString().trim() ?? "";
  if (!text || text.length < 3) { removeMenu(); return; }

  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

  showMenu(text, e.clientX, e.clientY);
}

// ── Floating menu ─────────────────────────────────────────────────────────────

function removeMenu(): void {
  floatMenu?.remove();
  floatMenu = null;
}

function showMenu(selectedText: string, x: number, y: number): void {
  removeMenu();

  const menu = document.createElement("div");
  menu.id = "lp-companion-menu";
  menu.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    top: ${Math.min(y + 8, window.innerHeight - 80)}px;
    left: ${Math.min(x, window.innerWidth - 220)}px;
    background: #1a56db;
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Feature 2: Post as Job
  const jobBtn = makeMenuBtn("📋 Post as Job on LocalPro", () => {
    void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "job", value: selectedText });
    removeMenu();
  });
  menu.appendChild(jobBtn);

  // Feature 6: PESO referral
  if (userRole === "peso") {
    const refBtn = makeMenuBtn("👤 Refer to LocalPro as Provider", () => {
      void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "referral", value: selectedText });
      removeMenu();
    });
    menu.appendChild(refBtn);
  }

  document.body.appendChild(menu);
  floatMenu = menu;
}

function makeMenuBtn(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText = `
    background: transparent;
    border: none;
    color: #fff;
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    white-space: nowrap;
  `;
  btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.15)"; });
  btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
  btn.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  return btn;
}

// ── Payment redirect detection (Feature 5) ────────────────────────────────────

function detectPaymentRedirect(): void {
  const url      = new URL(window.location.href);
  const sessionId = url.searchParams.get("session_id");
  const status    = url.searchParams.get("status") ?? url.searchParams.get("payment_status");

  if (sessionId && (status === "success" || window.location.href.includes("payment/success"))) {
    void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "payment_session", value: sessionId });
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

void init();
