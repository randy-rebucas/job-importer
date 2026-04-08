# LocalPro Marketplace — API Reference

> **Base URL:** `https://<your-domain>` (or `http://localhost:3000` for local dev)
>
> All authenticated requests require a valid JWT stored in HttpOnly cookies. From a Chrome extension, include `credentials: 'include'` in every `fetch()` call to send cookies.

---

## Authentication

All protected endpoints return `401 Unauthorized` if no valid session cookie is present. Most endpoints also enforce role-based access — callers will receive `403 Forbidden` if their role lacks permission.

### Cookies

| Cookie | Description |
|---|---|
| `access_token` | Short-lived JWT (15 min) |
| `refresh_token` | Long-lived JWT (7 days) |

---

## Quick-start: Chrome Extension Setup

```js
const API = 'https://<your-domain>';

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',          // send HttpOnly cookies
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

---

## Table of Contents

1. [Auth](#1-auth)
2. [Current User](#2-current-user)
3. [Jobs](#3-jobs)
4. [Quotes](#4-quotes)
5. [Quote Templates](#5-quote-templates)
6. [Messages & Chat](#6-messages--chat)
7. [Notifications](#7-notifications)
8. [Payments & Wallet](#8-payments--wallet)
9. [Transactions](#9-transactions)
10. [Favorites](#10-favorites)
11. [Reviews](#11-reviews)
12. [Search & Skills](#12-search--skills)
13. [Categories](#13-categories)
14. [Announcements](#14-announcements)
15. [Loyalty & Referrals](#15-loyalty--referrals)
16. [Recurring Schedules](#16-recurring-schedules)
17. [Consultations](#17-consultations)
18. [Provider Profile](#18-provider-profile)
19. [Support Chat](#19-support-chat)
20. [Business / Organization](#20-business--organization)
21. [AI Endpoints](#21-ai-endpoints)
22. [PESO Employment Office](#22-peso-employment-office)
23. [Admin](#23-admin)
24. [Public (No Auth)](#24-public-no-auth)

---

## 1. Auth

### POST `/api/auth/register`
Register a new account.

**Body**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "client | provider"
}
```

**Response** `201`
```json
{ "message": "Registered successfully" }
```

---

### POST `/api/auth/login`
Log in with email and password. Sets `access_token` + `refresh_token` cookies.

**Body**
```json
{ "email": "string", "password": "string" }
```

**Response** `200`
```json
{ "message": "Logged in", "user": { "id": "...", "name": "...", "role": "..." } }
```

---

### POST `/api/auth/logout`
Clears session cookies.

**Response** `200`
```json
{ "message": "Logged out" }
```

---

### POST `/api/auth/refresh`
Exchanges refresh token for a new access token. Called automatically — extension should call this on 401 and retry.

**Response** `200`
```json
{ "message": "Token refreshed" }
```

---

### POST `/api/auth/phone/send`
Send OTP to a phone number via Twilio.

**Body**
```json
{ "phone": "+639XXXXXXXXX" }
```

**Response** `200`
```json
{ "message": "OTP sent" }
```

---

### POST `/api/auth/phone/verify`
Verify OTP and issue session cookies.

**Body**
```json
{ "phone": "+639XXXXXXXXX", "code": "123456" }
```

**Response** `200`
```json
{ "message": "Verified", "user": { "id": "...", "name": "...", "role": "..." } }
```

---

### GET `/api/auth/facebook`
Redirects to Facebook OAuth dialog. Not suitable for extension popup flows.

---

### POST `/api/auth/verify-email`
Submit email verification token.

**Body**
```json
{ "token": "string" }
```

**Response** `200`
```json
{ "message": "Email verified" }
```

---

### POST `/api/auth/forgot-password`
Send password-reset email.

**Body**
```json
{ "email": "string" }
```

**Response** `200`
```json
{ "message": "Reset email sent" }
```

---

### POST `/api/auth/reset-password`
Reset password with token.

**Body**
```json
{ "token": "string", "password": "string" }
```

**Response** `200`
```json
{ "message": "Password reset" }
```

---

## 2. Current User

### GET `/api/auth/me`
Returns the authenticated user's profile.

**Response** `200`
```json
{
  "_id": "...",
  "name": "string",
  "email": "string",
  "role": "client | provider | admin | peso",
  "isEmailVerified": true,
  "avatar": "url | null"
}
```

---

### POST `/api/auth/me/addresses`
Add a saved address (max 10).

**Body**
```json
{
  "label": "Home",
  "address": "123 Main St",
  "coordinates": { "lat": 14.5, "lng": 121.0 }
}
```

**Response** `200`
```json
{ "addresses": [ ... ] }
```

---

### GET `/api/user/settings`
Get user notification and visibility preferences.

**Response** `200`
```json
{
  "preferences": {
    "emailNotifications": true,
    "pushNotifications": true,
    "profileVisibility": "public"
  }
}
```

---

### PUT `/api/user/settings`
Update preferences (partial update accepted).

**Body** — any subset of the preferences object above.

**Response** `200`
```json
{ "preferences": { ... } }
```

---

## 3. Jobs

### GET `/api/jobs`
List jobs. Behavior differs by role.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status |
| `category` | string | Filter by category ID |
| `page` | number | Default `1` |
| `limit` | number | Default `10` |
| `aiRank` | boolean | Provider only — GPT-4o-mini ranked results |

**Response** `200`
```json
{
  "data": [ { "_id": "...", "title": "...", "status": "...", ... } ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### POST `/api/jobs`
Create a new job (client only).

**Body**
```json
{
  "title": "string",
  "description": "string",
  "category": "categoryId",
  "budget": 1500,
  "location": "string",
  "coordinates": { "lat": 14.5, "lng": 121.0 },
  "tags": ["plumbing", "repair"]
}
```

**Response** `201`
```json
{ "_id": "...", "title": "...", "status": "open", ... }
```

---

### GET `/api/jobs/[id]`
Get a single job by ID.

**Response** `200` — full job document.

---

### PUT `/api/jobs/[id]`
Update a job (client only, must own it).

**Body** — partial job fields.

**Response** `200` — updated job.

---

### DELETE `/api/jobs/[id]`
Delete / cancel a job (client only).

**Response** `200`
```json
{ "message": "Job deleted" }
```

---

### GET `/api/jobs/[id]/quotes`
Get all quotes submitted for a job (job owner only).

**Response** `200` — array of quote objects.

---

### POST `/api/jobs/[id]/withdraw`
Provider withdraws from a funded job (reverts job to `open`).

**Body**
```json
{ "reason": "string" }
```

**Response** `200`
```json
{ "message": "Withdrawn" }
```

---

## 4. Quotes

### GET `/api/quotes`
Provider — returns the list of job IDs the provider has already quoted.

**Response** `200`
```json
{ "quotedJobIds": ["jobId1", "jobId2"] }
```

---

### POST `/api/quotes`
Provider submits a quote for a job.

**Body**
```json
{
  "jobId": "string",
  "proposedAmount": 2000,
  "laborCost": 1500,
  "materialsCost": 500,
  "timeline": "3 days",
  "milestones": [ { "title": "...", "amount": 500 } ],
  "notes": "string",
  "proposalDocUrl": "url",
  "sitePhotos": ["url1"],
  "message": "string"
}
```

**Response** `201` — quote object.

---

### PUT `/api/quotes/[id]`
Update a quote (provider only, before client accepts).

**Body** — partial quote fields.

**Response** `200` — updated quote.

---

### DELETE `/api/quotes/[id]`
Retract a quote.

**Response** `200`
```json
{ "message": "Quote retracted" }
```

---

### POST `/api/quotes/[id]/accept`
Client accepts a quote.

**Response** `200` — updated job + quote.

---

## 5. Quote Templates

### GET `/api/quote-templates`
List provider's saved templates.

**Response** `200` — array of template objects.

---

### POST `/api/quote-templates`
Create a template (max 20 per provider).

**Body**
```json
{
  "name": "Standard Plumbing Quote",
  "laborCost": 1500,
  "materialsCost": 500,
  "timeline": "2 days",
  "milestones": [],
  "notes": "string"
}
```

**Response** `201` — template object.

---

### PATCH `/api/quote-templates/[id]`
Update a template.

**Body** — partial template fields.

**Response** `200` — updated template.

---

### DELETE `/api/quote-templates/[id]`
Delete a template.

**Response** `200`
```json
{ "success": true }
```

---

## 6. Messages & Chat

All thread IDs follow the convention:
- **Job thread:** `threadId = jobId`
- **Support thread:** `threadId = "support:<userId>"`

### GET `/api/messages`
Get total unread message count.

**Response** `200`
```json
{ "unreadCount": 3 }
```

---

### GET `/api/messages/threads`
List all message threads for the current user.

**Response** `200`
```json
{
  "threads": [
    {
      "threadId": "jobId",
      "jobTitle": "Fix leaking pipe",
      "lastMessage": { "body": "...", "createdAt": "..." },
      "unreadCount": 2,
      "otherParty": { "_id": "...", "name": "...", "avatar": "..." }
    }
  ]
}
```

---

### GET `/api/messages/[threadId]`
Get all messages in a thread.

**Response** `200` — array of message objects.

---

### POST `/api/messages/[threadId]`
Send a message.

**Body**
```json
{ "body": "Hi, when can you start?" }
```

**Response** `201` — message object.

---

### POST `/api/messages/[threadId]/attachment`
Upload a file attachment (max 10 MB). Send as `multipart/form-data`.

**Form field:** `file`

**Response** `201` — message object with file info.

---

### GET `/api/messages/stream/[threadId]` *(SSE)*
Server-Sent Events stream for real-time messages.

```js
const es = new EventSource(`${API}/api/messages/stream/${threadId}`, {
  withCredentials: true,
});
es.onmessage = (e) => {
  const message = JSON.parse(e.data);
};
```

> **Note:** Chrome extensions can use `EventSource` directly from a background service worker or content script.

---

## 7. Notifications

### GET `/api/notifications`
List current user's notifications.

**Response** `200`
```json
{
  "notifications": [
    { "_id": "...", "type": "...", "message": "...", "read": false, "createdAt": "..." }
  ],
  "unreadCount": 5
}
```

---

### PATCH `/api/notifications`
Mark **all** notifications as read.

**Response** `200`
```json
{ "success": true }
```

---

### PATCH `/api/notifications/[id]`
Mark a single notification as read.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/notifications/stream` *(SSE)*
Real-time notification stream.

```js
const es = new EventSource(`${API}/api/notifications/stream`, {
  withCredentials: true,
});
es.onmessage = (e) => {
  const notification = JSON.parse(e.data);
};
```

---

## 8. Payments & Wallet

### POST `/api/payments`
Initiate PayMongo Checkout Session for escrow funding.

**Body**
```json
{ "jobId": "string" }
```

**Response** `201`
```json
{
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "sessionId": "cs_..."
}
```
> In dev (no `PAYMONGO_SECRET_KEY`), escrow is funded immediately and `{ "simulated": true }` is returned.

---

### GET `/api/payments/[sessionId]`
Poll payment status.

**Query:** `jobId` (optional) — triggers escrow confirmation if provided.

**Response** `200`
```json
{
  "payment": { ... },
  "liveStatus": "paid | unpaid | expired"
}
```

---

### GET `/api/wallet`
Get wallet balance and recent activity.

**Response** `200`
```json
{
  "balance": 5000,
  "transactions": [ ... ],
  "withdrawals": [ ... ]
}
```

---

### POST `/api/wallet/withdraw`
Request a withdrawal.

**Body**
```json
{
  "amount": 2000,
  "bankName": "BDO",
  "accountNumber": "1234567890",
  "accountName": "Juan dela Cruz"
}
```

**Response** `201`
```json
{ "message": "Withdrawal request submitted", "withdrawal": { ... } }
```

---

## 9. Transactions

### GET `/api/transactions`
Paginated transaction history (filtered by role).

**Query**

| Param | Type | Default |
|---|---|---|
| `page` | number | `1` |
| `limit` | number | `10` |

**Response** `200`
```json
{
  "data": [ ... ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### GET `/api/transactions/export`
Download transaction history as CSV.

**Response** `200` — `text/csv` file download.

---

## 10. Favorites

### GET `/api/favorites`
List favorite providers.

**Response** `200` — array of enriched provider profiles.

---

### POST `/api/favorites`
Add a provider to favorites.

**Body**
```json
{ "providerId": "string" }
```

**Response** `200`
```json
{ "favorited": true }
```

---

### DELETE `/api/favorites/[providerId]`
Remove provider from favorites.

**Response** `200`
```json
{ "favorited": false }
```

---

## 11. Reviews

### GET `/api/reviews`
List reviews. Optionally filter by provider.

**Query:** `providerId` (optional)

**Response** `200` — array of review objects.

---

### POST `/api/reviews`
Submit a review (client only, after job completion).

**Body**
```json
{
  "jobId": "string",
  "rating": 5,
  "feedback": "Great work!",
  "breakdown": {
    "quality": 5,
    "professionalism": 5,
    "punctuality": 4,
    "communication": 5
  }
}
```

**Response** `201` — review object.

---

### GET `/api/providers/[id]/reviews`
Paginated reviews for a specific provider.

**Query:** `page`, `limit`

**Response** `200`
```json
{ "reviews": [ ... ], "total": 20, "page": 1, "limit": 10 }
```

---

## 12. Search & Skills

### GET `/api/search`
Role-aware search across jobs, users, and providers.

**Query:** `q` (min 2 characters, required)

**Response** `200`
```json
{ "results": [ { "type": "job | user | provider", ... } ] }
```

---

### GET `/api/skills`
Search available skills.

**Query:** `q`, `limit` (max 20)

**Response** `200`
```json
{ "skills": ["Plumbing", "Electrical", ...] }
```

---

## 13. Categories

### GET `/api/categories`
List all active service categories (cached 24 h, no auth required).

**Response** `200`
```json
[
  { "_id": "...", "name": "Plumbing", "icon": "🔧", "description": "..." }
]
```

---

## 14. Announcements

### GET `/api/announcements`
List active announcements for the current user's role.

**Response** `200`
```json
{
  "announcements": [
    { "_id": "...", "title": "...", "message": "...", "type": "info | warning | success | danger" }
  ]
}
```

---

## 15. Loyalty & Referrals

### GET `/api/loyalty`
Get loyalty points and last 20 transactions.

**Response** `200`
```json
{
  "account": { "points": 120, "tier": "silver" },
  "ledger": [ { "points": 10, "reason": "...", "createdAt": "..." } ]
}
```

---

### GET `/api/loyalty/referral`
Get referral code and stats.

**Response** `200`
```json
{
  "referralCode": "ABC123",
  "referralLink": "https://...",
  "referredCount": 3
}
```

---

## 16. Recurring Schedules

### GET `/api/recurring/past-providers`
List providers from completed jobs (for auto-booking).

**Response** `200`
```json
{ "providers": [ ... ] }
```

---

### GET `/api/recurring/[id]`
Get a single recurring schedule.

**Response** `200` — recurring schedule object.

---

### PUT `/api/recurring/[id]`
Update a schedule.

**Body**
```json
{
  "title": "string",
  "description": "string",
  "budget": 500,
  "location": "string",
  "maxRuns": 12,
  "autoPayEnabled": true,
  "providerId": "string"
}
```

**Response** `200` — updated schedule.

---

### PATCH `/api/recurring/[id]`
Control a schedule.

**Body**
```json
{ "action": "pause | resume | cancel" }
```

**Response** `200` — updated schedule.

---

### GET `/api/recurring/saved-method`
Get saved payment method info.

**Response** `200`
```json
{ "savedMethod": { "last4": "1234", "brand": "Visa" } }
```

---

### DELETE `/api/recurring/saved-method`
Remove saved payment method.

**Response** `200`
```json
{ "ok": true }
```

---

## 17. Consultations

### GET `/api/consultations`
List consultations.

**Query:** `status` (optional), `page`, `limit`

**Response** `200`
```json
{ "data": [ ... ], "total": 10, "page": 1, "limit": 10 }
```

---

### POST `/api/consultations`
Create a consultation request.

**Body**
```json
{
  "targetUserId": "string",
  "type": "site_inspection | chat",
  "title": "string",
  "description": "string",
  "location": "string",
  "coordinates": { "type": "Point", "coordinates": [121.0, 14.5] },
  "photos": ["url1", "url2"]
}
```

**Response** `201` — consultation object.

---

### PUT `/api/consultations/[id]/respond`
Provider responds to a consultation.

**Body**
```json
{
  "action": "accept | decline",
  "estimateAmount": 1500,
  "estimateNote": "Includes materials"
}
```

**Response** `200` — updated consultation.

---

### POST `/api/consultations/[id]/messages`
Send message in a consultation thread.

**Body**
```json
{ "body": "string" }
```

**Response** `201` — message object.

---

## 18. Provider Profile

### POST `/api/providers/profile/service-areas`
Add a service area (max 10).

**Body**
```json
{
  "label": "Quezon City",
  "address": "string",
  "coordinates": { "lat": 14.6, "lng": 121.1 }
}
```

**Response** `201` — updated service areas array.

---

### DELETE `/api/providers/profile/service-areas/[id]`
Remove a service area.

**Response** `200` — updated service areas array.

---

## 19. Support Chat

### GET `/api/support` (user sends)
Fetch the user's support thread.

**Response** `200` — array of messages.

---

### POST `/api/support`
Send a message to support.

**Body**
```json
{ "body": "string" }
```

**Response** `201` — message object.

---

### GET `/api/support/stream` *(SSE)*
Real-time support replies from admin.

```js
const es = new EventSource(`${API}/api/support/stream`, { withCredentials: true });
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 20. Business / Organization

### GET `/api/business/org`
Get (or auto-create) the user's business organization.

**Response** `200`
```json
{ "org": { "_id": "...", "name": "...", "type": "hotel | company | other", ... } }
```

---

### POST `/api/business/org`
Create an organization.

**Body**
```json
{ "name": "Acme Corp", "type": "company", "defaultMonthlyBudget": 50000 }
```

**Response** `201`
```json
{ "org": { ... } }
```

---

### PATCH `/api/business/org`
Update an organization.

**Body**
```json
{ "orgId": "string", "name": "string", "logo": "url", "defaultMonthlyBudget": 60000 }
```

**Response** `200`
```json
{ "org": { ... } }
```

---

### GET `/api/business/dashboard`
Get business dashboard snapshot.

**Query:** `orgId` (required)

**Response** `200` — dashboard stats object.

---

### GET `/api/business/jobs`
List org's jobs with filters.

**Query:** `orgId` (required), `locationId`, `status`, `category`, `providerId`, `dateFrom`, `dateTo`, `page`, `limit`

**Response** `200` — paginated job list.

---

### GET `/api/business/members`
List org members or search by email.

**Query:** `orgId` (required), `searchEmail` (optional)

**Response** `200`
```json
{ "members": [ ... ] }
```

---

### POST `/api/business/members`
Add a member.

**Body**
```json
{
  "orgId": "string",
  "userId": "string",
  "role": "manager | supervisor | finance",
  "locationAccess": ["locationId1"]
}
```

**Response** `201`
```json
{ "member": { ... } }
```

---

### PATCH `/api/business/members`
Update a member's role or access.

**Body**
```json
{ "orgId": "string", "memberId": "string", "role": "finance", "locationAccess": [] }
```

**Response** `200`
```json
{ "member": { ... } }
```

---

### DELETE `/api/business/members`
Remove a member.

**Query:** `orgId`, `memberId` (required)

**Response** `200`
```json
{ "success": true }
```

---

### POST `/api/business/locations`
Add a location to an org.

**Body**
```json
{
  "orgId": "string",
  "label": "Makati Branch",
  "address": "string",
  "coordinates": { "lat": 14.5, "lng": 121.0 },
  "monthlyBudget": 20000,
  "alertThreshold": 15000,
  "managerId": "userId",
  "allowedCategories": ["catId1"]
}
```

**Response** `201`
```json
{ "org": { ... } }
```

---

### PATCH `/api/business/locations`
Update a location.

**Body** — include `orgId` + `locationId` + fields to change.

**Response** `200`
```json
{ "org": { ... } }
```

---

### DELETE `/api/business/locations`
Remove a location.

**Query:** `orgId`, `locationId` (required)

**Response** `200`
```json
{ "org": { ... } }
```

---

### GET `/api/business/billing`
Get billing and plan information.

**Query:** `orgId` (required)

**Response** `200` — billing object.

---

### POST `/api/business/billing/confirm`
Confirm PayPal order and activate plan.

**Body**
```json
{ "orgId": "string", "orderId": "PAYPAL-ORDER-ID" }
```

**Response** `200`
```json
{ "activated": true, "plan": "gold", "planStatus": "active", "planExpiresAt": "..." }
```

---

## 21. AI Endpoints

All AI endpoints require authentication. Some require Gold or Platinum tier.

### POST `/api/ai/classify-category`
Classify a job title into a category.

**Body**
```json
{
  "title": "Fix leaking bathroom sink",
  "description": "optional",
  "availableCategories": ["Plumbing", "Electrical", "Carpentry"]
}
```

**Response** `200`
```json
{ "category": "Plumbing" }
```

---

### POST `/api/ai/estimate-budget`
Get an AI-estimated budget range.

**Body**
```json
{ "title": "Paint interior walls", "category": "Painting", "description": "3-bedroom house" }
```

**Response** `200`
```json
{ "min": 5000, "max": 12000, "midpoint": 8500, "note": "Estimate includes labor only" }
```

---

### POST `/api/ai/generate-description`
Generate a job description from a title.

**Body**
```json
{ "title": "Install CCTV camera", "category": "Security" }
```

**Response** `200`
```json
{ "description": "..." }
```

---

### POST `/api/ai/suggest-skills`
Suggest skills based on bio and category *(Gold+ providers only)*.

**Body**
```json
{ "bio": "string", "category": "Plumbing", "existingSkills": ["pipe fitting"] }
```

**Response** `200`
```json
{ "skills": ["water heater installation", "drain cleaning"] }
```

---

### POST `/api/ai/suggest-replies`
Get 3 smart reply suggestions for a conversation *(Gold+ providers only)*.

**Body**
```json
{
  "lastMessages": [{ "sender": "client", "body": "Can you start tomorrow?" }],
  "role": "provider",
  "jobTitle": "Fix sink"
}
```

**Response** `200`
```json
{ "replies": ["Yes, I can be there by 9 AM.", "...", "..."] }
```

---

### POST `/api/ai/generate-quote-message`
Generate a professional quote cover message *(Gold+ providers only)*.

**Body**
```json
{
  "jobTitle": "Tile installation",
  "jobDescription": "string",
  "jobBudget": 5000,
  "category": "Carpentry"
}
```

**Response** `200`
```json
{ "message": "...", "timeline": "2–3 days" }
```

---

### POST `/api/ai/summarize-chat`
Summarize a conversation thread.

**Body**
```json
{
  "messages": [{ "sender": "client", "body": "..." }],
  "jobTitle": "Repair roof"
}
```

**Response** `200`
```json
{
  "summary": "...",
  "agreements": ["Provider will start Monday"],
  "nextSteps": ["Client to confirm escrow"]
}
```

---

### POST `/api/ai/generate-consultation-description`
Generate a consultation description *(Gold/Platinum clients only)*.

**Body**
```json
{ "title": "string", "type": "site_inspection | chat" }
```

**Response** `200`
```json
{ "description": "..." }
```

---

### POST `/api/ai/summarize-dispute`
Summarize a dispute *(admin only)*.

**Body**
```json
{
  "reason": "string",
  "jobTitle": "string",
  "raisedByRole": "client | provider",
  "messages": [ ... ]
}
```

**Response** `200`
```json
{ "summary": "..." }
```

---

## 22. PESO Employment Office

> Requires `role: "peso"`.

### GET `/api/peso/dashboard`
PESO dashboard stats.

**Response** `200` — employment stats object.

---

### GET `/api/peso/workforce`
Provider workforce registry.

**Response** `200` — registry object.

---

### POST `/api/peso/jobs`
Post a job on behalf of the PESO office.

**Body** — same as `POST /api/jobs` with optional `isPriority: true`.

**Response** `201` — job object.

---

### POST `/api/peso/referrals`
Refer a provider.

**Body**
```json
{ "providerId": "string", "notes": "string" }
```

**Response** `201` — referral object.

---

### POST `/api/peso/bulk-onboard`
Bulk create provider accounts.

**Body**
```json
[
  { "name": "Juan", "email": "juan@example.com", "phone": "+639...", "skills": ["Plumbing"], "barangay": "Sta. Cruz" }
]
```

**Response** `200`
```json
{ "results": [ { "email": "...", "status": "created | skipped" } ] }
```

---

### PUT `/api/peso/providers/[id]/verify`
Tag a provider as PESO-verified.

**Body**
```json
{ "tags": ["peso_registered", "lgu_resident", "peso_recommended"] }
```

**Response** `200` — updated provider profile.

---

### POST `/api/peso/providers/[id]/certifications`
Add a certification to a provider.

**Body**
```json
{
  "title": "TESDA NCII Plumbing",
  "issuer": "TESDA",
  "issuedAt": "2024-01-15",
  "expiresAt": "2027-01-15"
}
```

**Response** `201` — certification object.

---

### DELETE `/api/peso/providers/[id]/certifications`
Remove a certification.

**Body**
```json
{ "certId": "string" }
```

**Response** `200` — result object.

---

### GET `/api/peso/groups`
List livelihood groups.

**Response** `200`
```json
{ "data": [ ... ], "total": 5 }
```

---

### POST `/api/peso/groups`
Create a livelihood group.

**Body**
```json
{
  "name": "Barangay 1 Builders",
  "type": "construction",
  "barangay": "Sta. Cruz",
  "description": "string",
  "contactPerson": "string",
  "contactPhone": "+639...",
  "memberCount": 12
}
```

**Response** `201` — group object.

---

### PATCH `/api/peso/groups/[id]`
Update a group.

**Body** — partial group fields.

**Response** `200` — updated group.

---

### DELETE `/api/peso/groups/[id]`
Delete a group.

**Response** `200`
```json
{ "success": true }
```

---

### POST `/api/peso/emergency`
Broadcast an emergency job.

**Body**
```json
{
  "jobType": "Debris Clearing",
  "location": "Barangay 5",
  "urgency": "high",
  "workersNeeded": 20,
  "duration": "3 days",
  "notes": "Typhoon aftermath cleanup"
}
```

**Response** `201` — job object.

---

## 23. Admin

> Requires `role: "admin"` or specific capability.

### GET `/api/admin/jobs`
Paginated job list.

**Query:** `status`, `category`, `page`, `limit`

**Response** `200` — paginated jobs.

---

### POST `/api/admin/jobs/[id]/force-withdraw`
Remove provider and reopen job.

**Body**
```json
{ "reason": "Policy violation" }
```

**Response** `200`
```json
{ "message": "Provider removed" }
```

---

### GET `/api/admin/disputes`
List all disputes.

**Response** `200` — array of dispute objects.

---

### GET `/api/admin/users`
List all users.

**Response** `200` — paginated user list.

---

### GET `/api/admin/kyc`
List users with KYC submissions.

**Response** `200` — array of users with KYC data.

---

### GET `/api/admin/fraud`
List flagged jobs and suspicious users.

**Response** `200`
```json
{ "jobs": [ ... ], "users": [ ... ] }
```

---

### GET `/api/admin/staff`
List staff members.

**Response** `200`
```json
{ "staff": [ ... ] }
```

---

### POST `/api/admin/staff`
Create staff member.

**Body**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "capabilities": ["manage_jobs", "manage_disputes", "manage_kyc", "manage_users"]
}
```

**Response** `201`
```json
{ "staff": { ... } }
```

---

### PUT `/api/admin/staff/[id]`
Update staff capabilities or suspend.

**Body**
```json
{ "capabilities": ["manage_jobs"], "isSuspended": false }
```

**Response** `200`
```json
{ "staff": { ... } }
```

---

### DELETE `/api/admin/staff/[id]`
Suspend staff member.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/categories`
List all categories including inactive.

**Response** `200` — array of category objects.

---

### POST `/api/admin/categories`
Create a category.

**Body**
```json
{ "name": "Welding", "icon": "🔥", "description": "string", "order": 5 }
```

**Response** `201` — category object.

---

### GET `/api/admin/announcements`
List all announcements.

**Response** `200`
```json
{ "announcements": [ ... ] }
```

---

### POST `/api/admin/announcements`
Create an announcement.

**Body**
```json
{
  "title": "Maintenance tonight",
  "message": "The platform will be down from 2–4 AM.",
  "type": "warning",
  "targetRoles": ["client", "provider"],
  "isActive": true,
  "expiresAt": "2026-04-07T04:00:00Z"
}
```

**Response** `201` — announcement object.

---

### GET `/api/admin/partners`
List all partners.

**Response** `200` — array of partner objects.

---

### POST `/api/admin/partners`
Create a partner.

**Response** `201` — partner object.

---

### PATCH `/api/admin/partners/[id]`
Update a partner.

**Response** `200` — updated partner.

---

### GET `/api/admin/wallet/withdrawals/[id]`
Get withdrawal request details.

**Response** `200`
```json
{ "withdrawal": { ... } }
```

---

### PATCH `/api/admin/wallet/withdrawals/[id]`
Process a withdrawal.

**Body**
```json
{ "status": "processing | completed | rejected", "notes": "string" }
```

**Response** `200`
```json
{ "message": "Updated", "withdrawal": { ... } }
```

---

### GET `/api/admin/support`
List all support threads.

**Response** `200` — array of thread summaries.

---

### GET `/api/admin/support/[userId]`
Get a user's support thread.

**Response** `200` — array of messages.

---

### POST `/api/admin/support/[userId]`
Reply to a user's support thread.

**Body**
```json
{ "body": "string" }
```

**Response** `201` — message object.

---

### GET `/api/admin/support/stream` *(SSE)*
Admin support inbox stream. Events contain `{ userId, message }`.

---

## 24. Public (No Auth)

### GET `/api/public/activity-feed`
10 most recent platform activity items for a live feed widget.

**Response** `200`
```json
[
  { "icon": "🔧", "message": "A Plumbing job was posted in Quezon City", "createdAt": "..." }
]
```

---

### GET `/api/public/category-demand`
Top 6 categories by open job count for a demand bar widget.

**Response** `200`
```json
[
  { "category": "Plumbing", "count": 42 }
]
```

---

## Error Responses

All endpoints return consistent error shapes:

```json
{
  "error": "Human-readable message",
  "code": "NOT_FOUND | FORBIDDEN | UNAUTHORIZED | VALIDATION_ERROR | CONFLICT"
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Validation error / bad request |
| `401` | Not authenticated — refresh token or re-login |
| `403` | Authenticated but not authorized (wrong role/capability) |
| `404` | Resource not found |
| `409` | Conflict (duplicate, already exists) |
| `422` | Unprocessable entity |
| `429` | Rate limited |
| `500` | Internal server error |

---

## SSE (Server-Sent Events) Notes for Chrome Extensions

Extensions must use `credentials: 'include'` — the native `EventSource` API does **not** support custom headers for cookies directly in a service worker context. Use a background script or offscreen document:

```js
// background.js
const es = new EventSource('https://<your-domain>/api/notifications/stream', {
  withCredentials: true,
});

es.onmessage = (event) => {
  chrome.runtime.sendMessage({ type: 'NOTIFICATION', data: JSON.parse(event.data) });
};

es.onerror = () => {
  es.close();
  // reconnect after delay
  setTimeout(connectSSE, 5000);
};
```

---

*Generated 2026-04-06 — LocalPro Marketplace v1*
