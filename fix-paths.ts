import * as fs from 'fs';

function fixPath(file: string) {
   let content = fs.readFileSync(file, 'utf8');
   content = content.replace(/..\/..\/..\/lib\/firebase\/admin/g, '../../../../lib/firebase/admin');
   fs.writeFileSync(file, content);
}

fixPath('app/api/strava/callback/route.ts');
fixPath('app/api/strava/disconnect/route.ts');
fixPath('app/api/strava/status/route.ts');
