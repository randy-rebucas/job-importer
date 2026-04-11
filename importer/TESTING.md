# LocalPro AI Lead Engine - Testing Guide

## Quick Start

### 1. Build the Extension
```bash
npm run build
```

### 2. Load in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `dist/` folder

### 3. Verify Installation
- ✅ Extension icon appears in toolbar
- ✅ Icon shows "LocalPro Lead Engine" in tooltip
- ✅ Popup opens and shows "Sign In" screen

---

## Testing Scenarios

### Test 1: Lead Classification - Service Type Detection

#### Test Case 1.1: Plumbing
**Input:**
```
Title: "Urgent bathroom leak repair needed ASAP"
Description: "There's water leaking from my toilet and pipe connections. Need someone today. Will pay ₱300-500 for quick fix."
Location: "Manila, Philippines"
```

**Expected Output:**
- Service Type: `plumbing` (high confidence ~85%+)
- Urgency: `same-day` (due to "ASAP", "today", "Urgent")
- Budget: `min: 250, max: 550` (extracted from "₱300-500")
- Keywords Matched: leak, toilet, pipe, water, bathroom, urgent, asap, today

#### Test Case 1.2: Cleaning
**Input:**
```
Title: "House cleaning service needed next week"
Description: "Looking for someone to do general house cleaning. Flexible timing. Budget around ₱1500."
Location: "Makati, Philippines"
```

**Expected Output:**
- Service Type: `cleaning` (high confidence ~80%+)
- Urgency: `medium` (due to "flexible timing", "next week")
- Budget: `min: 1200, max: 1800`
- Keywords Matched: cleaning, house, general

#### Test Case 1.3: Electrical
**Input:**
```
Title: "Electrical outlet not working"
Description: "My kitchen outlet stopped working. Can someone check it? No rush, anytime this month is fine."
Location: "Quezon City, Philippines"
```

**Expected Output:**
- Service Type: `electrical` (confidence ~75%+)
- Urgency: `low` (due to "no rush", "anytime")
- Budget: `min: 48, max: 72` (default for electrical)
- Keywords Matched: electrical, outlet, kitchen

#### Test Case 1.4: Roofing
**Input:**
```
Title: "Roof leak causing water damage"
Description: "It's raining and my roof is leaking badly. Need emergency repair TODAY. Budget ₱5000-8000."
Location: "Cebu, Philippines"
```

**Expected Output:**
- Service Type: `roofing` (confidence ~85%+)
- Urgency: `same-day` (due to "emergency", "TODAY")
- Budget: `min: 4500, max: 8500`
- Keywords Matched: roof, leak, emergency, today

---

### Test 2: Urgency Level Detection

#### Test Case 2.1: Same-Day Urgency Indicators
**Phrases to test:**
- "URGENT: need today"
- "ASAP please"
- "Emergency repair needed"
- "Right now"
- "Cannot wait"

**Expected Urgency:** `same-day`

#### Test Case 2.2: Urgent (24 hours)
**Phrases to test:**
- "Need by tomorrow"
- "Urgent matter"
- "Rush job"
- "Quick turnaround"

**Expected Urgency:** `urgent`

#### Test Case 2.3: High Priority (This Week)
**Phrases to test:**
- "This week preferred"
- "Need soon"
- "Tight deadline"
- "Priority job"

**Expected Urgency:** `high`

#### Test Case 2.4: Medium (Flexible Timeline)
**Phrases to test:**
- "Flexible timing"
- "Next week is fine"
- "Can schedule"
- "Whenever available"

**Expected Urgency:** `medium`

#### Test Case 2.5: Low (No Rush)
**Phrases to test:**
- "No rush"
- "Whenever convenient"
- "Low priority"
- "Future project"

**Expected Urgency:** `low`

---

### Test 3: Budget Extraction

#### Test Case 3.1: Budget Range
**Text:** "We can pay ₱200-300 for this service"
**Expected:** `min: 200, max: 300`

#### Test Case 3.2: Single Budget Value
**Text:** "Budget is ₱500"
**Expected:** `min: 400, max: 650` (calculated as avg ±20-30%)

#### Test Case 3.3: Hourly Rate
**Text:** "Can offer ₱100/hour"
**Expected:** `min: 80, max: 120`

#### Test Case 3.4: No Budget
**Text:** "Will discuss payment"
**Expected:** Service-type default (e.g., plumbing: `min: 50, max: 500`)

---

### Test 4: Platform Detection & Lead Extraction

#### Test Case 4.1: Facebook Marketplace
**Steps:**
1. Navigate to `https://www.facebook.com/marketplace`
2. Find a service listing (e.g., repair, cleaning)
3. Look for "Capture Lead" button injected on the listing
4. Click button
5. **Expected:** Modal opens with extracted title, description, location

**Sample Marketplace Item:**
```
Title: "Need reliable electrician"
Description: "Looking for licensed electrician to fix outlets. Budget ₱2000. Call or message."
```

#### Test Case 4.2: Facebook Groups
**Steps:**
1. Navigate to a local Facebook group (e.g., "Manila Services Group")
2. Find a service request post
3. Look for "Capture Lead" button
4. Click button
5. **Expected:** Lead data extracted and classified

#### Test Case 4.3: Google Business
**Steps:**
1. Open Google Maps / Google Business
2. Find a service business profile
3. Check for inquiries or reviews with service requests
4. **Expected:** Comments/inquiries can be captured as leads

#### Test Case 4.4: Messenger Inquiries
**Steps:**
1. Open `https://www.messenger.com`
2. Look for service inquiry messages
3. **Expected:** Messages detected as potential leads

---

### Test 5: Lead Capture Flow (E2E)

#### Full User Journey:
1. **Login**
   - [ ] User enters email/password
   - [ ] System validates credentials
   - [ ] Popup shows user profile info

2. **Navigate to Supported Platform**
   - [ ] User goes to Facebook Marketplace
   - [ ] Content script loads
   - [ ] Console shows: "[LocalPro] Lead Engine content script active on marketplace"

3. **Scan/Capture Leads**
   - [ ] User clicks "Scan Current Tab"
   - [ ] Extension extracts all visible leads
   - [ ] Selection panel appears showing leads

4. **Select & Review Leads**
   - [ ] User selects leads to capture
   - [ ] Lead review modal appears
   - [ ] Shows: title, description, classification, urgency, budget

5. **Capture Lead**
   - [ ] User clicks "Capture" button
   - [ ] Lead is sent to backend
   - [ ] History updates with new lead
   - [ ] Badge count increments

6. **View Lead History**
   - [ ] Open popup
   - [ ] "Recent Captures" section shows new lead
   - [ ] Stats show "+1 Today"
   - [ ] Color-coded chip shows service type

---

### Test 6: Edge Cases & Error Handling

#### Test Case 6.1: Malformed Lead Data
**Input:** Title empty, description only
**Expected:** Validation error, clear error message

#### Test Case 6.2: Network Error During Capture
**Setup:** Disconnect network or mock API error
**Expected:** 
- Error message displayed
- Retry button appears
- Lead stays in popup for retry

#### Test Case 6.3: Very Long Lead Title/Description
**Input:** 5000+ character title and description
**Expected:**
- Truncation in UI with "..."
- Full text accessible on hover
- Classification still works accurately

#### Test Case 6.4: Mixed Language Lead
**Input:** English title + Filipino description
**Expected:** Still classifies correctly based on keywords

#### Test Case 6.5: Duplicate Lead Detection
**Input:** Same lead captured twice within 5 minutes
**Expected:** Warning or deduplication

---

## Verification Checklist

### UI/UX Tests
- [ ] Popup loads without errors
- [ ] Platform badges display correctly
- [ ] Stats refresh when new leads captured
- [ ] History list scrolls smoothly
- [ ] "Clear" button removes all history
- [ ] Logout works correctly

### Data Validation Tests
- [ ] Empty title shows error
- [ ] Empty description shows error
- [ ] Empty location shows error
- [ ] Valid lead saves successfully
- [ ] Service type always populated
- [ ] Urgency always populated

### Classification Accuracy Tests
- [ ] Plumbing keywords detected ~90% accuracy
- [ ] Cleaning keywords detected ~85% accuracy
- [ ] Budget extraction works 95% of cases
- [ ] Urgency detection matches expected levels
- [ ] Confidence scores reasonable (0-1)

### Platform Tests
- [ ] Facebook Marketplace leads captured
- [ ] Facebook Groups leads captured
- [ ] Google Business inquiries captured
- [ ] Messenger inquiries captured
- [ ] Platform detection works on subdomains

### Performance Tests
- [ ] Content script loads in <2 seconds
- [ ] Classification completes in <100ms per lead
- [ ] Popup opens within 1 second
- [ ] Badge updates instantly
- [ ] No memory leaks during extended use

---

## Debugging Commands

### Check Extension Status
```javascript
// In browser console on any page
chrome.runtime.sendMessage({type: "GET_LEAD_STATS"}, response => {
  console.log("Lead Stats:", response);
});
```

### Test Content Script
```javascript
// On supported platform (Facebook, etc.)
// Press F12, then:
console.log("[LocalPro] Testing content script...");
chrome.runtime.sendMessage({type: "PING"}, response => {
  console.log("Content script alive:", response);
});
```

### Manual Lead Classification
```javascript
// In popup console or background worker console
import { classifyLead } from './utils/leadClassifier';
const testLead = {
  title: "Urgent plumbing repair",
  description: "Leaky pipe, need ASAP. Budget 500",
  location: "Manila",
  source: "facebook",
  source_url: "https://example.com",
  posted_by: "John",
  timestamp: new Date().toISOString()
};
const result = classifyLead(testLead);
console.log("Classification Result:", result);
```

### View Extension Logs
1. Go to `chrome://extensions`
2. Find "LocalPro Lead Engine"
3. Click "Details"
4. Click "Service Worker" to view background logs
5. All `console.log` statements will appear

---

## Test Lead Examples

### High Confidence Examples

#### Plumbing
```
Title: "Toilet leak needs urgent fix"
Description: "Our bathroom toilet is leaking water. Need someone ASAP today. Will pay ₱400-600. Call 09123456789"
Location: "Makati, Philippines"
```
✅ Expected: service_type=plumbing, urgency=same-day, budget=400-600

#### Cleaning
```
Title: "House cleaning this week"
Description: "Need help cleaning my 3-bedroom house. Flexible schedule. Budget around ₱2000"
Location: "Quezon City, Philippines"
```
✅ Expected: service_type=cleaning, urgency=high, budget=1600-2400

#### Electrical
```
Title: "Broken kitchen outlets - no rush"
Description: "Two outlets in kitchen stopped working. Whenever you're available this month. Budget ₱1500"
Location: "Cebu, Philippines"
```
✅ Expected: service_type=electrical, urgency=low, budget=1500

---

## Success Criteria

✅ **Extension Built Successfully**
- No TypeScript errors
- All code compiles
- Dist folder generated

✅ **Loads in Chrome**
- No console errors
- Pop up renders
- Platform badges display

✅ **Classification Works**
- Service types detected correctly (80%+ accuracy)
- Urgency extracted properly
- Budget ranges reasonable

✅ **Lead Capture Works**
- Leads saved to local history
- Stats update correctly
- Badge count increments

✅ **UI Responsive**
- No lag or freezing
- Smooth button interactions
- History auto-updates

---

## Next Steps After Testing

1. ✅ **Fix any bugs found during testing**
2. 🔄 **Implement lead review modal** (currently uses job modal)
3. 🔄 **Implement provider matching** (backend API integration)
4. 🔄 **Add lead notifications** (SMS/Email)
5. 🔄 **Create analytics dashboard**
6. 🔄 **Add lead deduplication**
7. 🔄 **Multi-language support**

---

**Happy Testing! 🚀**
