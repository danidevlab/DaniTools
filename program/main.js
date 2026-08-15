const scripts = [
    "./backendutils/frontendhost.js",
    "./backendutils/applisten.js",
    "./backendutils/worker.js"
];

for (const script of scripts) {
    const command = new Deno.Command("deno", {
        args: ["run", script],
        stdout: "piped",
        stderr: "piped"
    });

    const child = command.spawn();

    (async () => {
        for await (const chunk of child.stdout) {
            const text = new TextDecoder().decode(chunk).trim();
            if (text) {
                console.log(`[${script}] ${text}`);
            }
        }
    })();

    (async () => {
        for await (const chunk of child.stderr) {
            const text = new TextDecoder().decode(chunk).trim();
            if (text) {
                console.error(`[${script} ERROR] ${text}`);
            }
        }
    })();

    child.status.then((status) => {
        console.log(
            `[${script}] 종료됨 (code: ${status.code})`
        );
    });
}