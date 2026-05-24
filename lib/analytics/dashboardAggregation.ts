import { CanonicalActivity, DailyTrainingLoad, DailyWellnessLog } from '../data/types';

export interface DashboardTotals {
    totalDistanceMeters: number;
    totalMovingTimeSeconds: number;
    totalActivities: number;
}

export function calculateDashboardTotals(activities: CanonicalActivity[], days: number = 30): DashboardTotals {
    const now = new Date();
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    let totalDistanceMeters = 0;
    let totalMovingTimeSeconds = 0;
    let totalActivities = 0;
    
    activities.forEach(act => {
        if (!act.startDate) return;
        const actDate = new Date(act.startDate);
        if (isNaN(actDate.getTime())) return;
        
        if (actDate >= cutoff) {
            totalDistanceMeters += (act.distanceMeters || 0);
            totalMovingTimeSeconds += (act.movingTimeSeconds || 0);
            totalActivities++;
        }
    });

    return { totalDistanceMeters, totalMovingTimeSeconds, totalActivities };
}
