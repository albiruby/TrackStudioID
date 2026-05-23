import * as fs from 'fs';

function replaceMobility() {
  const files = [
    'app/morning-check/page.tsx',
    'app/overtraining-guard/page.tsx',
    'app/injury-radar/page.tsx'
  ];

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/muscleMobility/g, 'muscleSoreness');
    content = content.replace(/setMuscleMobility/g, 'setMuscleSoreness');
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  });
}

replaceMobility();
