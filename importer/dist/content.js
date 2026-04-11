"use strict";(()=>{var Se={plumbing:["pipe","leak","drain","faucet","toilet","water","plumber","plumbing","sewage","tap","sink","shower"],cleaning:["clean","cleaning","cleaner","mop","sweep","vacuum","dust","laundry","housekeeping","surface","sanitize"],repair:["repair","fix","broken","maintenance","service","issue","damage","problem","install","replacement"],electrical:["electrical","wire","circuit","light","power","outlet","plug","breaker","electric","voltage","electrician"],hvac:["hvac","air conditioning","ac","heating","cool","furnace","thermostat","temperature","duct","ventilation"],landscaping:["lawn","garden","landscape","grass","mowing","tree","shrub","plant","yard","outdoor","trimming"],painting:["paint","painting","painter","color","wall","interior","exterior","brushing","coat","primer"],carpentry:["carpenter","wood","cabinet","door","frame","flooring","deck","joist","carpentry","woodwork","install"],roofing:["roof","roofing","shingle","leak","gutter","tile","structure","roofer","weatherproofing"],other:["service","work","help","need"]},Me={"same-day":["urgent","asap","today","emergency","immediately","right now","now","cannot wait","urgent","critical"],urgent:["urgent","soon","tomorrow","next day","quickly","hurry","rush","important"],high:["need soon","this week","priority","quick","fast","tight","deadline"],medium:["flexible","whenever","next week","can schedule","anytime","soon"],low:["no rush","when available","flexible","whenever","low priority","future"]},Te={plumbing:{min:50,max:500},cleaning:{min:30,max:200},repair:{min:40,max:300},electrical:{min:60,max:400},hvac:{min:100,max:1e3},landscaping:{min:50,max:500},painting:{min:100,max:800},carpentry:{min:80,max:600},roofing:{min:200,max:2e3},other:{min:50,max:500}};function Be(e){let o=[/(?:\$|budget[:\s]*)?(\d+)\s*-\s*(\d+)/gi,/(?:\$|budget[:\s]*)(\d+)\s*(?:per|\/|hour|hours)?/gi,/(?:costs?\s*(?:around|about|approx|~)?\s*)?(?:\$)?(\d+)/gi];for(let a of o){let n=e.matchAll(a);for(let s of n){if(s[2])return{min:parseInt(s[1],10),max:parseInt(s[2],10)};if(s[1]){let t=parseInt(s[1],10);return{min:Math.max(10,t-Math.floor(t*.2)),max:t+Math.floor(t*.3)}}}}return null}function Ie(e,o){let a=`${e} ${o}`.toLowerCase(),n={plumbing:0,cleaning:0,repair:0,electrical:0,hvac:0,landscaping:0,painting:0,carpentry:0,roofing:0,other:0};for(let[m,f]of Object.entries(Se))for(let y of f){let v=new RegExp(`\\b${y}\\b`,"gi"),L=a.match(v);L&&(n[m]+=L.length)}let s=Object.entries(n).reduce((m,f)=>m[1]>f[1]?m:f),[t,r]=s,l=a.split(/\s+/).length,u=Math.min(100,r/l*100);return{service_type:t,confidence:Math.round(u)/100}}function Ne(e,o){let a=`${e} ${o}`.toLowerCase(),n={"same-day":0,urgent:0,high:0,medium:0,low:0};for(let[t,r]of Object.entries(Me))for(let l of r){let u=new RegExp(`\\b${l}\\b`,"gi"),m=a.match(u);m&&(n[t]+=m.length)}let s=["same-day","urgent","high","medium","low"];for(let t of s)if(n[t]>0)return{urgency:t,confidence:Math.min(1,n[t]/10)};return{urgency:"medium",confidence:.5}}function ne(e){let{service_type:o,confidence:a}=Ie(e.title,e.description),{urgency:n,confidence:s}=Ne(e.title,e.description),r=Be(e.description)||Te[o],l=(a+s)/2;return{...e,service_type:o,urgency:n,estimated_budget:{min:r.min,max:r.max,currency:e.estimated_budget?.currency||"USD"},match_confidence:l,classification_analysis:`Classified as ${o} (${Math.round(a*100)}% confidence) with ${n} urgency. Estimated budget: $${r.min}-${r.max}.`}}var de="localpro-scan-host",pe="localpro-panel-host",ue="localpro-modal-host",He="https://www.localpro.asia",oe=`
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  /* \u2500\u2500 Floating scan buttons \u2500\u2500 */
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

  /* \u2500\u2500 Selection panel (side drawer) \u2500\u2500 */
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

  /* \u2500\u2500 Modal overlay \u2500\u2500 */
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

  /* \u2500\u2500 Per-post inline import button \u2500\u2500 */
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
`;function fe(e,o){document.getElementById(de)?.remove();let a=document.createElement("div");a.id=de,document.body.appendChild(a);let n=a.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=oe,n.appendChild(s);let t=document.createElement("div");t.className="lp-fab-wrap";let r=(f,y)=>{let v=document.createElement("button");return v.className=y?"lp-fab secondary":"lp-fab",v.innerHTML=y?`<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> ${f}`:`<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> ${f}`,v},l=r("Scan Jobs on This Page",!1),u=r("Scroll & Scan",!0),m=(f,y)=>v=>{l.disabled=v,u.disabled=v,f.innerHTML=v?`<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.4-5.4M20 15a9 9 0 01-14.4 5.4"/></svg> ${y?"Scrolling\u2026":"Scanning\u2026"}`:y?'<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> Scroll & Scan':'<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> Scan Jobs on This Page'};l.addEventListener("click",()=>e(m(l,!1))),u.addEventListener("click",()=>o(m(u,!0))),t.appendChild(l),t.appendChild(u),n.appendChild(t)}var me="data-lp-injected",$e=`
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
`,Q='<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>';function ge(e,o,a){if(e.hasAttribute(me))return;e.setAttribute(me,"1");let n=document.createElement("div"),s=n.attachShadow({mode:"open"}),t=document.createElement("style");t.textContent=$e;let r=document.createElement("div");r.className="lp-post-btn-wrap";let l=document.createElement("button");l.className="lp-post-btn"+(o?" done":""),l.innerHTML=o?`${Q} Already imported`:`${Q} Import to LocalPro`;let u=()=>{l.className="lp-post-btn done",l.innerHTML=`${Q} Imported!`};o||l.addEventListener("click",m=>{m.stopPropagation(),m.preventDefault(),!(l.classList.contains("importing")||l.classList.contains("done"))&&(l.className="lp-post-btn importing",l.innerHTML=`${Q} Opening\u2026`,a(u))}),r.appendChild(l),s.appendChild(t),s.appendChild(r),e.appendChild(n)}function be(e,o,a){document.getElementById(pe)?.remove();let n=document.createElement("div");n.id=pe,document.body.appendChild(n);let s=n.attachShadow({mode:"open"}),t=document.createElement("style");t.textContent=oe,s.appendChild(t);let r=new Set(e.map((d,g)=>g)),l={},u="",m=document.createElement("div");m.className="lp-panel-overlay";let f=document.createElement("div");f.className="lp-panel";let y=document.createElement("div");y.className="lp-panel-header";let v=document.createElement("div");v.className="lp-panel-title",v.innerHTML=`
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
    Jobs Found <span class="lp-panel-count">${e.length}</span>
  `;let L=document.createElement("button");L.className="lp-close-btn",L.innerHTML='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',L.addEventListener("click",()=>n.remove()),y.appendChild(v),y.appendChild(L);let D=document.createElement("div");D.className="lp-search-wrap";let N=document.createElement("input");N.type="text",N.className="lp-search-input",N.placeholder="Filter posts\u2026",N.addEventListener("input",()=>{u=N.value.toLowerCase();let d=0;h.forEach((g,i)=>{let p=e[i],c=!u||p.title.toLowerCase().includes(u)||p.description.toLowerCase().includes(u)||(p.posted_by??"").toLowerCase().includes(u);g.classList.toggle("hidden",!c),c&&d++}),k.classList.toggle("visible",d===0),I()}),D.appendChild(N);let V=document.createElement("div");V.className="lp-bulk-section";let C=document.createElement("button");C.type="button",C.className="lp-bulk-toggle",C.innerHTML=`
    Apply Defaults to All
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  `;let S=document.createElement("div");S.className="lp-bulk-body";let Z=new Date(Date.now()+864e5).toISOString().split("T")[0],ee=new Date().toISOString().split("T")[0];S.innerHTML=`
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
        <input class="lp-bulk-input" id="lp-bulk-date" type="date" value="${Z}" min="${ee}" />
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
  `,C.addEventListener("click",()=>{let d=S.classList.toggle("open");C.classList.toggle("open",d)}),S.querySelector("#lp-bulk-apply").addEventListener("click",()=>{let d=S.querySelector("#lp-bulk-location"),g=S.querySelector("#lp-bulk-budget"),i=S.querySelector("#lp-bulk-date"),p=S.querySelector("#lp-bulk-urgency");l={location:d.value.trim()||void 0,budget:parseFloat(g.value)||void 0,scheduleDate:i.value||void 0,urgency:p.value||void 0},S.classList.remove("open"),C.classList.remove("open"),C.textContent="\u2713 Defaults set \u2014 Apply Defaults to All",setTimeout(()=>{C.innerHTML='Apply Defaults to All <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>'},2e3)}),V.appendChild(C),V.appendChild(S);let J=document.createElement("div");J.className="lp-panel-toolbar";let F=document.createElement("label");F.className="lp-select-all-label";let H=document.createElement("input");H.type="checkbox",H.checked=!0,F.appendChild(H),F.appendChild(document.createTextNode("Select All"));let G=document.createElement("div");G.className="lp-toolbar-right";let q=document.createElement("span");q.className="lp-selected-count";let $=document.createElement("button");$.className="lp-csv-btn",$.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV',$.title="Export all scraped posts to CSV",$.addEventListener("click",()=>Ae(e)),G.appendChild(q),G.appendChild($),J.appendChild(F),J.appendChild(G);let z=document.createElement("div");z.className="lp-panel-list";let k=document.createElement("div");k.className="lp-no-results",k.textContent="No posts match your filter.";let A=[],h=[],I=()=>{let d=e.filter((i,p)=>r.has(p)&&!h[p].classList.contains("hidden")).length,g=e.filter((i,p)=>!h[p].classList.contains("hidden")).length;q.textContent=`${r.size} of ${e.length} selected`,x.disabled=r.size===0,x.textContent=r.size===0?"Select posts to import":`Import Selected (${r.size})`,H.checked=d>0&&d===g,H.indeterminate=d>0&&d<g};e.forEach((d,g)=>{let i=o.has(d.source_url),p=document.createElement("div");p.className="lp-job-item selected",h.push(p);let c=document.createElement("input");c.type="checkbox",c.className="lp-job-checkbox",c.checked=!0,A.push(c);let M=document.createElement("div");M.className="lp-job-info";let T=d.title||d.description.slice(0,70)+"\u2026";M.innerHTML=`
      <div class="lp-job-title">${B(T)}</div>
      <div class="lp-job-meta">
        <span class="lp-source-chip ${d.source}">${d.source}</span>
        ${i?'<span class="lp-dup-badge">Already imported</span>':""}
        ${d.posted_by?`<span>${B(d.posted_by)}</span>`:""}
        ${d.location?`<span>\u{1F4CD} ${B(d.location)}</span>`:""}
      </div>
    `;let b=E=>{c.checked=E,p.classList.toggle("selected",E),E?r.add(g):r.delete(g),I()};c.addEventListener("change",()=>b(c.checked)),p.addEventListener("click",E=>{E.target!==c&&b(!c.checked)}),p.appendChild(c),p.appendChild(M),z.appendChild(p)}),z.appendChild(k),H.addEventListener("change",()=>{let d=H.checked;e.forEach((g,i)=>{h[i].classList.contains("hidden")||(A[i].checked=d,h[i].classList.toggle("selected",d),d?r.add(i):r.delete(i))}),H.indeterminate=!1,I()});let w=document.createElement("div");w.className="lp-panel-footer";let x=document.createElement("button");x.className="lp-import-btn",x.addEventListener("click",()=>{let d=e.filter((g,i)=>r.has(i));n.remove(),a(d,l)}),w.appendChild(x),f.appendChild(y),f.appendChild(D),f.appendChild(V),f.appendChild(J),f.appendChild(z),f.appendChild(w),m.appendChild(f),s.appendChild(m),m.addEventListener("click",d=>{d.target===m&&n.remove()}),I()}function Ae(e){let o=["Title","Description","Source","Posted By","Location","Budget","Timestamp","Source URL"],a=e.map(l=>[l.title,l.description.replace(/\n/g," "),l.source,l.posted_by,l.location??"",l.budget!=null?String(l.budget):"",l.timestamp,l.source_url].map(Pe).join(",")),n=[o.join(","),...a].join(`\r
`),s=new Blob([n],{type:"text/csv;charset=utf-8;"}),t=URL.createObjectURL(s),r=document.createElement("a");r.href=t,r.download=`localpro-jobs-${new Date().toISOString().slice(0,10)}.csv`,r.click(),URL.revokeObjectURL(t)}function Pe(e){let o=e.replace(/"/g,'""');return/[",\n]/.test(o)?`"${o}"`:o}function le(e,o,a,n,s){document.getElementById(ue)?.remove();let t=document.createElement("div");t.id=ue,document.body.appendChild(t);let r=t.attachShadow({mode:"open"}),l=document.createElement("style");l.textContent=oe,r.appendChild(l);let u=_e(e,o,a??null,n??null,s??{},r,t);r.appendChild(u),u.addEventListener("click",f=>{f.target===u&&(j(t),n&&n.onNext())});let m=f=>{f.key==="Escape"&&(j(t),document.removeEventListener("keydown",m),n&&n.onNext())};document.addEventListener("keydown",m)}function j(e){e.remove()}function _e(e,o,a,n,s,t,r){let l=document.createElement("div");l.className="lp-overlay";let u=document.createElement("div");u.className="lp-modal",u.setAttribute("role","dialog"),u.setAttribute("aria-modal","true");let m=document.createElement("div");m.className="lp-modal-header";let f=document.createElement("div");f.className="lp-modal-title",f.innerHTML=`
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
    </svg>
    Import Job
    <span class="lp-source-chip ${e.source}">${e.source}</span>
  `;let y=document.createElement("div");if(y.className="lp-modal-header-right",n){let i=document.createElement("span");i.className="lp-modal-progress",i.textContent=`${n.current} / ${n.total}`,y.appendChild(i)}let v=document.createElement("button");v.className="lp-close-btn",v.innerHTML='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',v.addEventListener("click",()=>{j(r),n&&n.onNext()}),y.appendChild(v),m.appendChild(f),m.appendChild(y);let L=document.createElement("div");L.className="lp-modal-body";let D=document.createElement("form");D.noValidate=!0;let N=a??e.category??"",C=(i=>o.find(p=>p.name.toLowerCase()===i.toLowerCase()))(N),S=o.length?['<option value="">-- Select category --</option>',...o.map(i=>{let p=C?._id===i._id?"selected":"";return`<option value="${U(i._id)}" data-name="${U(i.name)}" ${p}>${B(i.icon??"")} ${B(i.name)}</option>`})].join(""):'<option value="">Loading categories\u2026</option>',Z=a?`<div class="lp-hint ai">\u2726 AI: "${B(a)}"</div>`:N&&C?`<div class="lp-hint">Auto: "${B(N)}"</div>`:"",ee=new Date().toISOString().split("T")[0],J=new Date(Date.now()+864e5).toISOString().split("T")[0],F=s.location??e.location??"",H=s.budget??e.budget??"",G=s.scheduleDate??e.scheduleDate??J,q=s.urgency??"standard";D.innerHTML=`
    <div class="lp-field">
      <label class="lp-label" for="lp-title">Job Title <span class="lp-required">*</span></label>
      <input class="lp-input" id="lp-title" type="text" value="${U(e.title)}" required maxlength="150" />
    </div>
    <div class="lp-field">
      <label class="lp-label" for="lp-description">Description <span class="lp-required">*</span></label>
      <textarea class="lp-textarea" id="lp-description" maxlength="2000" required>${B(e.description)}</textarea>
      <button type="button" class="lp-ai-clean-btn" id="lp-clean-btn">\u2726 Clean with AI</button>
      <div class="lp-hint" id="lp-clean-hint"></div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-category">Category <span class="lp-required">*</span></label>
        <select class="lp-select" id="lp-category" ${o.length===0?"disabled":""}>${S}</select>
        ${Z}
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-poster">Posted By</label>
        <input class="lp-input" id="lp-poster" type="text" value="${U(e.posted_by)}" maxlength="100" />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-location">Location <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-location" type="text" value="${U(F)}" maxlength="100" placeholder="e.g. Makati City" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${H}" min="1" step="1" placeholder="e.g. 1500" required />
        <button type="button" class="lp-estimate-btn" id="lp-estimate-btn">\u2726 Estimate with AI</button>
        <div class="lp-hint" id="lp-estimate-hint"></div>
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${U(G)}" min="${ee}" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" ${q==="standard"?"selected":""}>Standard</option>
          <option value="same_day" ${q==="same_day"?"selected":""}>Same Day</option>
          <option value="rush"     ${q==="rush"?"selected":""}>Rush</option>
        </select>
      </div>
    </div>
  `;let $=document.createElement("div");$.className="lp-ai-bar";let z=document.createElement("div");z.className="lp-ai-bar-label",z.innerHTML="\u2726 AI Smart Fill <span>\u2014 clean description + category + budget in one click</span>";let k=document.createElement("button");if(k.type="button",k.className="lp-smart-fill-btn",k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill',$.appendChild(z),$.appendChild(k),L.insertBefore($,D),L.appendChild(D),e.phone||e.email){let i=document.createElement("div");i.className="lp-contact-info";let p=document.createElement("span");if(p.className="lp-contact-label",p.textContent="Contact",i.appendChild(p),e.phone){let c=document.createElement("span");c.className="lp-contact-chip",c.innerHTML=`\u{1F4DE} ${B(e.phone)}`,c.title="Click to copy",c.style.cursor="pointer",c.addEventListener("click",()=>{navigator.clipboard.writeText(e.phone),c.innerHTML="\u2713 Copied!",setTimeout(()=>{c.innerHTML=`\u{1F4DE} ${B(e.phone)}`},1500)}),i.appendChild(c)}if(e.email){let c=document.createElement("span");c.className="lp-contact-chip",c.innerHTML=`\u2709\uFE0F ${B(e.email)}`,c.title="Click to copy",c.style.cursor="pointer",c.addEventListener("click",()=>{navigator.clipboard.writeText(e.email),c.innerHTML="\u2713 Copied!",setTimeout(()=>{c.innerHTML=`\u2709\uFE0F ${B(e.email)}`},1500)}),i.appendChild(c)}L.appendChild(i)}let A=t.getElementById("lp-estimate-btn"),h=t.getElementById("lp-estimate-hint");A&&h&&A.addEventListener("click",async()=>{let i=t.getElementById("lp-category"),p=t.getElementById("lp-title"),c=t.getElementById("lp-budget"),M=i.selectedOptions[0]?.getAttribute("data-name")??"";if(!M){h.textContent="Select a category first.",h.className="lp-hint";return}A.disabled=!0,A.textContent="Estimating\u2026",h.textContent="";try{let T={type:"ESTIMATE_BUDGET",title:p.value.trim()||e.title,category:M,description:e.description.slice(0,300)},b=await chrome.runtime.sendMessage(T);if(b?.success&&b.midpoint){c.value=String(b.midpoint);let E=b.min!=null&&b.max!=null?`PHP ${b.min.toLocaleString()} \u2013 ${b.max.toLocaleString()}`:"";h.textContent=`\u2726 AI estimate: ${E}${b.note?` \xB7 ${b.note}`:""}`,h.className="lp-hint ai"}else h.textContent=b?.error??"Estimate unavailable.",h.className="lp-hint"}catch{h.textContent="Could not fetch estimate.",h.className="lp-hint"}finally{A.disabled=!1,A.textContent="\u2726 Estimate with AI"}});let I=t.getElementById("lp-clean-btn"),w=t.getElementById("lp-clean-hint");I&&w&&I.addEventListener("click",async()=>{let i=t.getElementById("lp-category"),p=t.getElementById("lp-title"),c=t.getElementById("lp-description"),M=i.selectedOptions[0]?.getAttribute("data-name")??"";I.disabled=!0,I.textContent="Generating\u2026",w.textContent="";try{let T={type:"GENERATE_DESCRIPTION",title:p.value.trim()||e.title,category:M||void 0},b=await chrome.runtime.sendMessage(T);b?.success&&b.description?(c.value=b.description,w.textContent="\u2726 AI-generated \u2014 review before submitting",w.className="lp-hint ai"):(w.textContent=b?.error??"Could not generate description.",w.className="lp-hint")}catch{w.textContent="Could not reach AI service.",w.className="lp-hint"}finally{I.disabled=!1,I.textContent="\u2726 Clean with AI"}}),k.addEventListener("click",async()=>{let i=t.getElementById("lp-category"),p=t.getElementById("lp-title"),c=t.getElementById("lp-description"),M=t.getElementById("lp-budget"),T=i.selectedOptions[0]?.getAttribute("data-name")??"";if(!T){k.textContent="Select a category first",setTimeout(()=>{k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill'},2e3);return}k.disabled=!0,k.textContent="Working\u2026";let b=p.value.trim()||e.title,[E,O]=await Promise.allSettled([chrome.runtime.sendMessage({type:"GENERATE_DESCRIPTION",title:b,category:T}),chrome.runtime.sendMessage({type:"ESTIMATE_BUDGET",title:b,category:T,description:e.description.slice(0,300)})]);if(E.status==="fulfilled"&&E.value?.success&&E.value.description&&(c.value=E.value.description,w&&(w.textContent="\u2726 AI-generated \u2014 review before submitting",w.className="lp-hint ai")),O.status==="fulfilled"&&O.value?.success&&O.value.midpoint&&(M.value=String(O.value.midpoint),h)){let P=O.value,K=P.min!=null&&P.max!=null?`PHP ${P.min.toLocaleString()} \u2013 ${P.max.toLocaleString()}`:"";h.textContent=`\u2726 AI estimate: ${K}${P.note?` \xB7 ${P.note}`:""}`,h.className="lp-hint ai"}k.disabled=!1,k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill'});let x=document.createElement("div");x.className="lp-status";let d=document.createElement("div");if(d.className="lp-modal-footer",n){let i=document.createElement("button");i.type="button",i.className="lp-skip-btn",i.textContent="Skip",i.addEventListener("click",()=>{j(r),n.onNext()}),d.appendChild(i)}else{let i=document.createElement("button");i.type="button",i.className="lp-cancel-btn",i.textContent="Cancel",i.addEventListener("click",()=>j(r)),d.appendChild(i)}let g=document.createElement("button");return g.type="button",g.className="lp-submit-btn",g.innerHTML=`
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    ${n?"Submit & Next":"Submit to LocalPro"}
  `,d.appendChild(g),g.addEventListener("click",async()=>{let i=t.getElementById("lp-title"),p=t.getElementById("lp-description"),c=t.getElementById("lp-category"),M=t.getElementById("lp-poster"),T=t.getElementById("lp-location"),b=t.getElementById("lp-budget"),E=t.getElementById("lp-schedule"),O=t.getElementById("lp-urgency"),P=i.value.trim(),K=p.value.trim(),re=c.value,Le=c.selectedOptions[0]?.getAttribute("data-name")??"",se=T.value.trim(),X=parseFloat(b.value),ce=E.value,Fe=O.value;if(!P){_(x,"error","Job title is required."),i.focus();return}if(!K){_(x,"error","Description is required."),p.focus();return}if(!re){_(x,"error","Please select a category."),c.focus();return}if(!se){_(x,"error","Location is required."),T.focus();return}if(!X||X<=0||isNaN(X)){_(x,"error","Budget must be greater than 0 (PHP)."),b.focus();return}if(!ce){_(x,"error","Schedule date is required."),E.focus();return}g.disabled=!0,g.textContent="Submitting\u2026",_(x,"loading","Sending to LocalPro\u2026");let Ce={type:"IMPORT_JOB",payload:{...e,title:P,description:K,posted_by:M.value.trim(),location:se,budget:X,scheduleDate:ce,category:Le,categoryId:re}};try{let Y=await chrome.runtime.sendMessage(Ce);if(Y?.success){let W=Y.job_id??"",te=`${He}/jobs/${W}`;x.className="lp-status success",x.innerHTML=`Imported! <a href="${U(te)}" target="_blank" rel="noopener">View on LocalPro \u2192</a>`,x.style.display="block",g.textContent="Submitted!",setTimeout(()=>{j(r),n&&n.onNext()},2e3)}else{let W=Y?.error??"Import failed. Please try again.",te=W.toLowerCase().includes("session")||W.toLowerCase().includes("sign in");_(x,"error",te?"Session expired. Please sign in again via the extension icon.":W),g.disabled=!1,g.innerHTML=n?"Submit & Next":"Submit to LocalPro"}}catch(Y){_(x,"error",`Extension error: ${String(Y)}`),g.disabled=!1,g.innerHTML=n?"Submit & Next":"Submit to LocalPro"}}),u.appendChild(m),u.appendChild(L),u.appendChild(x),u.appendChild(d),l.appendChild(u),l}function _(e,o,a){e.className=`lp-status ${o}`,e.textContent=a}function U(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function B(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function De(){let e=window.location.hostname;if(e.includes("facebook.com")){let o=window.location.pathname;return o.includes("/marketplace")||o.includes("/marketplace/")?"marketplace":"facebook"}return e.includes("messenger.com")?"messenger":e.includes("google.com")||e.includes("maps.google.com")||e.includes("business.google.com")?"google-business":null}var R=De();if(!R)throw new Error("[LocalPro] Unsupported platform \u2014 content script exiting.");function ve(){switch(R){case"marketplace":return Array.from(document.querySelectorAll('[role="article"], [data-testid*="listing"], [class*="listing"], .x1lliihq[role="article"], [data-pagelet*="FeedUnit"]')).filter(e=>e.parentElement?.closest('[role="article"]')===null);case"facebook":return Array.from(document.querySelectorAll('[role="article"]')).filter(e=>e.parentElement?.closest('[role="article"]')===null);case"messenger":return Array.from(document.querySelectorAll('[data-convid], .x6bnwqk, [class*="message"], [class*="inquiry"]'));case"google-business":return Array.from(document.querySelectorAll('[data-review-id], [class*="review"], [class*="inquiry"], [role="option"]'));default:return[]}}async function ye(){try{let e={type:"GET_LEAD_HISTORY"},o=await chrome.runtime.sendMessage(e);if(o?.success)return new Set(o.history.map(a=>a.source_url))}catch{}return new Set}function ze(){return R==="messenger"?document.querySelector("[dir='ltr']")??null:R==="google-business"?document.querySelector(".scrollable")??null:null}async function Re(){let e=ze(),o=8,a=window.innerHeight*.85,n=700;for(let s=0;s<o;s++)e&&e.scrollBy({top:a,behavior:"smooth"}),window.scrollBy({top:a,behavior:"smooth"}),await new Promise(t=>setTimeout(t,n));await new Promise(s=>setTimeout(s,800))}var ke=new Set;function we(e,o){let a=e.querySelector("h1, h2, h3, [class*='title']")?.textContent?.trim()??"Service Request",n=e.textContent?.substring(0,500).trim()??"",s=e.querySelector("a")?.href??"",t=e.querySelector("[class*='author'], [class*='poster']")?.textContent?.trim()??"Unknown",l=e.querySelector("[class*='location'], [class*='address']")?.textContent?.trim()??"Unknown";return{title:a,description:n,source:o,source_url:s||window.location.href,posted_by:t,timestamp:new Date().toISOString(),location:l}}async function qe(e,o){let a=we(e,R),n=ne(a);le(n,[],void 0,void 0,{}),o()}function Oe(e){switch(R){case"marketplace":case"facebook":return e.parentElement?.closest('[role="article"]')===null;case"messenger":return!e.closest("[data-convid]")||e.hasAttribute("data-convid");case"google-business":return!e.closest('[class*="review"], [class*="inquiry"]');default:return!0}}function Ue(e){if(!Oe(e)||(e.textContent?.trim()??"").length<20||e.hasAttribute("data-lp-injected"))return;let a=e.querySelector("a[href]"),n=a?ke.has(a.href):!1;ge(e,n,s=>{qe(e,s)})}var ie=null;function he(){ie&&clearTimeout(ie),ie=setTimeout(()=>{ve().forEach(Ue)},400)}function Je(){he(),new MutationObserver(()=>he()).observe(document.body,{childList:!0,subtree:!0})}async function ae(e,o=!1){e(!0),await new Promise(l=>setTimeout(l,50)),o&&await Re();let a=ve(),t=[...new Set(a)].filter(l=>l.textContent&&l.textContent.trim().length>20).map(l=>we(l,R)).map(l=>ne(l)),[r]=await Promise.all([ye()]);if(e(!1),t.length===0){alert("[LocalPro] No service requests found on this page. Try scrolling to load more content first, or use 'Scroll & Scan'.");return}be(t,r,(l,u)=>{Ee(l,0,u)})}async function Ee(e,o,a){if(o>=e.length)return;let n=e[o],s=e.length-o;le(n,[],void 0,s>1?{current:o+1,total:e.length,onNext:()=>void Ee(e,o+1,a)}:void 0,{})}chrome.runtime.onMessage.addListener((e,o,a)=>{if(o.id===chrome.runtime.id){if(e.type==="PING")return a({ok:!0}),!0;if(e.type==="SCAN_TAB")return ae(()=>{},e.autoScroll??!1),a({ok:!0}),!0}});async function xe(){await ye().then(e=>{ke=e}),Je(),fe(e=>void ae(e,!1),e=>void ae(e,!0)),console.log(`[LocalPro] Lead Engine content script active on ${R}`)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{xe()}):xe();})();
