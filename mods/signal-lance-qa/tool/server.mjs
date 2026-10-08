// QA panel playtest tool, the daemon: holds the browser and the sessions between CLI calls. Local only (127.0.0.1).
// Started on demand by qa.mjs; exits after IDLE_MIN minutes without a command.
import http from 'node:http';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { startSession, getSession, running, shutdown, progress, RUNS } from './core.mjs';

const PORT = Number(process.env.SLQA_PORT || 4377), IDLE_MIN = 30;
let idle;
const touch = () => { clearTimeout(idle); idle = setTimeout(stop, IDLE_MIN * 60000); };
async function stop() { await shutdown(); try { unlinkSync(resolve(RUNS, '.server')); } catch (_) {} process.exit(0); }

async function handle({ cmd, session, args = {} }) {
  switch (cmd) {
    case 'ping': return 'ok · running: ' + (running().join(', ') || 'none');
    case 'start': return startSession({ ...args, session });
    case 'progress': return JSON.stringify(progress(args.batch), null, 1);
    case 'shutdown': setTimeout(stop, 50); return 'stopping';
  }
  const s = getSession(session);
  switch (cmd) {
    case 'look': return s.look(args);
    case 'tap': return s.tap(args.target);
    case 'hold': return s.hold(args.target);
    case 'drag': return s.drag(args.points);
    case 'scroll': return s.scroll(args.panel, args.dy);
    case 'type': return s.type(args.text, args.into);
    case 'key': return s.key(args.key);
    case 'wait': return s.wait(args.timeout);
    case 'fallback': return s.fallback(args.action, args.args, args.why);
    case 'note': return s.note(args);
    case 'think': return s.think(args.text);
    case 'status': return s.left();
    case 'checkpoint': return s.checkpoint(args.k || 'cp');
    case 'oracle': return JSON.stringify(await s.qa('oracle'), null, 1);
    case 'end': return s.end(args.summary || '', args.handoff || '');
  }
  throw new Error('unknown command ' + cmd);
}

const queue = new Map(); // one command at a time per session (parallel testers run side by side)
http.createServer((req, res) => {
  let body = '';
  req.on('data', d => (body += d));
  req.on('end', async () => {
    touch();
    let out, code = 200;
    try {
      const msg = JSON.parse(body || '{}'), key = msg.session || '_';
      const prev = queue.get(key) || Promise.resolve();
      const p = prev.then(() => handle(msg)); queue.set(key, p.catch(() => {}));
      out = String(await p);
    } catch (e) { out = 'ERROR: ' + (e?.message || e); code = 400; }
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }); res.end(out);
  });
}).listen(PORT, '127.0.0.1', () => { writeFileSync(resolve(RUNS, '.server'), String(process.pid)); touch(); console.log('slqa server on ' + PORT); });
