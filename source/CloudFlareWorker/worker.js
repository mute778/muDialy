/**
 * Cloudflare Worker — Slack投稿プロキシ
 *
 * 環境変数（Cloudflare Dashboardで設定）:
 *   SLACK_BOT_TOKEN  : xoxb-xxxx...
 *   SLACK_CHANNEL_ID : C0XXXXXXXX
 *   ALLOWED_ORIGIN   : https://<your-github-username>.github.io
 */

const SLACK_API = "https://slack.com/api/chat.postMessage";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // CORS プリフライト
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, origin, env);
    }

    if (request.method !== "POST") {
      return corsResponse(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        405, origin, env
      );
    }

    // リクエストボディ取得
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(
        JSON.stringify({ ok: false, error: "Invalid JSON" }),
        400, origin, env
      );
    }

    const { text, timestamp } = body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return corsResponse(
        JSON.stringify({ ok: false, error: "text is required" }),
        400, origin, env
      );
    }

    // Slackへ投稿
    // メッセージ形式: タイムスタンプ + 改行 + 本文
    const slackText = `${timestamp || new Date().toISOString()}\n${text.trim()}`;

    let slackRes;
    try {
      slackRes = await fetch(SLACK_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Bearer ${env.SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: env.SLACK_CHANNEL_ID,
          text: slackText,
        }),
      });
    } catch (err) {
      return corsResponse(
        JSON.stringify({ ok: false, error: `Slack request failed: ${err.message}` }),
        502, origin, env
      );
    }

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      return corsResponse(
        JSON.stringify({ ok: false, error: slackData.error || "Slack API error" }),
        500, origin, env
      );
    }

    return corsResponse(
      JSON.stringify({ ok: true }),
      200, origin, env
    );
  },
};

function corsResponse(body, status, origin, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || "*";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(body, { status, headers });
}
