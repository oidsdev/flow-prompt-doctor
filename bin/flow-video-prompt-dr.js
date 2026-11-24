#!/usr/bin/env node
// flow-video-prompt-dr: score a Flow prompt and its start frame against the playbook.
//
//   flow-video-prompt-dr --prompt "Slow push-in. ..." --still "Wide shot, riders from behind ..."
//   flow-video-prompt-dr --prompt-file shot.txt --still-file still.txt [--end "..."] [--mode frames|ingredients|text] [--seconds 8] [--json]
//   echo "prompt text" | flow-video-prompt-dr --still "..."
import { readFileSync } from "node:fs";
import { diagnose, FAILURE_MODES } from "../src/rules.js";

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--json") opt.json = true;
  else if (a === "-h" || a === "--help") opt.help = true;
  else if (a.startsWith("--")) opt[a.slice(2)] = args[++i];
}
if (opt.help) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(1, 6).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}
const read = (v, f) => (f ? readFileSync(f, "utf8") : v || "");
let prompt = read(opt.prompt, opt["prompt-file"]);
if (!prompt && !process.stdin.isTTY) prompt = readFileSync(0, "utf8");
const r = diagnose({
  prompt,
  still: read(opt.still, opt["still-file"]),
  endFrame: read(opt.end, opt["end-file"]),
  mode: opt.mode || "frames",
  seconds: opt.seconds,
});
if (opt.json) {
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
}
const tty = process.stdout.isTTY;
const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const sev = { error: c("31;1", "BLOCK"), warn: c("33;1", "WARN "), tip: c("36", "TIP  ") };
console.log(`\n${c("1", "Flow Video Prompt Dr")}  ${r.mode} mode, ${r.wordCount} words, ${r.seconds} s`);
console.log(`${c("1", `Score ${r.score}/100  grade ${r.grade}`)}  ${r.verdict}\n`);
for (const f of r.findings) {
  console.log(`${sev[f.severity]} ${c("2", f.rule + ":")} ${f.title}`);
  if (f.evidence) console.log(`       ${c("2", f.evidence)}`);
  if (f.why) console.log(`       why: ${f.why}`);
  if (f.fix) console.log(`       fix: ${f.fix}`);
  if (f.modes && f.modes.length) console.log(`       ${c("2", "failure modes: " + f.modes.map((m) => `#${m} ${FAILURE_MODES[m]}`).join("; "))}`);
  console.log("");
}
if (r.passes.length) console.log(c("32", "Passed: ") + r.passes.map((p) => p.rule).join(", ") + "\n");
process.exit(r.findings.some((f) => f.severity === "error") ? 1 : 0);
