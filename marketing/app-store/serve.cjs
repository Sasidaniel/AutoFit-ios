const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const port = Number(process.env.PORT || 8970);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.zip': 'application/zip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  let base, relative;
  if (url === '/icon.png') {
    base = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
    relative = 'AppIcon-512@2x.png';
  } else if (url.startsWith('/app/')) {
    base = path.join(root, 'www'); relative = url.slice(5) || 'index.html';
    if (relative === 'service-worker.js') { res.writeHead(404); res.end(); return; }
  } else {
    base = __dirname; relative = url === '/' ? 'index.html' : url.slice(1);
    if (!/^(?:index\.html|review\.(?:css|js)|listing\.json|capture\.html|fixture\.html|fixture\.js|assets\/[a-z0-9._/-]+)$/.test(relative)) {
      res.writeHead(404); res.end(); return;
    }
  }
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': stat.size });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`Local store review: http://127.0.0.1:${port}`));
