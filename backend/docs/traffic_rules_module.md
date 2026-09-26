# Government Traffic Rules & Challan Information Module

## Overview

The **Government Traffic Rules & Challan Information Module** is a core component of `SafeWay-AI`. It provides verified, authoritative Indian traffic rules, fine structures, legal sections, traffic sign meanings, and state-specific regulations derived directly from official Indian government sources:

1. **Ministry of Road Transport & Highways (MoRTH)**
2. **India Code** (Legislative Department, Ministry of Law and Justice)
3. **The Motor Vehicles (Amendment) Act, 2019 (Act No. 32 of 2019)**
4. **Central Motor Vehicles Rules, 1989**
5. **Official State Transport Department Notifications & Gazettes** (Bihar, Maharashtra, Delhi, Karnataka, Tamil Nadu, Uttar Pradesh, Gujarat, West Bengal)
6. **IRC:67-2012 Code of Practice for Road Signs** (Indian Roads Congress)

---

## Data Policy & Verification

- **Strict Government Lineage**: Every verified rule contains direct legal section references, official publication title (`governmentDocument`), issuing authority (`sourceName`), and valid portal URL (`sourceUrl`).
- **No Unverified Data Fabrication**: For states and union territories where state-level gazette notification documents could not be directly verified, skeleton entries are stored with `status: "REQUIRES_VERIFICATION"` and `fineAmount: null`.
- **Status Lifecycle**:
  - `VERIFIED`: Formally cross-referenced with government gazettes / MVA 2019.
  - `REQUIRES_VERIFICATION`: Architecture skeleton entry awaiting state-specific notification publication.
  - `DEPRECATED`: Superseded by newer legislative amendments.

---

## Schema Architecture (`TrafficRule`)

```javascript
{
  scope: 'CENTRAL' | 'STATE',            // Scoping: CENTRAL (Nationwide) or STATE (State-specific)
  state: String | null,                  // State name e.g. "Bihar", "Maharashtra" (null when scope=CENTRAL)
  ruleCode: String,                      // Unique identifier e.g. "MVA-194D", "BR-MVA-194D", "SIGN-MANDATORY-STOP"
  category: String,                      // E.g. "Helmet", "Seat Belt", "Speed Limit", "Drunk Driving", "Traffic Signs"
  title: String,                         // Rule title
  description: String,                   // Detailed human-readable rule summary
  applicableVehicleTypes: [String],      // Array of vehicles: ["TwoWheeler", "FourWheeler", "Commercial", "Goods", "Passenger"]
  vehicleType: String,                   // Primary vehicle type ("TwoWheeler", "FourWheeler", "All", etc.)
  violation: String,                     // Legal definition of violation
  fineAmount: Number | null,             // Penalty amount in INR (min: 0, null if unverified)
  additionalPenalty: String,             // E.g. "License suspension for 3 months", "Imprisonment up to 6 months"
  legalSection: String,                  // E.g. "Section 194D of Motor Vehicles Act, 1988 (amended 2019)"
  sourceName: String,                    // E.g. "Ministry of Road Transport & Highways (MoRTH)"
  sourceUrl: String,                     // Official URL e.g. "https://morth.nic.in"
  governmentDocument: String,            // E.g. "The Motor Vehicles (Amendment) Act, 2019 (Act No. 32 of 2019)"
  effectiveFrom: Date | null,            // Notification effective date
  lastVerifiedAt: Date,                  // Verification timestamp
  status: 'VERIFIED' | 'REQUIRES_VERIFICATION' | 'DEPRECATED',
  language: String,                      // Language code (default "en")
  notes: String                          // Additional judicial or compounding notes
}
```

---

## Central vs State Rule Resolution

When a client queries rules for a specific state (`GET /api/traffic-rules/state/Bihar`):

The system retrieves:
`Applicable Central Rules (scope: CENTRAL)` + `Applicable State Rules (scope: STATE, state: Bihar)`

This avoids duplicating national rules while giving full visibility into both national laws and state-specific compounding rates.

---

## API Endpoints

### 1. List All Traffic Rules
```http
GET /api/traffic-rules
```
**Query Parameters**:
- `scope` (`CENTRAL` | `STATE`)
- `state` (e.g. `Bihar`)
- `category` (e.g. `Helmet`)
- `vehicleType` (e.g. `TwoWheeler`)
- `status` (`VERIFIED` | `REQUIRES_VERIFICATION`)
- `page` (default: 1)
- `limit` (default: 20, max: 50)

### 2. Get Rules by State (Central + State Combined)
```http
GET /api/traffic-rules/state/:state
GET /api/rules/:state
```

### 3. Search Traffic Rules
```http
GET /api/traffic-rules/search?q=helmet
```

### 4. Get Rules by Category
```http
GET /api/traffic-rules/category/:category
```

### 5. Get Rules by Vehicle Type
```http
GET /api/traffic-rules/vehicle/:vehicleType
```

### 6. Get Rule by ID or RuleCode
```http
GET /api/traffic-rules/:idOrRuleCode
```

---

## Seeding & Import Script

The seed system loads structured data files from `backend/data/traffic-rules/`:
- `central_rules.json`: Motor Vehicles (Amendment) Act 2019 / MoRTH rules
- `state_rules.json`: State Transport Notifications (Bihar, MH, Delhi, KA, TN, UP, GJ, WB)
- `traffic_signs.json`: IRC:67 Road Signs & Meanings
- `state_skeletons.json`: Skeleton data for remaining Indian States and UTs (`status: REQUIRES_VERIFICATION`)

### Running the Seed Script
```bash
npm run seed:rules
```
or
```bash
node src/scripts/seedTrafficRules.js
```

The script is **idempotent** (uses upsert based on `ruleCode` or `(scope, state, title, legalSection)`), preserves existing verified records, and outputs a detailed import summary report.

---

## Running Tests

```bash
node src/tests/trafficRule.test.js
```
All backend unit & integration tests can be executed via:
```bash
node src/tests/trafficRule.test.js
node src/tests/challan.test.js
node src/tests/security.test.js
node src/tests/hazard.test.js
node src/tests/safety.test.js
node src/tests/emergency.test.js
node src/tests/ai.test.js
```
