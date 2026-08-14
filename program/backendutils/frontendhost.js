import { serveDir } from "jsr:@std/http/file-server";

const CONFIG = {
  port: 5050,
  frontendDir: "./frontend",
};

/**
 * HTTP 서버를 시작하는 함수
 */
function startServer() {
  Deno.serve({ port: CONFIG.port }, (req) => {
    return serveDir(req, {
      fsRoot: CONFIG.frontendDir,
      urlRoot: "",
      showDirList: true,
      enableCors: true,
    });
  });

  console.log(`Server running at http://localhost:${CONFIG.port}/`);
}

/**
 * 운영체제에 맞춰 기본 브라우저를 여는 함수
 */
function openBrowser(url) {
  const isWindows = Deno.build.os === "windows";
  const command = isWindows ? "cmd" : "xdg-open";
  const args = isWindows ? ["/c", "start", url] : [url];

  try {
    new Deno.Command(command, { args }).spawn();
  } catch (e) {
    console.error("브라우저를 자동으로 열지 못했습니다:", e);
  }
}

/**
 * 애플리케이션 초기화 및 실행 함수
 */
function main() {
  startServer();

  // 2초 뒤에 브라우저 오픈
  setTimeout(() => {
    openBrowser(`http://localhost:${CONFIG.port}`);
  }, 2000);
}

// 실행
main();