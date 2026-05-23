import * as fs from 'fs';
import * as path from 'path';

function fixTypographyPhase3(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Generic font-mono removals for non-numeric fields
  content = content.replace(/font-mono bg-/g, 'bg-');
  content = content.replace(/font-mono rounded/g, 'font-sans rounded');
  content = content.replace(/font-mono text-/g, 'text-');
  content = content.replace(/font-mono tracking-/g, 'tracking-');
  content = content.replace(/font-mono pt-1/g, 'font-sans pt-1');
  
  // Table container fonts
  content = content.replace(/gap-2 pt-1 font-mono/g, 'gap-2 pt-1');
  
  // Restore font-mono specifically for numeric fields and badges if needed
  // We'll replace the one we broke: font-mono text-base font-bold
  content = content.replace(/text-base font-bold text-white/g, 'font-mono text-base font-bold text-white tracking-tight');
  content = content.replace(/text-base font-bold text-zinc-300/g, 'font-mono text-base font-bold text-zinc-300 tracking-tight');
  
  // Specific inputs
  content = content.replace(/text-xs text-zinc-400 uppercase font-bold block font-mono/g, 'text-xs text-zinc-400 uppercase font-bold block');

  // Any hanging font-mono text-xs
  content = content.replace(/text-xs font-mono/g, 'text-xs');

  // Fix form and layout widths
  content = content.replace(/max-w-screen-xl/g, 'max-w-[1280px]');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated Phase 3: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      fixTypographyPhase3(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
