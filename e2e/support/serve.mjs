import fs from "node:fs";
import http from "node:http";
import path from "node:path";

// Serves the single-page web export. Every path that is not a file falls
// back to index.html, which is how the router reads deep links.
const root = path.resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 8061);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`No web export at ${root}. Run the export first.`);
  process.exit(1);
}

http
  .createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname);
    let file = path.join(root, pathname);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(root, "index.html");
    }
    response.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, "127.0.0.1", () => console.log(`Serving ${root} on http://127.0.0.1:${port}`));
