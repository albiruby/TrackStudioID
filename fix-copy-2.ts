import * as fs from 'fs';
import * as path from 'path';

function rewriteCopy2(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // More replacements
  content = content.replace(/Athlete Bioprofile Dossier/g, 'Athlete Profile');
  content = content.replace(/MERGING DOSSIER\.\.\./g, 'SAVING PROFILE...');
  content = content.replace(/SAVE AND CONSOLIDATE BIOPROFILE/g, 'SAVE PROFILE');
  content = content.replace(/athlete dossier/g, 'athlete profile');
  content = content.replace(/System Healthy/g, 'Data Connection Active');
  content = content.replace(/Metabolic Imprint Analysis/g, 'Training Profile');
  content = content.replace(/Accumulated Residual Fatigue/g, 'Accumulated Fatigue');
  content = content.replace(/Physiological Stream Analysis/g, 'Activity Stream Analysis');
  content = content.replace(/Dev Lab/g, 'Activity Analysis');
  content = content.replace(/Command Center/g, 'Dashboard');
  content = content.replace(/Bio Scan/g, 'Scan');
  
  // Specific wording fixes requested
  content = content.replace(/Profile Dossier/g, 'Athlete Profile');
  content = content.replace(/Pre-calculated Load vs Recovery/g, 'Training Load vs Recovery');
  content = content.replace(/Predictive Engine/g, 'Race Predictor');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Rewritten Phase 2: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      rewriteCopy2(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
