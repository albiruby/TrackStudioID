import { CanonicalActivity } from '../data/types';

export function computeSafePaceSecPerKm(movingTimeSeconds: number | null | undefined, distanceMeters: number | null | undefined): number | null {
    if (movingTimeSeconds === null || movingTimeSeconds === undefined || typeof movingTimeSeconds !== 'number' || isNaN(movingTimeSeconds)) return null;
    if (distanceMeters === null || distanceMeters === undefined || typeof distanceMeters !== 'number' || isNaN(distanceMeters) || distanceMeters <= 0) return null;
    return movingTimeSeconds / (distanceMeters / 1000);
}

export function filterValidActivities(activities: CanonicalActivity[], startDateStr?: string, endDateStr?: string): CanonicalActivity[] {
    return activities.filter(act => {
        if (!act.startDate) return false;
        const actDate = new Date(act.startDate);
        if (isNaN(actDate.getTime())) return false;
        
        if (startDateStr) {
            const start = new Date(startDateStr);
            if (actDate < start) return false;
        }
        if (endDateStr) {
            const end = new Date(endDateStr);
            end.setHours(23, 59, 59, 999);
            if (actDate > end) return false;
        }
        return true;
    });
}
