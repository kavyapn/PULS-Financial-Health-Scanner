import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { COACH_REQUEST_LIMIT, createCoach } from "./coach-server.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "dist");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".webp":"image/webp" };
let key = process.env.JAIF_API_KEY?.trim();
if (process.env.JAIF_API_KEY_FILE) {
  try { key = (await readFile(process.env.JAIF_API_KEY_FILE, "utf8")).trim(); }
  catch { console.warn("The JAIF secret file could not be read. Demo guidance is enabled."); }
}
const coach = createCoach({
  apiKey: key, baseUrl: process.env.JAIF_BASE_URL || undefined, modelId: process.env.JAIF_MODEL,
  loadProfile: async persona => JSON.parse(await readFile(resolve(root, "api", "banking", persona + ".json"), "utf8"))
});
const json = (res,status,data) => {
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(JSON.stringify(data));
};

async function readBody(req) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > COACH_REQUEST_LIMIT) throw new Error("Request too large");
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}

async function answer(req,res) {
  if (req.headers.origin) {
    let sameHost = false;
    try { sameHost = new URL(req.headers.origin).host === req.headers.host; } catch {}
    if (!sameHost) return json(res,403,{error:"Open PULS on the same server."});
  }
  if (!req.headers["content-type"]?.startsWith("application/json")) return json(res,415,{error:"Expected JSON."});
  let input;
  try { input = await readBody(req); }
  catch { return json(res,400,{error:"The request could not be read."}); }
  const reply = await coach.reply(input);
  if (!reply) return json(res,400,{error:"Choose a demo profile and ask a shorter question."});
  return json(res,200,reply);
}

const server = createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if (req.method === "GET" && path === "/api/health") return json(res,200,{status:"ok",aiConfigured:coach.configured});
    if (req.method === "POST" && path === "/api/coach") return await answer(req,res);
    if (req.method !== "GET" && req.method !== "HEAD") return json(res,405,{error:"Method unavailable."});
    if (path.startsWith("/server/")) return json(res,404,{error:"Page unavailable."});
    const local = resolve(root,"."+(path === "/" ? "/index.html" : path));
    if (!local.startsWith(root+sep) || !types[extname(local)]) return json(res,404,{error:"Page unavailable."});
    const info = await stat(local);
    if (!info.isFile()) return json(res,404,{error:"Page unavailable."});
    res.writeHead(200,{"Content-Type":types[extname(local)],"Content-Length":info.size,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    if (req.method === "HEAD") return res.end();
    res.end(await readFile(local));
  } catch {
    if (!res.headersSent) json(res,404,{error:"Page unavailable."});
    else res.end();
  }
});
server.listen(Number(process.env.PORT || 8080),process.env.HOST || "0.0.0.0",()=>console.log(`PULS listening on port ${server.address().port}`));
