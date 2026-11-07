import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3300;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Connected SSE clients for live reload
const sseClients = new Set();

function broadcastReload() {
  for (const client of sseClients) {
    try {
      client.write('data: reload\n\n');
    } catch (_err) {
      sseClients.delete(client);
    }
  }
}

// Watch src/ and dev/ for changes
let reloadTimeout = null;
function setupWatchers() {
  const watchDirs = [path.join(ROOT_DIR, 'src'), path.join(ROOT_DIR, 'dev')];
  for (const dir of watchDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.watch(dir, { recursive: true }, (eventType, filename) => {
          if (filename && !filename.includes('.git') && !filename.endsWith('.tmp')) {
            clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
              console.log(`[live-reload] Modificado: ${filename} - Recarregando navegador...`);
              broadcastReload();
            }, 100);
          }
        });
      } catch (err) {
        console.warn(`[live-reload] Aviso ao monitorar ${dir}:`, err.message);
      }
    }
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // SSE Live Reload endpoint
  if (pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 1000\n\n');
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Root serves dev/index.html
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/dev/index.html';
  }

  const filePath = path.join(ROOT_DIR, pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`  AIRSPACE ACARS - DEV PREVIEW NO NAVEGADOR`);
  console.log(`  URL: ${url}`);
  console.log(`  Modo: Hot Reload ativado (atualiza ao salvar em src/)`);
  console.log(`======================================================\n`);

  setupWatchers();

  // Auto-open browser on Windows
  exec(`start ${url}`, (err) => {
    if (err) {
      console.log(`Abra o link no navegador: ${url}`);
    }
  });
});

