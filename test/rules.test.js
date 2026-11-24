import assert from "node:assert/strict";
import { diagnose } from "../src/rules.js";

let n = 0;
const ids = (r) => r.findings.map((f) => f.id);
const sevOf = (r, id) => (r.findings.find((f) => f.id === id) || {}).severity;
function t(name, fn) { fn(); n++; console.log("ok  ", name); }

const GOOD_STILL = "Wide shot from behind: every rider square from behind, galloping mid-stride away from camera toward the guns at the valley head, lead room ahead, staggered uneven ranks in the front rank and in depth, sabres sheathed at their hips, matte dull steel, one low key light from the left, dust in the air.";
const GOOD = "Slow push-in. The riders gallop at full stretch away from camera toward the guns at the valley head, manes streaming, dust kicked up behind them. Dust hangs low and drifts. Every rider faces away from camera for the whole shot; blades remain sheathed at their hips.";

t("template prompt with a judged still scores A, no blocks", () => {
  const r = diagnose({ prompt: GOOD, still: GOOD_STILL, mode: "frames" });
  assert.equal(r.grade, "A", JSON.stringify(r.findings, null, 1));
  assert.ok(!r.findings.some((f) => f.severity === "error"));
});
t("empty prompt is an F", () => assert.equal(diagnose({ prompt: "" }).grade, "F"));
t("description first fails motion-first", () => {
  assert.equal(sevOf(diagnose({ prompt: "A beautiful woman with long dark hair in a velvet dress under fairy lights, she slowly turns.", still: GOOD_STILL }), "motion-first"), "error");
});
t("action negation is blocked", () => {
  for (const p of ["Slow push-in. She does not turn toward camera.", "Static frame. The blade doesn't glow.", "Tracking shot. Riders gallop, never turning around."]) {
    assert.ok(ids(diagnose({ prompt: p, still: GOOD_STILL })).includes("action-negation"), p);
  }
});
t("positive invariant is not mistaken for negation", () => {
  assert.ok(!ids(diagnose({ prompt: GOOD, still: GOOD_STILL })).includes("action-negation"));
});
t("ban list warns", () => {
  assert.equal(sevOf(diagnose({ prompt: "Slow push-in. The riders gallop away from camera. Avoid: glowing swords, extra people, text.", still: GOOD_STILL }), "ban-list"), "warn");
});
t("two camera moves block; handheld tracking is one move", () => {
  assert.equal(sevOf(diagnose({ prompt: "Slow push-in while the camera orbits the singer, she sings.", still: GOOD_STILL }), "camera"), "error");
  assert.notEqual(sevOf(diagnose({ prompt: "Handheld tracking shot following at shoulder height as she walks right to left across frame, hair lifting in the breeze.", still: GOOD_STILL }), "camera"), "error");
});
t("walks forward with no anchor is a direction error", () => {
  assert.equal(sevOf(diagnose({ prompt: "Slow tracking shot. The man walks forward, coat flaring, rain falling.", still: "Medium-wide, the man in profile facing frame right, mid-stride, lead room ahead." }), "direction"), "error");
});
t("frames-mode budget over 90 words is an error", () => {
  const long = GOOD + " " + "The light is soft and golden and the grass sways gently in the wind as the clouds roll over the distant hills.".repeat(4);
  assert.equal(sevOf(diagnose({ prompt: long, still: GOOD_STILL }), "budget"), "error");
});
t("ingredients mode uses the 50 to 120 budget", () => {
  assert.ok(!ids(diagnose({ prompt: GOOD + " " + GOOD.slice(0, 200), mode: "ingredients" })).includes("budget"));
});
t("facing only in prose, not in the still, is blocked", () => {
  assert.equal(sevOf(diagnose({ prompt: "Static frame. She keeps her back to camera for the whole shot, hair lifting in the wind.", still: "A woman on a road at dusk." }), "still-facing"), "error");
});
t("half-turned still is ambiguous facing", () => {
  assert.equal(sevOf(diagnose({ prompt: GOOD, still: "Wide shot, a rider half-turned in the saddle, sabres sheathed." }), "still-facing"), "error");
});
t("specular highlight on metal blocks; matte metal passes", () => {
  assert.equal(sevOf(diagnose({ prompt: GOOD, still: "Riders from behind, gleaming polished sabres catching the light." }), "specular"), "error");
  assert.ok(!ids(diagnose({ prompt: GOOD, still: GOOD_STILL })).includes("specular"));
});
t("prop against the body is a silhouette error", () => {
  assert.equal(sevOf(diagnose({ prompt: GOOD, still: "The soldier from behind, black rifle held across his dark vest." }), "prop-silhouette"), "error");
});
t("push-in on a close-up has no camera room", () => {
  assert.equal(sevOf(diagnose({ prompt: "Slow push-in. She sings, breath misting in the cold air.", still: "Extreme close-up of the singer in profile, gaze on the window." }), "camera-room"), "error");
});
t("late event in prose suggests a timestamp; a timestamp clears it", () => {
  assert.ok(ids(diagnose({ prompt: GOOD + " Near the end the guns open fire.", still: GOOD_STILL })).includes("timing"));
  assert.ok(!ids(diagnose({ prompt: GOOD + " [00:06-00:08] the guns open fire.", still: GOOD_STILL })).includes("timing"));
});
t("a fall with no end frame warns about the held beat", () => {
  assert.equal(sevOf(diagnose({ prompt: "Steady tracking shot. A horse falls and the rank parts around it, moving away from camera, dust hanging.", still: GOOD_STILL }), "flf-hold"), "warn");
});
t("end frame not built from the start frame warns", () => {
  assert.ok(ids(diagnose({ prompt: GOOD, still: GOOD_STILL, endFrame: "A different wide shot of riders near the guns." })).includes("flf-pair"));
  assert.ok(!ids(diagnose({ prompt: GOOD, still: GOOD_STILL, endFrame: "Edit of the start still: same riders and light, framing pushed in to medium." })).includes("flf-pair"));
});
t("thin objects warn, string lights do not", () => {
  assert.ok(ids(diagnose({ prompt: GOOD, still: GOOD_STILL + " A lance rises from the centre rider." })).includes("thin"));
  assert.ok(!ids(diagnose({ prompt: GOOD, still: GOOD_STILL.replace("dust in the air", "string lights overhead") })).includes("thin"));
});
t("every non-tip finding maps to a recorded failure mode", () => {
  const r = diagnose({ prompt: "Cinematic woman. She does not turn. Camera pushes in and orbits as she walks forward, then runs.", still: "Close-up, half-turned, gleaming sword against her black coat, crowd, neon sign, candlelight, moonlight." });
  for (const f of r.findings) assert.ok(f.modes.length, f.id);
  assert.ok(Object.keys(r.failureModes).length >= 5);
});
console.log(`\n${n} checks passed`);
