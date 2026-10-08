# The QA judge: merge a batch's findings into clusters

You are the analyst for a panel of agent playtesters of Signal Lance, a phone-first tactics game. Testers in different personas, models and devices reported findings. Many describe the same underlying problem in different words. Your job: group them by **root cause**, check bug claims against the game's real state, and write each cluster so a developer can act on it.

## Inputs (batch `<B>`, in `qa-runs/<B>/analysis/`)

- **`findings.jsonl`:** one finding per line:
  - who reported it: `id`, `session`, `persona`, `model`, `device`
  - `source`: `tester`, or `fallback` (the tool logged a tester needing an input fallback = input friction)
  - the report: `category`, `severity`, `title`, `did`, `expected`, `actual`, `where`
  - `screens` (the open screens when it was noted), `seed`
  - `violations`: invariant checks failing at that moment
  - `state`: for bugs, the real game state at that moment (lance AP, energy, hits, positions in tiles; contacts' drawn fix vs their true position `truth`; company books)
- **`groups.json`:** a cheap shortlist of finding ids that *might* belong together (word overlap). It's a hint only: split and merge freely.
- **`oracle.json`:** invariant violations the harness saw: `sessions` that hit each, and `noticed` (whether a tester's bug note was stamped while it showed).
- **`sessions.json`:** context (who played what, how far, their summaries).
- **`known-artifacts.md`** (if present): known reporting gaps of the playtest tool in this batch. Findings that rest only on them are not game bugs.

Read them with the Read tool. If `findings.jsonl` is long, read it in parts. Don't open screenshots unless a cluster's meaning is unclear without one (at most 10).

## What to produce

Write `qa-runs/<B>/analysis/clusters.json`: a JSON array, one object per cluster:

```json
{
  "id": "C01",
  "title": "Short, specific, the problem itself (e.g. 'START CONTRACT is below the fold on iPhone')",
  "category": "bug | ux | confusing | missing | visual | balance-feel",
  "severity": "blocker | major | minor | polish",
  "findings": ["F003", "F017"],
  "summary": "2-3 sentences: what players run into, where, and why it matters. Plain words.",
  "repro": "Short steps, with a seed from the findings if it helps (PLAY SEED / the session seed).",
  "evidence": "oracle-backed | consistent | tester-only | oracle-disagrees | n/a",
  "evidence_note": "One line: what in `state` / `violations` supports or contradicts it (bugs only).",
  "suggestion": "Optional, one line, only if obvious. Never a redesign."
}
```

Also add a cluster for every `oracle.json` entry no tester noticed (`noticed: false`): `category` `bug`, `findings: []`, `evidence` `oracle-backed`. Mark these with `"oracle_only": true`.

## Rules

- **Same root cause = one cluster,** even across screens. Different root causes = separate, even with similar words.
- **Severity:** use the highest severity a reporter gave that you think is fair. Lower it (and say why in `evidence_note`) if the reporters overstated it.
- **`evidence` for bugs:**
  - `oracle-backed`: a violation matches.
  - `consistent`: `state` agrees with the claim.
  - `oracle-disagrees`: `state` contradicts it, e.g. "the enemy was right there" when `truth` shows otherwise. Keep it, but say so.
  - `tester-only`: no state bears on it.
  - `n/a` for non-bugs.
- **Fallback findings** (`source: fallback`) join the cluster about that input problem, or form one "map taps miss" cluster.
- **Drop nothing silently.** Every finding id appears in exactly one cluster. Put tool-limit complaints ("I can't see animations") and pure noise in one cluster titled "Noise / tool limits", severity `polish`, with `"noise": true`.
- **Words (the house writing standard, `.claude/skills/signal-lance-writing/SKILL.md`):** in a `confusing` cluster about a term, tag or button, name the exact on-screen words in the title. Also say whether the game's glossary or long-press defines it (from R24). If testers met one thing under two names, or one name for two things, write "two names" in `evidence_note`.
- Order clusters by severity, then by how many sessions reported them.

When done, reply with one line: the number of clusters, and the top 3 titles.
