const { spawn } = require('child_process');
const http = require('http');

const child = spawn('npx', ['next', 'dev', '-p', '3001'], { stdio: 'pipe' });

child.stdout.on('data', (data) => console.log(`STDOUT: ${data}`));
child.stderr.on('data', (data) => console.error(`STDERR: ${data}`));

setTimeout(() => {
  http.get('http://127.0.0.1:3001/', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      console.log('RESPONSE:', rawData.substring(0, 500));
      process.exit(0);
    });
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
    process.exit(1);
  });
}, 8000);
