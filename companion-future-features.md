# LocalPro Companion — Future Feature Roadmap

All features below are buildable against existing API routes in `localpro-marketplace`.
No new backend work required unless noted.

---

## Tier 1 — High Value, Low Effort

### 1. Wallet Balance Widget
- **Routes:** `GET /api/wallet`, `GET /api/wallet/transactions`
- **Roles:** client, provider
- Show current balance + pending escrow in popup header
- One-tap top-up link and withdrawal shortcut
- **Why first:** Every user sees money — highest engagement feature

### 2. Quick Review after Job Completion
- **Routes:** `POST /api/reviews`, `POST /api/jobs/[id]/mark-complete`
- **Roles:** client
- After a job is completed, show a banner in Notifications: "Rate your experience with [Provider]"
- Star rating + optional comment, submitted inline without leaving the extension
- **Why:** Reviews are a core trust signal; zero-friction capture = more reviews

### 3. Provider Search / Hire
- **Routes:** `GET /api/search`, `GET /api/providers`, `POST /api/favorites/[providerId]`
- **Roles:** client
- Text search for providers directly in the popup
- Show avatar, rating, skills, hourly rate
- Save/unfavorite providers with a single tap
- **Why:** Lets clients act on a job without ever opening a full tab

### 4. Support Ticket Quick-Create
- **Routes:** `POST /api/support/tickets`, `GET /api/support/tickets`
- **Roles:** all
- Single form: Subject, Category, Description
- Show status of open tickets (waiting / in-progress / resolved)
- **Why:** Users hit problems while on other sites — capturing without tab switching is high value

### 5. Loyalty Points + Redeem
- **Routes:** `GET /api/loyalty`, `POST /api/loyalty/redeem`, `GET /api/loyalty/referral`
- **Roles:** all
- Show current points balance
- One-tap redeem button + referral link for earning more points
- **Why:** Surfacing gamification in the extension keeps it top-of-mind, drives retention

### 6. Announcement Banner
- **Routes:** `GET /api/announcements`
- **Roles:** all
- On popup open, check for active system announcements (maintenance windows, promotions)
- Dismissible banner above the tab bar
- **Why:** Already fully built on the backend — zero backend cost to surface here

---

## Tier 2 — High Value, Moderate Effort

### 7. Active Job Status Tracker
- **Routes:** `GET /api/jobs`, `GET /api/jobs/[id]`, `GET /api/jobs/[id]/milestones`, `POST /api/jobs/[id]/mark-complete`
- **Roles:** client, provider
- Client view: list of their active jobs with status pill (open → assigned → in-progress → complete)
- Milestone progress bar per job
- One-tap "Mark Complete" button
- Provider view: jobs currently assigned to them
- **Why:** Central at-a-glance view; eliminates needing to open the web app for a status check

### 8. Quote Template Quick-Send
- **Routes:** `GET /api/quote-templates`, `POST /api/quotes`
- **Roles:** provider
- In the QuickQuote tab, allow picking a saved template from a dropdown
- Auto-fills amount / message / timeline
- **Why:** Providers quote many similar jobs — templates save significant time per submission

### 9. Omni-Search
- **Routes:** `GET /api/search`
- **Roles:** all
- Single search box (could live in the popup header) that searches jobs, providers, and categories simultaneously
- Results open the relevant app page via `window.open`
- **Why:** Fastest possible path from popup → action without building a full UI

### 10. Recurring Job Reminder
- **Routes:** `GET /api/recurring`
- **Roles:** client, provider
- Mini calendar strip showing upcoming scheduled/recurring jobs for the week
- "Start Now" button links to the job detail page
- Background alarm can notify 30 minutes before a scheduled job
- **Why:** Reduces missed recurring appointments, drives reliability scores

---

## Tier 3 — Moderate Value, Needs More Design

### 11. Dispute Filing Assistant
- **Routes:** `POST /api/disputes`, `GET /api/disputes`, `POST /api/upload`
- **Roles:** all
- Multi-step wizard: select job → describe issue → attach screenshot → submit
- Show existing dispute status inline
- Content script enhancement: detect if user is on a social media post related to a disputed provider and auto-fill context
- **Why:** Disputes are stressful; guided flow reduces abandonment

### 12. Provider Availability Toggle
- **Routes:** `PATCH /api/provider`
- **Roles:** provider
- Single on/off toggle: "Available for new jobs"
- Sends `{ isAvailable: true/false }` — nothing else
- **Why:** Currently buried in profile settings; providers go unavailable during holidays/busy periods frequently

### 13. Context-Aware Page Actions (Content Script)
- **Routes:** depends on action
- **Roles:** all
- Detect URL patterns and inject contextual actions:
  - On `paymongo.com/checkout/*` → auto-offer "Track this payment"
  - On `localpro.asia/jobs/[id]` → inject a "Quick Quote" button directly into the page DOM
  - On `localpro.asia/client/my-jobs` → inject "Rate" button alongside completed jobs
- Builds on the existing content script floating-menu pattern
- **Why:** Meets users at the exact moment they need action, zero navigation required

### 14. KYC Status + Nudge
- **Routes:** `GET /api/kyc`
- **Roles:** provider
- Show KYC verification status in the popup header (verified ✓ / pending ⏳ / rejected ✗)
- If pending or rejected → one-tap link to upload docs
- **Why:** Unverified providers cannot receive payments; surfacing this unblocks them faster

---

## Priority Matrix

| # | Feature | Roles | Effort | Backend Route(s) |
|---|---|---|---|---|
| 1 | Wallet Balance | all | Low | `/api/wallet` |
| 2 | Quick Review | client | Low | `/api/reviews` |
| 3 | Provider Search | client | Low | `/api/search`, `/api/favorites` |
| 4 | Support Ticket | all | Low | `/api/support/tickets` |
| 5 | Loyalty Points | all | Low | `/api/loyalty` |
| 6 | Announcement Banner | all | Trivial | `/api/announcements` |
| 7 | Active Job Tracker | client, provider | Medium | `/api/jobs/[id]/milestones` |
| 8 | Quote Templates | provider | Medium | `/api/quote-templates` |
| 9 | Omni-Search | all | Medium | `/api/search` |
| 10 | Recurring Reminder | client, provider | Medium | `/api/recurring` |
| 11 | Dispute Wizard | all | High | `/api/disputes`, `/api/upload` |
| 12 | Availability Toggle | provider | Trivial | `/api/provider` |
| 13 | Context Page Actions | all | Medium | content script only |
| 14 | KYC Nudge | provider | Low | `/api/kyc` |

---

## Implementation Notes

- All API calls use `credentials: "include"` (HttpOnly cookie auth) — same pattern as the rest of the companion
- Add new message types to `background/service-worker.ts` switch, new tab entries to `popup.ts` TABS array, and new component files under `popup/components/`
- For features needing background polling (Recurring Reminder, Job Tracker updates), add a new alarm in `ALARMS` constant and handler in `chrome.alarms.onAlarm`
- Context Page Actions (Feature 13) should only inject buttons on `localpro.asia` pages — tighten the content script `matches` pattern for those specific injections
