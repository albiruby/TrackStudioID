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

    // Calculate window: YYYY-MM-DD
    const today = new Date();
    const oldestDate = new Date();
    oldestDate.setDate(oldestDate.getDate() - 7); // Include past week planned
    const newestDate = new Date();
    newestDate.setDate(newestDate.getDate() + 30); // Project next 30 days

    const oldest = oldestDate.toISOString().split('T')[0];
    const newest = newestDate.toISOString().split('T')[0];

    // Intervals.icu calendar events (planned workouts) endpoint
    const url = `/athlete/${targetAthleteId}/events?oldest=${oldest}&newest=${newest}`;
    
    let eventsResponse;
    try {
      eventsResponse = await intervalsFetch(userId, url);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (!eventsResponse.ok) {
      // Try fallback without date range
      try {
        eventsResponse = await intervalsFetch(userId, `/athlete/${targetAthleteId}/events`);
      } catch (e) {}
    }

    if (!eventsResponse || !eventsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch calendar events from Intervals.icu' }, { status: 400 });
    }

    const eventsData = (await eventsResponse.json()) as any[];
    
    // Filter to real planned workouts (not already completed physical activities if matched on calendar)
    // On Intervals.icu, events with category 'WORKOUT' or those with steps/prescription are planned workouts.
    // Also, if matched to an activity, activityId is populated. We display them as imported sessions.
    const plannedWorkouts = eventsData.filter(event => {
      // Include events that have a title or description and are scheduled, avoiding duplicate completed activities where possible
      return event.name || event.title || event.workout;
    });

    if (plannedWorkouts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        count: 0, 
        message: 'No planned workouts found in Intervals.icu.' 
      });
    }

    const nowSync = new Date().toISOString();
    const batch = adminDb.batch();
    const syncedWorkouts: any[] = [];
    const workoutIds: string[] = [];

    for (const event of plannedWorkouts) {
      const originalId = String(event.id);
      const workoutId = `intervals_workout_${originalId}`;
      workoutIds.push(workoutId);

      // Extract properties mapping fields to canonical workout fields
      const title = event.name || event.title || (event.workout && event.workout.name) || 'Intervals.icu Planned Workout';
      const sportType = event.type || event.category || event.sport || 'Other';
      
      let scheduledDate = '';
      if (event.start_date_local) {
        scheduledDate = event.start_date_local.split('T')[0];
      } else if (event.startDateLocal) {
        scheduledDate = event.startDateLocal.split('T')[0];
      } else if (event.start_date) {
        scheduledDate = event.start_date.split('T')[0];
      } else {
        scheduledDate = today.toISOString().split('T')[0];
      }

      const durationSeconds = event.moving_time || event.duration || (event.workout && event.workout.duration) || 0;
      const distanceMeters = event.distance || (event.workout && event.workout.distance) || 0;
      const steps = event.steps || (event.workout && event.workout.steps) || null;
      const intensityTarget = event.intensity_target || event.intensity || null;
      const description = event.description || event.notes || (event.workout && event.workout.description) || '';

      const canonicalWorkout = {
        id: workoutId,
        userId,
        source: 'intervals',
        title,
        sportType,
        scheduledDate,
        durationSeconds,
        distanceMeters,
        steps,
        intensityTarget,
        description,
        raw: event,
        syncedAt: nowSync,
        updatedAt: nowSync
      };

      syncedWorkouts.push(canonicalWorkout);

      // Write individual workout document: users/{userId}/workouts/{workoutId}
      const workoutRef = adminDb
        .collection('users').doc(userId)
        .collection('workouts').doc(workoutId);
      
      batch.set(workoutRef, canonicalWorkout, { merge: true });
    }

    // Write trainingPlan document: users/{userId}/trainingPlans/{planId}
    const planId = 'intervals_imported';
    const planRef = adminDb
      .collection('users').doc(userId)
      .collection('trainingPlans').doc(planId);

    const planPayload = {
      id: planId,
      userId,
      title: 'Intervals.icu Planned Workouts',
      source: 'intervals',
      workoutIds,
      workouts: syncedWorkouts,
      syncedAt: nowSync,
      updatedAt: nowSync
    };
    batch.set(planRef, planPayload, { merge: true });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      count: syncedWorkouts.length, 
      planId,
      workouts: syncedWorkouts 
    });

  } catch (error: any) {
    console.error('Error in intervals planned workouts sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
