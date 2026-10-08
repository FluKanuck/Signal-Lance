export type Feed = { t: string; icon: string; text: string; shot?: string }
export type Row = {
  id: string; persona: string; model: string; device: string; state: 'running' | 'done'
  screen: string; last: string; thought: string; notes: number; sev: Record<string, number>; oracle: number
  actions: number; shot: string; t: string
}
export type Watch = {
  batch: string; rows: Row[]; feed: Record<string, Feed[]>; planned: number
  oracle: number; findings: number; sev: Record<string, number>; offset: number
}

declare module 'claude-code' {
  interface PluginState {
    'signal-lance-qa': { watch: Watch | null; follow: string; paused: boolean }
  }
}
