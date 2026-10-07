export type BandInfo = {
  round: number; title: string; build: string; cp: number; cpTotal: number; next: string
  branch: string; dirty: number; head: string; root: string
}
export type Variant = {
  label: string; args: string[]; n: number; done: number; wins: number; hunts: number
  complete: number; lost: number; chan: Record<string, number>
  status: 'queued' | 'running' | 'done' | 'error' | 'stopped'; err?: string
}
export type Job = {
  title: string; contracts: number; startedAt: number; finishedAt?: number
  variants: Variant[]; tail: string[]; flags: string[]
} | null

declare module 'claude-code' {
  interface PluginState {
    'signal-lance': { band: BandInfo | null; job: Job; lastRun: string }
  }
}
