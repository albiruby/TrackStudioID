import * as fs from 'fs';
import * as path from 'path';

function fixTypographyPhase5(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Clean double classes and strange leftovers
  content = content.replace(/tracking-wide tracking-wider/g, 'tracking-wide');
  content = content.replace(/font-heading font-heading/g, 'font-heading');
  content = content.replace(/border-zinc-90 w\/40/g, 'border-white/10');
  content = content.replace(/border-zinc-\d+0?/g, 'border-white/10');
  content = content.replace(/border-zinc-90/g, 'border-white/10');
  content = content.replace(/bg-zinc-855/g, 'bg-zinc-800');
  content = content.replace(/bg-zinc-905/g, 'bg-zinc-900');
  content = content.replace(/text-zinc-450/g, 'text-zinc-400');
  content = content.replace(/text-zinc-550/g, 'text-zinc-500');
  content = content.replace(/text-zinc-650/g, 'text-zinc-500');
  content = content.replace(/text-zinc-750/g, 'text-zinc-600');
  
  // Clean up excessive uppercase in long body copy
  // Example: text-sm text-zinc-400 font-sans leading-relaxed uppercase
  content = content.replace(/text-sm text-zinc-400 font-sans leading-relaxed uppercase/g, 'text-sm text-zinc-400 font-sans leading-relaxed');

  // Any hanging font-mono text-xs
  content = content.replace(/text-xs font-mono/g, 'text-xs');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated Phase 5: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      fixTypographyPhase5(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
