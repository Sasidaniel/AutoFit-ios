const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const port = Number(process.env.PORT || 8970);
const nativeCapture = process.env.CAPTURE_NATIVE === '1';
const stateDirectory = process.env.CAPTURE_NATIVE_STATE;
if (nativeCapture && (process.env.CI !== 'true' || process.platform !== 'darwin'
  || !stateDirectory || !path.isAbsolute(stateDirectory))) throw new Error('Native capture controls require an isolated macOS CI session');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.zip': 'application/zip', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (nativeCapture && url === '/') {
    const command = JSON.parse(fs.readFileSync(path.join(stateDirectory, 'control.json'), 'utf8'));
    if (!['he', 'en'].includes(command.language)) throw new Error('Invalid native fixture language');
    res.writeHead(302, { Location: `/fixture.html?lang=${command.language}`, 'Cache-Control': 'no-store' }); res.end(); return;
  }
  if (nativeCapture && ['/native-store-control.json', '/native-store-ready', '/native-store-error'].includes(url)) {
    const command = JSON.parse(fs.readFileSync(path.join(stateDirectory, 'control.json'), 'utf8'));
    const params = new URL(req.url, 'http://localhost').searchParams;
    if (url === '/native-store-error') {
      const file = path.join(stateDirectory, 'error.json');
      fs.writeFileSync(`${file}.next`, JSON.stringify({ message: (params.get('message') || 'Unknown native capture error').slice(0, 1500) }));
      fs.renameSync(`${file}.next`, file);
    } else if (url === '/native-store-ready') {
      if (params.get('id') !== String(command.id) || params.get('screen') !== command.screen
        || params.get('language') !== command.language || params.get('native') !== 'true') {
        res.writeHead(409); res.end(); return;
      }
      const file = path.join(stateDirectory, 'ready.json');
      fs.writeFileSync(`${file}.next`, JSON.stringify({ ...command, nativeBridgeVerified: true }));
      fs.renameSync(`${file}.next`, file);
    }
    const body = JSON.stringify(command);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(body); return;
  }
  let base, relative;
  if (url === '/icon.png') {
    base = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
    relative = 'AppIcon-512@2x.png';
  } else if (url.startsWith('/app/')) {
    base = path.join(root, 'www'); relative = url.slice(5) || 'index.html';
    if (relative === 'service-worker.js') { res.writeHead(404); res.end(); return; }
  } else {
    base = __dirname; relative = url === '/' ? 'index.html' : url.slice(1);
    if (!(nativeCapture && relative === 'native-controls.js')
      && !/^(?:index\.html|review\.(?:css|js)|listing\.json|capture\.html|fixture\.html|fixture\.js|assets\/[a-z0-9._/-]+)$/.test(relative)) {
      res.writeHead(404); res.end(); return;
    }
  }
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    if (nativeCapture && base === path.join(root, 'www') && relative === 'index.html') {
      const body = fs.readFileSync(file, 'utf8').replace('</body>', '<script type="module" src="/native-controls.js"></script></body>');
      res.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
      if (req.method === 'HEAD') res.end(); else res.end(body);
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': stat.size });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`Local store review: http://127.0.0.1:${server.address().port}`));
