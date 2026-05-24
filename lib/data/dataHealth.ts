import { CanonicalActivity } from './types';

export interface DataHealthSummary {
    totalChecked: number;
    invalidDateCount: number;
    missingDistanceCount: number;
    missingTimeCount: number;
    missingPaceCount: number;
    missingHrStreamCount: number;
    missingGpsPolylineCount: number;
    duplicateExternalIdCount: number;
    overallStatus: 'GREEN' | 'YELLOW' | 'RED';
}

export function auditDataHealth(activities: CanonicalActivity[]): DataHealthSummary {
    let invalidDateCount = 0;
    let missingDistanceCount = 0;
    let missingTimeCount = 0;
    let missingPaceCount = 0;
    let missingHrStreamCount = 0;
    let missingGpsPolylineCount = 0;
    let duplicateExternalIdCount = 0;
    
    const externalIds = new Set<string>();

    activities.forEach(act => {
        if (!act.startDate || isNaN(new Date(act.startDate).getTime())) {
            invalidDateCount++;
        }
        if (act.distanceMeters === undefined || act.distanceMeters === null || isNaN(act.distanceMeters)) {
            missingDistanceCount++;
        }
        if (act.movingTimeSeconds === undefined || act.movingTimeSeconds === null || isNaN(act.movingTimeSeconds)) {
            missingTimeCount++;
        }
        const hasDistance = act.distanceMeters > 0;
        const hasTime = act.movingTimeSeconds > 0;
        if (hasDistance && hasTime && (act.averagePaceSecPerKm === undefined || act.averagePaceSecPerKm === null || isNaN(act.averagePaceSecPerKm))) {
            missingPaceCount++;
        }
        
        // HR exists in summary but stream is missing. Strava activities without premium might still have summary.
        const hasAverageHr = act.averageHeartRate && act.averageHeartRate > 0;
        const streamAvailable = (act as any).hasStreams === true && (act as any).streamKeysAvailable?.includes('heartrate');
        // We just flag it
        if (hasAverageHr && !streamAvailable) {
            missingHrStreamCount++; // Note: Some external data might not populate `hasStreams` if fetched directly
        }

        const hasGpsFlag = act.hasGps === true;
        const polylineExists = !!(act.polyline || act.summaryPolyline);
        if (hasGpsFlag && !polylineExists) {
            missingGpsPolylineCount++;
        }

        if (act.externalId) {
            if (externalIds.has(act.externalId)) {
                duplicateExternalIdCount++;
            } else {
                externalIds.add(act.externalId);
            }
        }
    });

    let overallStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (invalidDateCount > 0 || missingDistanceCount > 0) {
        overallStatus = 'RED';
    } else if (missingHrStreamCount > 0 || missingGpsPolylineCount > 0) {
        overallStatus = 'YELLOW';
    }

    return {
        totalChecked: activities.length,
        invalidDateCount,
        missingDistanceCount,
        missingTimeCount,
        missingPaceCount,
        missingHrStreamCount,
        missingGpsPolylineCount,
        duplicateExternalIdCount,
        overallStatus
    };
}
