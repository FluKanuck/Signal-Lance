export type GitInfo = { repo: string; branch: string; dirty: number; ahead: number; behind: number }
export type Usage = {
  ctxPct: number | null; ctxTokens: number | null; ctxWindow: number
  limits: { kind: string; pct: number; resetsAt: number | null }[]
  usd: number | null; startedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'flu-statusline': { file: string; mode: string }
  }
}
