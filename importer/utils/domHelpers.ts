import type {
  BulkDefaults,
  Category,
  EstimateBudgetMessage,
  EstimateBudgetResponse,
  GenerateDescriptionMessage,
  GenerateDescriptionResponse,
  ImportJobMessage,
  ImportJobResponse,
  JobPost,
} from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const SCAN_BTN_ID   = "localpro-scan-host";
const PANEL_HOST_ID = "localpro-panel-host";
const MODAL_HOST_ID = "localpro-modal-host";
const LP_URL        = "https://www.localpro.asia";

// ── Shared Shadow DOM styles ───────────────────────────────────────────────────

const BASE_STYLES = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  /* ── Floating scan buttons ── */
  .lp-fab-wrap {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 2147483646;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .lp-fab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 18px;
    background: #1a56db;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(26,86,219,.45);
    transition: background .2s, transform .15s, box-shadow .2s;
    line-height: 1;
    white-space: nowrap;
  }
  .lp-fab:hover  { background: #1e429f; box-shadow: 0 6px 20px rgba(26,86,219,.55); transform: translateY(-1px); }
  .lp-fab:active { transform: scale(0.96); }
  .lp-fab:disabled { background: #6b7280; cursor: not-allowed; box-shadow: none; transform: none; }
  .lp-fab.secondary { background: #0f766e; box-shadow: 0 4px 16px rgba(15,118,110,.4); font-size: 12px; padding: 9px 14px; }
  .lp-fab.secondary:hover { background: #0d5e58; }
  .lp-fab svg { flex-shrink: 0; }

  /* ── Selection panel (side drawer) ── */
  .lp-panel-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.35);
    z-index: 2147483646;
    display: flex;
    justify-content: flex-end;
    animation: lp-fade-in .15s ease;
  }
  @keyframes lp-fade-in { from { opacity: 0 } to { opacity: 1 } }

  .lp-panel {
    width: 440px;
    max-width: 100vw;
    height: 100%;
    background: #fff;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0,0,0,.15);
    animation: lp-slide-left .2s ease;
  }
  @keyframes lp-slide-left { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }

  .lp-panel-header {
    padding: 16px 18px 12px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .lp-panel-title {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lp-panel-count {
    display: inline-block;
    background: #eff6ff;
    color: #1e40af;
    border-radius: 20px;
    padding: 2px 9px;
    font-size: 12px;
    font-weight: 700;
  }
  .lp-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
  }
  .lp-close-btn:hover { background: #f3f4f6; color: #111827; }

  /* Search bar */
  .lp-search-wrap {
    padding: 10px 18px;
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
  }
  .lp-search-input {
    width: 100%;
    padding: 8px 12px 8px 34px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    color: #111827;
    background: #f9fafb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z'/%3E%3C/svg%3E") no-repeat 10px center;
    box-sizing: border-box;
    outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  .lp-search-input:focus { border-color: #1a56db; background-color: #fff; }

  /* Bulk pre-fill */
  .lp-bulk-section {
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
  }
  .lp-bulk-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: .4px;
    font-family: inherit;
  }
  .lp-bulk-toggle:hover { background: #f9fafb; }
  .lp-bulk-toggle svg { transition: transform .2s; }
  .lp-bulk-toggle.open svg { transform: rotate(180deg); }

  .lp-bulk-body {
    display: none;
    padding: 4px 18px 14px;
    background: #fafafa;
  }
  .lp-bulk-body.open { display: block; }
  .lp-bulk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .lp-bulk-label { display: block; font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 3px; text-transform: uppercase; letter-spacing: .4px; }
  .lp-bulk-input, .lp-bulk-select {
    width: 100%;
    padding: 7px 10px;
    border: 1.5px solid #d1d5db;
    border-radius: 7px;
    font-size: 13px;
    color: #111827;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    font-family: inherit;
    transition: border-color .15s;
  }
  .lp-bulk-input:focus, .lp-bulk-select:focus { border-color: #1a56db; }
  .lp-bulk-apply {
    width: 100%;
    padding: 8px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background .15s;
  }
  .lp-bulk-apply:hover { background: #1e429f; }

  /* Toolbar (select-all + count + CSV) */
  .lp-panel-toolbar {
    padding: 8px 18px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    background: #fafafa;
  }
  .lp-select-all-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    user-select: none;
  }
  .lp-select-all-label input { cursor: pointer; width: 15px; height: 15px; accent-color: #1a56db; }
  .lp-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .lp-selected-count { font-size: 12px; color: #6b7280; font-weight: 500; }
  .lp-csv-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    background: #fff;
    border: 1.5px solid #d1d5db;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    font-family: inherit;
    transition: background .1s;
  }
  .lp-csv-btn:hover { background: #f3f4f6; }

  /* Job list */
  .lp-panel-list { flex: 1; overflow-y: auto; padding: 6px 0; }

  .lp-job-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 18px;
    border-bottom: 1px solid #f9fafb;
    cursor: pointer;
    transition: background .1s;
  }
  .lp-job-item:hover   { background: #f9fafb; }
  .lp-job-item.selected { background: #eff6ff; }
  .lp-job-item.hidden   { display: none; }

  .lp-job-checkbox {
    margin-top: 3px;
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    accent-color: #1a56db;
    cursor: pointer;
  }
  .lp-job-info { flex: 1; min-width: 0; }
  .lp-job-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lp-job-meta {
    font-size: 11px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .lp-dup-badge {
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
  }

  .lp-source-chip {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .lp-source-chip.facebook  { background: #dbeafe; color: #1d4ed8; }
  .lp-source-chip.linkedin  { background: #cffafe; color: #0e7490; }
  .lp-source-chip.jobstreet { background: #d1fae5; color: #065f46; }
  .lp-source-chip.indeed    { background: #fce7f3; color: #9d174d; }

  .lp-no-results {
    text-align: center;
    padding: 32px 18px;
    color: #9ca3af;
    font-size: 13px;
    display: none;
  }
  .lp-no-results.visible { display: block; }

  /* Footer */
  .lp-panel-footer { padding: 12px 18px; border-top: 1px solid #e5e7eb; flex-shrink: 0; background: #fff; }
  .lp-import-btn {
    width: 100%;
    padding: 11px 20px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: inherit;
  }
  .lp-import-btn:hover { background: #1e429f; }
  .lp-import-btn:disabled { background: #9ca3af; cursor: not-allowed; }

  /* ── Modal overlay ── */
  .lp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.5);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: lp-fade-in .15s ease;
  }
  .lp-modal {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
    animation: lp-slide-up .2s ease;
  }
  @keyframes lp-slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .lp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e5e7eb;
  }
  .lp-modal-title { font-size: 16px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }
  .lp-modal-progress { font-size: 12px; font-weight: 600; color: #6b7280; background: #f3f4f6; padding: 3px 10px; border-radius: 20px; }
  .lp-modal-header-right { display: flex; align-items: center; gap: 8px; }
  .lp-modal-body { padding: 18px 22px; }

  .lp-field { margin-bottom: 13px; }
  .lp-label { display: block; font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
  .lp-label .lp-required { color: #ef4444; margin-left: 2px; }
  .lp-input, .lp-textarea, .lp-select {
    width: 100%;
    padding: 9px 12px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    transition: border-color .15s;
    font-family: inherit;
  }
  .lp-input:focus, .lp-textarea:focus, .lp-select:focus { border-color: #1a56db; }
  .lp-textarea { resize: vertical; min-height: 90px; }
  .lp-select:disabled { background: #f3f4f6; color: #9ca3af; }
  .lp-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  input[type="date"].lp-input { color-scheme: light; }

  .lp-hint { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .lp-hint.ai { color: #7c3aed; }
  .lp-hint.success { color: #059669; }

  /* AI estimate button */
  .lp-estimate-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    padding: 4px 10px;
    background: #f5f3ff;
    color: #6d28d9;
    border: 1.5px solid #ddd6fe;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-estimate-btn:hover { background: #ede9fe; }
  .lp-estimate-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* AI clean description button */
  .lp-ai-clean-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    padding: 4px 10px;
    background: #f0fdf4;
    color: #15803d;
    border: 1.5px solid #bbf7d0;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-ai-clean-btn:hover { background: #dcfce7; }
  .lp-ai-clean-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* AI Smart Fill bar */
  .lp-ai-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    background: linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%);
    border: 1.5px solid #ddd6fe;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .lp-ai-bar-label {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    color: #5b21b6;
  }
  .lp-ai-bar-label span { font-weight: 400; color: #7c3aed; }
  .lp-smart-fill-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 13px;
    background: #7c3aed;
    color: #fff;
    border: none;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
    white-space: nowrap;
  }
  .lp-smart-fill-btn:hover { background: #6d28d9; }
  .lp-smart-fill-btn:disabled { background: #a78bfa; cursor: not-allowed; }

  /* ── Per-post inline import button ── */
  .lp-post-btn-wrap {
    display: flex;
    align-items: center;
    padding: 6px 0 2px 0;
  }
  .lp-post-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1.5px solid #bfdbfe;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: background .15s, border-color .15s, box-shadow .15s;
    white-space: nowrap;
    line-height: 1;
  }
  .lp-post-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(29,78,216,.15);
  }
  .lp-post-btn:active { transform: scale(0.97); }
  .lp-post-btn.importing {
    background: #f3f4f6;
    color: #6b7280;
    border-color: #e5e7eb;
    cursor: not-allowed;
  }
  .lp-post-btn.done {
    background: #d1fae5;
    color: #065f46;
    border-color: #6ee7b7;
    cursor: default;
  }

  /* Contact info pill */
  .lp-contact-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 13px;
    flex-wrap: wrap;
  }
  .lp-contact-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .5px;
    flex-shrink: 0;
  }
  .lp-contact-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    font-size: 12px;
    color: #334155;
    font-weight: 500;
    user-select: text;
  }

  /* Modal footer */
  .lp-modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 22px; border-top: 1px solid #e5e7eb; }
  .lp-cancel-btn {
    padding: 9px 18px;
    border: 1.5px solid #d1d5db;
    background: #fff;
    color: #374151;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-cancel-btn:hover { background: #f9fafb; }
  .lp-skip-btn {
    padding: 9px 18px;
    border: 1.5px solid #d1d5db;
    background: #fff;
    color: #6b7280;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
  }
  .lp-skip-btn:hover { background: #f9fafb; color: #374151; }
  .lp-submit-btn {
    padding: 9px 20px;
    background: #1a56db;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
  }
  .lp-submit-btn:hover { background: #1e429f; }
  .lp-submit-btn:disabled { background: #9ca3af; cursor: not-allowed; }

  /* Status */
  .lp-status { margin: 0 22px 14px; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; display: none; line-height: 1.5; }
  .lp-status.success { display: block; background: #d1fae5; color: #065f46; }
  .lp-status.error   { display: block; background: #fee2e2; color: #991b1b; }
  .lp-status.loading { display: block; background: #eff6ff; color: #1e40af; }
  .lp-status a { color: inherit; font-weight: 700; }
  .lp-status a:hover { text-decoration: underline; }
`;

// ── Floating scan buttons ─────────────────────────────────────────────────────

/**
 * Injects two fixed buttons:
 *  - "Scan Jobs on This Page" — immediate scan
 *  - "Scroll & Scan" — auto-scrolls then scans
 */
export function injectFloatingScanButton(
  onScan:       (setScanningState: (s: boolean) => void) => void,
  onScrollScan: (setScanningState: (s: boolean) => void) => void
): void {
  document.getElementById(SCAN_BTN_ID)?.remove();

  const host = document.createElement("div");
  host.id = SCAN_BTN_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BASE_STYLES;
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "lp-fab-wrap";

  const makeBtn = (label: string, secondary: boolean): HTMLButtonElement => {
    const btn = document.createElement("button");
    btn.className = secondary ? "lp-fab secondary" : "lp-fab";
    btn.innerHTML = secondary
      ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> ${label}`
      : `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> ${label}`;
    return btn;
  };

  const scanBtn       = makeBtn("Scan Jobs on This Page", false);
  const scrollScanBtn = makeBtn("Scroll & Scan", true);

  const buildSetter = (btn: HTMLButtonElement, isScrollScan: boolean) => (scanning: boolean) => {
    scanBtn.disabled = scanning;
    scrollScanBtn.disabled = scanning;
    btn.innerHTML = scanning
      ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.4-5.4M20 15a9 9 0 01-14.4 5.4"/></svg> ${isScrollScan ? "Scrolling…" : "Scanning…"}`
      : isScrollScan
        ? `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> Scroll & Scan`
        : `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> Scan Jobs on This Page`;
  };

  scanBtn.addEventListener(      "click", () => onScan(buildSetter(scanBtn, false)));
  scrollScanBtn.addEventListener("click", () => onScrollScan(buildSetter(scrollScanBtn, true)));

  wrap.appendChild(scanBtn);
  wrap.appendChild(scrollScanBtn);
  shadow.appendChild(wrap);
}

// ── Per-post inline import button ────────────────────────────────────────────

const PER_POST_ATTR = "data-lp-injected";
const PER_POST_STYLES = `
  :host { display: block; }
  .lp-post-btn-wrap {
    display: flex;
    align-items: center;
    padding: 6px 0 2px 0;
  }
  .lp-post-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1.5px solid #bfdbfe;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    transition: background .15s, border-color .15s, box-shadow .15s;
    white-space: nowrap;
    line-height: 1;
  }
  .lp-post-btn:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(29,78,216,.15);
  }
  .lp-post-btn:active { transform: scale(0.97); }
  .lp-post-btn.importing { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; cursor: not-allowed; }
  .lp-post-btn.done { background: #d1fae5; color: #065f46; border-color: #6ee7b7; cursor: default; }
`;

const IMPORT_ICON = `<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>`;

/**
 * Appends a small "Import to LocalPro" button to a single post container.
 * Uses an isolated Shadow DOM so page styles never bleed in.
 *
 * @param container  The post element to attach the button to.
 * @param isDup      Whether this post has already been imported (shows muted state).
 * @param onClick    Async callback invoked when the user clicks Import.
 *                   Receives a setter to update the button state to "done" on success.
 */
export function injectPerPostImportButton(
  container: Element,
  isDup: boolean,
  onClick: (markDone: () => void) => void
): void {
  if (container.hasAttribute(PER_POST_ATTR)) return;
  container.setAttribute(PER_POST_ATTR, "1");

  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = PER_POST_STYLES;

  const wrap = document.createElement("div");
  wrap.className = "lp-post-btn-wrap";

  const btn = document.createElement("button");
  btn.className = "lp-post-btn" + (isDup ? " done" : "");
  btn.innerHTML = isDup
    ? `${IMPORT_ICON} Already imported`
    : `${IMPORT_ICON} Import to LocalPro`;

  const markDone = () => {
    btn.className = "lp-post-btn done";
    btn.innerHTML = `${IMPORT_ICON} Imported!`;
  };

  if (!isDup) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (btn.classList.contains("importing") || btn.classList.contains("done")) return;
      btn.className = "lp-post-btn importing";
      btn.innerHTML = `${IMPORT_ICON} Opening…`;
      onClick(markDone);
    });
  }

  wrap.appendChild(btn);
  shadow.appendChild(style);
  shadow.appendChild(wrap);
  container.appendChild(host);
}

// ── Job selection panel ───────────────────────────────────────────────────────

export function showJobSelectionPanel(
  jobs: JobPost[],
  importedUrls: Set<string>,
  onImport: (selected: JobPost[], bulkDefaults: BulkDefaults) => void
): void {
  document.getElementById(PANEL_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = PANEL_HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BASE_STYLES;
  shadow.appendChild(style);

  const selected = new Set<number>(jobs.map((_, i) => i));
  let bulkDefaults: BulkDefaults = {};
  let filterText = "";

  // ── Overlay + panel ──
  const overlay = document.createElement("div");
  overlay.className = "lp-panel-overlay";
  const panel = document.createElement("div");
  panel.className = "lp-panel";

  // ── Header ──
  const header = document.createElement("div");
  header.className = "lp-panel-header";
  const titleWrap = document.createElement("div");
  titleWrap.className = "lp-panel-title";
  titleWrap.innerHTML = `
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
    Jobs Found <span class="lp-panel-count">${jobs.length}</span>
  `;
  const closeBtn = document.createElement("button");
  closeBtn.className = "lp-close-btn";
  closeBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
  closeBtn.addEventListener("click", () => host.remove());
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // ── Search ──
  const searchWrap = document.createElement("div");
  searchWrap.className = "lp-search-wrap";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "lp-search-input";
  searchInput.placeholder = "Filter posts…";
  searchInput.addEventListener("input", () => {
    filterText = searchInput.value.toLowerCase();
    let visibleCount = 0;
    items.forEach((item, i) => {
      const job = jobs[i];
      const matches = !filterText
        || job.title.toLowerCase().includes(filterText)
        || job.description.toLowerCase().includes(filterText)
        || (job.posted_by ?? "").toLowerCase().includes(filterText);
      item.classList.toggle("hidden", !matches);
      if (matches) visibleCount++;
    });
    noResults.classList.toggle("visible", visibleCount === 0);
    updateCount();
  });
  searchWrap.appendChild(searchInput);

  // ── Bulk pre-fill ──
  const bulkSection = document.createElement("div");
  bulkSection.className = "lp-bulk-section";
  const bulkToggle = document.createElement("button");
  bulkToggle.type = "button";
  bulkToggle.className = "lp-bulk-toggle";
  bulkToggle.innerHTML = `
    Apply Defaults to All
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  `;
  const bulkBody = document.createElement("div");
  bulkBody.className = "lp-bulk-body";

  const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  const todayStr    = new Date().toISOString().split("T")[0];
  bulkBody.innerHTML = `
    <div class="lp-bulk-grid">
      <div>
        <label class="lp-bulk-label">Location</label>
        <input class="lp-bulk-input" id="lp-bulk-location" type="text" placeholder="e.g. Makati City" />
      </div>
      <div>
        <label class="lp-bulk-label">Budget (PHP)</label>
        <input class="lp-bulk-input" id="lp-bulk-budget" type="number" min="1" placeholder="e.g. 1500" />
      </div>
      <div>
        <label class="lp-bulk-label">Schedule Date</label>
        <input class="lp-bulk-input" id="lp-bulk-date" type="date" value="${tomorrowStr}" min="${todayStr}" />
      </div>
      <div>
        <label class="lp-bulk-label">Urgency</label>
        <select class="lp-bulk-select" id="lp-bulk-urgency">
          <option value="standard">Standard</option>
          <option value="same_day">Same Day</option>
          <option value="rush">Rush</option>
        </select>
      </div>
    </div>
    <button class="lp-bulk-apply" id="lp-bulk-apply">Apply to All Selected</button>
  `;

  bulkToggle.addEventListener("click", () => {
    const open = bulkBody.classList.toggle("open");
    bulkToggle.classList.toggle("open", open);
  });

  (bulkBody.querySelector("#lp-bulk-apply") as HTMLButtonElement).addEventListener("click", () => {
    const locationEl = bulkBody.querySelector("#lp-bulk-location") as HTMLInputElement;
    const budgetEl   = bulkBody.querySelector("#lp-bulk-budget")   as HTMLInputElement;
    const dateEl     = bulkBody.querySelector("#lp-bulk-date")     as HTMLInputElement;
    const urgencyEl  = bulkBody.querySelector("#lp-bulk-urgency")  as HTMLSelectElement;
    bulkDefaults = {
      location:     locationEl.value.trim() || undefined,
      budget:       parseFloat(budgetEl.value) || undefined,
      scheduleDate: dateEl.value || undefined,
      urgency:      (urgencyEl.value as BulkDefaults["urgency"]) || undefined,
    };
    bulkBody.classList.remove("open");
    bulkToggle.classList.remove("open");
    // Visual confirmation
    bulkToggle.textContent = "✓ Defaults set — Apply Defaults to All";
    setTimeout(() => {
      bulkToggle.innerHTML = `Apply Defaults to All <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
    }, 2000);
  });

  bulkSection.appendChild(bulkToggle);
  bulkSection.appendChild(bulkBody);

  // ── Toolbar ──
  const toolbar = document.createElement("div");
  toolbar.className = "lp-panel-toolbar";

  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "lp-select-all-label";
  const selectAllCb = document.createElement("input");
  selectAllCb.type = "checkbox";
  selectAllCb.checked = true;
  selectAllLabel.appendChild(selectAllCb);
  selectAllLabel.appendChild(document.createTextNode("Select All"));

  const toolbarRight = document.createElement("div");
  toolbarRight.className = "lp-toolbar-right";

  const countLabel = document.createElement("span");
  countLabel.className = "lp-selected-count";

  const csvBtn = document.createElement("button");
  csvBtn.className = "lp-csv-btn";
  csvBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV`;
  csvBtn.title = "Export all scraped posts to CSV";
  csvBtn.addEventListener("click", () => exportToCSV(jobs));

  toolbarRight.appendChild(countLabel);
  toolbarRight.appendChild(csvBtn);
  toolbar.appendChild(selectAllLabel);
  toolbar.appendChild(toolbarRight);

  // ── List ──
  const list = document.createElement("div");
  list.className = "lp-panel-list";
  const noResults = document.createElement("div");
  noResults.className = "lp-no-results";
  noResults.textContent = "No posts match your filter.";

  const checkboxes: HTMLInputElement[] = [];
  const items: HTMLElement[] = [];

  const updateCount = () => {
    const visibleSelected = jobs.filter((_, i) =>
      selected.has(i) && !items[i].classList.contains("hidden")
    ).length;
    const visibleTotal = jobs.filter((_, i) => !items[i].classList.contains("hidden")).length;
    countLabel.textContent = `${selected.size} of ${jobs.length} selected`;
    importBtn.disabled = selected.size === 0;
    importBtn.textContent = selected.size === 0
      ? "Select posts to import"
      : `Import Selected (${selected.size})`;
    selectAllCb.checked = visibleSelected > 0 && visibleSelected === visibleTotal;
    selectAllCb.indeterminate = visibleSelected > 0 && visibleSelected < visibleTotal;
  };

  jobs.forEach((job, i) => {
    const isDup = importedUrls.has(job.source_url);
    const item = document.createElement("div");
    item.className = "lp-job-item selected";
    items.push(item);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "lp-job-checkbox";
    cb.checked = true;
    checkboxes.push(cb);

    const info = document.createElement("div");
    info.className = "lp-job-info";
    const displayTitle = job.title || job.description.slice(0, 70) + "…";
    info.innerHTML = `
      <div class="lp-job-title">${escapeText(displayTitle)}</div>
      <div class="lp-job-meta">
        <span class="lp-source-chip ${job.source}">${job.source}</span>
        ${isDup ? `<span class="lp-dup-badge">Already imported</span>` : ""}
        ${job.posted_by ? `<span>${escapeText(job.posted_by)}</span>` : ""}
        ${job.location  ? `<span>📍 ${escapeText(job.location)}</span>` : ""}
      </div>
    `;

    const toggle = (checked: boolean) => {
      cb.checked = checked;
      item.classList.toggle("selected", checked);
      if (checked) selected.add(i); else selected.delete(i);
      updateCount();
    };

    cb.addEventListener("change", () => toggle(cb.checked));
    item.addEventListener("click", (e) => { if (e.target !== cb) toggle(!cb.checked); });
    item.appendChild(cb);
    item.appendChild(info);
    list.appendChild(item);
  });

  list.appendChild(noResults);

  selectAllCb.addEventListener("change", () => {
    const checked = selectAllCb.checked;
    jobs.forEach((_, i) => {
      if (items[i].classList.contains("hidden")) return;
      checkboxes[i].checked = checked;
      items[i].classList.toggle("selected", checked);
      if (checked) selected.add(i); else selected.delete(i);
    });
    selectAllCb.indeterminate = false;
    updateCount();
  });

  // ── Footer ──
  const footer = document.createElement("div");
  footer.className = "lp-panel-footer";
  const importBtn = document.createElement("button");
  importBtn.className = "lp-import-btn";

  importBtn.addEventListener("click", () => {
    const selectedJobs = jobs.filter((_, i) => selected.has(i));
    host.remove();
    onImport(selectedJobs, bulkDefaults);
  });

  footer.appendChild(importBtn);

  // ── Assemble ──
  panel.appendChild(header);
  panel.appendChild(searchWrap);
  panel.appendChild(bulkSection);
  panel.appendChild(toolbar);
  panel.appendChild(list);
  panel.appendChild(footer);
  overlay.appendChild(panel);
  shadow.appendChild(overlay);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) host.remove(); });

  updateCount();
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportToCSV(jobs: JobPost[]): void {
  const headers = ["Title", "Description", "Source", "Posted By", "Location", "Budget", "Timestamp", "Source URL"];
  const rows = jobs.map((j) => [
    j.title,
    j.description.replace(/\n/g, " "),
    j.source,
    j.posted_by,
    j.location ?? "",
    j.budget != null ? String(j.budget) : "",
    j.timestamp,
    j.source_url,
  ].map(csvCell).join(","));

  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `localpro-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(val: string): string {
  const escaped = val.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

// ── Job review modal ──────────────────────────────────────────────────────────

interface BatchContext {
  current: number;
  total: number;
  onNext: () => void;
}

export function showJobModal(
  initialJob: JobPost,
  categories: Category[],
  aiCategory?: string,
  batch?: BatchContext,
  bulkDefaults?: BulkDefaults
): void {
  document.getElementById(MODAL_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = MODAL_HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BASE_STYLES;
  shadow.appendChild(style);

  const overlay = buildModalOverlay(initialJob, categories, aiCategory ?? null, batch ?? null, bulkDefaults ?? {}, shadow, host);
  shadow.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) { closeModal(host); if (batch) batch.onNext(); }
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal(host);
      document.removeEventListener("keydown", escHandler);
      if (batch) batch.onNext();
    }
  };
  document.addEventListener("keydown", escHandler);
}

function closeModal(host: HTMLElement): void { host.remove(); }

function buildModalOverlay(
  job: JobPost,
  categories: Category[],
  aiCategory: string | null,
  batch: BatchContext | null,
  bulkDefaults: BulkDefaults,
  shadow: ShadowRoot,
  host: HTMLElement
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "lp-overlay";

  const modal = document.createElement("div");
  modal.className = "lp-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  // ── Header ──
  const header = document.createElement("div");
  header.className = "lp-modal-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "lp-modal-title";
  titleWrap.innerHTML = `
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
    </svg>
    Import Job
    <span class="lp-source-chip ${job.source}">${job.source}</span>
  `;

  const headerRight = document.createElement("div");
  headerRight.className = "lp-modal-header-right";
  if (batch) {
    const prog = document.createElement("span");
    prog.className = "lp-modal-progress";
    prog.textContent = `${batch.current} / ${batch.total}`;
    headerRight.appendChild(prog);
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "lp-close-btn";
  closeBtn.innerHTML = `<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
  closeBtn.addEventListener("click", () => { closeModal(host); if (batch) batch.onNext(); });
  headerRight.appendChild(closeBtn);
  header.appendChild(titleWrap);
  header.appendChild(headerRight);

  // ── Body ──
  const body = document.createElement("div");
  body.className = "lp-modal-body";

  const form = document.createElement("form");
  form.noValidate = true;

  const effectiveCategory = aiCategory ?? job.category ?? "";
  const findCatByName = (name: string) =>
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const matchedCat = findCatByName(effectiveCategory);

  const catOptions = categories.length
    ? [`<option value="">-- Select category --</option>`,
        ...categories.map((c) => {
          const sel = matchedCat?._id === c._id ? "selected" : "";
          return `<option value="${escapeAttr(c._id)}" data-name="${escapeAttr(c.name)}" ${sel}>${escapeText(c.icon ?? "")} ${escapeText(c.name)}</option>`;
        })].join("")
    : `<option value="">Loading categories…</option>`;

  const catHint = aiCategory
    ? `<div class="lp-hint ai">✦ AI: "${escapeText(aiCategory)}"</div>`
    : effectiveCategory && matchedCat
    ? `<div class="lp-hint">Auto: "${escapeText(effectiveCategory)}"</div>`
    : "";

  const todayStr    = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  // Apply bulk defaults over extracted values
  const preLocation     = bulkDefaults.location     ?? job.location ?? "";
  const preBudget       = bulkDefaults.budget        ?? job.budget   ?? "";
  const preSchedule     = bulkDefaults.scheduleDate  ?? job.scheduleDate ?? tomorrowStr;
  const preUrgency      = bulkDefaults.urgency       ?? "standard";

  form.innerHTML = `
    <div class="lp-field">
      <label class="lp-label" for="lp-title">Job Title <span class="lp-required">*</span></label>
      <input class="lp-input" id="lp-title" type="text" value="${escapeAttr(job.title)}" required maxlength="150" />
    </div>
    <div class="lp-field">
      <label class="lp-label" for="lp-description">Description <span class="lp-required">*</span></label>
      <textarea class="lp-textarea" id="lp-description" maxlength="2000" required>${escapeText(job.description)}</textarea>
      <button type="button" class="lp-ai-clean-btn" id="lp-clean-btn">✦ Clean with AI</button>
      <div class="lp-hint" id="lp-clean-hint"></div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-category">Category <span class="lp-required">*</span></label>
        <select class="lp-select" id="lp-category" ${categories.length === 0 ? "disabled" : ""}>${catOptions}</select>
        ${catHint}
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-poster">Posted By</label>
        <input class="lp-input" id="lp-poster" type="text" value="${escapeAttr(job.posted_by)}" maxlength="100" />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-location">Location <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-location" type="text" value="${escapeAttr(preLocation)}" maxlength="100" placeholder="e.g. Makati City" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${preBudget}" min="1" step="1" placeholder="e.g. 1500" required />
        <button type="button" class="lp-estimate-btn" id="lp-estimate-btn">✦ Estimate with AI</button>
        <div class="lp-hint" id="lp-estimate-hint"></div>
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${escapeAttr(preSchedule)}" min="${todayStr}" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" ${preUrgency === "standard"  ? "selected" : ""}>Standard</option>
          <option value="same_day" ${preUrgency === "same_day"  ? "selected" : ""}>Same Day</option>
          <option value="rush"     ${preUrgency === "rush"      ? "selected" : ""}>Rush</option>
        </select>
      </div>
    </div>
  `;

  // ── AI Smart Fill bar (injected before form) ──
  const aiBar = document.createElement("div");
  aiBar.className = "lp-ai-bar";
  const aiBarLabel = document.createElement("div");
  aiBarLabel.className = "lp-ai-bar-label";
  aiBarLabel.innerHTML = `✦ AI Smart Fill <span>— clean description + category + budget in one click</span>`;
  const smartFillBtn = document.createElement("button");
  smartFillBtn.type = "button";
  smartFillBtn.className = "lp-smart-fill-btn";
  smartFillBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill`;
  aiBar.appendChild(aiBarLabel);
  aiBar.appendChild(smartFillBtn);
  body.insertBefore(aiBar, form);

  body.appendChild(form);

  // ── Contact info section (phone/email from post) ──
  if (job.phone || job.email) {
    const contactDiv = document.createElement("div");
    contactDiv.className = "lp-contact-info";
    const contactLabel = document.createElement("span");
    contactLabel.className = "lp-contact-label";
    contactLabel.textContent = "Contact";
    contactDiv.appendChild(contactLabel);
    if (job.phone) {
      const chip = document.createElement("span");
      chip.className = "lp-contact-chip";
      chip.innerHTML = `📞 ${escapeText(job.phone)}`;
      chip.title = "Click to copy";
      chip.style.cursor = "pointer";
      chip.addEventListener("click", () => { void navigator.clipboard.writeText(job.phone!); chip.innerHTML = "✓ Copied!"; setTimeout(() => { chip.innerHTML = `📞 ${escapeText(job.phone!)}`; }, 1500); });
      contactDiv.appendChild(chip);
    }
    if (job.email) {
      const chip = document.createElement("span");
      chip.className = "lp-contact-chip";
      chip.innerHTML = `✉️ ${escapeText(job.email)}`;
      chip.title = "Click to copy";
      chip.style.cursor = "pointer";
      chip.addEventListener("click", () => { void navigator.clipboard.writeText(job.email!); chip.innerHTML = "✓ Copied!"; setTimeout(() => { chip.innerHTML = `✉️ ${escapeText(job.email!)}`; }, 1500); });
      contactDiv.appendChild(chip);
    }
    body.appendChild(contactDiv);
  }

  // ── AI budget estimate ──
  const estimateBtn  = shadow.getElementById("lp-estimate-btn") as HTMLButtonElement | null;
  const estimateHint = shadow.getElementById("lp-estimate-hint") as HTMLElement | null;

  if (estimateBtn && estimateHint) {
    estimateBtn.addEventListener("click", async () => {
      const categoryEl = shadow.getElementById("lp-category") as HTMLSelectElement;
      const titleEl    = shadow.getElementById("lp-title")    as HTMLInputElement;
      const budgetEl   = shadow.getElementById("lp-budget")   as HTMLInputElement;
      const catName    = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";

      if (!catName) {
        estimateHint.textContent = "Select a category first.";
        estimateHint.className = "lp-hint";
        return;
      }

      estimateBtn.disabled = true;
      estimateBtn.textContent = "Estimating…";
      estimateHint.textContent = "";

      try {
        const msg: EstimateBudgetMessage = {
          type: "ESTIMATE_BUDGET",
          title: titleEl.value.trim() || job.title,
          category: catName,
          description: job.description.slice(0, 300),
        };
        const res: EstimateBudgetResponse = await chrome.runtime.sendMessage(msg);

        if (res?.success && res.midpoint) {
          budgetEl.value = String(res.midpoint);
          const range = (res.min != null && res.max != null)
            ? `PHP ${res.min.toLocaleString()} – ${res.max.toLocaleString()}`
            : "";
          estimateHint.textContent = `✦ AI estimate: ${range}${res.note ? ` · ${res.note}` : ""}`;
          estimateHint.className = "lp-hint ai";
        } else {
          estimateHint.textContent = res?.error ?? "Estimate unavailable.";
          estimateHint.className = "lp-hint";
        }
      } catch {
        estimateHint.textContent = "Could not fetch estimate.";
        estimateHint.className = "lp-hint";
      } finally {
        estimateBtn.disabled = false;
        estimateBtn.textContent = "✦ Estimate with AI";
      }
    });
  }

  // ── Clean with AI ──
  const cleanBtn  = shadow.getElementById("lp-clean-btn")  as HTMLButtonElement | null;
  const cleanHint = shadow.getElementById("lp-clean-hint") as HTMLElement | null;

  if (cleanBtn && cleanHint) {
    cleanBtn.addEventListener("click", async () => {
      const categoryEl = shadow.getElementById("lp-category") as HTMLSelectElement;
      const titleEl    = shadow.getElementById("lp-title")    as HTMLInputElement;
      const descEl     = shadow.getElementById("lp-description") as HTMLTextAreaElement;
      const catName    = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";

      cleanBtn.disabled = true;
      cleanBtn.textContent = "Generating…";
      cleanHint.textContent = "";

      try {
        const msg: GenerateDescriptionMessage = {
          type: "GENERATE_DESCRIPTION",
          title: titleEl.value.trim() || job.title,
          category: catName || undefined,
        };
        const res: GenerateDescriptionResponse = await chrome.runtime.sendMessage(msg);

        if (res?.success && res.description) {
          descEl.value = res.description;
          cleanHint.textContent = "✦ AI-generated — review before submitting";
          cleanHint.className = "lp-hint ai";
        } else {
          cleanHint.textContent = res?.error ?? "Could not generate description.";
          cleanHint.className = "lp-hint";
        }
      } catch {
        cleanHint.textContent = "Could not reach AI service.";
        cleanHint.className = "lp-hint";
      } finally {
        cleanBtn.disabled = false;
        cleanBtn.textContent = "✦ Clean with AI";
      }
    });
  }

  // ── AI Smart Fill (clean description + estimate budget simultaneously) ──
  smartFillBtn.addEventListener("click", async () => {
    const categoryEl = shadow.getElementById("lp-category") as HTMLSelectElement;
    const titleEl    = shadow.getElementById("lp-title")    as HTMLInputElement;
    const descEl     = shadow.getElementById("lp-description") as HTMLTextAreaElement;
    const budgetEl   = shadow.getElementById("lp-budget")   as HTMLInputElement;
    const catName    = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";

    if (!catName) {
      smartFillBtn.textContent = "Select a category first";
      setTimeout(() => { smartFillBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill`; }, 2000);
      return;
    }

    smartFillBtn.disabled = true;
    smartFillBtn.textContent = "Working…";

    const titleVal = titleEl.value.trim() || job.title;

    const [descRes, budgetRes] = await Promise.allSettled([
      chrome.runtime.sendMessage<GenerateDescriptionMessage, GenerateDescriptionResponse>({
        type: "GENERATE_DESCRIPTION",
        title: titleVal,
        category: catName,
      }),
      chrome.runtime.sendMessage<EstimateBudgetMessage, EstimateBudgetResponse>({
        type: "ESTIMATE_BUDGET",
        title: titleVal,
        category: catName,
        description: job.description.slice(0, 300),
      }),
    ]);

    if (descRes.status === "fulfilled" && descRes.value?.success && descRes.value.description) {
      descEl.value = descRes.value.description;
      if (cleanHint) { cleanHint.textContent = "✦ AI-generated — review before submitting"; cleanHint.className = "lp-hint ai"; }
    }
    if (budgetRes.status === "fulfilled" && budgetRes.value?.success && budgetRes.value.midpoint) {
      budgetEl.value = String(budgetRes.value.midpoint);
      if (estimateHint) {
        const r = budgetRes.value;
        const range = (r.min != null && r.max != null) ? `PHP ${r.min.toLocaleString()} – ${r.max.toLocaleString()}` : "";
        estimateHint.textContent = `✦ AI estimate: ${range}${r.note ? ` · ${r.note}` : ""}`;
        estimateHint.className = "lp-hint ai";
      }
    }

    smartFillBtn.disabled = false;
    smartFillBtn.innerHTML = `<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill`;
  });

  // ── Status ──
  const status = document.createElement("div");
  status.className = "lp-status";

  // ── Footer ──
  const footer = document.createElement("div");
  footer.className = "lp-modal-footer";

  if (batch) {
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "lp-skip-btn";
    skipBtn.textContent = "Skip";
    skipBtn.addEventListener("click", () => { closeModal(host); batch.onNext(); });
    footer.appendChild(skipBtn);
  } else {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "lp-cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => closeModal(host));
    footer.appendChild(cancelBtn);
  }

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "lp-submit-btn";
  submitBtn.innerHTML = `
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    ${batch ? "Submit & Next" : "Submit to LocalPro"}
  `;
  footer.appendChild(submitBtn);

  // ── Submit handler ──
  submitBtn.addEventListener("click", async () => {
    const titleEl    = shadow.getElementById("lp-title")       as HTMLInputElement;
    const descEl     = shadow.getElementById("lp-description") as HTMLTextAreaElement;
    const categoryEl = shadow.getElementById("lp-category")    as HTMLSelectElement;
    const posterEl   = shadow.getElementById("lp-poster")      as HTMLInputElement;
    const locationEl = shadow.getElementById("lp-location")    as HTMLInputElement;
    const budgetEl   = shadow.getElementById("lp-budget")      as HTMLInputElement;
    const scheduleEl = shadow.getElementById("lp-schedule")    as HTMLInputElement;
    const urgencyEl  = shadow.getElementById("lp-urgency")     as HTMLSelectElement;

    const title        = titleEl.value.trim();
    const description  = descEl.value.trim();
    const categoryId   = categoryEl.value;
    const categoryName = categoryEl.selectedOptions[0]?.getAttribute("data-name") ?? "";
    const location     = locationEl.value.trim();
    const budget       = parseFloat(budgetEl.value);
    const scheduleDate = scheduleEl.value;
    const urgency      = urgencyEl.value as "standard" | "same_day" | "rush";

    if (!title)       { showStatus(status, "error", "Job title is required.");              titleEl.focus();    return; }
    if (!description) { showStatus(status, "error", "Description is required.");             descEl.focus();     return; }
    if (!categoryId)  { showStatus(status, "error", "Please select a category.");            categoryEl.focus(); return; }
    if (!location)    { showStatus(status, "error", "Location is required.");                locationEl.focus(); return; }
    if (!budget || budget <= 0 || isNaN(budget)) {
      showStatus(status, "error", "Budget must be greater than 0 (PHP).");
      budgetEl.focus(); return;
    }
    if (!scheduleDate) { showStatus(status, "error", "Schedule date is required."); scheduleEl.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    showStatus(status, "loading", "Sending to LocalPro…");

    const updatedJob: JobPost = {
      ...job, title, description,
      posted_by: posterEl.value.trim(),
      location, budget, scheduleDate,
      category: categoryName,
      categoryId,
    };

    const msg: ImportJobMessage = { type: "IMPORT_JOB", payload: updatedJob };

    try {
      const response = await chrome.runtime.sendMessage<ImportJobMessage, ImportJobResponse>(msg);

      if (response?.success) {
        const jobId  = response.job_id ?? "";
        const viewUrl = `${LP_URL}/jobs/${jobId}`;
        status.className = "lp-status success";
        status.innerHTML = `Imported! <a href="${escapeAttr(viewUrl)}" target="_blank" rel="noopener">View on LocalPro →</a>`;
        status.style.display = "block";
        submitBtn.textContent = "Submitted!";
        setTimeout(() => { closeModal(host); if (batch) batch.onNext(); }, 2000);
      } else {
        const errText = response?.error ?? "Import failed. Please try again.";
        const isAuthErr = errText.toLowerCase().includes("session") || errText.toLowerCase().includes("sign in");
        showStatus(status, "error", isAuthErr
          ? "Session expired. Please sign in again via the extension icon."
          : errText);
        submitBtn.disabled = false;
        submitBtn.innerHTML = batch ? "Submit & Next" : "Submit to LocalPro";
      }
    } catch (err) {
      showStatus(status, "error", `Extension error: ${String(err)}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = batch ? "Submit & Next" : "Submit to LocalPro";
    }
  });

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(status);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  return overlay;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showStatus(el: HTMLElement, type: "success" | "error" | "loading", msg: string): void {
  el.className = `lp-status ${type}`;
  el.textContent = msg;
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
