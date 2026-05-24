import { CanonicalActivity } from '../../data/types';

export interface ReportAggregationResult {
  totalActivities: number;
  totalDistanceMeters: number;
  totalMovingTimeSeconds: number;
  totalElevationGainMeters: number;
  activeDays: number;
  averagePaceSecPerKm: number;
  averageHeartRate: number | null;
  longestActivityId: string | null;
  longestDistanceMeters: number;
  highestElevationActivityId: string | null;
  highestElevationGainMeters: number;
  dataHealth: {
    totalChecked: number;
    validDatesCount: number;
    validDistanceCount: number;
    hrAvailableCount: number;
    elevationAvailableCount: number;
    excludedCount: number;
    missingDistanceCount: number;
    missingDateCount: number;
    missingHrCount: number;
    missingElevationCount: number;
    warningsList: string[];
  };
  charts: {
    monthlyDistance: { month: string; distance: number; formattedDistance: number }[];
    weeklyVolume: { week: string; distance: number; formattedDistance: number }[];
    activityComposition: { sport: string; count: number; distance: number; formattedDistance: number }[];
    elevationTrend: { date: string; elevation: number }[];
  };
}

// Map helper to sport matching rules
export function matchesSportFilter(activitySport: string | undefined, filter: string): boolean {
  if (!activitySport) return filter === 'all';
  const act = activitySport.toLowerCase().trim();
  const filt = filter.toLowerCase().trim();

  if (filt === 'all') return true;
  if (filt === 'run') {
    return act === 'run' || act === 'trailrun' || act === 'trail run';
  }
  if (filt === 'trail run') {
    return act === 'trailrun' || act === 'trail run';
  }
  if (filt === 'walk') {
    return act === 'walk';
  }
  if (filt === 'ride') {
    return act === 'ride' || act === 'virtualride';
  }
  return act === filt;
}

export function aggregateActivities(
  activities: CanonicalActivity[],
  startDateStr: string,
  endDateStr: string,
  sportFilter: string = 'all'
): ReportAggregationResult {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999); // fully include the end day

  let missingDistanceCount = 0;
  let missingDateCount = 0;
  let missingHrCount = 0;
  let missingElevationCount = 0;
  let excludedCount = 0;

  const warningsList: string[] = [];
  const checkedActivities = activities;

  // Track valid subsets
  const matchingDateActivities: CanonicalActivity[] = [];

  // Phase 1: Filter and aggregate data health metrics
  checkedActivities.forEach(act => {
    // Check sports first (even if date/distance missing so we can count correctly or warn)
    if (!matchesSportFilter(act.sportType, sportFilter)) {
      return;
    }

    // Checking dates
    if (!act.startDate) {
      missingDateCount++;
      excludedCount++;
      warningsList.push(`Activity "${act.name || 'Unnamed'}" is missing a valid date.`);
      return;
    }
    const actDate = new Date(act.startDate);
    if (isNaN(actDate.getTime())) {
      missingDateCount++;
      excludedCount++;
      warningsList.push(`Activity "${act.name || 'Unnamed'}" has an unparseable starting date.`);
      return;
    }

    // Is it in our target date range?
    if (actDate < start || actDate > end) {
      return;
    }

    // Date range is matches. Let's inspect distance
    if (act.distanceMeters === undefined || act.distanceMeters === null || isNaN(act.distanceMeters) || act.distanceMeters < 0) {
      missingDistanceCount++;
      excludedCount++;
      warningsList.push(`Activity "${act.name}" on ${act.startDate.slice(0, 10)} excluded due to missing or invalid distance metrics.`);
      return;
    }

    matchingDateActivities.push(act);
  });

  // Aggregation states
  let totalDistanceMeters = 0;
  let totalMovingTimeSeconds = 0;
  let totalElevationGainMeters = 0;
  const activeDaysSet = new Set<string>();

  let longestActivityId: string | null = null;
  let longestDistanceMeters = 0;

  let highestElevationActivityId: string | null = null;
  let highestElevationGainMeters = -Infinity;

  let sumHeartRate = 0;
  let hrAvailableCount = 0;
  let elevationAvailableCount = 0;

  matchingDateActivities.forEach(act => {
    // Add distance
    totalDistanceMeters += act.distanceMeters;
    totalMovingTimeSeconds += (act.movingTimeSeconds || act.elapsedTimeSeconds || 0);

    // Active day capture
    if (act.startDate) {
      const yyyymmdd = act.startDate.slice(0, 10);
      activeDaysSet.add(yyyymmdd);
    }

    // Heart Rate calculation
    if (act.averageHeartRate !== undefined && act.averageHeartRate !== null && !isNaN(act.averageHeartRate) && act.averageHeartRate > 0) {
      sumHeartRate += act.averageHeartRate;
      hrAvailableCount++;
    } else {
      missingHrCount++;
    }

    // Elevation Gain calculation
    if (act.elevationGainMeters !== undefined && act.elevationGainMeters !== null && !isNaN(act.elevationGainMeters)) {
      totalElevationGainMeters += act.elevationGainMeters;
      elevationAvailableCount++;

      if (act.elevationGainMeters > highestElevationGainMeters) {
        highestElevationGainMeters = act.elevationGainMeters;
        highestElevationActivityId = act.id;
      }
    } else {
      missingElevationCount++;
    }

    // Check longest runs
    if (act.distanceMeters > longestDistanceMeters) {
      longestDistanceMeters = act.distanceMeters;
      longestActivityId = act.id;
    }
  });

  if (highestElevationGainMeters === -Infinity) {
    highestElevationGainMeters = 0;
  }

  const totalActivities = matchingDateActivities.length;
  const averagePaceSecPerKm = totalDistanceMeters > 0 ? (totalMovingTimeSeconds / (totalDistanceMeters / 1000)) : 0;
  const averageHeartRate = hrAvailableCount > 0 ? sumHeartRate / hrAvailableCount : null;

  // Build Charts Data
  // Monthly Distance Chart
  const monthlyMap: { [month: string]: number } = {};
  // Weekly Volume Chart
  const weeklyMap: { [week: string]: number } = {};
  // Composition Chart
  const compositionMap: { [sport: string]: { count: number; distance: number } } = {};
  // Elevation Trend list
  const elevationTrendList: { date: string; elevation: number }[] = [];

  matchingDateActivities.forEach(act => {
    const d = new Date(act.startDate);
    
    // Monthly
    const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + act.distanceMeters;

    // Weekly (Determine Sunday starting point for simplicity)
    const sundayStr = getSundayOfWeekString(d);
    weeklyMap[sundayStr] = (weeklyMap[sundayStr] || 0) + act.distanceMeters;

    // Composition
    const sportName = act.sportType || 'Other';
    const cleanSportName = sportName.slice(0, 1).toUpperCase() + sportName.slice(1).toLowerCase();
    if (!compositionMap[cleanSportName]) {
      compositionMap[cleanSportName] = { count: 0, distance: 0 };
    }
    compositionMap[cleanSportName].count += 1;
    compositionMap[cleanSportName].distance += act.distanceMeters;

    // Elevation Trend
    if (act.elevationGainMeters !== undefined && act.elevationGainMeters !== null && !isNaN(act.elevationGainMeters)) {
      elevationTrendList.push({
        date: act.startDate.slice(5, 10), // Short date MM-DD
        elevation: act.elevationGainMeters
      });
    }
  });

  // Format monthly distance array
  const monthlyDistance = Object.entries(monthlyMap).map(([month, distance]) => ({
    month,
    distance,
    formattedDistance: parseFloat((distance / 1000).toFixed(2))
  })).sort((a, b) => {
    const parseMonth = (str: string) => {
      const parts = str.split(' ');
      return new Date(`${parts[0]} 1, ${parts[1]}`).getTime();
    };
    return parseMonth(a.month) - parseMonth(b.month);
  });

  // Format weekly volume array
  const weeklyVolume = Object.entries(weeklyMap).map(([week, distance]) => ({
    week,
    distance,
    formattedDistance: parseFloat((distance / 1000).toFixed(2))
  })).sort((a, b) => {
    return new Date(a.week).getTime() - new Date(b.week).getTime();
  });

  // Format composition array
  const activityComposition = Object.entries(compositionMap).map(([sport, data]) => ({
    sport,
    count: data.count,
    distance: data.distance,
    formattedDistance: parseFloat((data.distance / 1000).toFixed(2))
  }));

  // Sort elevation list chronologically by raw index
  const elevationTrend = elevationTrendList.sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalActivities,
    totalDistanceMeters,
    totalMovingTimeSeconds,
    totalElevationGainMeters,
    activeDays: activeDaysSet.size,
    averagePaceSecPerKm,
    averageHeartRate,
    longestActivityId,
    longestDistanceMeters,
    highestElevationActivityId,
    highestElevationGainMeters,
    dataHealth: {
      totalChecked: checkedActivities.length,
      validDatesCount: checkedActivities.length - missingDateCount,
      validDistanceCount: matchingDateActivities.length,
      hrAvailableCount,
      elevationAvailableCount,
      excludedCount,
      missingDistanceCount,
      missingDateCount,
      missingHrCount,
      missingElevationCount,
      warningsList
    },
    charts: {
      monthlyDistance,
      weeklyVolume,
      activityComposition,
      elevationTrend
    }
  };
}

function getSundayOfWeekString(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to Sunday of current week
  const sunday = new Date(d);
  sunday.setDate(diff);
  return sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
