import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../../lib/firebase/admin';
import { getIntervalsConnection, saveIntervalsConnection, intervalsFetch } from '../../../../../lib/intervals/server';
import { DailyWellnessLog, DailyTrainingLoad } from '../../../../../types/track-studio';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let userId = '';
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getIntervalsConnection(userId);
    if (!connection || !connection.connected) {
      return NextResponse.json({ error: 'Intervals.icu not connected' }, { status: 400 });
    }
    
    // Default config
    let body = {};
    try { body = await req.json(); } catch(e) {}
    
    // newest = today, oldest = today minus 90 days
    const today = new Date();
    const defaultNewest = today.toISOString().split('T')[0];
    const defaultOldestDate = new Date();
    defaultOldestDate.setDate(defaultOldestDate.getDate() - 90);
    const defaultOldest = defaultOldestDate.toISOString().split('T')[0];
    
    const oldest = (body as any).oldest || defaultOldest;
    const newest = (body as any).newest || defaultNewest;
    
    const targetAthleteId = connection.athleteId && connection.athleteId !== '0' ? connection.athleteId : '0';

    const url = `/athlete/${targetAthleteId}/wellness?oldest=${oldest}&newest=${newest}`;
    
    let wellnessResponse;
    try {
        wellnessResponse = await intervalsFetch(userId, url);
    } catch(err: any) {
        await saveIntervalsConnection(userId, { lastSyncError: err.message });
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
    
    if (!wellnessResponse.ok) {
        const errorText = await wellnessResponse.text();
        await saveIntervalsConnection(userId, { lastSyncError: errorText });
        return NextResponse.json({ error: 'Failed to fetch wellness data' }, { status: 400 });
    }
    
    const wellnessData = (await wellnessResponse.json()) as any[];
    
    const batch = adminDb.batch();
    const nowSync = new Date().toISOString();
    
    for (const record of wellnessData) {
        const dateId = record.id; // YYYY-MM-DD
        
        // 1. Map DailyWellnessLog
        const wellnessLogRef = adminDb
            .collection('users').doc(userId)
            .collection('wellnessLogs').doc(dateId);
            
        const cleanWellness: DailyWellnessLog = {
            id: dateId,
            userId: userId,
            date: dateId,
            source: 'intervals',
            restingHeartRate: record.restingHR ?? null,
            hrvRmssd: record.hrv ?? null,
            hrvSdnn: record.hrvSdnn ?? null,
            sleepDurationHours: record.sleepSecs ? record.sleepSecs / 3600 : null,
            sleepQuality: record.sleepQuality ?? null,
            soreness: record.soreness ?? null,
            fatigue: record.fatigue ?? null,
            mood: record.mood ?? null,
            stress: record.stress ?? null,
            weightKg: record.weight ?? null,
            bodyFatPercent: record.bodyFat ?? null,
            notes: record.comments || null,
            raw: record,
            syncedAt: nowSync,
            updatedAt: nowSync,
            dataHealth: 'GREEN',
        };
        batch.set(wellnessLogRef, cleanWellness, { merge: true });
        
        // 2. Map DailyTrainingLoad
        const loadRef = adminDb
            .collection('users').doc(userId)
            .collection('dailyLoad').doc(dateId);
            
        const cleanLoad: DailyTrainingLoad = {
             id: dateId,
             userId: userId,
             date: dateId,
             source: 'intervals',
             fitnessCtl: record.ctl ?? null,
             fatigueAtl: record.atl ?? null,
             formTsb: record.tsb ?? null,
             rampRate: record.rampRate ?? null,
             trainingLoad: record.load ?? null,
             acuteLoad: record.acuteLoad ?? null,
             chronicLoad: record.chronicLoad ?? record.ctl ?? null,
             intensity: record.intensity ?? null,
             loadScore: record.load ?? null,
             raw: record,
             syncedAt: nowSync,
             updatedAt: nowSync,
             dataHealth: 'GREEN',
        };
        batch.set(loadRef, cleanLoad, { merge: true });
    }
    
    await batch.commit();
    
    // Update Connection sync status
    await saveIntervalsConnection(userId, {
        lastSyncAt: nowSync,
        lastSyncError: null
    });

    return NextResponse.json({ success: true, count: wellnessData.length });
  } catch (error: any) {
    console.error('Error in intervals wellness sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
