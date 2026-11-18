import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp"
};
const assets = {};
for (const file of await readdir(dist, { recursive: true, withFileTypes: true })) {
  const type = types[extname(file.name)];
  if (!file.isFile() || !type) continue;
  const path = join(file.parentPath, file.name);
  const name = relative(dist, path).split(sep).join("/");
  if (name.startsWith("server/") || name.startsWith(".openai/")) continue;
  const binary = /\.(png|webp)$/.test(name);
  assets["/" + name] = { type, binary, body: await readFile(path, binary ? "base64" : "utf8") };
}
if (!assets["/index.html"]) throw new Error("The PULS app is missing index.html.");

await build({
  absWorkingDir: root, entryPoints: ["worker/index.js"], outfile: "dist/server/index.js",
  bundle: true, format: "esm", platform: "browser", target: "es2022",
  plugins: [{
    name: "puls-assets",
    setup(builder) {
      builder.onResolve({ filter: /^puls-assets$/ }, () => ({ path: "puls-assets", namespace: "embedded" }));
      builder.onLoad({ filter: /.*/, namespace: "embedded" }, () => ({ contents: `export default ${JSON.stringify(assets)};` }));
    }
  }]
});
