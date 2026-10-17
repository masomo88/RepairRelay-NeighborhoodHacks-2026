import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSchedule } from './public/core.js';

const root = resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const paths = new Set(['/','/index.html','/video.html','/app.js','/core.js','/styles.css']);

export function createApp() {
  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/api/schedule') {
      let body = '';
      try {
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 100000) throw new Error('Board exceeds the 100 KB limit.');
        }
        const schedule = makeSchedule(JSON.parse(body));
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify(schedule));
      } catch (error) {
        response.writeHead(400, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid board.' }));
      }
      return;
    }
    if (request.method === 'GET' && url.pathname === '/demo.webm') {
      try {
        const video = await readFile(fileURLToPath(new URL('./assets/repair-relay-demo.webm', import.meta.url)));
        response.writeHead(200, { 'content-type': 'video/webm', 'content-length': video.length, 'x-content-type-options': 'nosniff' });
        response.end(video);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
      return;
    }
    if (request.method !== 'GET' || !paths.has(url.pathname)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const path = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep)) {
      response.writeHead(404);
      response.end();
      return;
    }
    try {
      const content = await readFile(path);
      response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'x-content-type-options': 'nosniff' });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () => console.log('Repair Relay: http://127.0.0.1:' + port));
}

