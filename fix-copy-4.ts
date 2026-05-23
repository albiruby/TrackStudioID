import * as fs from 'fs';
import * as path from 'path';

function rewriteCopy4(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Empty state texts
  content = content.replace(/INSUFFICIENT REGISTERED LOGS/g, 'NOT ENOUGH DATA');
  content = content.replace(/Insufficient guard indices/g, 'Not enough data');
  content = content.replace(/insufficient readings/g, 'missing data');

  // Any leftover "Bio", "Scan", etc
  content = content.replace(/Bio-state/gi, 'Status');
  content = content.replace(/Neural/gi, 'Data');
  content = content.replace(/Elite mode/gi, 'Advanced mode');
  content = content.replace(/Engine active/gi, 'Active');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Rewritten Phase 4: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      rewriteCopy4(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
