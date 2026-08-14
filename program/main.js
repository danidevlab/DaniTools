const { spawn } = require('child_process');

const scripts = [
    './backendutils/frontendhost.js',
    './backendutils/applisten.js',
    './backendutils/worker.js'
];

for (const script of scripts) {
    const process = spawn('deno', ['run', script], {
        stdio: ['inherit', 'pipe', 'pipe']
    });

    process.stdout.on('data', (data) => {
        console.log(`[${script}] ${data.toString().trim()}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`[${script} ERROR] ${data.toString().trim()}`);
    });

    process.on('close', (code) => {
        console.log(`[${script}] 종료됨 (code: ${code})`);
    });
}