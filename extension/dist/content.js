"use strict";(()=>{var ke=/(\+?\d[\d\s\-().]{7,15}\d)/g,oe=/(?:PHP|AED|USD|\$|₱|€|£)\s*[\d,]+|[\d,]+\s*(?:PHP|AED|USD)/gi,Ee=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,Ce={Plumbing:["plumber","plumbing","pipe","drain","faucet","toilet","water leak"],Electrical:["electrician","electrical","wiring","circuit","panel","outlet","voltage"],Carpentry:["carpenter","carpentry","wood","furniture","cabinet","flooring"],Painting:["painter","painting","paint","coating","wallpaper","finishing"],Cleaning:["cleaner","cleaning","housekeeping","janitorial","sanitation","maid"],Driving:["driver","driving","delivery","courier","transport","logistics","grab"],HVAC:["hvac","aircon","air conditioning","airconditioning","refrigeration","cooling","heating"],Welding:["welder","welding","fabrication","steel","metal"],Construction:["mason","masonry","construction","laborer","concrete","builder","scaffolding"],Mechanical:["mechanic","mechanical","engine","motor","automotive","vehicle","repair"],IT:["developer","programmer","software","coding","web","app","it support","network"],Design:["designer","graphic","ui","ux","creative","illustrator","photoshop"],Healthcare:["nurse","caregiver","medical","healthcare","doctor","therapist"],Education:["teacher","tutor","instructor","educator","trainer","teaching"],Security:["security guard","security officer","bodyguard","cctv","patrol"]};function we(e){let n=e.toLowerCase(),t,o=0;for(let[i,r]of Object.entries(Ce)){let l=r.filter(c=>n.includes(c)).length;l>o&&(o=l,t=i)}return o>0?t:void 0}function Se(e){let n=e.match(ke),t=e.match(oe),o=e.match(Ee);return{hasPhone:n!==null,hasCurrency:t!==null,hasEmail:o!==null,phone:n?.[0]?.trim(),email:o?.[0]?.trim()}}function Le(e,n){let t=e.cloneNode(!0);return n==="facebook"?(t.querySelectorAll('[role="article"]').forEach(o=>o.remove()),["form",'[role="form"]',"[data-commentid]",'[data-testid*="comment"]','[data-testid*="Comment"]','[data-testid*="ufi"]','[data-testid*="UFI"]','[aria-label*="eaction"]','[aria-label*="omment"]','[aria-label*="hare"]'].forEach(o=>t.querySelectorAll(o).forEach(i=>i.remove()))):n==="linkedin"&&[".comments-comments-list",".comments-comment-list",".comments-comment-item",".comments-comment-texteditor",".comments-reply-compose-box",".social-details-social-counts",".social-details-social-activity",".feed-shared-social-action-bar",".feed-shared-footer",".social-actions-bar",".update-components-footer",".update-components-social-activity",'[class*="comment-"]','[class*="-comment"]'].forEach(o=>t.querySelectorAll(o).forEach(i=>i.remove())),t.textContent?.replace(/\s+/g," ").trim()??""}function de(e,n){let t=Le(e,n),{hasCurrency:o,phone:i,email:r}=Se(t),l="",c="",u="",b="",g=window.location.href;n==="facebook"?(l=Me(e,t),c=Te(e,t),u=Ie(e),b=Be(e)):n==="linkedin"?(l=Ne(e,t),c=Pe(e,t),u=He(e),b=qe(e)):n==="jobstreet"?(l=_e(e,t),c=De(e,t),u=$e(e),b=ce(e)):(l=ze(e,t),c=Re(e,t),u=Je(e),b=ce(e)),l||(l=t.split(/[\n.!?]/).map(E=>E.trim()).filter(E=>E.length>10&&E.length<120)[0]??"Job Opportunity");let v=o?Oe(t):void 0,y=Ge(t),S=we(t);return{title:F(l.slice(0,150)),description:F(c.slice(0,2e3)),source:n,source_url:Ae(e,n)||g,posted_by:F(u.slice(0,100)),timestamp:b||new Date().toISOString(),location:y?F(y):void 0,budget:v,category:S,phone:i?F(i):void 0,email:r?F(r):void 0}}function Me(e,n){let t=Array.from(e.querySelectorAll("strong"));for(let i of t){if(i.closest('[role="article"]')!==e)continue;let r=i.textContent?.trim()??"";if(r.length>3)return r}for(let i of["h1","h2","h3"]){let r=e.querySelector(i);if(r&&r.closest('[role="article"]')===e&&r.textContent?.trim())return r.textContent.trim()}let o=n.match(/(?:hiring|looking for|need(?:ed)?|vacancy|open(?:ing)?)[^.!?\n]{5,80}/i);return o?o[0].trim():""}function Te(e,n){let t=e.querySelector('[data-ad-preview="message"]')??e.querySelector('[data-testid="post_message"]')??e.querySelector('[data-testid="story-message"]');if(t?.textContent?.trim())return t.textContent.trim();let o=Array.from(e.querySelectorAll('[dir="auto"]'));for(let i of o){let r=i.closest('[role="article"]');if(r&&r!==e)continue;let l=i.textContent?.trim()??"";if(l.length>30)return l}return n}function Ie(e){return(e.querySelector('a[role="link"][tabindex="0"] strong')??e.querySelector('[data-testid="story-subtitle"] a')??e.querySelector("h3 a")??e.querySelector("h4 a"))?.textContent?.trim()??""}function Be(e){let n=e.querySelector("abbr[data-utime]");if(n){let o=n.getAttribute("data-utime");if(o)return new Date(parseInt(o)*1e3).toISOString()}let t=e.querySelector("time");if(t){let o=t.getAttribute("datetime");if(o)return new Date(o).toISOString();if(t.textContent)return t.textContent.trim()}return new Date().toISOString()}function Ae(e,n){if(n==="facebook"){let t=e.querySelectorAll("a[href]");for(let o of t){let i=o.href;if(i.includes("/posts/")||i.includes("story_fbid")||i.includes("permalink"))return i}}else if(n==="linkedin"){let t=e.querySelectorAll("a[href]");for(let o of t){let i=o.href;if(i.includes("/feed/update/")||i.includes("/posts/")||i.includes("ugcPost"))return i}}else if(n==="jobstreet"){let t=e.querySelector("a[href*='/job/'], a[data-automation='job-list-item-link-overlay']");if(t?.href)return t.href;let o=e.getAttribute("data-job-id")??e.getAttribute("data-automation-id");if(o)return`https://www.jobstreet.com.ph/job/${o}`}else if(n==="indeed"){let t=e.querySelector("a[href*='/rc/clk'], a[href*='/viewjob'], h2 a");if(t?.href)return t.href;let o=e.getAttribute("data-jk");if(o)return`https://ph.indeed.com/viewjob?jk=${o}`}return window.location.href}function Ne(e,n){let t=e.querySelector(".feed-shared-text strong")??e.querySelector(".update-components-text strong");if(t?.textContent)return t.textContent.trim();let o=e.querySelector(".job-card-container__link, .jobs-unified-top-card__job-title");if(o?.textContent)return o.textContent.trim();let i=n.match(/(?:hiring|looking for|need)[^.!?\n]{5,80}/i);return i?i[0].trim():""}function Pe(e,n){let t=e.querySelector(".feed-shared-text")??e.querySelector(".update-components-text")??e.querySelector(".feed-shared-update-v2__description")??e.querySelector("[data-test-id='main-feed-activity-card__commentary']");return t?.textContent?t.textContent.trim():n}function He(e){return(e.querySelector(".update-components-actor__name span[aria-hidden='true']")??e.querySelector(".feed-shared-actor__name")??e.querySelector(".update-components-actor__name"))?.textContent?.trim()??""}function qe(e){let n=e.querySelector("time");if(n){let o=n.getAttribute("datetime");if(o)return new Date(o).toISOString()}let t=e.querySelector(".feed-shared-actor__sub-description, .update-components-actor__sub-description");return t?.textContent?t.textContent.trim():new Date().toISOString()}function _e(e,n){let t=e.querySelector('[data-automation="job-card-title"] span')??e.querySelector('[data-automation="job-card-title"]')??e.querySelector("h1, h2, h3");return t?.textContent?t.textContent.trim():n.split(`
`).map(i=>i.trim()).filter(i=>i.length>5&&i.length<120)[0]??"Job Opening"}function De(e,n){let t=e.querySelector('[data-automation="job-card-teaser"]')??e.querySelector('[class*="teaser"]')??e.querySelector('[class*="description"]');return t?.textContent?t.textContent.trim():n.trim()}function $e(e){return(e.querySelector('[data-automation="job-card-company"]')??e.querySelector('[class*="company"]')??e.querySelector('[class*="advertiser"]'))?.textContent?.trim()??""}function ze(e,n){let t=e.querySelector("h2.jobTitle span[title]")??e.querySelector("h2.jobTitle span:not([class])")??e.querySelector(".jobTitle a span")??e.querySelector("h2, h3");return t?.textContent?t.textContent.trim():n.split(`
`).map(i=>i.trim()).filter(i=>i.length>5&&i.length<120)[0]??"Job Opening"}function Re(e,n){let t=e.querySelector(".job-snippet")??e.querySelector('[class*="snippet"]')??e.querySelector('[class*="description"]');return t?.textContent?t.textContent.trim():n.trim()}function Je(e){return(e.querySelector(".companyName")??e.querySelector('[data-testid="company-name"]')??e.querySelector('[class*="company"]'))?.textContent?.trim()??""}function ce(e){let n=e.querySelector("time");if(n){let t=n.getAttribute("datetime");if(t)return new Date(t).toISOString()}return new Date().toISOString()}function Oe(e){oe.lastIndex=0;let n=oe.exec(e);if(!n)return;let t=n[0].replace(/[^0-9]/g,""),o=parseInt(t,10);return isNaN(o)?void 0:o}var je=[/\blocation[:\s]+([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,/\b(?:based in|located in|work in|working in|site[:\s]+)\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,/\b(?:in|at)\s+([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)(?=\s*[\.\,\n])/,/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(?:Metro\s)?(?:Manila|Cebu|Davao|Quezon City|Makati|Pasig|Taguig|Mandaluyong|Parañaque|Las Piñas|Muntinlupa|Caloocan|Marikina|Pasay|Dubai|Abu Dhabi|Sharjah|Singapore|Riyadh|Qatar)/];function Ge(e){for(let n of je){let t=e.match(n);if(t?.[1])return t[1].trim()}}function F(e){return e.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim()}var pe="localpro-scan-host",ue="localpro-panel-host",me="localpro-modal-host",Fe="https://www.localpro.asia",ie=`
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
`;function fe(e,n){document.getElementById(pe)?.remove();let t=document.createElement("div");t.id=pe,document.body.appendChild(t);let o=t.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=ie,o.appendChild(i);let r=document.createElement("div");r.className="lp-fab-wrap";let l=(g,v)=>{let y=document.createElement("button");return y.className=v?"lp-fab secondary":"lp-fab",y.innerHTML=v?`<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> ${g}`:`<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> ${g}`,y},c=l("Scan Jobs on This Page",!1),u=l("Scroll & Scan",!0),b=(g,v)=>y=>{c.disabled=y,u.disabled=y,g.innerHTML=y?`<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.4-5.4M20 15a9 9 0 01-14.4 5.4"/></svg> ${v?"Scrolling\u2026":"Scanning\u2026"}`:v?'<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> Scroll & Scan':'<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> Scan Jobs on This Page'};c.addEventListener("click",()=>e(b(c,!1))),u.addEventListener("click",()=>n(b(u,!0))),r.appendChild(c),r.appendChild(u),o.appendChild(r)}function ge(e,n,t){document.getElementById(ue)?.remove();let o=document.createElement("div");o.id=ue,document.body.appendChild(o);let i=o.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=ie,i.appendChild(r);let l=new Set(e.map((d,m)=>m)),c={},u="",b=document.createElement("div");b.className="lp-panel-overlay";let g=document.createElement("div");g.className="lp-panel";let v=document.createElement("div");v.className="lp-panel-header";let y=document.createElement("div");y.className="lp-panel-title",y.innerHTML=`
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
    Jobs Found <span class="lp-panel-count">${e.length}</span>
  `;let S=document.createElement("button");S.className="lp-close-btn",S.innerHTML='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',S.addEventListener("click",()=>o.remove()),v.appendChild(y),v.appendChild(S);let H=document.createElement("div");H.className="lp-search-wrap";let E=document.createElement("input");E.type="text",E.className="lp-search-input",E.placeholder="Filter posts\u2026",E.addEventListener("input",()=>{u=E.value.toLowerCase();let d=0;h.forEach((m,a)=>{let p=e[a],s=!u||p.title.toLowerCase().includes(u)||p.description.toLowerCase().includes(u)||(p.posted_by??"").toLowerCase().includes(u);m.classList.toggle("hidden",!s),s&&d++}),k.classList.toggle("visible",d===0),A()}),H.appendChild(E);let Y=document.createElement("div");Y.className="lp-bulk-section";let L=document.createElement("button");L.type="button",L.className="lp-bulk-toggle",L.innerHTML=`
    Apply Defaults to All
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  `;let M=document.createElement("div");M.className="lp-bulk-body";let ee=new Date(Date.now()+864e5).toISOString().split("T")[0],te=new Date().toISOString().split("T")[0];M.innerHTML=`
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
        <input class="lp-bulk-input" id="lp-bulk-date" type="date" value="${ee}" min="${te}" />
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
  `,L.addEventListener("click",()=>{let d=M.classList.toggle("open");L.classList.toggle("open",d)}),M.querySelector("#lp-bulk-apply").addEventListener("click",()=>{let d=M.querySelector("#lp-bulk-location"),m=M.querySelector("#lp-bulk-budget"),a=M.querySelector("#lp-bulk-date"),p=M.querySelector("#lp-bulk-urgency");c={location:d.value.trim()||void 0,budget:parseFloat(m.value)||void 0,scheduleDate:a.value||void 0,urgency:p.value||void 0},M.classList.remove("open"),L.classList.remove("open"),L.textContent="\u2713 Defaults set \u2014 Apply Defaults to All",setTimeout(()=>{L.innerHTML='Apply Defaults to All <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>'},2e3)}),Y.appendChild(L),Y.appendChild(M);let O=document.createElement("div");O.className="lp-panel-toolbar";let j=document.createElement("label");j.className="lp-select-all-label";let N=document.createElement("input");N.type="checkbox",N.checked=!0,j.appendChild(N),j.appendChild(document.createTextNode("Select All"));let G=document.createElement("div");G.className="lp-toolbar-right";let z=document.createElement("span");z.className="lp-selected-count";let P=document.createElement("button");P.className="lp-csv-btn",P.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV',P.title="Export all scraped posts to CSV",P.addEventListener("click",()=>Ue(e)),G.appendChild(z),G.appendChild(P),O.appendChild(j),O.appendChild(G);let $=document.createElement("div");$.className="lp-panel-list";let k=document.createElement("div");k.className="lp-no-results",k.textContent="No posts match your filter.";let q=[],h=[],A=()=>{let d=e.filter((a,p)=>l.has(p)&&!h[p].classList.contains("hidden")).length,m=e.filter((a,p)=>!h[p].classList.contains("hidden")).length;z.textContent=`${l.size} of ${e.length} selected`,x.disabled=l.size===0,x.textContent=l.size===0?"Select posts to import":`Import Selected (${l.size})`,N.checked=d>0&&d===m,N.indeterminate=d>0&&d<m};e.forEach((d,m)=>{let a=n.has(d.source_url),p=document.createElement("div");p.className="lp-job-item selected",h.push(p);let s=document.createElement("input");s.type="checkbox",s.className="lp-job-checkbox",s.checked=!0,q.push(s);let T=document.createElement("div");T.className="lp-job-info";let I=d.title||d.description.slice(0,70)+"\u2026";T.innerHTML=`
      <div class="lp-job-title">${B(I)}</div>
      <div class="lp-job-meta">
        <span class="lp-source-chip ${d.source}">${d.source}</span>
        ${a?'<span class="lp-dup-badge">Already imported</span>':""}
        ${d.posted_by?`<span>${B(d.posted_by)}</span>`:""}
        ${d.location?`<span>\u{1F4CD} ${B(d.location)}</span>`:""}
      </div>
    `;let f=w=>{s.checked=w,p.classList.toggle("selected",w),w?l.add(m):l.delete(m),A()};s.addEventListener("change",()=>f(s.checked)),p.addEventListener("click",w=>{w.target!==s&&f(!s.checked)}),p.appendChild(s),p.appendChild(T),$.appendChild(p)}),$.appendChild(k),N.addEventListener("change",()=>{let d=N.checked;e.forEach((m,a)=>{h[a].classList.contains("hidden")||(q[a].checked=d,h[a].classList.toggle("selected",d),d?l.add(a):l.delete(a))}),N.indeterminate=!1,A()});let C=document.createElement("div");C.className="lp-panel-footer";let x=document.createElement("button");x.className="lp-import-btn",x.addEventListener("click",()=>{let d=e.filter((m,a)=>l.has(a));o.remove(),t(d,c)}),C.appendChild(x),g.appendChild(v),g.appendChild(H),g.appendChild(Y),g.appendChild(O),g.appendChild($),g.appendChild(C),b.appendChild(g),i.appendChild(b),b.addEventListener("click",d=>{d.target===b&&o.remove()}),A()}function Ue(e){let n=["Title","Description","Source","Posted By","Location","Budget","Timestamp","Source URL"],t=e.map(c=>[c.title,c.description.replace(/\n/g," "),c.source,c.posted_by,c.location??"",c.budget!=null?String(c.budget):"",c.timestamp,c.source_url].map(Ve).join(",")),o=[n.join(","),...t].join(`\r
`),i=new Blob([o],{type:"text/csv;charset=utf-8;"}),r=URL.createObjectURL(i),l=document.createElement("a");l.href=r,l.download=`localpro-jobs-${new Date().toISOString().slice(0,10)}.csv`,l.click(),URL.revokeObjectURL(r)}function Ve(e){let n=e.replace(/"/g,'""');return/[",\n]/.test(n)?`"${n}"`:n}function be(e,n,t,o,i){document.getElementById(me)?.remove();let r=document.createElement("div");r.id=me,document.body.appendChild(r);let l=r.attachShadow({mode:"open"}),c=document.createElement("style");c.textContent=ie,l.appendChild(c);let u=Ye(e,n,t??null,o??null,i??{},l,r);l.appendChild(u),u.addEventListener("click",g=>{g.target===u&&(U(r),o&&o.onNext())});let b=g=>{g.key==="Escape"&&(U(r),document.removeEventListener("keydown",b),o&&o.onNext())};document.addEventListener("keydown",b)}function U(e){e.remove()}function Ye(e,n,t,o,i,r,l){let c=document.createElement("div");c.className="lp-overlay";let u=document.createElement("div");u.className="lp-modal",u.setAttribute("role","dialog"),u.setAttribute("aria-modal","true");let b=document.createElement("div");b.className="lp-modal-header";let g=document.createElement("div");g.className="lp-modal-title",g.innerHTML=`
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
    </svg>
    Import Job
    <span class="lp-source-chip ${e.source}">${e.source}</span>
  `;let v=document.createElement("div");if(v.className="lp-modal-header-right",o){let a=document.createElement("span");a.className="lp-modal-progress",a.textContent=`${o.current} / ${o.total}`,v.appendChild(a)}let y=document.createElement("button");y.className="lp-close-btn",y.innerHTML='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',y.addEventListener("click",()=>{U(l),o&&o.onNext()}),v.appendChild(y),b.appendChild(g),b.appendChild(v);let S=document.createElement("div");S.className="lp-modal-body";let H=document.createElement("form");H.noValidate=!0;let E=t??e.category??"",L=(a=>n.find(p=>p.name.toLowerCase()===a.toLowerCase()))(E),M=n.length?['<option value="">-- Select category --</option>',...n.map(a=>{let p=L?._id===a._id?"selected":"";return`<option value="${J(a._id)}" data-name="${J(a.name)}" ${p}>${B(a.icon??"")} ${B(a.name)}</option>`})].join(""):'<option value="">Loading categories\u2026</option>',ee=t?`<div class="lp-hint ai">\u2726 AI: "${B(t)}"</div>`:E&&L?`<div class="lp-hint">Auto: "${B(E)}"</div>`:"",te=new Date().toISOString().split("T")[0],O=new Date(Date.now()+864e5).toISOString().split("T")[0],j=i.location??e.location??"",N=i.budget??e.budget??"",G=i.scheduleDate??e.scheduleDate??O,z=i.urgency??"standard";H.innerHTML=`
    <div class="lp-field">
      <label class="lp-label" for="lp-title">Job Title <span class="lp-required">*</span></label>
      <input class="lp-input" id="lp-title" type="text" value="${J(e.title)}" required maxlength="150" />
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
        <select class="lp-select" id="lp-category" ${n.length===0?"disabled":""}>${M}</select>
        ${ee}
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-poster">Posted By</label>
        <input class="lp-input" id="lp-poster" type="text" value="${J(e.posted_by)}" maxlength="100" />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-location">Location <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-location" type="text" value="${J(j)}" maxlength="100" placeholder="e.g. Makati City" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${N}" min="1" step="1" placeholder="e.g. 1500" required />
        <button type="button" class="lp-estimate-btn" id="lp-estimate-btn">\u2726 Estimate with AI</button>
        <div class="lp-hint" id="lp-estimate-hint"></div>
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${J(G)}" min="${te}" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" ${z==="standard"?"selected":""}>Standard</option>
          <option value="same_day" ${z==="same_day"?"selected":""}>Same Day</option>
          <option value="rush"     ${z==="rush"?"selected":""}>Rush</option>
        </select>
      </div>
    </div>
  `;let P=document.createElement("div");P.className="lp-ai-bar";let $=document.createElement("div");$.className="lp-ai-bar-label",$.innerHTML="\u2726 AI Smart Fill <span>\u2014 clean description + category + budget in one click</span>";let k=document.createElement("button");if(k.type="button",k.className="lp-smart-fill-btn",k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill',P.appendChild($),P.appendChild(k),S.insertBefore(P,H),S.appendChild(H),e.phone||e.email){let a=document.createElement("div");a.className="lp-contact-info";let p=document.createElement("span");if(p.className="lp-contact-label",p.textContent="Contact",a.appendChild(p),e.phone){let s=document.createElement("span");s.className="lp-contact-chip",s.innerHTML=`\u{1F4DE} ${B(e.phone)}`,s.title="Click to copy",s.style.cursor="pointer",s.addEventListener("click",()=>{navigator.clipboard.writeText(e.phone),s.innerHTML="\u2713 Copied!",setTimeout(()=>{s.innerHTML=`\u{1F4DE} ${B(e.phone)}`},1500)}),a.appendChild(s)}if(e.email){let s=document.createElement("span");s.className="lp-contact-chip",s.innerHTML=`\u2709\uFE0F ${B(e.email)}`,s.title="Click to copy",s.style.cursor="pointer",s.addEventListener("click",()=>{navigator.clipboard.writeText(e.email),s.innerHTML="\u2713 Copied!",setTimeout(()=>{s.innerHTML=`\u2709\uFE0F ${B(e.email)}`},1500)}),a.appendChild(s)}S.appendChild(a)}let q=r.getElementById("lp-estimate-btn"),h=r.getElementById("lp-estimate-hint");q&&h&&q.addEventListener("click",async()=>{let a=r.getElementById("lp-category"),p=r.getElementById("lp-title"),s=r.getElementById("lp-budget"),T=a.selectedOptions[0]?.getAttribute("data-name")??"";if(!T){h.textContent="Select a category first.",h.className="lp-hint";return}q.disabled=!0,q.textContent="Estimating\u2026",h.textContent="";try{let I={type:"ESTIMATE_BUDGET",title:p.value.trim()||e.title,category:T,description:e.description.slice(0,300)},f=await chrome.runtime.sendMessage(I);if(f?.success&&f.midpoint){s.value=String(f.midpoint);let w=f.min!=null&&f.max!=null?`PHP ${f.min.toLocaleString()} \u2013 ${f.max.toLocaleString()}`:"";h.textContent=`\u2726 AI estimate: ${w}${f.note?` \xB7 ${f.note}`:""}`,h.className="lp-hint ai"}else h.textContent=f?.error??"Estimate unavailable.",h.className="lp-hint"}catch{h.textContent="Could not fetch estimate.",h.className="lp-hint"}finally{q.disabled=!1,q.textContent="\u2726 Estimate with AI"}});let A=r.getElementById("lp-clean-btn"),C=r.getElementById("lp-clean-hint");A&&C&&A.addEventListener("click",async()=>{let a=r.getElementById("lp-category"),p=r.getElementById("lp-title"),s=r.getElementById("lp-description"),T=a.selectedOptions[0]?.getAttribute("data-name")??"";A.disabled=!0,A.textContent="Generating\u2026",C.textContent="";try{let I={type:"GENERATE_DESCRIPTION",title:p.value.trim()||e.title,category:T||void 0},f=await chrome.runtime.sendMessage(I);f?.success&&f.description?(s.value=f.description,C.textContent="\u2726 AI-generated \u2014 review before submitting",C.className="lp-hint ai"):(C.textContent=f?.error??"Could not generate description.",C.className="lp-hint")}catch{C.textContent="Could not reach AI service.",C.className="lp-hint"}finally{A.disabled=!1,A.textContent="\u2726 Clean with AI"}}),k.addEventListener("click",async()=>{let a=r.getElementById("lp-category"),p=r.getElementById("lp-title"),s=r.getElementById("lp-description"),T=r.getElementById("lp-budget"),I=a.selectedOptions[0]?.getAttribute("data-name")??"";if(!I){k.textContent="Select a category first",setTimeout(()=>{k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill'},2e3);return}k.disabled=!0,k.textContent="Working\u2026";let f=p.value.trim()||e.title,[w,R]=await Promise.allSettled([chrome.runtime.sendMessage({type:"GENERATE_DESCRIPTION",title:f,category:I}),chrome.runtime.sendMessage({type:"ESTIMATE_BUDGET",title:f,category:I,description:e.description.slice(0,300)})]);if(w.status==="fulfilled"&&w.value?.success&&w.value.description&&(s.value=w.value.description,C&&(C.textContent="\u2726 AI-generated \u2014 review before submitting",C.className="lp-hint ai")),R.status==="fulfilled"&&R.value?.success&&R.value.midpoint&&(T.value=String(R.value.midpoint),h)){let _=R.value,X=_.min!=null&&_.max!=null?`PHP ${_.min.toLocaleString()} \u2013 ${_.max.toLocaleString()}`:"";h.textContent=`\u2726 AI estimate: ${X}${_.note?` \xB7 ${_.note}`:""}`,h.className="lp-hint ai"}k.disabled=!1,k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill'});let x=document.createElement("div");x.className="lp-status";let d=document.createElement("div");if(d.className="lp-modal-footer",o){let a=document.createElement("button");a.type="button",a.className="lp-skip-btn",a.textContent="Skip",a.addEventListener("click",()=>{U(l),o.onNext()}),d.appendChild(a)}else{let a=document.createElement("button");a.type="button",a.className="lp-cancel-btn",a.textContent="Cancel",a.addEventListener("click",()=>U(l)),d.appendChild(a)}let m=document.createElement("button");return m.type="button",m.className="lp-submit-btn",m.innerHTML=`
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    ${o?"Submit & Next":"Submit to LocalPro"}
  `,d.appendChild(m),m.addEventListener("click",async()=>{let a=r.getElementById("lp-title"),p=r.getElementById("lp-description"),s=r.getElementById("lp-category"),T=r.getElementById("lp-poster"),I=r.getElementById("lp-location"),f=r.getElementById("lp-budget"),w=r.getElementById("lp-schedule"),R=r.getElementById("lp-urgency"),_=a.value.trim(),X=p.value.trim(),ae=s.value,ye=s.selectedOptions[0]?.getAttribute("data-name")??"",le=I.value.trim(),Q=parseFloat(f.value),se=w.value,tt=R.value;if(!_){D(x,"error","Job title is required."),a.focus();return}if(!X){D(x,"error","Description is required."),p.focus();return}if(!ae){D(x,"error","Please select a category."),s.focus();return}if(!le){D(x,"error","Location is required."),I.focus();return}if(!Q||Q<=0||isNaN(Q)){D(x,"error","Budget must be greater than 0 (PHP)."),f.focus();return}if(!se){D(x,"error","Schedule date is required."),w.focus();return}m.disabled=!0,m.textContent="Submitting\u2026",D(x,"loading","Sending to LocalPro\u2026");let ve={type:"IMPORT_JOB",payload:{...e,title:_,description:X,posted_by:T.value.trim(),location:le,budget:Q,scheduleDate:se,category:ye,categoryId:ae}};try{let Z=await chrome.runtime.sendMessage(ve);if(Z?.success){let W=Z.job_id??"",ne=`${Fe}/jobs/${W}`;x.className="lp-status success",x.innerHTML=`Imported! <a href="${J(ne)}" target="_blank" rel="noopener">View on LocalPro \u2192</a>`,x.style.display="block",m.textContent="Submitted!",setTimeout(()=>{U(l),o&&o.onNext()},2e3)}else{let W=Z?.error??"Import failed. Please try again.",ne=W.toLowerCase().includes("session")||W.toLowerCase().includes("sign in");D(x,"error",ne?"Session expired. Please sign in again via the extension icon.":W),m.disabled=!1,m.innerHTML=o?"Submit & Next":"Submit to LocalPro"}}catch(Z){D(x,"error",`Extension error: ${String(Z)}`),m.disabled=!1,m.innerHTML=o?"Submit & Next":"Submit to LocalPro"}}),u.appendChild(b),u.appendChild(S),u.appendChild(x),u.appendChild(d),c.appendChild(u),c}function D(e,n,t){e.className=`lp-status ${n}`,e.textContent=t}function J(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function B(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ze(){let e=window.location.hostname;return e.includes("facebook.com")?"facebook":e.includes("linkedin.com")?"linkedin":e.includes("jobstreet.com")?"jobstreet":e.includes("indeed.com")?"indeed":null}var V=Ze();if(!V)throw new Error("[LocalPro] Unsupported platform \u2014 content script exiting.");var K=[];async function We(){try{let e={type:"GET_CATEGORIES"},n=await chrome.runtime.sendMessage(e);n?.success&&n.categories.length>0&&(K=n.categories)}catch{}}function Xe(){switch(V){case"facebook":return Array.from(document.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]'));case"linkedin":return Array.from(document.querySelectorAll([".feed-shared-update-v2",".occludable-update","li.fie-impression-container",'[data-urn^="urn:li:activity"]','[data-urn^="urn:li:share"]','[data-urn^="urn:li:ugcPost"]'].join(", ")));case"jobstreet":return Array.from(document.querySelectorAll(['[data-automation="normalJob"]','[data-automation="featuredJob"]',"article[data-job-id]",'[class*="job-item"]','[class*="JobCard"]'].join(", ")));case"indeed":return Array.from(document.querySelectorAll(["[data-jk]",".job_seen_beacon",".resultContent",'[class*="jobCard"]',".jobsearch-ResultsList > li"].join(", ")));default:return[]}}async function Qe(){try{let e={type:"GET_IMPORT_HISTORY"},n=await chrome.runtime.sendMessage(e);if(n?.success)return new Set(n.history.map(t=>t.source_url))}catch{}return new Set}function Ke(){return V==="linkedin"?document.querySelector(".scaffold-layout__main")??document.querySelector("main.scaffold-layout__main")??document.querySelector('[class*="scaffold-layout__main"]')??document.querySelector("main[role='main']")??null:null}async function et(){let e=Ke(),n=8,t=window.innerHeight*.85,o=V==="linkedin"?1100:700;for(let i=0;i<n;i++)e&&e.scrollBy({top:t,behavior:"smooth"}),window.scrollBy({top:t,behavior:"smooth"}),await new Promise(r=>setTimeout(r,o));await new Promise(i=>setTimeout(i,800))}async function re(e,n=!1){e(!0),await new Promise(l=>setTimeout(l,50)),n&&await et();let t=Xe(),i=[...new Set(t)].filter(l=>l.textContent&&l.textContent.trim().length>20).map(l=>de(l,V)),[r]=await Promise.all([Qe()]);if(e(!1),i.length===0){alert("[LocalPro] No posts found on this page. Try scrolling to load more content first, or use 'Scroll & Scan'.");return}ge(i,r,(l,c)=>{xe(l,0,c)})}async function xe(e,n,t){if(n>=e.length)return;let o=e[n],i;if(K.length>0)try{let l={type:"CLASSIFY_CATEGORY",title:o.title,description:o.description,availableCategories:K.map(u=>u.name)},c=await Promise.race([chrome.runtime.sendMessage(l),new Promise(u=>setTimeout(()=>u({success:!1}),4e3))]);c?.success&&c.category&&(i=c.category)}catch{}let r=e.length-n;be(o,K,i,r>1?{current:n+1,total:e.length,onNext:()=>void xe(e,n+1,t)}:void 0,t)}chrome.runtime.onMessage.addListener((e,n,t)=>{if(e.type==="PING")return t({ok:!0}),!0;if(e.type==="SCAN_TAB")return re(()=>{},e.autoScroll??!1),t({ok:!0}),!0});async function he(){We(),fe(e=>void re(e,!1),e=>void re(e,!0)),console.log(`[LocalPro] Content script active on ${V}`)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{he()}):he();})();
