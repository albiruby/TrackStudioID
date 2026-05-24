export interface IntervalsConnection {
  provider: 'intervals';
  connected: boolean;
  authMethod: 'oauth' | 'api_key' | null;
  athleteId: string | null;
  athleteName: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  updatedAt: string;
  // Private fields - must never be exposed to client UI
  apiKey?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: number | null;
}

export interface SafeIntervalsStatus {
  provider: 'intervals';
  connected: boolean;
  authMethod: 'oauth' | 'api_key' | null;
  athleteId: string | null;
  athleteName: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  updatedAt: string | null;
}
