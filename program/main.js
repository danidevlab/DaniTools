import { serveDir } from "jsr:@std/http/file-server";

// ======================================================
// 설정 및 경로 정의
// ======================================================

const CONFIG = {
  frontendPort: 5050,
  apiPort: 4047,
  frontendDir: "./frontend",
};

const USERDATA_DIR = new URL("./userdata/", import.meta.url);
const WINDOWDATA_FILE = new URL("./userdata/windowdata.json", import.meta.url);
const MEMODATA_FILE = new URL("./userdata/memodata.json", import.meta.url);
const MEMO_PAGES_DIR = new URL("./userdata/memoapp-pages/", import.meta.url);

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const textHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// ======================================================
// 유틸리티 함수
// ======================================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

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

// ======================================================
// 1. 프론트엔드 정적 파일 서버 (5050 포트)
// ======================================================

function startFrontendServer() {
  Deno.serve({ port: CONFIG.frontendPort }, (req) => {
    return serveDir(req, {
      fsRoot: CONFIG.frontendDir,
      urlRoot: "",
      showDirList: true,
      enableCors: true,
    });
  });

  console.log(`[Frontend] 서버 실행: http://localhost:${CONFIG.frontendPort}/`);
}

// ======================================================
// 2. 백엔드 API 서버 (4047 포트)
// ======================================================

function startApiServer() {
  Deno.serve(
    {
      port: CONFIG.apiPort,
      onListen({ hostname, port }) {
        console.log(`[API] 서버 실행: http://localhost:${port}`);
      },
    },

    async (req) => {
      const url = new URL(req.url);

      // CORS Preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }

      // [GET] /savewindowdata/
      if (url.pathname === "/savewindowdata/" && req.method === "GET") {
        const data = url.searchParams.get("windowdata");

        if (!data) {
          return jsonResponse({ success: false, error: "windowdata 없음" }, 400);
        }

        try {
          JSON.parse(data);
          await Deno.writeTextFile(WINDOWDATA_FILE, data);
          console.log("[WindowData] 저장 완료");
          return jsonResponse({ success: true });
        } catch (error) {
          console.error("[WindowData] 저장 실패:", error);
          return jsonResponse({ success: false, error: "windowdata 저장 실패" }, 500);
        }
      }

      // [GET] /getwindowdata/
      if (url.pathname === "/getwindowdata/" && req.method === "GET") {
        try {
          const data = await Deno.readTextFile(WINDOWDATA_FILE);
          JSON.parse(data);
          console.log("[WindowData] 복원 요청");
          return new Response(data, { status: 200, headers });
        } catch {
          console.log("[WindowData] 저장된 데이터 없음");
          return new Response("[]", { status: 200, headers });
        }
      }

      // [GET] /app/memosave/
      if (url.pathname === "/app/memosave/" && req.method === "GET") {
        const data = url.searchParams.get("data");

        if (!data) {
          return jsonResponse({ success: false, error: "data 없음" }, 400);
        }

        try {
          const parsed = JSON.parse(data);
          await Deno.writeTextFile(
            MEMODATA_FILE,
            JSON.stringify(parsed, null, 2)
          );
          console.log("[Memo] memodata.json 저장 완료");
          return jsonResponse({ success: true });
        } catch (error) {
          console.error("[Memo] 저장 실패:", error);
          return jsonResponse({ success: false, error: "메모 데이터 저장 실패" }, 500);
        }
      }

      // [GET] /app/memorestore/
      if (url.pathname === "/app/memorestore/" && req.method === "GET") {
        try {
          const data = await Deno.readTextFile(MEMODATA_FILE);
          JSON.parse(data);
          console.log("[Memo] memodata.json 불러오기");
          return new Response(data, { status: 200, headers });
        } catch {
          console.log("[Memo] memodata.json 없음");
          return new Response("[]", { status: 200, headers });
        }
      }

      // [GET] /app/memopages/
      if (url.pathname === "/app/memopages/" && req.method === "GET") {
        const pages = [];

        try {
          for await (const entry of Deno.readDir(MEMO_PAGES_DIR)) {
            if (entry.isFile && entry.name.toLowerCase().endsWith(".md")) {
              const fileURL = new URL(
                encodeURIComponent(entry.name),
                MEMO_PAGES_DIR
              );

              try {
                const content = await Deno.readTextFile(fileURL);
                pages.push({ name: entry.name, content });
              } catch (error) {
                console.error(`[MemoPages] ${entry.name} 읽기 실패:`, error);
              }
            }
          }

          pages.sort((a, b) => a.name.localeCompare(b.name, "ko"));
          console.log(`[MemoPages] ${pages.length}개 파일 전송`);
          return jsonResponse(pages);
        } catch (error) {
          console.error("[MemoPages] 폴더 읽기 실패:", error);
          return jsonResponse([]);
        }
      }

      // [GET] /app/memopage/
      if (url.pathname === "/app/memopage/" && req.method === "GET") {
        const filename = url.searchParams.get("file");

        if (!filename) {
          return jsonResponse({ success: false, error: "file 없음" }, 400);
        }

        if (!filename.toLowerCase().endsWith(".md")) {
          return jsonResponse(
            { success: false, error: "Markdown 파일만 허용됩니다." },
            400
          );
        }

        const safeName = filename
          .replaceAll("/", "")
          .replaceAll("\\", "")
          .replaceAll("..", "");

        try {
          const fileURL = new URL(
            encodeURIComponent(safeName),
            MEMO_PAGES_DIR
          );
          const content = await Deno.readTextFile(fileURL);
          console.log(`[MemoPages] ${safeName} 전송`);
          return new Response(content, { status: 200, headers: textHeaders });
        } catch {
          return jsonResponse(
            { success: false, error: "파일을 찾을 수 없습니다." },
            404
          );
        }
      }

      // [GET] /app/userdata/
      if (url.pathname === "/app/userdata/" && req.method === "GET") {
        try {
          const result = [];
          for await (const entry of Deno.readDir(USERDATA_DIR)) {
            result.push({
              name: entry.name,
              type: entry.isDirectory ? "directory" : "file",
            });
          }
          return jsonResponse(result);
        } catch {
          return jsonResponse([]);
        }
      }

      // Not Found
      return jsonResponse(
        { success: false, error: "Not Found", path: url.pathname },
        404
      );
    }
  );
}

// ======================================================
// 메인 실행 흐름
// ======================================================

function main() {
  // 1. 프론트엔드 서버 실행 (5050 포트)
  startFrontendServer();

  // 2. 2초 후 API 서버 실행 (4047 포트) 및 브라우저 오픈
  setTimeout(() => {
    startApiServer();
    openBrowser(`http://localhost:${CONFIG.frontendPort}`);
  }, 2000);
}

// 실행
main();