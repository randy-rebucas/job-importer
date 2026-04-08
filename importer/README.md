# LocalPro Job Importer — Chrome Extension

A production-ready Manifest V3 Chrome Extension that detects job posts on **Facebook** and **LinkedIn**, lets you review and edit the extracted data, and imports them directly into the **LocalPro** platform via API.

---

## Features

- Detects job posts using keyword scoring + heuristics (phone numbers, salary mentions, location)
- Auto-confidence scoring (0–100%) displayed on each detected post
- Auto-category tagging (Plumbing, Electrical, Cleaning, IT, etc.)
- Shadow DOM injection — zero CSS conflicts with host pages
- Editable modal preview before submitting
- JWT authentication via email/password login or token paste
- Infinite scroll support via MutationObserver + debouncing
- Duplicate post prevention via WeakSet tracking

---

## Project Structure

```
localpro-crome-extension/
└── importer/
    ├── extension/
    │   ├── manifest.json          # MV3 manifest
    │   ├── content.ts             # Content script: detection + button injection
    │   ├── background.ts          # Service worker: API calls + auth
    │   ├── popup.html             # Extension popup UI
    │   ├── popup.ts               # Popup logic: login / logout
    │   ├── styles.css             # Popup styles
    │   ├── types.ts               # Shared TypeScript types
    │   ├── utils/
    │   │   ├── parser.ts          # detectJobPost(), extractJobData(), scoring
    │   │   ├── domHelpers.ts      # Button + modal (Shadow DOM)
    │   │   └── api.ts             # Fetch wrapper for LocalPro API
    │   ├── icons/                 # PNG icons (16, 48, 128px)
    │   └── dist/                  # Build output — load THIS in Chrome
    ├── build.js                   # esbuild config
    ├── generate-icons.js          # Icon generator (pure Node.js)
    ├── package.json
    └── tsconfig.json
```

---

## Setup

### 1. Install dependencies

```bash
cd importer
npm install
```

### 2. Configure the API base URL

Open `importer/extension/utils/api.ts` and update `API_BASE_URL`:

```ts
export const API_BASE_URL = "https://api.localpro.app"; // your backend URL
```

Also update `host_permissions` in `importer/extension/manifest.json` to match your API domain.

### 3. Build

```bash
npm run build
```

Output lands in `importer/extension/dist/`.

For development with auto-rebuild:

```bash
npm run watch
```

### 4. Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `importer/extension/dist/` folder

---

## Authentication

Click the extension icon in the Chrome toolbar:

- **Email + Password** — logs in via `POST /api/auth/login` and stores the JWT in `chrome.storage.local`
- **Paste Token** — directly saves a JWT if you already have one

The token is stored securely in `chrome.storage.local` and never exposed to page scripts.

---

## API Contract

### Login
```
POST /api/auth/login
{ "email": "...", "password": "..." }
→ { "token": "<jwt>", "user": { "email": "..." } }
```

### Import Job
```
POST /api/jobs/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "source": "facebook" | "linkedin",
  "source_url": "string",
  "posted_by": "string",
  "timestamp": "ISO8601",
  "location": "string (optional)",
  "budget": number (optional),
  "category": "string (optional)"
}

→ { "success": true, "job_id": "string" }
  or
→ { "success": false, "error": "string" }
```

---

## Detection Logic

Posts are scored using a weighted keyword list. A post must reach a **score ≥ 5** to be flagged:

| Signal | Score |
|---|---|
| "hiring", "we are hiring" | +3–4 |
| Phone number detected | +2 |
| Currency / salary mention | +3 |
| "apply now", "send cv" | +3 |
| Job-specific roles (plumber, electrician…) | +2–3 |

The confidence score (0–1) is `min(score / 20, 1)` and displayed as a badge.

---

## Regenerate Icons

```bash
cd importer
node generate-icons.js
```

This creates `importer/extension/icons/icon16.png`, `icon48.png`, and `icon128.png` using pure Node.js — no external dependencies required.

---

## Security Notes

- JWT token stored in `chrome.storage.local` (not accessible to page scripts)
- All data extraction happens client-side (no background scraping)
- Only HTTPS API calls
- Extracted data is sanitized before display or submission
- Shadow DOM prevents injected UI from leaking styles or being manipulated by the host page
