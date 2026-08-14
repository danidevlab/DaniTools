const { exec } = require('child_process');

// 실행할 Deno 명령어 (예: run ../script.js)
const command = 'deno run 0/front.js';

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`실행 에러: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`출력 결과:\n${stdout}`);
});
