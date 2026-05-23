import * as fs from 'fs';
import * as path from 'path';

function fixTypographyPhase2(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Kill tiny text
  content = content.replace(/text-\[8px\]/g, 'text-xs');
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-xs');

  // Kill extra font-black globally
  content = content.replace(/font-black/g, 'font-bold');

  // Fix global font hierarchy
  // Sidebar labels
  content = content.replace(/font-sans text-sm font-semibold uppercase tracking-wide/g, 'font-sans text-sm font-medium uppercase tracking-wide');
  content = content.replace(/text-zinc-500 uppercase tracking-widest mt-1/g, 'text-zinc-400 font-sans tracking-wide mt-1');
  
  // Make sure we have proper tracking
  content = content.replace(/tracking-widest/g, 'tracking-wider');

  // Card titles
  content = content.replace(/font-heading text-lg font-semibold/g, 'font-sans text-base font-semibold');
  content = content.replace(/font-heading text-xl font-bold/g, 'font-heading text-xl font-bold');

  // Labels
  content = content.replace(/font-semibold uppercase tracking-wider/g, 'font-medium uppercase tracking-wide');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated Phase 2: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      fixTypographyPhase2(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
