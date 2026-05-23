import * as fs from 'fs';
import * as path from 'path';

function fixTypographyPhase6(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Widen single page content max-widths
  content = content.replace(/max-w-4xl/g, 'max-w-[1400px]');
  content = content.replace(/max-w-5xl/g, 'max-w-[1400px]');
  content = content.replace(/max-w-3xl/g, 'max-w-[1400px]');

  // A couple odd lingering bugs in strings
  content = content.replace(/font-sans tracking-wide mt-1.5 font-bold/g, 'font-medium tracking-wide mt-1.5');
  content = content.replace(/tracking-wide text-white tracking-wider/g, 'tracking-wide text-white');
  content = content.replace(/uppercase tracking-wide tracking-wider/g, 'uppercase tracking-wide');
  content = content.replace(/font-sans text-zinc-400 leading-relaxed uppercase/g, 'font-medium tracking-wide text-zinc-400 leading-relaxed');
  content = content.replace(/leading-relaxed uppercase/g, 'leading-relaxed');
  content = content.replace(/font-mono/g, 'font-mono'); // Just ensuring we didn't break things
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated Phase 6: ${filePath}`);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      if (fullPath.includes('login') || fullPath.includes('LoginCard.tsx') || fullPath === "app/page.tsx") {
        continue; // Keep login and intro panel narrow
      }
      fixTypographyPhase6(fullPath);
    }
  }
}

processDirectory('./app');
processDirectory('./components');
