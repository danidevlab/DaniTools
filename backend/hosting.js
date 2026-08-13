import { serveDir } from "jsr:@std/http/file-server";

// 서버 시작
Deno.serve({ port: 8000 }, (req) => {
  return serveDir(req, {
    fsRoot: "../frontend",
    urlRoot: "",
  });
});

// Windows 기본 브라우저 열기
new Deno.Command("powershell", {
  args: [
    "-NoProfile",
    "-Command",
    "Start-Process 'http://localhost:8000'",
  ],
}).output();