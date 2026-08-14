import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const FILE = "./windowdata.json";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  const url = new URL(req.url);

  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  // =========================
  // 창 데이터 저장
  // =========================
  if (url.pathname === "/savewindowdata/") {
    const data = url.searchParams.get("windowdata");

    if (!data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "windowdata 없음",
        }),
        {
          status: 400,
          headers,
        }
      );
    }

    try {
      // JSON 형식인지 확인
      JSON.parse(data);

      await Deno.writeTextFile(FILE, data);

      console.log("창 데이터 저장 완료");

      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      console.error("저장 실패:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: "저장 실패",
        }),
        {
          status: 500,
          headers,
        }
      );
    }
  }

  // =========================
  // 창 데이터 복원
  // =========================
  if (url.pathname === "/getwindowdata/") {
    try {
      const data = await Deno.readTextFile(FILE);

      // JSON 유효성 검사
      JSON.parse(data);

      console.log("창 데이터 복원 요청");

      return new Response(data, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.log("저장된 창 데이터 없음");

      // 파일이 없으면 빈 배열 반환
      return new Response("[]", {
        status: 200,
        headers,
      });
    }
  }

  // =========================
  // 존재하지 않는 경로
  // =========================
  return new Response(
    JSON.stringify({
      success: false,
      error: "Not Found",
    }),
    {
      status: 404,
      headers,
    }
  );
}, {
  port: 4047,
});

console.log("창 데이터 서버 실행: http://localhost:4047");