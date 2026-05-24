export const serverEnv = {
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  STRAVA_REDIRECT_URI: process.env.STRAVA_REDIRECT_URI,
  INTERVALS_CLIENT_ID: process.env.INTERVALS_CLIENT_ID,
  INTERVALS_CLIENT_SECRET: process.env.INTERVALS_CLIENT_SECRET,
  INTERVALS_REDIRECT_URI: process.env.INTERVALS_REDIRECT_URI,
};

export function validateServerEnvs() {
  const missing = [];
  if (!serverEnv.STRAVA_CLIENT_ID) missing.push('STRAVA_CLIENT_ID');
  if (!serverEnv.STRAVA_CLIENT_SECRET) missing.push('STRAVA_CLIENT_SECRET');
  if (missing.length > 0) {
      console.warn(`[Security] Missing server-side environment variables: ${missing.join(', ')}`);
  }
}
