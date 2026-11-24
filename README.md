# Flow Prompt Dr

A scored critique of a Google Flow (Veo) prompt and its start frame, against
the Flow craft playbook and our twelve recorded failure modes.

- `src/rules.js` is the whole engine: pure functions, no I/O. The CLI and
  the page both import `diagnose()`.
- Rules come from `research/` (MUSE-LEG.md, GEMINI-LEG.md, CLAUDE-LEG.md):
  motion verbs in the first 10 words, no action negation, the still carries
  facing and state, prop silhouette and specular-highlight checks,
  first-and-last-frame discipline, one camera move, one pacing set, word
  budget by mode (Frames 25 to 60, Ingredients and Text 50 to 120).
- Every finding names the failure modes it risks (Muse leg, section 4).

## Use

    node bin/flow-prompt-dr.js --prompt "Slow push-in. ..." --still "Wide shot from behind, ..."
    node bin/flow-prompt-dr.js --prompt-file shot.txt --still-file still.txt --end "..." --mode frames --seconds 8
    node bin/flow-prompt-dr.js ... --json      # machine-readable; exit 1 when anything blocks

Page: `npm run build` (copies the engine into `public/`), then serve
`public/` with any static server. `#ex=good` and `#ex=bad` load examples.

## Test

    npm test

## Limits

It reads words, not pixels. A still that is described well and looks wrong
will pass here; the still is still judged on enlarged crops before any
credit is spent, and the clip is judged in motion.
