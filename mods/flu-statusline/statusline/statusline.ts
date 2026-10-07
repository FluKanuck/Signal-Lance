// The status line command: Claude Code pipes the session's JSON in and draws what this prints, above its footer.
// Run as `node <this file>` (Node 23.6+ strips the types). Settings: { "statusLine": { "type": "command", "command": "node \"<path>/statusline.ts\"" } }
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { ansi, asMode, fromStatusInput, modeFile, parseGit, rows } from '../hooks/logic.ts'

function git(cwd: string) {
  try {
    const opts = { cwd, timeout: 1500, encoding: 'utf8' as const, stdio: ['ignore', 'pipe', 'ignore'] as any }
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], opts).trim()
    return parseGit(execFileSync('git', ['status', '--porcelain=v2', '--branch'], opts), top)
  } catch { return null }
}

function mode(transcriptPath: string, sessionId: string) {
  if (!transcriptPath || !sessionId) return null
  try { return asMode(readFileSync(modeFile(transcriptPath, sessionId), 'utf8').trim()) } catch { return null }
}

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => { input += d })
process.stdin.on('end', () => {
  let j: any = {}
  try { j = JSON.parse(input) } catch { /* draw what we can */ }
  const now = Date.now()
  const s = fromStatusInput(j, now)
  // Claude Code sets COLUMNS; keep a few clear for its own padding
  const columns = (Number(process.env.COLUMNS) || 120) - 4
  const out = rows({
    git: git(s.cwd || process.cwd()), usage: s.usage, model: s.model, cwd: s.cwd, now, columns,
    mode: mode(s.transcriptPath, s.sessionId), effort: s.effort,
  })
  process.stdout.write(ansi(out, columns) + '\n')
})
