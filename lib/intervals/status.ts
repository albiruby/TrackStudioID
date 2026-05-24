import { getIntervalsConnection } from './server';
import { SafeIntervalsStatus } from './types';

export async function getSafeIntervalsStatus(userId: string): Promise<SafeIntervalsStatus> {
  const connection = await getIntervalsConnection(userId);
  if (!connection) {
    return {
      provider: 'intervals',
      connected: false,
      status: "not_connected",
      label: "Not Connected",
      setupRequired: true,
      authMethod: null,
      athleteId: null,
      athleteName: null,
      lastSyncAt: null,
      lastSyncError: null,
      updatedAt: null
    };
  }

  // Never return private fields!
  return {
    provider: connection.provider || 'intervals',
    connected: connection.connected !== false,
    status: connection.connected !== false ? "connected" : "not_connected",
    label: connection.connected !== false ? "Connected" : "Not Connected",
    setupRequired: false,
    authMethod: connection.authMethod || null,
    athleteId: connection.athleteId || null,
    athleteName: connection.athleteName || null,
    lastSyncAt: connection.lastSyncAt || null,
    lastSyncError: connection.lastSyncError || null,
    updatedAt: connection.updatedAt || null
  };
}
