import assets from "puls-assets";
import { COACH_REQUEST_LIMIT, createCoach } from "../coach-server.mjs";

const coaches = new WeakMap();

function coachFor(env) {
  if (!coaches.has(env)) {
    coaches.set(env, createCoach({
      apiKey: env.JAIF_API_KEY, modelId: env.JAIF_MODEL,
      loadProfile: persona => JSON.parse(assets[`/api/banking/${persona}.json`].body)
    }));
  }
  return coaches.get(env);
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function readQuestion(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > COACH_REQUEST_LIMIT) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

async function answer(request, origin, env) {
  if (request.headers.has("Origin") && request.headers.get("Origin") !== origin) {
    return json({ error: "Open PULS on the same server." }, 403);
  }
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return json({ error: "Expected JSON." }, 415);
  }
  let input;
  try { input = await readQuestion(request); }
  catch { return json({ error: "The request could not be read." }, 400); }
  const reply = await coachFor(env).reply(input);
  return reply ? json(reply) : json({ error: "Choose a demo profile and ask a shorter question." }, 400);
}

export default {
  async fetch(request, env) {
    const { origin, pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/api/health") {
      return json({ status: "ok", aiConfigured: coachFor(env).configured });
    }
    if (request.method === "POST" && pathname === "/api/coach") return answer(request, origin, env);
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method unavailable." }, 405);
    const asset = assets[pathname === "/" ? "/index.html" : pathname];
    if (!asset?.type) return json({ error: "Page unavailable." }, 404);
    const body = request.method === "HEAD" ? null : asset.binary ? Uint8Array.from(atob(asset.body), char => char.charCodeAt(0)) : asset.body;
    return new Response(body, {
      headers: { "Content-Type": asset.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  }
};
