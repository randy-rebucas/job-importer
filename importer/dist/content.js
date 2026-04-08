"use strict";(()=>{var Ie=/(\+?\d[\d\s\-().]{7,15}\d)/g,ie=/(?:PHP|AED|USD|\$|₱|€|£)\s*[\d,]+|[\d,]+\s*(?:PHP|AED|USD)/gi,Be=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,Ae={Plumbing:["plumber","plumbing","pipe","drain","faucet","toilet","water leak"],Electrical:["electrician","electrical","wiring","circuit","panel","outlet","voltage"],Carpentry:["carpenter","carpentry","wood","furniture","cabinet","flooring"],Painting:["painter","painting","paint","coating","wallpaper","finishing"],Cleaning:["cleaner","cleaning","housekeeping","janitorial","sanitation","maid"],Driving:["driver","driving","delivery","courier","transport","logistics","grab"],HVAC:["hvac","aircon","air conditioning","airconditioning","refrigeration","cooling","heating"],Welding:["welder","welding","fabrication","steel","metal"],Construction:["mason","masonry","construction","laborer","concrete","builder","scaffolding"],Mechanical:["mechanic","mechanical","engine","motor","automotive","vehicle","repair"],IT:["developer","programmer","software","coding","web","app","it support","network"],Design:["designer","graphic","ui","ux","creative","illustrator","photoshop"],Healthcare:["nurse","caregiver","medical","healthcare","doctor","therapist"],Education:["teacher","tutor","instructor","educator","trainer","teaching"],Security:["security guard","security officer","bodyguard","cctv","patrol"]};function Pe(e){let n=e.toLowerCase(),t,o=0;for(let[i,r]of Object.entries(Ae)){let a=r.filter(s=>n.includes(s)).length;a>o&&(o=a,t=i)}return o>0?t:void 0}function Ne(e){let n=e.match(Ie),t=e.match(ie),o=e.match(Be);return{hasPhone:n!==null,hasCurrency:t!==null,hasEmail:o!==null,phone:n?.[0]?.trim(),email:o?.[0]?.trim()}}function He(e,n){let t=e.cloneNode(!0);return n==="facebook"?(t.querySelectorAll('[role="article"]').forEach(o=>o.remove()),["form",'[role="form"]',"[data-commentid]",'[data-testid*="comment"]','[data-testid*="Comment"]','[data-testid*="ufi"]','[data-testid*="UFI"]','[aria-label*="eaction"]','[aria-label*="omment"]','[aria-label*="hare"]'].forEach(o=>t.querySelectorAll(o).forEach(i=>i.remove()))):n==="linkedin"&&[".comments-comments-list",".comments-comment-list",".comments-comment-item",".comments-comment-texteditor",".comments-reply-compose-box",".social-details-social-counts",".social-details-social-activity",".feed-shared-social-action-bar",".feed-shared-footer",".social-actions-bar",".update-components-footer",".update-components-social-activity",'[class*="comment-"]','[class*="-comment"]'].forEach(o=>t.querySelectorAll(o).forEach(i=>i.remove())),t.textContent?.replace(/\s+/g," ").trim()??""}function re(e,n){let t=He(e,n),{hasCurrency:o,phone:i,email:r}=Ne(t),a="",s="",p="",f="",b=window.location.href;n==="facebook"?(a=_e(e,t),s=qe(e,t),p=$e(e),f=De(e)):n==="linkedin"?(a=Re(e,t),s=je(e,t),p=Oe(e),f=Je(e)):n==="jobstreet"?(a=Ge(e,t),s=Fe(e,t),p=Ue(e),f=me(e)):(a=Ve(e,t),s=Ye(e,t),p=Ze(e),f=me(e)),a||(a=t.split(/[\n.!?]/).map(E=>E.trim()).filter(E=>E.length>10&&E.length<120)[0]??"Job Opportunity");let v=o?We(t):void 0,y=Qe(t),S=Pe(t);return{title:V(a.slice(0,150)),description:V(s.slice(0,2e3)),source:n,source_url:ze(e,n)||b,posted_by:V(p.slice(0,100)),timestamp:f||new Date().toISOString(),location:y?V(y):void 0,budget:v,category:S,phone:i?V(i):void 0,email:r?V(r):void 0}}function _e(e,n){let t=Array.from(e.querySelectorAll("strong"));for(let i of t){if(i.closest('[role="article"]')!==e)continue;let r=i.textContent?.trim()??"";if(r.length>3)return r}for(let i of["h1","h2","h3"]){let r=e.querySelector(i);if(r&&r.closest('[role="article"]')===e&&r.textContent?.trim())return r.textContent.trim()}let o=n.match(/(?:hiring|looking for|need(?:ed)?|vacancy|open(?:ing)?)[^.!?\n]{5,80}/i);return o?o[0].trim():""}function qe(e,n){let t=e.querySelector('[data-ad-preview="message"]')??e.querySelector('[data-testid="post_message"]')??e.querySelector('[data-testid="story-message"]');if(t?.textContent?.trim())return t.textContent.trim();let o=Array.from(e.querySelectorAll('[dir="auto"]'));for(let i of o){let r=i.closest('[role="article"]');if(r&&r!==e)continue;let a=i.textContent?.trim()??"";if(a.length>30)return a}return n}function $e(e){return(e.querySelector('a[role="link"][tabindex="0"] strong')??e.querySelector('[data-testid="story-subtitle"] a')??e.querySelector("h3 a")??e.querySelector("h4 a"))?.textContent?.trim()??""}function De(e){let n=e.querySelector("abbr[data-utime]");if(n){let o=n.getAttribute("data-utime");if(o)return new Date(parseInt(o)*1e3).toISOString()}let t=e.querySelector("time");if(t){let o=t.getAttribute("datetime");if(o)return new Date(o).toISOString();if(t.textContent)return t.textContent.trim()}return new Date().toISOString()}function ze(e,n){if(n==="facebook"){let t=e.querySelectorAll("a[href]");for(let o of t){let i=o.href;if(i.includes("/posts/")||i.includes("story_fbid")||i.includes("permalink"))return i}}else if(n==="linkedin"){let t=e.querySelectorAll("a[href]");for(let o of t){let i=o.href;if(i.includes("/feed/update/")||i.includes("/posts/")||i.includes("ugcPost"))return i}}else if(n==="jobstreet"){let t=e.querySelector("a[href*='/job/'], a[data-automation='job-list-item-link-overlay']");if(t?.href)return t.href;let o=e.getAttribute("data-job-id")??e.getAttribute("data-automation-id");if(o)return`https://www.jobstreet.com.ph/job/${o}`}else if(n==="indeed"){let t=e.querySelector("a[href*='/rc/clk'], a[href*='/viewjob'], h2 a");if(t?.href)return t.href;let o=e.getAttribute("data-jk");if(o)return`https://ph.indeed.com/viewjob?jk=${o}`}return window.location.href}function Re(e,n){let t=e.querySelector(".feed-shared-text strong")??e.querySelector(".update-components-text strong");if(t?.textContent)return t.textContent.trim();let o=e.querySelector(".job-card-container__link, .jobs-unified-top-card__job-title");if(o?.textContent)return o.textContent.trim();let i=n.match(/(?:hiring|looking for|need)[^.!?\n]{5,80}/i);return i?i[0].trim():""}function je(e,n){let t=e.querySelector(".feed-shared-text")??e.querySelector(".update-components-text")??e.querySelector(".feed-shared-update-v2__description")??e.querySelector("[data-test-id='main-feed-activity-card__commentary']");return t?.textContent?t.textContent.trim():n}function Oe(e){return(e.querySelector(".update-components-actor__name span[aria-hidden='true']")??e.querySelector(".feed-shared-actor__name")??e.querySelector(".update-components-actor__name"))?.textContent?.trim()??""}function Je(e){let n=e.querySelector("time");if(n){let o=n.getAttribute("datetime");if(o)return new Date(o).toISOString()}let t=e.querySelector(".feed-shared-actor__sub-description, .update-components-actor__sub-description");return t?.textContent?t.textContent.trim():new Date().toISOString()}function Ge(e,n){let t=e.querySelector('[data-automation="job-card-title"] span')??e.querySelector('[data-automation="job-card-title"]')??e.querySelector("h1, h2, h3");return t?.textContent?t.textContent.trim():n.split(`
`).map(i=>i.trim()).filter(i=>i.length>5&&i.length<120)[0]??"Job Opening"}function Fe(e,n){let t=e.querySelector('[data-automation="job-card-teaser"]')??e.querySelector('[class*="teaser"]')??e.querySelector('[class*="description"]');return t?.textContent?t.textContent.trim():n.trim()}function Ue(e){return(e.querySelector('[data-automation="job-card-company"]')??e.querySelector('[class*="company"]')??e.querySelector('[class*="advertiser"]'))?.textContent?.trim()??""}function Ve(e,n){let t=e.querySelector("h2.jobTitle span[title]")??e.querySelector("h2.jobTitle span:not([class])")??e.querySelector(".jobTitle a span")??e.querySelector("h2, h3");return t?.textContent?t.textContent.trim():n.split(`
`).map(i=>i.trim()).filter(i=>i.length>5&&i.length<120)[0]??"Job Opening"}function Ye(e,n){let t=e.querySelector(".job-snippet")??e.querySelector('[class*="snippet"]')??e.querySelector('[class*="description"]');return t?.textContent?t.textContent.trim():n.trim()}function Ze(e){return(e.querySelector(".companyName")??e.querySelector('[data-testid="company-name"]')??e.querySelector('[class*="company"]'))?.textContent?.trim()??""}function me(e){let n=e.querySelector("time");if(n){let t=n.getAttribute("datetime");if(t)return new Date(t).toISOString()}return new Date().toISOString()}function We(e){ie.lastIndex=0;let n=ie.exec(e);if(!n)return;let t=n[0].replace(/[^0-9]/g,""),o=parseInt(t,10);return isNaN(o)?void 0:o}var Xe=[/\blocation[:\s]+([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,/\b(?:based in|located in|work in|working in|site[:\s]+)\s*([A-Za-z\s,]+?)(?:\.|,|\n|$)/i,/\b(?:in|at)\s+([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)(?=\s*[\.\,\n])/,/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(?:Metro\s)?(?:Manila|Cebu|Davao|Quezon City|Makati|Pasig|Taguig|Mandaluyong|Parañaque|Las Piñas|Muntinlupa|Caloocan|Marikina|Pasay|Dubai|Abu Dhabi|Sharjah|Singapore|Riyadh|Qatar)/];function Qe(e){for(let n of Xe){let t=e.match(n);if(t?.[1])return t[1].trim()}}function V(e){return e.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim()}var fe="localpro-scan-host",ge="localpro-panel-host",be="localpro-modal-host",Ke="https://www.localpro.asia",ae=`
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
`;function xe(e,n){document.getElementById(fe)?.remove();let t=document.createElement("div");t.id=fe,document.body.appendChild(t);let o=t.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=ae,o.appendChild(i);let r=document.createElement("div");r.className="lp-fab-wrap";let a=(b,v)=>{let y=document.createElement("button");return y.className=v?"lp-fab secondary":"lp-fab",y.innerHTML=v?`<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> ${b}`:`<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> ${b}`,y},s=a("Scan Jobs on This Page",!1),p=a("Scroll & Scan",!0),f=(b,v)=>y=>{s.disabled=y,p.disabled=y,b.innerHTML=y?`<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.4-5.4M20 15a9 9 0 01-14.4 5.4"/></svg> ${v?"Scrolling\u2026":"Scanning\u2026"}`:v?'<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/></svg> Scroll & Scan':'<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> Scan Jobs on This Page'};s.addEventListener("click",()=>e(f(s,!1))),p.addEventListener("click",()=>n(f(p,!0))),r.appendChild(s),r.appendChild(p),o.appendChild(r)}var he="data-lp-injected",et=`
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
`,ee='<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>';function ye(e,n,t){if(e.hasAttribute(he))return;e.setAttribute(he,"1");let o=document.createElement("div"),i=o.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=et;let a=document.createElement("div");a.className="lp-post-btn-wrap";let s=document.createElement("button");s.className="lp-post-btn"+(n?" done":""),s.innerHTML=n?`${ee} Already imported`:`${ee} Import to LocalPro`;let p=()=>{s.className="lp-post-btn done",s.innerHTML=`${ee} Imported!`};n||s.addEventListener("click",f=>{f.stopPropagation(),f.preventDefault(),!(s.classList.contains("importing")||s.classList.contains("done"))&&(s.className="lp-post-btn importing",s.innerHTML=`${ee} Opening\u2026`,t(p))}),a.appendChild(s),i.appendChild(r),i.appendChild(a),e.appendChild(o)}function ve(e,n,t){document.getElementById(ge)?.remove();let o=document.createElement("div");o.id=ge,document.body.appendChild(o);let i=o.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=ae,i.appendChild(r);let a=new Set(e.map((d,m)=>m)),s={},p="",f=document.createElement("div");f.className="lp-panel-overlay";let b=document.createElement("div");b.className="lp-panel";let v=document.createElement("div");v.className="lp-panel-header";let y=document.createElement("div");y.className="lp-panel-title",y.innerHTML=`
    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
    Jobs Found <span class="lp-panel-count">${e.length}</span>
  `;let S=document.createElement("button");S.className="lp-close-btn",S.innerHTML='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',S.addEventListener("click",()=>o.remove()),v.appendChild(y),v.appendChild(S);let H=document.createElement("div");H.className="lp-search-wrap";let E=document.createElement("input");E.type="text",E.className="lp-search-input",E.placeholder="Filter posts\u2026",E.addEventListener("input",()=>{p=E.value.toLowerCase();let d=0;h.forEach((m,l)=>{let u=e[l],c=!p||u.title.toLowerCase().includes(p)||u.description.toLowerCase().includes(p)||(u.posted_by??"").toLowerCase().includes(p);m.classList.toggle("hidden",!c),c&&d++}),k.classList.toggle("visible",d===0),A()}),H.appendChild(E);let Z=document.createElement("div");Z.className="lp-bulk-section";let L=document.createElement("button");L.type="button",L.className="lp-bulk-toggle",L.innerHTML=`
    Apply Defaults to All
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  `;let T=document.createElement("div");T.className="lp-bulk-body";let te=new Date(Date.now()+864e5).toISOString().split("T")[0],ne=new Date().toISOString().split("T")[0];T.innerHTML=`
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
        <input class="lp-bulk-input" id="lp-bulk-date" type="date" value="${te}" min="${ne}" />
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
  `,L.addEventListener("click",()=>{let d=T.classList.toggle("open");L.classList.toggle("open",d)}),T.querySelector("#lp-bulk-apply").addEventListener("click",()=>{let d=T.querySelector("#lp-bulk-location"),m=T.querySelector("#lp-bulk-budget"),l=T.querySelector("#lp-bulk-date"),u=T.querySelector("#lp-bulk-urgency");s={location:d.value.trim()||void 0,budget:parseFloat(m.value)||void 0,scheduleDate:l.value||void 0,urgency:u.value||void 0},T.classList.remove("open"),L.classList.remove("open"),L.textContent="\u2713 Defaults set \u2014 Apply Defaults to All",setTimeout(()=>{L.innerHTML='Apply Defaults to All <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>'},2e3)}),Z.appendChild(L),Z.appendChild(T);let G=document.createElement("div");G.className="lp-panel-toolbar";let F=document.createElement("label");F.className="lp-select-all-label";let P=document.createElement("input");P.type="checkbox",P.checked=!0,F.appendChild(P),F.appendChild(document.createTextNode("Select All"));let U=document.createElement("div");U.className="lp-toolbar-right";let R=document.createElement("span");R.className="lp-selected-count";let N=document.createElement("button");N.className="lp-csv-btn",N.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> CSV',N.title="Export all scraped posts to CSV",N.addEventListener("click",()=>tt(e)),U.appendChild(R),U.appendChild(N),G.appendChild(F),G.appendChild(U);let D=document.createElement("div");D.className="lp-panel-list";let k=document.createElement("div");k.className="lp-no-results",k.textContent="No posts match your filter.";let _=[],h=[],A=()=>{let d=e.filter((l,u)=>a.has(u)&&!h[u].classList.contains("hidden")).length,m=e.filter((l,u)=>!h[u].classList.contains("hidden")).length;R.textContent=`${a.size} of ${e.length} selected`,x.disabled=a.size===0,x.textContent=a.size===0?"Select posts to import":`Import Selected (${a.size})`,P.checked=d>0&&d===m,P.indeterminate=d>0&&d<m};e.forEach((d,m)=>{let l=n.has(d.source_url),u=document.createElement("div");u.className="lp-job-item selected",h.push(u);let c=document.createElement("input");c.type="checkbox",c.className="lp-job-checkbox",c.checked=!0,_.push(c);let M=document.createElement("div");M.className="lp-job-info";let I=d.title||d.description.slice(0,70)+"\u2026";M.innerHTML=`
      <div class="lp-job-title">${B(I)}</div>
      <div class="lp-job-meta">
        <span class="lp-source-chip ${d.source}">${d.source}</span>
        ${l?'<span class="lp-dup-badge">Already imported</span>':""}
        ${d.posted_by?`<span>${B(d.posted_by)}</span>`:""}
        ${d.location?`<span>\u{1F4CD} ${B(d.location)}</span>`:""}
      </div>
    `;let g=C=>{c.checked=C,u.classList.toggle("selected",C),C?a.add(m):a.delete(m),A()};c.addEventListener("change",()=>g(c.checked)),u.addEventListener("click",C=>{C.target!==c&&g(!c.checked)}),u.appendChild(c),u.appendChild(M),D.appendChild(u)}),D.appendChild(k),P.addEventListener("change",()=>{let d=P.checked;e.forEach((m,l)=>{h[l].classList.contains("hidden")||(_[l].checked=d,h[l].classList.toggle("selected",d),d?a.add(l):a.delete(l))}),P.indeterminate=!1,A()});let w=document.createElement("div");w.className="lp-panel-footer";let x=document.createElement("button");x.className="lp-import-btn",x.addEventListener("click",()=>{let d=e.filter((m,l)=>a.has(l));o.remove(),t(d,s)}),w.appendChild(x),b.appendChild(v),b.appendChild(H),b.appendChild(Z),b.appendChild(G),b.appendChild(D),b.appendChild(w),f.appendChild(b),i.appendChild(f),f.addEventListener("click",d=>{d.target===f&&o.remove()}),A()}function tt(e){let n=["Title","Description","Source","Posted By","Location","Budget","Timestamp","Source URL"],t=e.map(s=>[s.title,s.description.replace(/\n/g," "),s.source,s.posted_by,s.location??"",s.budget!=null?String(s.budget):"",s.timestamp,s.source_url].map(nt).join(",")),o=[n.join(","),...t].join(`\r
`),i=new Blob([o],{type:"text/csv;charset=utf-8;"}),r=URL.createObjectURL(i),a=document.createElement("a");a.href=r,a.download=`localpro-jobs-${new Date().toISOString().slice(0,10)}.csv`,a.click(),URL.revokeObjectURL(r)}function nt(e){let n=e.replace(/"/g,'""');return/[",\n]/.test(n)?`"${n}"`:n}function le(e,n,t,o,i){document.getElementById(be)?.remove();let r=document.createElement("div");r.id=be,document.body.appendChild(r);let a=r.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=ae,a.appendChild(s);let p=ot(e,n,t??null,o??null,i??{},a,r);a.appendChild(p),p.addEventListener("click",b=>{b.target===p&&(Y(r),o&&o.onNext())});let f=b=>{b.key==="Escape"&&(Y(r),document.removeEventListener("keydown",f),o&&o.onNext())};document.addEventListener("keydown",f)}function Y(e){e.remove()}function ot(e,n,t,o,i,r,a){let s=document.createElement("div");s.className="lp-overlay";let p=document.createElement("div");p.className="lp-modal",p.setAttribute("role","dialog"),p.setAttribute("aria-modal","true");let f=document.createElement("div");f.className="lp-modal-header";let b=document.createElement("div");b.className="lp-modal-title",b.innerHTML=`
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
    </svg>
    Import Job
    <span class="lp-source-chip ${e.source}">${e.source}</span>
  `;let v=document.createElement("div");if(v.className="lp-modal-header-right",o){let l=document.createElement("span");l.className="lp-modal-progress",l.textContent=`${o.current} / ${o.total}`,v.appendChild(l)}let y=document.createElement("button");y.className="lp-close-btn",y.innerHTML='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',y.addEventListener("click",()=>{Y(a),o&&o.onNext()}),v.appendChild(y),f.appendChild(b),f.appendChild(v);let S=document.createElement("div");S.className="lp-modal-body";let H=document.createElement("form");H.noValidate=!0;let E=t??e.category??"",L=(l=>n.find(u=>u.name.toLowerCase()===l.toLowerCase()))(E),T=n.length?['<option value="">-- Select category --</option>',...n.map(l=>{let u=L?._id===l._id?"selected":"";return`<option value="${O(l._id)}" data-name="${O(l.name)}" ${u}>${B(l.icon??"")} ${B(l.name)}</option>`})].join(""):'<option value="">Loading categories\u2026</option>',te=t?`<div class="lp-hint ai">\u2726 AI: "${B(t)}"</div>`:E&&L?`<div class="lp-hint">Auto: "${B(E)}"</div>`:"",ne=new Date().toISOString().split("T")[0],G=new Date(Date.now()+864e5).toISOString().split("T")[0],F=i.location??e.location??"",P=i.budget??e.budget??"",U=i.scheduleDate??e.scheduleDate??G,R=i.urgency??"standard";H.innerHTML=`
    <div class="lp-field">
      <label class="lp-label" for="lp-title">Job Title <span class="lp-required">*</span></label>
      <input class="lp-input" id="lp-title" type="text" value="${O(e.title)}" required maxlength="150" />
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
        <select class="lp-select" id="lp-category" ${n.length===0?"disabled":""}>${T}</select>
        ${te}
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-poster">Posted By</label>
        <input class="lp-input" id="lp-poster" type="text" value="${O(e.posted_by)}" maxlength="100" />
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-location">Location <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-location" type="text" value="${O(F)}" maxlength="100" placeholder="e.g. Makati City" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-budget">Budget (PHP) <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-budget" type="number" value="${P}" min="1" step="1" placeholder="e.g. 1500" required />
        <button type="button" class="lp-estimate-btn" id="lp-estimate-btn">\u2726 Estimate with AI</button>
        <div class="lp-hint" id="lp-estimate-hint"></div>
      </div>
    </div>
    <div class="lp-row">
      <div class="lp-field">
        <label class="lp-label" for="lp-schedule">Schedule Date <span class="lp-required">*</span></label>
        <input class="lp-input" id="lp-schedule" type="date" value="${O(U)}" min="${ne}" required />
      </div>
      <div class="lp-field">
        <label class="lp-label" for="lp-urgency">Urgency</label>
        <select class="lp-select" id="lp-urgency">
          <option value="standard" ${R==="standard"?"selected":""}>Standard</option>
          <option value="same_day" ${R==="same_day"?"selected":""}>Same Day</option>
          <option value="rush"     ${R==="rush"?"selected":""}>Rush</option>
        </select>
      </div>
    </div>
  `;let N=document.createElement("div");N.className="lp-ai-bar";let D=document.createElement("div");D.className="lp-ai-bar-label",D.innerHTML="\u2726 AI Smart Fill <span>\u2014 clean description + category + budget in one click</span>";let k=document.createElement("button");if(k.type="button",k.className="lp-smart-fill-btn",k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill',N.appendChild(D),N.appendChild(k),S.insertBefore(N,H),S.appendChild(H),e.phone||e.email){let l=document.createElement("div");l.className="lp-contact-info";let u=document.createElement("span");if(u.className="lp-contact-label",u.textContent="Contact",l.appendChild(u),e.phone){let c=document.createElement("span");c.className="lp-contact-chip",c.innerHTML=`\u{1F4DE} ${B(e.phone)}`,c.title="Click to copy",c.style.cursor="pointer",c.addEventListener("click",()=>{navigator.clipboard.writeText(e.phone),c.innerHTML="\u2713 Copied!",setTimeout(()=>{c.innerHTML=`\u{1F4DE} ${B(e.phone)}`},1500)}),l.appendChild(c)}if(e.email){let c=document.createElement("span");c.className="lp-contact-chip",c.innerHTML=`\u2709\uFE0F ${B(e.email)}`,c.title="Click to copy",c.style.cursor="pointer",c.addEventListener("click",()=>{navigator.clipboard.writeText(e.email),c.innerHTML="\u2713 Copied!",setTimeout(()=>{c.innerHTML=`\u2709\uFE0F ${B(e.email)}`},1500)}),l.appendChild(c)}S.appendChild(l)}let _=r.getElementById("lp-estimate-btn"),h=r.getElementById("lp-estimate-hint");_&&h&&_.addEventListener("click",async()=>{let l=r.getElementById("lp-category"),u=r.getElementById("lp-title"),c=r.getElementById("lp-budget"),M=l.selectedOptions[0]?.getAttribute("data-name")??"";if(!M){h.textContent="Select a category first.",h.className="lp-hint";return}_.disabled=!0,_.textContent="Estimating\u2026",h.textContent="";try{let I={type:"ESTIMATE_BUDGET",title:u.value.trim()||e.title,category:M,description:e.description.slice(0,300)},g=await chrome.runtime.sendMessage(I);if(g?.success&&g.midpoint){c.value=String(g.midpoint);let C=g.min!=null&&g.max!=null?`PHP ${g.min.toLocaleString()} \u2013 ${g.max.toLocaleString()}`:"";h.textContent=`\u2726 AI estimate: ${C}${g.note?` \xB7 ${g.note}`:""}`,h.className="lp-hint ai"}else h.textContent=g?.error??"Estimate unavailable.",h.className="lp-hint"}catch{h.textContent="Could not fetch estimate.",h.className="lp-hint"}finally{_.disabled=!1,_.textContent="\u2726 Estimate with AI"}});let A=r.getElementById("lp-clean-btn"),w=r.getElementById("lp-clean-hint");A&&w&&A.addEventListener("click",async()=>{let l=r.getElementById("lp-category"),u=r.getElementById("lp-title"),c=r.getElementById("lp-description"),M=l.selectedOptions[0]?.getAttribute("data-name")??"";A.disabled=!0,A.textContent="Generating\u2026",w.textContent="";try{let I={type:"GENERATE_DESCRIPTION",title:u.value.trim()||e.title,category:M||void 0},g=await chrome.runtime.sendMessage(I);g?.success&&g.description?(c.value=g.description,w.textContent="\u2726 AI-generated \u2014 review before submitting",w.className="lp-hint ai"):(w.textContent=g?.error??"Could not generate description.",w.className="lp-hint")}catch{w.textContent="Could not reach AI service.",w.className="lp-hint"}finally{A.disabled=!1,A.textContent="\u2726 Clean with AI"}}),k.addEventListener("click",async()=>{let l=r.getElementById("lp-category"),u=r.getElementById("lp-title"),c=r.getElementById("lp-description"),M=r.getElementById("lp-budget"),I=l.selectedOptions[0]?.getAttribute("data-name")??"";if(!I){k.textContent="Select a category first",setTimeout(()=>{k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill'},2e3);return}k.disabled=!0,k.textContent="Working\u2026";let g=u.value.trim()||e.title,[C,j]=await Promise.allSettled([chrome.runtime.sendMessage({type:"GENERATE_DESCRIPTION",title:g,category:I}),chrome.runtime.sendMessage({type:"ESTIMATE_BUDGET",title:g,category:I,description:e.description.slice(0,300)})]);if(C.status==="fulfilled"&&C.value?.success&&C.value.description&&(c.value=C.value.description,w&&(w.textContent="\u2726 AI-generated \u2014 review before submitting",w.className="lp-hint ai")),j.status==="fulfilled"&&j.value?.success&&j.value.midpoint&&(M.value=String(j.value.midpoint),h)){let q=j.value,Q=q.min!=null&&q.max!=null?`PHP ${q.min.toLocaleString()} \u2013 ${q.max.toLocaleString()}`:"";h.textContent=`\u2726 AI estimate: ${Q}${q.note?` \xB7 ${q.note}`:""}`,h.className="lp-hint ai"}k.disabled=!1,k.innerHTML='<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Smart Fill'});let x=document.createElement("div");x.className="lp-status";let d=document.createElement("div");if(d.className="lp-modal-footer",o){let l=document.createElement("button");l.type="button",l.className="lp-skip-btn",l.textContent="Skip",l.addEventListener("click",()=>{Y(a),o.onNext()}),d.appendChild(l)}else{let l=document.createElement("button");l.type="button",l.className="lp-cancel-btn",l.textContent="Cancel",l.addEventListener("click",()=>Y(a)),d.appendChild(l)}let m=document.createElement("button");return m.type="button",m.className="lp-submit-btn",m.innerHTML=`
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    ${o?"Submit & Next":"Submit to LocalPro"}
  `,d.appendChild(m),m.addEventListener("click",async()=>{let l=r.getElementById("lp-title"),u=r.getElementById("lp-description"),c=r.getElementById("lp-category"),M=r.getElementById("lp-poster"),I=r.getElementById("lp-location"),g=r.getElementById("lp-budget"),C=r.getElementById("lp-schedule"),j=r.getElementById("lp-urgency"),q=l.value.trim(),Q=u.value.trim(),de=c.value,Te=c.selectedOptions[0]?.getAttribute("data-name")??"",pe=I.value.trim(),K=parseFloat(g.value),ue=C.value,ut=j.value;if(!q){$(x,"error","Job title is required."),l.focus();return}if(!Q){$(x,"error","Description is required."),u.focus();return}if(!de){$(x,"error","Please select a category."),c.focus();return}if(!pe){$(x,"error","Location is required."),I.focus();return}if(!K||K<=0||isNaN(K)){$(x,"error","Budget must be greater than 0 (PHP)."),g.focus();return}if(!ue){$(x,"error","Schedule date is required."),C.focus();return}m.disabled=!0,m.textContent="Submitting\u2026",$(x,"loading","Sending to LocalPro\u2026");let Me={type:"IMPORT_JOB",payload:{...e,title:q,description:Q,posted_by:M.value.trim(),location:pe,budget:K,scheduleDate:ue,category:Te,categoryId:de}};try{let W=await chrome.runtime.sendMessage(Me);if(W?.success){let X=W.job_id??"",oe=`${Ke}/jobs/${X}`;x.className="lp-status success",x.innerHTML=`Imported! <a href="${O(oe)}" target="_blank" rel="noopener">View on LocalPro \u2192</a>`,x.style.display="block",m.textContent="Submitted!",setTimeout(()=>{Y(a),o&&o.onNext()},2e3)}else{let X=W?.error??"Import failed. Please try again.",oe=X.toLowerCase().includes("session")||X.toLowerCase().includes("sign in");$(x,"error",oe?"Session expired. Please sign in again via the extension icon.":X),m.disabled=!1,m.innerHTML=o?"Submit & Next":"Submit to LocalPro"}}catch(W){$(x,"error",`Extension error: ${String(W)}`),m.disabled=!1,m.innerHTML=o?"Submit & Next":"Submit to LocalPro"}}),p.appendChild(f),p.appendChild(S),p.appendChild(x),p.appendChild(d),s.appendChild(p),s}function $(e,n,t){e.className=`lp-status ${n}`,e.textContent=t}function O(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function B(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function it(){let e=window.location.hostname;return e.includes("facebook.com")?"facebook":e.includes("linkedin.com")?"linkedin":e.includes("jobstreet.com")?"jobstreet":e.includes("indeed.com")?"indeed":null}var z=it();if(!z)throw new Error("[LocalPro] Unsupported platform \u2014 content script exiting.");var J=[];async function rt(){try{let e={type:"GET_CATEGORIES"},n=await chrome.runtime.sendMessage(e);n?.success&&n.categories.length>0&&(J=n.categories)}catch{}}function we(){switch(z){case"facebook":return Array.from(document.querySelectorAll('[role="article"], [data-pagelet^="FeedUnit"]')).filter(e=>e.parentElement?.closest('[role="article"]')===null);case"linkedin":{let e=[".feed-shared-update-v2",".occludable-update","li.fie-impression-container",'[data-urn^="urn:li:activity"]','[data-urn^="urn:li:share"]','[data-urn^="urn:li:ugcPost"]'].join(", "),n=".comments-comment-item, .comments-comments-list, .comments-comment-list, .comments-reply-item, .social-details-social-activity";return Array.from(document.querySelectorAll(e)).filter(t=>!t.closest(n)&&t.parentElement?.closest(e)===null)}case"jobstreet":return Array.from(document.querySelectorAll(['[data-automation="normalJob"]','[data-automation="featuredJob"]',"article[data-job-id]",'[class*="job-item"]','[class*="JobCard"]'].join(", ")));case"indeed":return Array.from(document.querySelectorAll(["[data-jk]",".job_seen_beacon",".resultContent",'[class*="jobCard"]',".jobsearch-ResultsList > li"].join(", ")));default:return[]}}async function Ce(){try{let e={type:"GET_IMPORT_HISTORY"},n=await chrome.runtime.sendMessage(e);if(n?.success)return new Set(n.history.map(t=>t.source_url))}catch{}return new Set}function at(){return z==="linkedin"?document.querySelector(".scaffold-layout__main")??document.querySelector("main.scaffold-layout__main")??document.querySelector('[class*="scaffold-layout__main"]')??document.querySelector("main[role='main']")??null:null}async function lt(){let e=at(),n=8,t=window.innerHeight*.85,o=z==="linkedin"?1100:700;for(let i=0;i<n;i++)e&&e.scrollBy({top:t,behavior:"smooth"}),window.scrollBy({top:t,behavior:"smooth"}),await new Promise(r=>setTimeout(r,o));await new Promise(i=>setTimeout(i,800))}var Se=new Set;async function st(e,n){let t=re(e,z),o;if(J.length>0)try{let i={type:"CLASSIFY_CATEGORY",title:t.title,description:t.description,availableCategories:J.map(a=>a.name)},r=await Promise.race([chrome.runtime.sendMessage(i),new Promise(a=>setTimeout(()=>a({success:!1}),4e3))]);r?.success&&r.category&&(o=r.category)}catch{}le(t,J,o,void 0,{}),n()}function ct(e){switch(z){case"facebook":return e.parentElement?.closest('[role="article"]')===null;case"linkedin":return e.closest(".comments-comment-item, .comments-comments-list, .comments-comment-list, .comments-reply-item, .social-details-social-activity")?!1:e.parentElement?.closest(".feed-shared-update-v2, .occludable-update, li.fie-impression-container")===null;default:return!0}}function dt(e){if(!ct(e)||(e.textContent?.trim()??"").length<20||e.hasAttribute("data-lp-injected"))return;let t=e.querySelector('a[href*="/posts/"], a[href*="story_fbid="], a[href*="?p="], a[href*="/jobs/view/"], a[href*="jk="]'),o=t?Se.has(t.href):!1;ye(e,o,i=>{st(e,i)})}var se=null;function ke(){se&&clearTimeout(se),se=setTimeout(()=>{we().forEach(dt)},400)}function pt(){ke(),new MutationObserver(()=>ke()).observe(document.body,{childList:!0,subtree:!0})}async function ce(e,n=!1){e(!0),await new Promise(a=>setTimeout(a,50)),n&&await lt();let t=we(),i=[...new Set(t)].filter(a=>a.textContent&&a.textContent.trim().length>20).map(a=>re(a,z)),[r]=await Promise.all([Ce()]);if(e(!1),i.length===0){alert("[LocalPro] No posts found on this page. Try scrolling to load more content first, or use 'Scroll & Scan'.");return}ve(i,r,(a,s)=>{Le(a,0,s)})}async function Le(e,n,t){if(n>=e.length)return;let o=e[n],i;if(J.length>0)try{let a={type:"CLASSIFY_CATEGORY",title:o.title,description:o.description,availableCategories:J.map(p=>p.name)},s=await Promise.race([chrome.runtime.sendMessage(a),new Promise(p=>setTimeout(()=>p({success:!1}),4e3))]);s?.success&&s.category&&(i=s.category)}catch{}let r=e.length-n;le(o,J,i,r>1?{current:n+1,total:e.length,onNext:()=>void Le(e,n+1,t)}:void 0,t)}chrome.runtime.onMessage.addListener((e,n,t)=>{if(n.id===chrome.runtime.id){if(e.type==="PING")return t({ok:!0}),!0;if(e.type==="SCAN_TAB")return ce(()=>{},e.autoScroll??!1),t({ok:!0}),!0}});async function Ee(){await Promise.allSettled([rt(),Ce().then(e=>{Se=e})]),pt(),xe(e=>void ce(e,!1),e=>void ce(e,!0)),console.log(`[LocalPro] Content script active on ${z}`)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{Ee()}):Ee();})();
