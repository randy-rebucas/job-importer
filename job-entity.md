# Job Entity Reference

> Source: `src/types/index.ts`

---

## JobStatus

```ts
type JobStatus =
  | "pending_validation"  // Awaiting admin review after posting
  | "open"                // Approved and visible to providers
  | "assigned"            // Provider accepted, escrow not yet funded
  | "in_progress"         // Escrow funded, work underway
  | "completed"           // Escrow released to provider
  | "disputed"            // Dispute raised by client or provider
  | "rejected"            // Rejected by admin during validation
  | "refunded"            // Escrow refunded to client
  | "expired"             // No quotes received within expiry window
  | "cancelled";          // Cancelled by client or admin
```

---

## EscrowStatus

```ts
type EscrowStatus =
  | "not_funded"  // Payment not yet made
  | "funded"      // PayMongo checkout completed, funds held
  | "released"    // Funds released to provider
  | "refunded";   // Funds returned to client
```

---

## MilestoneStatus

```ts
type MilestoneStatus = "pending" | "released";
```

---

## IMilestone

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | `ObjectId \| string` | ✅ | |
| `title` | `string` | ✅ | Milestone label |
| `amount` | `number` | ✅ | PHP amount for this milestone |
| `description` | `string` | — | Optional detail |
| `status` | `MilestoneStatus` | ✅ | `pending` or `released` |
| `releasedAt` | `Date` | — | Set when milestone is released |

---

## IJob

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | `ObjectId \| string` | ✅ | |
| `clientId` | `ObjectId \| IUser` | ✅ | Client who posted the job |
| `providerId` | `ObjectId \| IUser \| null` | — | Assigned after quote is accepted |
| `category` | `string` | ✅ | Category ID |
| `title` | `string` | ✅ | |
| `description` | `string` | ✅ | |
| `budget` | `number` | ✅ | Client's budget in PHP |
| `status` | `JobStatus` | ✅ | See JobStatus above |
| `escrowStatus` | `EscrowStatus` | ✅ | See EscrowStatus above |
| `partialReleaseAmount` | `number \| null` | — | Set when client partially releases escrow; remainder was refunded |
| `location` | `string` | ✅ | Human-readable address |
| `scheduleDate` | `Date` | ✅ | Requested work date |
| `specialInstructions` | `string` | — | Optional notes for provider |
| `riskScore` | `number` | ✅ | AI-generated fraud/risk score at submission |
| `fraudFlags` | `string[]` | — | Specific fraud/spam flags detected at submission |
| `beforePhoto` | `string[]` | — | URLs of photos uploaded before work |
| `afterPhoto` | `string[]` | — | URLs of photos uploaded after work |
| `coordinates` | `GeoPoint \| null` | — | `{ type: "Point", coordinates: [lng, lat] }` |
| `invitedProviderId` | `ObjectId \| null` | — | When set, admin approval directly assigns this provider |
| `milestones` | `IMilestone[]` | — | Optional milestone payment plan |
| `recurringScheduleId` | `ObjectId \| null` | — | Non-null when auto-spawned from a recurring schedule |

### PESO Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `jobSource` | `"private" \| "peso" \| "lgu"` | ✅ | Who posted the job |
| `jobTags` | `JobTag[]` | — | Government/PESO classification tags |
| `pesoPostedBy` | `ObjectId \| null` | — | PESO officer user ID |
| `isPriority` | `boolean` | — | Pinned to top of provider marketplace |

### Urgency & Fees

| Field | Type | Required | Description |
|---|---|---|---|
| `urgency` | `"standard" \| "same_day" \| "rush"` | — | Booking urgency level |
| `urgencyFee` | `number` | — | Flat urgent booking fee locked at creation (PHP) |
| `escrowFee` | `number` | — | 2% escrow service fee, locked at funding |
| `processingFee` | `number` | — | 2% payment processing fee, locked at funding |
| `platformServiceFee` | `number` | — | 5% client-side platform fee, locked at funding |
| `cancellationFee` | `number` | — | Fee charged when client cancels an assigned job |

### Cancellation

| Field | Type | Required | Description |
|---|---|---|---|
| `cancelledBy` | `ObjectId \| null` | — | User ID (admin or client) who cancelled |
| `cancellationReason` | `string \| null` | — | Reason provided at admin cancellation |
| `adminCancelled` | `boolean` | — | `true` when cancelled by admin (not client) |

### Timestamps

| Field | Type | Required |
|---|---|---|
| `createdAt` | `Date` | ✅ |
| `updatedAt` | `Date` | ✅ |

---

## Job Lifecycle State Machine

```
[POST /api/jobs]
       │
       ▼
pending_validation ──(rejected)──► rejected
       │
    (approved)
       │
       ▼
     open ◄─────────────────────────────────────────┐
       │                                             │
  (quote accepted)                        (provider withdraws)
       │                                             │
       ▼                                             │
   assigned ──(escrow funded)──► in_progress ────────┘
       │                              │
  (cancelled)                    (completed) ──► completed
       │                              │
    cancelled                    (disputed) ──► disputed
                                      │
                                 (refunded) ──► refunded
```

---

## Fee Breakdown

When escrow is funded, three fees are locked as snapshots on the job document:

| Fee | Rate | Field |
|---|---|---|
| Escrow service fee | 2% | `escrowFee` |
| Payment processing fee | 2% | `processingFee` |
| Platform service fee (client) | 5% | `platformServiceFee` |

Platform commission on provider payout is handled separately by `src/lib/commission.ts` — `calculateCommission()` returns `{ gross, commission, netAmount, rate }`.

---

*Generated 2026-04-07 — LocalPro Marketplace v1*
