# Track.Studio E2E Test Plan

## GLOBAL PRODUCT LAW COMPLIANCE
- [x] NO AI
- [x] NO fake data
- [x] REAL DATA ONLY
- [x] Use Strava free API capabilities only
- [x] No Strava Premium dependency
- [x] Secured User Credentials

## Test Scenarios

### Scenario 1 — Empty account
**Steps:**
1. User logs in.
2. No Strava connected.
3. No Intervals connected.
4. No activities.

**Expected Results:**
- [x] Dashboard shows clear empty states.
- [x] Activities page shows no synced activities.
- [x] Wellness page prompts for Intervals.icu connection or manual logs.
- [x] No fake charts are rendered.
- [x] No fake values or placeholders.

### Scenario 2 — Strava connected
**Steps:**
1. Connect Strava.
2. Sync activities.
3. Open Activities page.
4. Open one activity detail.

**Expected Results:**
- [x] Real activities appear.
- [x] No invalid dates (e.g. 'Unknown date').
- [x] Pace is computed only if distance/time exist, otherwise displays '—'.
- [x] Heart Rate (HR) is shown only if available.
- [x] GPS route is drawn only if polyline exists.
- [x] No Strava Premium feature dependency.

### Scenario 3 — Activity detail
**Steps:**
1. Sync detail.
2. Sync streams.
3. Sync laps/splits/best efforts.

**Expected Results:**
- [x] Stream chart shows only available series (returns nothing if lack of specific stream).
- [x] HR distribution requires both HR stream and explicitly configured zones.
- [x] Pace distribution requires both pace stream and configured zones.
- [x] Laps/splits/best efforts show only real synced data, no dummy segments.

### Scenario 4 — Intervals connected
**Steps:**
1. Connect Intervals.icu.
2. Sync wellness/load.

**Expected Results:**
- [x] CTL/ATL/TSB show only if real data exists.
- [x] HRV shows only if HRV data exists.
- [x] Readiness is gated if required fields are missing.
- [x] No fake "optimal" baseline state. Empty states show as '—' or explicitly 'missing'.

### Scenario 5 — Training
**Steps:**
1. Fill Athlete Profile manually.
2. Use VDOT calculator.
3. Use HR calculator.
4. Create workout manually.
5. Add workout to calendar.

**Expected Results:**
- [x] All manual values have `source: 'manual'`.
- [x] No generated fake plan unless user manually creates it.
- [x] Estimated/calculated values are specifically labeled "Estimated".

### Scenario 6 — Reports and export
**Steps:**
1. Generate monthly report from synced activities.
2. Export PNG card.
3. Try Route Art.

**Expected Results:**
- [x] Report totals match dashboard totals exactly.
- [x] Export card uses real props, rendering '—' where metrics lack real data.
- [x] No 'UNKNOWN RUN', 'Unnamed', or '--KM' fake fields.
- [x] Route art only works if GPS route data exists.

### Scenario 7 — Security
**Steps:**
1. Inspect UI network calls.
2. Inspect client code payload.
3. Inspect localStorage.

**Expected Results:**
- [x] No Strava tokens anywhere in client read models.
- [x] No Intervals API key or tokens everywhere in client read models.
- [x] No client secrets exposed.
- [x] Firestore security rules block cross-user data (tested implicitly via rules structure).
- [x] Tokens are strictly isolated in a private nested subcollection `users/{uid}/connections_private` unreadable by client sdk.
