"use strict";
(() => {
  // content/content-script.ts
  var userRole = null;
  var floatMenu = null;
  async function init() {
    try {
      const res = await chrome.runtime.sendMessage({ type: "GET_AUTH" });
      userRole = res?.user?.role ?? null;
    } catch {
    }
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    detectPaymentRedirect();
  }
  function onMouseDown(e) {
    if (floatMenu && !floatMenu.contains(e.target)) removeMenu();
  }
  function onMouseUp(e) {
    setTimeout(() => handleSelection(e), 50);
  }
  function handleSelection(e) {
    const text = window.getSelection()?.toString().trim() ?? "";
    if (!text || text.length < 3) {
      removeMenu();
      return;
    }
    const target = e.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
    showMenu(text, e.clientX, e.clientY);
  }
  function removeMenu() {
    floatMenu?.remove();
    floatMenu = null;
  }
  function showMenu(selectedText, x, y) {
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
    const jobBtn = makeMenuBtn("\u{1F4CB} Post as Job on LocalPro", () => {
      void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "job", value: selectedText });
      removeMenu();
    });
    menu.appendChild(jobBtn);
    if (userRole === "peso") {
      const refBtn = makeMenuBtn("\u{1F464} Refer to LocalPro as Provider", () => {
        void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "referral", value: selectedText });
        removeMenu();
      });
      menu.appendChild(refBtn);
    }
    document.body.appendChild(menu);
    floatMenu = menu;
  }
  function makeMenuBtn(label, onClick) {
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
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255,255,255,0.15)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "transparent";
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }
  function detectPaymentRedirect() {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const status = url.searchParams.get("status") ?? url.searchParams.get("payment_status");
    if (sessionId && (status === "success" || window.location.href.includes("payment/success"))) {
      void chrome.runtime.sendMessage({ type: "SET_PREFILL", key: "payment_session", value: sessionId });
    }
  }
  void init();
})();
