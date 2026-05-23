import * as fs from 'fs';
import * as path from 'path';

function fixTypographyPhase4(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Bump contrast and remove uppercase compression on tiny tables headers and descriptions
  content = content.replace(/text-xs text-zinc-500 uppercase/g, 'text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide');
  content = content.replace(/text-xs text-zinc-500 mt-1 uppercase/g, 'text-sm font-sans text-zinc-400 mt-1 leading-relaxed');
  content = content.replace(/text-xs text-zinc-500/g, 'text-sm font-sans text-zinc-400');
  
  // Any lingering font tricks
  content = content.replace(/font-mono text-xs uppercase tracking-wider font-bold/g, 'font-sans text-sm font-semibold uppercase tracking-wide');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated Phase 4: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      fixTypographyPhase4(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
