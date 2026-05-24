import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../../lib/firebase/admin';
import { getIntervalsConnection, saveIntervalsConnection, intervalsFetch } from '../../../../../lib/intervals/server';

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

    const targetAthleteId = connection.athleteId && connection.athleteId !== '0' ? connection.athleteId : '0';

    // Try multiple endpoints in Intervals.icu to fetch zones / athlete info
    let athleteData: any = null;
    let fetchErrorMsg = '';

    // Fallback 1: GET /athlete/{id}
    try {
      const res = await intervalsFetch(userId, `/athlete/${targetAthleteId}`);
      if (res.ok) {
        athleteData = await res.json();
      } else {
        fetchErrorMsg = `Endpoint /athlete/${targetAthleteId} returned status ${res.status}`;
      }
    } catch (err: any) {
      fetchErrorMsg = err.message;
    }

    // Fallback 2: If zones are not directly in the athlete profile, or first failed, try /athlete/{id}/zones
    let zonesData: any = null;
    try {
      const res = await intervalsFetch(userId, `/athlete/${targetAthleteId}/zones`);
      if (res.ok) {
        zonesData = await res.json();
      }
    } catch (e) {}

    // Combine any retrieved sources
    const src = { ...(athleteData || {}), ...(zonesData || {}) };

    // Extract physiological zones
    let hrZones = src.hr_zones || src.heart_rate_zones || (src.zones && src.zones.hr_zones) || src.hrZones || null;
    let paceZones = src.pace_zones || src.speed_zones || (src.zones && src.zones.pace_zones) || src.paceZones || null;
    let powerZones = src.power_zones || src.pwr_zones || (src.zones && src.zones.power_zones) || src.powerZones || null;

    // Check if we got any real zone data
    const hasData = (hrZones && hrZones.length > 0) || (paceZones && paceZones.length > 0) || (powerZones && powerZones.length > 0);

    if (!hasData) {
      // Return a message that no zone data is available, as required by the laws
      return NextResponse.json({ 
        success: false, 
        error: 'No training zones data found on Intervals.icu.',
        details: fetchErrorMsg || 'API returned empty or unrecognized format for athlete zones.'
      }, { status: 404 });
    }

    const nowSync = new Date().toISOString();

    const zonesRef = adminDb.collection('users').doc(userId).collection('settings').doc('trainingZones');
    const currentZonesRef = adminDb.collection('users').doc(userId).collection('zones').doc('current');

    const payload = {
      userId,
      heartRateZones: hrZones,
      paceZones: paceZones,
      powerZones: powerZones,
      syncedAt: nowSync,
      updatedAt: nowSync
    };

    const batch = adminDb.batch();
    batch.set(zonesRef, payload, { merge: true });
    batch.set(currentZonesRef, payload, { merge: true });
    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      heartRateZones: hrZones,
      paceZones: paceZones,
      powerZones: powerZones,
      syncedAt: nowSync
    });

  } catch (error: any) {
    console.error('Error in intervals zones sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
