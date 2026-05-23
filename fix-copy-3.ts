import * as fs from 'fs';
import * as path from 'path';

function rewriteCopy3(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Compare Lab
  content = content.replace(/Initiating Comparison Engine\.\.\./g, 'Loading Activities...');
  content = content.replace(/Biomechanical Comparison Laboratory/g, 'Workout Comparison');
  content = content.replace(/interactive dual-workout biomechanical analysis/g, 'an interactive workout comparison');
  
  // Morning Check
  content = content.replace(/Morning Check Biometrics/g, 'Morning Check');
  content = content.replace(/BIOMETRICS DIRECT INPUT/g, 'WELLNESS DIRECT INPUT');
  
  // Reports
  content = content.replace(/Consolidated Biometric Reports/g, 'Performance Reports');
  content = content.replace(/Biomechanical outputs/g, 'Performance outputs');
  content = content.replace(/morning biometric checklists/g, 'morning wellness checks');
  content = content.replace(/morning biometric check/g, 'morning wellness check');
  
  // Overtraining Guard
  content = content.replace(/Biomechanical muscle soreness/g, 'Muscle soreness');
  content = content.replace(/Scanning Biomechanical Traps\.\.\./g, 'Scanning for Overtraining...');
  content = content.replace(/REAL-TIME BIOPHARMA MONITORING/g, 'REAL-TIME MONITORING');
  content = content.replace(/morning biometrics fatigue checks/g, 'morning wellness logs');
  
  // Layout
  content = content.replace(/brutalist biometric performance tracker/g, 'brutalist performance tracker');

  // How to use
  content = content.replace(/speculative evaluations, or simulate imaginary achievements\. If biometric data/g, 'speculative evaluations. If data');

  // Login
  content = content.replace(/Sports Science Biometrics and Timeline Console/g, 'Sports Science and Performance Platform');
  content = content.replace(/biometric timeline/g, 'performance timeline');

  // App Page
  content = content.replace(/biometric records/g, 'wellness records');
  
  // Profile
  content = content.replace(/Custom biomechanical thresholds/g, 'Custom physiological thresholds');
  content = content.replace(/Biomass/g, 'Weight');
  content = content.replace(/Biometabolic Caps/g, 'Heart Rate Limits');
  content = content.replace(/BIOPROFILE DATA MERGED SUCCESSFULLY/g, 'PROFILE SAVED SUCCESSFULLY');
  content = content.replace(/BIOPROFILE RESTING HR METRIC CONSOLIDATED/g, 'RESTING HR SAVED');
  
  // Sleep
  content = content.replace(/morning biometrics questionnaire/g, 'morning wellness log');

  // Data Health
  content = content.replace(/Heart rate biometrics/g, 'Heart rate metrics');
  content = content.replace(/SECURE PASSWORDS AND API SECRETS HELD CONFINED IN CONSOLE ENGINE/g, 'API SECRETS HELD SECURELY');
  content = content.replace(/Local Biometric Data Quality Audit/g, 'Local Data Quality Audit');
  content = content.replace(/Local Data Biometric Quality/g, 'Local Data Quality');
  content = content.replace(/Biometric Discrepancy/g, 'Data Discrepancy');
  content = content.replace(/biometrics schema integrity/g, 'data schema integrity');
  
  // Injury Radar
  content = content.replace(/Initializing Biomechanics Radar\.\.\./g, 'Loading...');
  content = content.replace(/Biomechanical Injury Radar/g, 'Injury Risk Analysis');
  content = content.replace(/active biometric logs/g, 'active wellness logs');
  content = content.replace(/morning check biometrics dashboard/g, 'morning wellness check');
  
  // Heart Rate Calc
  content = content.replace(/Heart Rate Bio-Intensity Calibration/g, 'Heart Rate Zones');
  content = content.replace(/Biometric Thresholds/g, 'Heart Rate Thresholds');

  // Shell
  content = content.replace(/BIOMETRICS BASE/g, 'PHYSIOLOGY BASE');
  content = content.replace(/REAL-TIME DETERMINISTIC ENGINE/g, 'REAL-TIME DATA-DRIVEN ANALYSIS');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Rewritten Phase 3: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      rewriteCopy3(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
