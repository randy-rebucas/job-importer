# LocalPro AI Lead Engine 🚀

Transform your service request capture workflow with an AI-powered lead engine that automatically classifies, prioritizes, and matches service requests to providers.

## Overview

The **LocalPro Lead Engine** is an advanced Chrome extension that:

- **Captures service requests** from Facebook Marketplace, Google Business profiles, Facebook Groups, and Messenger
- **Classifies requests** automatically using AI (service type, urgency level, estimated price range)
- **Extracts contact information** (phone, email, Messenger ID)
- **Matches providers** based on service type, location, and availability
- **Tracks leads** with comprehensive history and statistics

## Key Features

### 🎯 Service Request Detection

The extension detects and captures service requests across multiple platforms:

| Platform | Sources |
|----------|---------|
| **Facebook Marketplace** | Buy/Sell service listings |
| **Facebook Groups** | Local community service requests |
| **Google Business** | Google My Business inquiries and reviews |
| **Messenger** | Direct message inquiries |

### 🤖 AI-Powered Classification

Each captured lead is automatically analyzed for:

**Service Types:**
- Plumbing 🚰
- Cleaning 🧹
- Repair 🔧
- Electrical ⚡
- HVAC 🌡️
- Landscaping 🌳
- Painting 🎨
- Carpentry 🪵
- Roofing 🏠
- Other Services

**Urgency Levels:**
- `same-day` - Critical, requires immediate response
- `urgent` - High priority, within 24 hours
- `high` - Important, this week
- `medium` - Standard timeline, flexible
- `low` - No rush, when available

**Budget Estimation:**
- Automatic budget extraction from text
- Service-type-based default ranges
- Confidence scoring

### 🔗 Provider Matching

The engine identifies and matches suitable providers based on:
- Service type expertise
- Geographic location
- Rating and availability
- Match confidence score

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Content Scripts                          │
│  (Facebook, Google, Messenger platforms)        │
│  - Detect service requests                      │
│  - Extract lead data                            │
│  - Inject UI buttons                            │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│     AI Lead Classifier                          │
│  utils/leadClassifier.ts                        │
│  - Classify service type (keyword matching)    │
│  - Extract urgency (indicator keywords)        │
│  - Estimate budget (regex + defaults)          │
│  - Calculate match scores                      │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│    Background Service Worker                    │
│  - Process classified leads                    │
│  - Handle provider matching                    │
│  - Manage lead history & stats                 │
│  - API communication                           │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│    LocalPro Backend API                         │
│  - Lead storage & persistence                  │
│  - Provider matching logic                     │
│  - User & provider profiles                    │
└─────────────────────────────────────────────────┘
```

## Type System

### Core Types

```typescript
// Raw extracted lead
interface Lead {
  title: string;
  description: string;
  source: Platform;          // 'marketplace' | 'facebook' | 'google-business' | 'messenger'
  source_url: string;
  posted_by: string;
  timestamp: string;
  location?: string;
  phone?: string;
  email?: string;
  messenger_id?: string;
}

// Classified lead with AI analysis
interface ClassifiedLead extends Lead {
  service_type: ServiceType;
  urgency: UrgencyLevel;
  estimated_budget: {
    min: number;
    max: number;
    currency: string;
  };
  match_confidence: number;
  matched_providers?: string[];
  classification_analysis?: string;
}
```

### Message Types

The extension communicates via Chrome messages:

```typescript
// Classify a service request
ClassifyLeadMessage: {
  type: "CLASSIFY_LEAD";
  title: string;
  description: string;
  location: string;
}

// Match providers to a classified lead
MatchProvidersMessage: {
  type: "MATCH_PROVIDERS";
  lead: ClassifiedLead;
  limit?: number;
}

// Capture a lead to the system
CaptureLeadMessage: {
  type: "CAPTURE_LEAD";
  payload: Lead;
}

// Get lead history
GetLeadHistoryMessage: {
  type: "GET_LEAD_HISTORY";
}

// Get lead statistics
GetLeadStatsMessage: {
  type: "GET_LEAD_STATS";
}
```

## Lead Classification Algorithm

### Service Type Classification

Uses keyword matching to identify service categories:

```
Plumbing Keywords: pipe, leak, drain, faucet, toilet, water, ...
Cleaning Keywords: clean, mop, sweep, vacuum, dust, laundry, ...
Repair Keywords: repair, fix, broken, maintenance, service, ...
... (service-specific keyword sets)
```

**Confidence Calculation:**
```
confidence = (matched_keywords / total_words) * 100
```

### Urgency Extraction

Keywords trigger urgency levels (priority order):
1. `same-day`: urgent, asap, today, emergency, immediately, now
2. `urgent`: urgent, soon, tomorrow, hurry, rush
3. `high`: need soon, this week, priority, quick, deadline
4. `medium`: flexible, whenever, next week, anytime
5. `low`: no rush, when available, low priority

### Budget Estimation

Three tactics in order:
1. **Regex extraction** from text patterns: "$100-200", "$100/hour"
2. **Service-type defaults** if no explicit budget found
3. **Range calculation** from single values (±20-30%)

## File Structure

```
importer/
├── manifest.json              # Extension configuration
├── types.ts                   # TypeScript type definitions
├── background.ts              # Service worker (CPU)
├── content.ts                 # Content script (DOM injection)
├── popup.ts                   # Popup UI logic
├── popup.html                 # Popup UI markup
├── styles.css                 # Styling
├── build.js                   # Build script
├── tsconfig.json              # TypeScript config
│
├── utils/
│   ├── api.ts                 # API communication
│   ├── leadClassifier.ts      # AI classification logic ⭐
│   ├── domHelpers.ts          # DOM manipulation utilities
│   ├── parser.ts              # Lead data parsing
│   └── ...
│
└── components/                # (Legacy, being replaced)
    └── ...
```

## Usage Flow

### 1. Lead Capture

1. User browses Facebook Marketplace, Google Business, or Facebook Groups
2. Extension injects "Capture Lead" buttons next to each post
3. User clicks button or uses "Scan Page" floating button
4. Extension extracts raw lead data

### 2. AI Classification

```
Raw Lead Data
   ↓
[NLP Analysis]
   ↓
Service Type: "Plumbing" (89% confidence)
Urgency: "High"
Budget: $200-500
   ↓
ClassifiedLead
```

### 3. Provider Matching

```
ClassifiedLead
   ↓
[Match Algorithm]
   ├─ Service type match (60% weight)
   ├─ Location match (20% weight)
   └─ Availability match (20% weight)
   ↓
Recommended Providers [...]
```

### 4. Lead Capture

Lead is saved to LocalPro system with:
- Classification results
- Recommended providers
- Contact information
- Source tracking
- Timestamp

### 5. History & Stats

Leads are tracked with:
- Total leads captured
- Leads captured today
- Breakdown by service type
- Breakdown by urgency
- Match success rate

## Configuration

### Service Type Keywords

Edit `utils/leadClassifier.ts` to customize keyword detection:

```typescript
const SERVICE_TYPE_KEYWORDS: Record<ServiceType, string[]> = {
  plumbing: ["pipe", "leak", "drain", "faucet", "toilet", ...],
  cleaning: ["clean", "mop", "sweep", "vacuum", ...],
  // ... add or modify keywords
};
```

### Budget Ranges

Customize default budget ranges:

```typescript
const DEFAULT_BUDGET_RANGES: Record<ServiceType, { min: number; max: number }> = {
  plumbing: { min: 50, max: 500 },
  // ... adjust ranges by service
};
```

### Urgency Indicators

Modify urgency detection keywords:

```typescript
const URGENCY_INDICATORS: Record<UrgencyLevel, string[]> = {
  "same-day": ["urgent", "asap", "today", ...],
  // ... customize by urgency level
};
```

## API Integration

The extension communicates with LocalPro backend:

```
POST /api/ai/classify-lead         # Classify service requests
POST /api/leads                    # Save captured leads
GET  /api/providers/match          # Find matching providers
GET  /api/leads/history            # Retrieve lead history
GET  /api/leads/stats              # Get statistics
```

## Performance Optimization

- **Lead classification**: Client-side (instant, no API calls)
- **Provider matching**: Backend (returns best matches)
- **History caching**: Local storage (50 most recent leads)
- **Badge updates**: Real-time count of today's captures
- **MutationObserver**: Efficient auto-detection of new leads

## Browser Permissions

```json
{
  "permissions": ["storage", "activeTab", "tabs", "scripting"],
  "host_permissions": [
    "*://*.facebook.com/*",
    "*://*.messenger.com/*",
    "*://*.google.com/*",
    "*://*.business.google.com/*"
  ]
}
```

## Development

### Build

```bash
npm run build
```

### Local Testing

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `importer` folder

### Debug

- Content scripts: Open browser console on Facebook/Google
- Background worker: Open `chrome://extensions` → Details → Background service worker
- Popup: Right-click extension icon → Inspect popup

## Future Enhancements

- [ ] Multi-language support (detect & classify non-English leads)
- [ ] ML-based urgency detection (beyond keywords)
- [ ] Duplicate lead detection (prevent duplicates)
- [ ] Lead scoring (priority ranking)
- [ ] Auto-assignment workflows
- [ ] Email/SMS notifications
- [ ] Integration with CRM systems
- [ ] Advanced analytics dashboard

## Troubleshooting

### No leads detected

- Ensure you're on a supported platform (Facebook Marketplace, Google Business, etc.)
- Try clicking "Scroll & Scan" to trigger full page analysis
- Open browser console (`F12`) and check for errors

### Incorrect classification

- Check service type keywords in `utils/leadClassifier.ts`
- Classification improves with better, more descriptive service titles
- Report misclassifications to improve the algorithm

### Provider matching returning empty

- Backend API may not have providers in that service/location
- Ensure provider profiles are complete in LocalPro system

## License

© LocalPro 2024. AI Lead Engine Extension.

---

**Transform service discovery with intelligent lead capture and routing.** 🚀
