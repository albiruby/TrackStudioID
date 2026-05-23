export interface StravaConnection {
  provider: 'strava';
  athleteId: number;
  athleteUsername: string;
  athleteFirstname: string;
  athleteLastname: string;
  scope: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  connectedAt: string; // ISO date string
  updatedAt: string; // ISO date string
  lastSyncAt: string | null;
  lastSyncError?: string | null;
  reauthRequired?: boolean;
}

export interface StravaTokenResponse {
  token_type: 'Bearer';
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
}
