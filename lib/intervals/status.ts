import { getIntervalsConnection } from './server';
import { SafeIntervalsStatus } from './types';

export async function getSafeIntervalsStatus(userId: string): Promise<SafeIntervalsStatus> {
  const connection = await getIntervalsConnection(userId);
  if (!connection) {
    return {
      provider: 'intervals',
      connected: false,
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
    provider: connection.provider,
    connected: connection.connected,
    authMethod: connection.authMethod,
    athleteId: connection.athleteId,
    athleteName: connection.athleteName,
    lastSyncAt: connection.lastSyncAt,
    lastSyncError: connection.lastSyncError,
    updatedAt: connection.updatedAt
  };
}
