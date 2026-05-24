# Track.Studio Master Canonical Data Contract

## Immutable Rules (Product Law)
1. **NO AI**: Zero artificial intelligence, large language models, or generative agents inside the application layers or calculation engines.
2. **NO FAKE DATA**: Zero synthetic seeding, mock values, or placeholder metrics.
3. **REAL DATA ONLY**: All statistics must derive deterministically from synced API responses (Strava, Intervals.icu) or deliberate manual athlete input.
4. **STRAVA FREE API ONLY**: No requests or features requiring Strava Premium or subscription-exclusive endpoints. Use only what is available via granted OAuth scopes.
5. **DETERMINISTIC CALCULATIONS**: Formulas (VDOT, CTL/ATL, PMC) must be mathematically sound constants without stochastic variance.

## Missing Data Handling
When data is absent from the source:
- Display `—` or `Data not available`.
- Do NOT simulate, estimate, or zero-fill missing metrics.
- A missing value `null | undefined` remains `null | undefined`. 0 is only used when the source explicitly reports `0`.

## Canonical Models

### CanonicalActivity
- **id** (string): Unique identifier (Strava ID).
- **name** (string): Athlete-provided name.
- **startDate** (string): ISO format time of recording.
- **distanceMeters** (number | null): Real recorded distance.
- **movingTimeSeconds** (number): Real active duration.
- **elevationGainMeters** (number | null): Vert ascent.
- **averageHeartRate** (number | null): Derived from sensor.
- **maxHeartRate** (number | null): Peak bpm.
- **sportType** (string): Strava sport string (Run, Ride, etc).

### DailyTrainingLoad
- **date** (string): YYYY-MM-DD.
- **fitnessCtl** (number | null): Rolling 42-day average.
- **fatigueAtl** (number | null): Rolling 7-day average.
- **formTsb** (number | null): CTL - ATL.
- **trainingLoad** (number | null): Acute daily stress score.

*(Full technical implementation resides in `lib/data/` architecture)*
