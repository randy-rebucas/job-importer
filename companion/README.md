# LocalPro Companion — Chrome Extension

> **Version 1.0.1** · Manifest V3 · Chrome 120+

A feature-rich browser companion for [LocalPro](https://www.localpro.asia) that puts real-time notifications, job management, chat, payments, disputes, and more directly in your browser toolbar — no tab-switching required.

---

## Table of Contents

- [Overview](#overview)
- [Features by Role](#features-by-role)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Production Build](#production-build)
- [Permissions Explained](#permissions-explained)
- [Role System](#role-system)
- [Background Polling & Real-Time](#background-polling--real-time)
- [Content Scripts](#content-scripts)
- [Adding a New Feature](#adding-a-new-feature)

---

## Overview

LocalPro Companion runs as a popup extension with a **home grid** of feature tiles. Clicking a tile opens a full feature view with a back button. A role-based auth guard shows only the tabs relevant to the signed-in user's role (client / provider / peso).

Authentication uses **HttpOnly cookie sessions** (`credentials: "include"`) — no tokens are stored in extension storage. The cached user object (name, role, ID) is persisted in `chrome.storage.local` to survive service-worker restarts.

---

## Features by Role

| Tab | Icon | Client | Provider | PESO |
|-----|------|:------:|:--------:|:----:|
| Alerts (notifications) | 🔔 | ✓ | ✓ | ✓ |
| Post Job | ➕ | ✓ | | |
| Quotes | 📋 | | ✓ | |
| Chat | 💬 | ✓ | ✓ | ✓ |
| Payment Tracker | 💳 | ✓ | | |
| Referral | 👤 | | | ✓ |
| My Jobs | 🗂️ | ✓ | ✓ | |
| Schedule (Recurring) | 🔁 | ✓ | ✓ | |
| Find Providers | 🔍 | ✓ | | |
| File Dispute | ⚖️ | ✓ | ✓ | |
| My Disputes | 📋 | ✓ | ✓ | |
| Availability | 🟢 | | ✓ | |
| Support Tickets | 🎫 | ✓ | ✓ | ✓ |
| Loyalty Points | ⭐ | ✓ | ✓ | ✓ |

**Additional capabilities:**

- **Omni-search** — global search bar in the header (jobs, providers, categories)
- **Wallet bar** — balance + escrow amount shown in header for clients and providers
- **KYC status bar** — pending/rejected identity verification alert for providers
- **Announcement banner** — dismissable system-wide announcements
- **Context page actions** — floating action buttons injected on localpro.asia and PayMongo checkout pages
- **Text selection menu** — highlight any text on any page to prefill a job post or referral form

---

## Architecture

```
popup (HTML/TS)
    │
    │  chrome.runtime.sendMessage
    ▼
background/service-worker.ts   ←── SSE stream (real-time notifications)
    │                           ←── Alarms (polling: jobs, payments, status, recurring, token)
    │  fetch + credentials:include
    ▼
localpro.asia API  /  paymongo.com
```

The popup and content scripts **never call the API directly**. All network requests go through the service worker via typed message passing. This keeps cookies and session state centralized and avoids CORS issues in content script contexts.

---

## Project Structure

```
companion/
├── manifest.json                  # MV3 manifest (source)
├── package.json
├── build.js                       # esbuild bundler script
├── tsconfig.json
├── types.ts                       # Shared ExtMessage union + domain types
│
├── background/
│   └── service-worker.ts          # All API calls, SSE, alarms, badge
│
├── content/
│   ├── content-script.ts          # Text-select prefill + payment redirect detection (<all_urls>)
│   └── context-actions.ts         # FAB injection on localpro.asia + paymongo.com
│
├── popup/
│   ├── popup.ts                   # Entry point — auth guard, tab grid, shell UI
│   ├── index.html
│   ├── styles.css
│   ├── utils.ts                   # send(), formatRelative(), relativeTime(), formatPHP(), el()
│   └── components/
│       ├── LoginView.ts
│       ├── NotificationList.ts
│       ├── QuickJobPost.ts
│       ├── QuickQuote.ts
│       ├── ChatView.ts
│       ├── PaymentStatus.ts
│       ├── PesoReferral.ts
│       ├── SupportTickets.ts
│       ├── LoyaltyPoints.ts
│       ├── ProviderSearch.ts
│       ├── JobTracker.ts
│       ├── RecurringJobs.ts
│       ├── DisputeWizard.ts       # File Dispute + My Disputes (split tabs)
│       └── AvailabilityToggle.ts
│
├── utils/
│   └── api.ts                     # All typed API functions (used only by service worker)
│
└── dist/                          # Build output — load this folder in Chrome
    ├── manifest.json
    ├── popup.html
    ├── styles.css
    ├── background.js
    ├── popup.js
    ├── content.js
    ├── context-actions.js
    └── icons/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Google Chrome (or any Chromium-based browser)

### Install dependencies

```bash
cd companion
npm install
```

### Load in Chrome (development)

1. Run the dev build:
   ```bash
   npm run build
   ```
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `companion/dist/` folder

The extension icon appears in the toolbar. Click it to open the popup.

---

## Development

```bash
# One-time build
npm run build

# Watch mode — rebuilds on every file save
npm run watch
```

The watch build includes **inline source maps** for easy DevTools debugging. Open the popup, right-click → **Inspect**, then check the Sources panel.

> **Tip:** After editing `manifest.json`, go to `chrome://extensions/` and click the reload icon on the extension card.

---

## Production Build

```bash
npm run build:prod
```

This runs esbuild with `minify: true` and no source maps. The output in `dist/` is ready to package for the Chrome Web Store.

To create a ZIP for submission:

```bash
cd dist
zip -r ../localpro-companion-v1.0.1.zip .
```

---

## Permissions Explained

| Permission | Why it's needed |
|-----------|----------------|
| `storage` | Persist cached user, notification badge count, tracked payments, job status cache, and dispute drafts across service-worker restarts |
| `alarms` | Schedule background polling (jobs every 5 min, payments every 30 s, job status every 3 min, recurring reminders every 30 min, token check every 10 min) |
| `notifications` | Show OS-level push notifications for new jobs, payment confirmations, and recurring job reminders |
| `activeTab` | Auto-fill PayMongo session ID from the current tab's URL in the Payment Tracker |
| `tabs` | Read the current tab URL for payment redirect detection |
| `scripting` | Inject the floating action button on context-aware pages |

**Host permissions:**

| Host | Why |
|------|-----|
| `https://*.localpro.asia/*` | All API calls + SSE stream |
| `https://www.paymongo.com/*` | Payment status polling |
| `https://dashboard.paymongo.com/*` | Payment checkout tracking |

---

## Role System

Three roles are defined. The popup filters the home grid at render time — users only see tiles their role permits.

| Role | Who | Key permissions |
|------|-----|----------------|
| `client` | Homeowners / businesses hiring providers | Post jobs, pay, track payments, search providers, file disputes |
| `provider` | Skilled tradespeople / service workers | See job quotes, manage availability, track milestones, file disputes |
| `peso` | DOLE-PESO field officers | Refer candidates to LocalPro, access support and loyalty |

Role is read from the API at login and cached in `chrome.storage.local`. It is re-validated on every `GET_AUTH` message.

---

## Background Polling & Real-Time

The service worker runs five alarms and one SSE connection:

| Alarm | Interval | What it does |
|-------|----------|-------------|
| `companion_job_poll` | 5 min | Fetches new jobs for providers; fires OS notification for each unseen job |
| `companion_payment_poll` | 30 s | Polls tracked PayMongo sessions; notifies when `status === "paid"` and stops polling |
| `companion_job_status_poll` | 3 min | Detects job status changes (e.g., accepted → in-progress); notifies the user |
| `companion_recurring_poll` | 30 min | Checks upcoming recurring jobs; reminds users 30 minutes before scheduled time |
| `companion_token_check` | 10 min | Calls `GET /api/me`; if session expired, attempts refresh then clears auth |

**SSE** connects to `/api/notifications/stream` immediately after login. Each non-heartbeat event increments the toolbar badge. If the stream drops, the next alarm reconnects it automatically.

---

## Content Scripts

### `content.js` — runs on `<all_urls>`

- **Text selection → Job prefill:** Highlights of up to 2 000 characters show a "Post as Job on LocalPro" floating button. Clicking stores the text in `chrome.storage.session`; the popup reads and clears it on next open.
- **PESO referral prefill:** Same mechanic with a "Refer to LocalPro" button, visible only to `peso`-role users.
- **Payment redirect detection:** On pages whose URL contains `?session_id=cs_live_…`, the session ID is captured and stored so the Payment Tracker auto-fills it.

### `context-actions.js` — runs on `*.localpro.asia/*` and `*.paymongo.com/checkout/*`

Injects a floating action button (FAB) tailored to the current page:

| URL pattern | FAB shown | Role |
|-------------|-----------|------|
| `paymongo.com/checkout/*` | Track this payment | any |
| `localpro.asia/jobs/[id]` | Quick Quote | provider |
| `localpro.asia/client/my-jobs` | Rate Provider | client |

---

## Adding a New Feature

1. **API function** — add it to `utils/api.ts` following the existing `apiFetch` pattern.
2. **Message handler** — add a `case "MY_MESSAGE":` block in `background/service-worker.ts`.
3. **Type** — add the message shape to the `ExtMessage` union in `types.ts`.
4. **Component** — create `popup/components/MyFeature.ts` that exports `renderMyFeature(container)`.
5. **Tab entry** — add an entry to `TABS` in `popup/popup.ts`, with the correct `roles` array if role-restricted.
6. If background polling is needed, add an alarm name to the `ALARMS` constant and a handler in `chrome.alarms.onAlarm`.

---

## Notes

- All DOM in components is built via `createElement` / `textContent` — no `innerHTML` with user data. This prevents XSS by design.
- The CSP blocks `unsafe-eval` and external scripts: `script-src 'self'; object-src 'self'`.
- Dispute drafts persist across popup opens using `chrome.storage.session` (cleared when the browser session ends).
- The extension coexists safely with the Job Importer extension — all storage keys are namespaced with `companion_`.
