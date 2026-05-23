import * as fs from 'fs';
import * as path from 'path';

function rewriteCopy(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Global terminology
  content = content.replace(/V3\.01 Cockpit/g, 'V3.0 Dashboard');
  content = content.replace(/V3\.01 COCKPIT/g, 'V3.0 DASHBOARD');
  content = content.replace(/Cockpit/g, 'Dashboard');
  content = content.replace(/COCKPIT/g, 'DASHBOARD');
  content = content.replace(/cockpit/g, 'dashboard');
  
  content = content.replace(/Endurance Biometrics Systems Board/g, 'Performance Overview');
  content = content.replace(/Syncing telemetry.../g, 'Syncing data...');
  
  // page.tsx specifics
  content = content.replace(/BIOMECHANICAL CONTROLLERS/g, 'PERFORMANCE TOOLS');
  content = content.replace(/The Endurance <span className="text-\[#FC5200\]">Dashboard<\/span> for Athletes/g, 'The Endurance <span className="text-[#FC5200]">Dashboard</span> for Athletes');
  content = content.replace(/Deterministic sports science algorithms for endurance runners\. Track acute-to-chronic conditioning scores, VDOT indices, shoe mileage, course records, and resting recovery indicators\./g, 'Data-driven sports science tools for endurance runners. Track training load ratios, VDOT scores, shoe mileage, course records, and resting recovery indicators.');
  content = content.replace(/Initialize Connection/g, 'Log In');
  content = content.replace(/Authorize via sports database registry to load personal pacing logs and biometric records\./g, 'Sign in to access your running dashboard and biometric records.');
  content = content.replace(/CONNECT WITH GOOGLE PROVIDER/g, 'Continue with Google');
  content = content.replace(/DATA TRUTH/g, 'REAL DATA');
  content = content.replace(/CALCULATOR/g, 'CALCULATOR');
  content = content.replace(/DANIELS FORMULA/g, 'VDOT MODEL');
  content = content.replace(/SECURITY/g, 'SECURITY');
  content = content.replace(/GATED PROFILE/g, 'PRIVATE DATA');

  // Sidebar labels
  content = content.replace(/Daily Checks/g, 'Wellness');

  // HUD SUmmary
  content = content.replace(/ATHLETE VDOT SCORE/g, 'VDOT SCORE');
  content = content.replace(/Jack Daniels endurance base index/g, 'Current endurance fitness level');
  content = content.replace(/Waking autonomic baseline/g, 'Current waking baseline');
  content = content.replace(/ACWR STRAIN RATIO/g, 'TRAINING LOAD RATIO');
  
  // Dashboard Tabs & Labels
  content = content.replace(/SUITE A/g, 'ENDURANCE');
  content = content.replace(/Cardiopulmonary Laboratories/g, 'Endurance Tools');
  content = content.replace(/Calculate VO2Max equivalents & recommended training paces/g, 'Calculate VDOT and training paces from a verified race result.');
  
  content = content.replace(/Physiological/g, 'Heart Rate');
  content = content.replace(/Heart Rate Calibrator/g, 'Heart Rate Zone Calculator');
  content = content.replace(/Derive Karvonen heart rate zones safely using resting indices/g, 'Set heart rate zones using your resting and maximum heart rate.');
  
  content = content.replace(/Predictive/g, 'Estimation');
  content = content.replace(/Performance Predictor/g, 'Race Time Predictor');
  content = content.replace(/Predict equivalent race times for standard distances via VDOT/g, 'Estimate race times from your current performance data.');
  
  content = content.replace(/Biokinetics/g, 'Load');
  content = content.replace(/Acute-to-Chronic Ratio/g, 'Training Load Ratio');
  content = content.replace(/Uncover ACWR strain progression levels from registered logs/g, 'Compare recent training load with your longer-term baseline.');
  
  content = content.replace(/Comparative/g, 'Analysis');
  content = content.replace(/Workout Compare Lab/g, 'Workout Comparison');
  content = content.replace(/Examine average speeds, durations, and heart rates side-by-side/g, 'Compare pace, heart rate, and duration across selected activities.');
  
  content = content.replace(/Personal Bests/g, 'Records');
  content = content.replace(/Best Efforts Index/g, 'Best Efforts');
  content = content.replace(/Find your true peak achievements logged across 1K or 5K limits/g, 'View your peak achievements across standard distances.');

  content = content.replace(/SUITE B/g, 'GEAR & FORM');
  content = content.replace(/Mechanics & Equipment/g, 'Gear and Running Form');
  
  content = content.replace(/Equipment Wear Lab/g, 'Shoe Mileage Tracker');
  content = content.replace(/Track cumulative mileage fatigue registered against active shoes/g, 'Track shoe usage and replacement thresholds.');
  
  content = content.replace(/Telemetry/g, 'Form');
  content = content.replace(/Running Mechanics Form/g, 'Running Form Analysis');
  content = content.replace(/Analyze landing cadences & step frequencies across courses/g, 'Analyze cadence and running form metrics.');
  
  content = content.replace(/GeoArt/g, 'Map');
  content = content.replace(/GPS Route Art Canvas/g, 'Route Art');
  content = content.replace(/Examine raw polyline streams logged on outdoor circuits/g, 'Create visual posters from GPS activity routes.');
  
  content = content.replace(/Altimeter/g, 'Elevation');
  content = content.replace(/Trail Elevation Log/g, 'Trail & Elevation Analysis');
  content = content.replace(/Observe vertical meters, climbs matrices, and altimeter gains/g, 'Analyze elevation gain and grade distribution.');
  
  content = content.replace(/PR Segment/g, 'Segments');
  content = content.replace(/Course Records Board/g, 'Course Records');
  content = content.replace(/Compare peak workout metrics completed across key training courses/g, 'Track your fastest times on specific routes or segments.');
  
  content = content.replace(/Intervals/g, 'Workouts');
  content = content.replace(/Intensity Design Vault/g, 'Workout Library');
  content = content.replace(/Construct precise high-intensity interval conditioning blocks/g, 'Create and store structured interval sessions with pace targets.');

  content = content.replace(/SUITE C/g, 'RECOVERY');
  content = content.replace(/Autonomic Restoration/g, 'Wellness & Recovery');
  
  content = content.replace(/Parasympathetic/g, 'HRV');
  content = content.replace(/HRV Autonomic Variability/g, 'HRV Lab');
  content = content.replace(/Monitor morning RMSSD autonomic balance indexes/g, 'Monitor heart rate variability trends.');
  
  content = content.replace(/Restoration/g, 'Sleep');
  content = content.replace(/Sleep & Recovery Hours/g, 'Sleep Analysis');
  content = content.replace(/Observe deep recovery sleep hours & cell restorative levels/g, 'Track sleep duration and quality over time.');
  
  content = content.replace(/Overtravel/g, 'Guard');
  content = content.replace(/Compute physiological stress alarms and threshold bounds/g, 'Monitor physiological metrics for signs of overtraining.');
  
  content = content.replace(/Soreness/g, 'Mobility');
  content = content.replace(/Muscular Injury Radar/g, 'Injury Risk');
  content = content.replace(/Trace physical sorenesses directly from daily checking logs/g, 'Track muscle soreness and fatigue.');
  
  content = content.replace(/Diagnostics/g, 'Reports');
  content = content.replace(/Consolidated Diagnostics/g, 'Performance Reports');
  content = content.replace(/Review overall diagnostics of endurance volumes and loads/g, 'Generate consolidated performance and volume reports.');
  
  content = content.replace(/Decrees/g, 'Help');
  content = content.replace(/System Guide & Formulas/g, 'How to Use');
  content = content.replace(/Review Jack Daniels VO2 levels, ACWR calculations, and rules/g, 'Learn about the metrics and calculations used in Track.Studio.');

  // Form / Tab 2
  content = content.replace(/PROVISION LOGS/g, 'NEW LOG');
  content = content.replace(/Register Workout/g, 'Log Activity');
  content = content.replace(/COMMIT WORKOUT/g, 'SAVE ACTIVITY');
  content = content.replace(/ACTIVITY STREAM/g, 'ACTIVITY LOG');
  content = content.replace(/Logged Workouts Registry/g, 'Recent Activities');
  content = content.replace(/Athlete log notes:/g, 'Notes:');

  // Tab 3
  content = content.replace(/JOURNAL ENTRIES/g, 'DAILY LOGS');
  content = content.replace(/Morning Biometric Checklists/g, 'Morning Wellness Checks');
  content = content.replace(/Keep submitting daily morning waking check metrics directly to build comprehensive sports science recovery models\./g, 'Log your daily resting metrics to track recovery trends.');
  content = content.replace(/Log Morning Biometrics/g, 'Log Wellness Check');
  content = content.replace(/No specific wellness observations submitted\./g, 'No notes submitted.');
  
  // Empty states
  content = content.replace(/No workouts logged yet\./g, 'No activity data available.');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Rewritten: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      rewriteCopy(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
