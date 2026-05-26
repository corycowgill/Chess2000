// Minimal zero-dependency static file server with correct MIME types.
// Render or any Node host can run this with `node server.js`.

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function safeJoin(base, target) {
  const resolved = path.resolve(base, "." + target);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  const filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  fs.stat(filePath, (err, stat) => {
    let resolved = filePath;
    if (err || !stat.isFile()) {
      // SPA-style fallback for unknown paths
      resolved = path.join(ROOT, "index.html");
    }
    const ext = path.extname(resolved).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(resolved).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Chicago Chess listening on http://0.0.0.0:${PORT}`);
});
