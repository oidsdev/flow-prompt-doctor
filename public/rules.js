// Flow Prompt Dr rules: a scored critique of a Flow (Veo) prompt and its start frame.
//
// Sources, all in research/: MUSE-LEG.md (sections 1 to 4, the START-FRAME
// CHECKLIST and PROMPT TEMPLATE), GEMINI-LEG.md (failure matrix, prop
// silhouette and specular findings) and CLAUDE-LEG.md. The twelve failure
// modes are the Muse leg's section 4 table, our own probe record.
//
// Pure functions, no I/O: the CLI and the web page both import diagnose().

export const FAILURE_MODES = {
  1: "Subject turns toward camera mid-shot",
  2: "Direction of travel reverses",
  3: "Props or blades ignite, glow or morph",
  4: "Sterile, posed-tableau feel",
  5: "Formation dresses into a parade line",
  6: "One design rendered two ways",
  7: "Extra figures contaminate the frame",
  8: "Camera move never registers",
  9: "Event timing or flavour drifts",
  10: "Held beat resolves before the cut",
  11: "Thin object grows or morphs",
  12: "Spacing reads even despite the brief",
};

const W = (list) => new RegExp("\\b(" + list.join("|") + ")\\b", "i");
const WG = (list) => new RegExp("\\b(" + list.join("|") + ")\\b", "gi");

const CAMERA_MOVES = [
  "push(?:es|ing)?[- ]?in", "pull(?:s|ing)?[- ]?(?:out|back)", "dolly(?: in| out| forward| back)?", "tracking shot", "tracks?",
  "trucking", "truck(?:s)? (?:left|right)", "crane(?: up| down)?", "pans?(?: left| right)?", "panning",
  "tilts?(?: up| down)?", "orbits?", "orbiting", "arc shot", "zooms?(?: in| out)?", "handheld",
  "aerial", "drone shot", "pov", "static", "locked[- ]off", "locked frame", "follows?", "following",
];
const CAMERA_RE = WG(CAMERA_MOVES);
const SPEED_SLOW = ["slow", "slowly", "gentle", "gently", "gradual", "gradually", "leisurely", "unhurried", "slow-motion"];
const SPEED_FAST = ["fast", "quick", "quickly", "rapid", "rapidly", "sudden", "suddenly", "swift", "swiftly", "frantic", "full stretch", "at speed"];
const MOTION_VERBS = [
  "walks?", "walking", "strides?", "striding", "runs?", "running", "gallops?", "galloping", "charges?", "charging",
  "rides?", "riding", "advances?", "advancing", "moves?", "moving", "turns?", "turning", "rises?", "rising",
  "falls?", "falling", "drifts?", "drifting", "sways?", "swaying", "flows?", "flowing", "spreads?", "spreading",
  "lifts?", "lifting", "lowers?", "lowering", "reaches?", "reaching", "steps?", "stepping", "leans?", "leaning",
  "sings?", "singing", "speaks?", "speaking", "breathes?", "breathing", "blows?", "blowing", "flickers?",
  "flickering", "billows?", "billowing", "swirls?", "swirling", "ripples?", "rippling", "streams?", "streaming",
  "pours?", "pouring", "glides?", "gliding", "rolls?", "rolling", "sweeps?", "sweeping", "climbs?", "climbing",
  "descends?", "descending", "approaches", "approaching", "retreats?", "retreating", "crosses", "crossing",
  "opens?", "opening", "closes?", "closing", "raises?", "raising", "nods?", "nodding", "glances?", "glancing",
  "sprints?", "sprinting", "marches?", "marching", "trots?", "trotting", "canters?", "cantering", "dances?",
  "dancing", "spins?", "spinning", "swings?", "swinging", "waves?", "waving", "shifts?", "shifting",
  "pushes", "pulls", "dollies", "tracks", "pans", "tilts", "orbits", "cranes", "follows", "kicks?", "kicked",
  "hangs?", "hanging", "settles?", "settling", "fire", "fires", "firing", "erupts?", "erupting",
];
const MOTION_RE = W(MOTION_VERBS);
const ENV_MOTION = [
  "dust", "smoke", "mist", "fog", "rain", "snow", "wind", "breeze", "leaves", "grass", "water", "waves",
  "embers", "sparks", "ash", "steam", "clouds", "flames", "candle", "haze", "spray", "debris", "petals", "curtains?",
];
const ENV_RE = W(ENV_MOTION);
const FILLER = [
  "cinematic", "stunning", "epic", "beautiful", "gorgeous", "breathtaking", "masterpiece", "award[- ]winning",
  "ultra[- ]realistic", "hyper[- ]?realistic", "photorealistic", "4k", "8k", "hdr", "high quality", "best quality",
  "highly detailed", "intricate", "amazing", "incredible", "dramatic", "trending",
];
const FILLER_RE = WG(FILLER);
const STATIC_DESC = [
  "wearing", "dressed in", "with (?:long|short|dark|blonde|black|white|red|grey|gray) hair", "hair", "eyes",
  "dress", "coat", "jacket", "uniform", "armou?r", "helmet", "lit by", "lighting", "golden hour", "background",
  "in the background", "palette", "color grade", "colour grade",
];
const SEQUENCERS = WG(["then", "after that", "afterwards", "next", "before", "finally", "followed by", "once", "until", "as soon as"]);

const ACTION_NEGATION = new RegExp(
  "\\b(?:do(?:es)?\\s*n[o']t|do(?:es)? not|never|must not|should not|shouldn'?t|won'?t|cannot|can'?t|avoid(?:s|ing)?|without)\\s+(?:\\w+\\s+){0,2}?" +
    "(?:turn|turning|look|looking|face|facing|glow|glowing|ignite|igniting|move|moving|reverse|reversing|change|changing|" +
    "morph|morphing|spark|sparking|shine|shining|stop|stopping|walk|walking|run|running|blink|blinking|smile|smiling|" +
    "speak|speaking|fall|falling|recover|recovering|draw|drawing|swing|swinging|light up|catch fire|burn|burning|flash|flashing)\\b",
  "i"
);
const NOUN_BAN = /\b(?:no|without)\s+(?!longer\b|one\b|matter\b)([a-z][a-z-]+(?:\s+[a-z][a-z-]+)?)/gi;
const AVOID_LIST = /\b(?:avoid|negative|exclude|do not include)\s*:/i;

const PROPS = [
  "sword", "swords", "sabre", "sabres", "saber", "sabers", "blade", "blades", "knife", "dagger", "rifle", "rifles",
  "gun", "guns", "pistol", "musket", "lance", "lances", "spear", "spears", "staff", "pole", "poles", "flag", "flags",
  "banner", "standard", "axe", "shield", "microphone", "mic", "cup", "glass", "bottle", "phone", "lantern", "torch",
  "umbrella", "cane", "bow", "arrow", "wand", "tool", "hammer", "wrench",
];
const PROP_RE = WG(PROPS);
const HELD = "(?:hold(?:s|ing)?|held|grip(?:s|ping)?|carr(?:y|ies|ying)|clutch(?:es|ing)?|wield(?:s|ing)?|rais(?:es|ed|ing)|brandish(?:es|ing)?|in (?:his|her|their|one|both) hands?|drawn|levelled|leveled|shouldered|aim(?:s|ing)?)";
const HELD_PROP = new RegExp("(?:" + HELD + "\\W+(?:\\w+\\W+){0,4}(?:" + PROPS.join("|") + ")\\b|\\b(?:" + PROPS.join("|") + ")\\W+(?:\\w+\\W+){0,3}" + HELD + ")", "gi");
const METAL = W(["sword", "swords", "sabre", "sabres", "saber", "blade", "blades", "steel", "metal", "metallic", "chrome", "silver", "iron", "rifle", "barrel", "gun", "knife", "dagger", "armou?r", "helmet", "microphone", "mic", "lance", "spear", "axe"]);
const SPECULAR = W(["gleaming", "gleams?", "shining", "shiny", "shines?", "glinting", "glints?", "polished", "reflective", "reflecting", "highlights?", "specular", "sparkling", "sparkles?", "glowing", "glows?", "lens flares?", "flares?", "blown[- ]out", "bright edge", "catching the light", "catches the light", "mirror"]);
const MATTE = W(["matte", "dull", "unlit", "non-reflective", "weathered", "dark steel", "sheathed", "holstered", "scabbard", "covered"]);
const BODY_BACKDROP = /\bagainst (?:her|his|their|the) (?:[a-z]+ ){0,2}(?:body|torso|chest|dress|coat|jacket|vest|shirt|uniform|clothes|clothing|robe|cloak|armou?r)\b/i;
const SEPARATION = W(["against", "silhouetted", "away from (?:the |his |her |their )?(?:body|torso|chest)", "held out", "held clear", "clear of", "contrasting", "clean background", "sky behind", "separated"]);
const DARK_ON_DARK = /\b(black|dark)\b[^.]{0,40}\b(rifle|gun|sword|blade|prop|pistol)\b[^.]{0,40}\b(black|dark)\b/i;
const STATEFUL_PROPS = WG(["swords?", "sabres?", "sabers?", "blades?", "knife", "dagger", "rifles?", "guns?", "pistol", "musket", "lances?", "spears?", "axe", "flags?", "banners?", "lantern", "torch", "doors?", "umbrella", "bow"]);
const PROP_STATE = W(["sheathed", "holstered", "slung", "shouldered", "lowered", "raised", "drawn", "unlit", "lit", "closed", "open", "empty", "full", "cold", "at (?:his|her|their|the) (?:hip|hips|side|sides)", "in (?:its|their) scabbards?"]);

const FACING_TERMS = W([
  "from behind", "back to (?:the )?camera", "backs to (?:the )?camera", "facing away", "faces away", "away from (?:the )?camera",
  "toward (?:the )?camera", "towards (?:the )?camera", "facing (?:the )?camera", "faces (?:the )?camera", "profile",
  "side[- ]on", "three[- ]quarter", "3/4", "over (?:the|her|his|their) shoulder", "facing (?:left|right|frame left|frame right)",
  "faces (?:left|right)", "looking (?:left|right|ahead|down|up|at)", "gaze", "eyes (?:on|locked|fixed)",
]);
const AMBIGUOUS_FACING = W(["turning", "half[- ]turned", "glancing back", "looking back", "over (?:the|her|his|their) shoulder", "mid[- ]turn", "about to turn", "toward the viewer"]);
const TOWARD_CAMERA = W(["toward (?:the )?camera", "towards (?:the )?camera", "facing (?:the )?camera", "faces (?:the )?camera", "into (?:the )?lens", "at the camera", "at the viewer"]);
const DIRECTION_TERMS = W([
  "left to right", "right to left", "frame left", "frame right", "screen left", "screen right", "away from (?:the )?camera",
  "toward (?:the )?camera", "towards (?:the )?camera", "into (?:the )?(?:distance|frame|background)", "out of frame",
  "toward the (?:\\w+ ){0,3}\\w+", "towards the (?:\\w+ ){0,3}\\w+", "across (?:the )?frame", "down the \\w+", "up the \\w+",
]);
const POSED = W(["standing still", "stands still", "standing", "posed", "posing", "poses?", "at rest", "motionless", "frozen", "static pose", "symmetrical", "centered", "centred", "portrait"]);
const MID_ACTION = W(["mid[- ]stride", "mid[- ]step", "mid[- ]gesture", "mid[- ]gallop", "mid[- ]swing", "mid[- ]action", "in motion", "caught mid", "leaning into", "weight on", "full stretch", "stride", "galloping", "running", "walking", "singing", "reaching"]);
const CROWD = W(["crowd", "crowds", "people", "bystanders", "onlookers", "passers?-?by", "pedestrians", "spectators", "audience", "soldiers", "infantry", "extras", "figures", "townsfolk", "background characters"]);
const GROUP = W(["riders", "horses", "cavalry", "troops", "soldiers", "formation", "rank", "ranks", "line of", "row of", "column", "squad", "group", "pack", "herd"]);
const STAGGER = W(["stagger", "staggered", "uneven", "irregular", "offset", "varied spacing", "varied depth", "ragged", "broken line"]);
const THIN = W(["pole", "poles", "lance", "lances", "spear", "spears", "reins", "wire", "wires", "cable", "cables", "strap", "straps", "antenna", "rope", "ropes", "chain", "chains", "staff", "mast", "flagpole", "strings?(?! lights?)", "stick"]);
const TEXT_IN_FRAME = W(["sign", "signs", "signage", "text", "words?", "letters?", "lettering", "logo", "logos", "caption", "label", "neon sign", "billboard", "poster", "headline", "writing", "graffiti", "plate", "marquee"]);
const DESIGN = W(["flag", "flags", "banner", "banners", "insignia", "emblem", "crest", "livery", "logo", "badge", "patch", "coat of arms", "pattern"]);
const TIGHT_FRAMING = W(["extreme close[- ]?up", "close[- ]?up", "closeup", "tight shot", "tight framing", "ecu", "macro", "fills the frame", "full frame face"]);
const WIDE_FRAMING = W(["wide shot", "wide", "establishing", "full shot", "long shot", "medium[- ]wide", "medium shot", "full body", "full-length"]);
const PUSH_IN = W(["push(?:es|ing)?[- ]?in", "dolly in", "dolly forward", "zoom in", "zooms in", "moves closer", "closes in"]);
const LIGHT_SOURCES = WG(["neon", "candle(?:light|s)?", "moonlight", "sunlight", "sunset", "sunrise", "golden hour", "street ?lights?", "headlights?", "fluorescent", "firelight", "lantern", "torchlight", "spotlight", "string lights", "fairy lights", "window light", "lamp", "lamps", "blue hour", "lightning", "screen glow", "lens flare"]);
const LATE_EVENT = W(["near the end", "at the end", "toward the end", "towards the end", "finally", "at the last moment", "late in the shot", "in the final", "then suddenly", "eventually"]);
const TIMESTAMP = /\[\s*\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\s*\]/;
const HOLD_BEAT = W(["falls?", "falling", "collapses?", "is struck", "struck down", "lies? still", "stays? down", "dies", "crashes", "goes down"]);
const CONTINUOUS = W(["for the (?:whole|entire|full) shot", "throughout", "the whole time", "for the duration", "remains?", "stays?", "keeps?", "maintains?", "maintaining", "held", "holds?", "continues? to"]);
const SUBJECT_GENERAL = W(["the subject", "the woman", "the man", "the figure", "the riders", "the rider", "they", "she", "he", "the singer", "the child", "the group", "the horses", "the dancer", "the character"]);

function cameraKind(c) {
  const t = c.toLowerCase();
  if (/push|dolly in|dolly forward|zoom/.test(t)) return "push-in";
  if (/pull|dolly out|dolly back/.test(t)) return "pull-out";
  if (/track|truck|follow/.test(t)) return "tracking";
  if (/pan/.test(t)) return "pan";
  if (/tilt/.test(t)) return "tilt";
  if (/orbit|arc/.test(t)) return "orbit";
  if (/crane/.test(t)) return "crane";
  if (/static|locked/.test(t)) return "static";
  if (/handheld/.test(t)) return "handheld";
  if (/aerial|drone/.test(t)) return "aerial";
  if (/pov/.test(t)) return "pov";
  return t;
}

function words(s) {
  return (s || "").trim().split(/\s+/).filter(Boolean);
}

function uniq(arr) {
  return [...new Set(arr.map((x) => x.toLowerCase()))];
}

function matches(re, s) {
  if (!s) return [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return uniq([...s.matchAll(g)].map((m) => m[0]));
}

const SEVERITY_COST = { error: 12, warn: 6, tip: 2 };

/**
 * diagnose({ prompt, still, endFrame, mode, seconds })
 *   prompt   the Flow prompt text (required)
 *   still    description of the start frame (required for frames mode)
 *   endFrame description of the end frame, if one will be supplied
 *   mode     "frames" | "ingredients" | "text"   (default "frames")
 *   seconds  planned clip length (default 8)
 * Returns { score, grade, verdict, mode, wordCount, findings[], passes[], failureModes{} }.
 */
export function diagnose(input) {
  const prompt = (input.prompt || "").trim();
  const still = (input.still || "").trim();
  const endFrame = (input.endFrame || "").trim();
  const mode = ["frames", "ingredients", "text"].includes(input.mode) ? input.mode : "frames";
  const seconds = Number(input.seconds) || 8;
  const findings = [];
  const passes = [];
  const add = (f) => findings.push(f);
  const pass = (rule, note) => passes.push({ rule, note });

  const body = prompt.split(/\n\s*(?:sfx|audio|ambient noise|dialogue)\s*:/i)[0];
  const wc = words(body).length;
  const first10 = words(body).slice(0, 10).join(" ");
  const combined = still + " " + endFrame;

  if (!prompt) {
    return { score: 0, grade: "F", verdict: "No prompt to read.", mode, wordCount: 0, findings: [
      { id: "empty", rule: "Prompt", severity: "error", title: "Paste a prompt to diagnose.", fix: "", modes: [] },
    ], passes: [], failureModes: {} };
  }

  // ---------- P1 motion first ----------
  const motionEarly = MOTION_RE.test(first10) || CAMERA_RE.test(first10);
  CAMERA_RE.lastIndex = 0;
  const fillerEarly = matches(FILLER_RE, first10);
  if (!motionEarly) {
    add({ id: "motion-first", rule: "Motion first", severity: "error",
      title: "No motion or camera verb in the first 10 words.",
      evidence: "First 10 words: “" + first10 + "”",
      why: "Veo weighs action verbs and camera language most; opening on description spends the prompt's strongest position on things that do not move.",
      fix: "Open with the one camera move and the subject's action, e.g. “Slow push-in. The singer leans into the microphone…”",
      modes: [4, 8] });
  } else if (fillerEarly.length) {
    add({ id: "motion-first", rule: "Motion first", severity: "warn",
      title: "Style words crowd the opening: " + fillerEarly.join(", ") + ".",
      evidence: "First 10 words: “" + first10 + "”",
      why: "Aesthetic adjectives carry the least weight; in the first ten words they push the motion back.",
      fix: "Move style words to the end, or cut them; lead with camera and action.", modes: [4] });
  } else pass("Motion first", "Opens on motion or camera language.");

  // ---------- P2 no action negation ----------
  const neg = body.match(ACTION_NEGATION);
  if (neg) {
    add({ id: "action-negation", rule: "No action negation", severity: "error",
      title: "Negated action: “" + neg[0] + "”.",
      evidence: neg[0],
      why: "Text encoders drop the negation on verbs and keep the verb, so “does not turn toward camera” primes the turn.",
      fix: "State the positive invariant instead: “backs to camera for the whole shot”, “matte unlit steel, blades sheathed at the hip”.",
      modes: [1, 2, 3] });
  } else pass("No action negation", "No negated actions found.");

  const bans = matches(NOUN_BAN, body).filter((b) => !/^no (?:longer|one|matter)/i.test(b));
  if (AVOID_LIST.test(body) || bans.length >= 2) {
    add({ id: "ban-list", rule: "No action negation", severity: "warn",
      title: "Exclusions written as a ban list" + (bans.length ? ": " + bans.slice(0, 4).join(", ") : "") + ".",
      why: "Flow has no negative-prompt field; “no X” and “Avoid:” lists can prime the named element.",
      fix: "Describe the scene without it (“flanks clear, open grass to the horizon”), and lock exclusions in the still.",
      modes: [7, 3] });
  } else if (bans.length === 1) {
    add({ id: "ban-list", rule: "No action negation", severity: "tip",
      title: "One noun exclusion: “" + bans[0] + "”.",
      why: "Concrete noun exclusions are the least-bad form, but still only a nudge in Flow.",
      fix: "If it matters, remove it from the still instead; exclusion by still is a lock.", modes: [7] });
  }

  // ---------- P3 word budget ----------
  const [lo, hi] = mode === "frames" ? [25, 60] : [50, 120];
  if (wc > hi) {
    add({ id: "budget", rule: "Prompt budget", severity: wc > hi * 1.5 ? "error" : "warn",
      title: wc + " words, over the " + mode + "-mode budget of " + lo + " to " + hi + ".",
      why: "Overloaded prompts make the model cherry-pick which instructions to honour.",
      fix: mode === "frames" ? "Cut everything the still already shows; keep camera, action, environment motion, end state." :
        "Move identity text into the saved Character and keep the shot prompt kinetic.", modes: [4] });
  } else if (wc < lo) {
    add({ id: "budget", rule: "Prompt budget", severity: "tip",
      title: wc + " words, under the " + lo + " to " + hi + " range for " + mode + " mode.",
      why: "Very short prompts leave speed, environment and end state to the model's defaults.",
      fix: "Add a speed qualifier, one environmental motion and an end-state condition.", modes: [4] });
  } else pass("Prompt budget", wc + " words, inside the " + lo + " to " + hi + " range.");

  // ---------- P4 one camera move ----------
  const cams = matches(CAMERA_RE, body).filter((c) => !/^(?:follows?|following|tracks?)$/i.test(c) || /shot/i.test(body));
  // "handheld" and "static" describe the rig, not a second move.
  let camKinds = uniq(cams.map(cameraKind));
  if (camKinds.length > 1) camKinds = camKinds.filter((k) => k !== "handheld" && k !== "static");
  if (camKinds.length === 0) {
    add({ id: "camera", rule: "One camera move", severity: "warn",
      title: "No camera direction.",
      why: "Without one, Veo picks a default move and speed that may fight the shot.",
      fix: "Name one move with a standard term and speed, first in the prompt: “Slow push-in.” or “Static locked frame.”",
      modes: [8] });
  } else if (camKinds.length > 1) {
    add({ id: "camera", rule: "One camera move", severity: "error",
      title: "Competing camera moves: " + camKinds.join(", ") + ".",
      why: "Two moves force the model to interpolate between them; neither registers cleanly.",
      fix: "Keep one move per clip; cut to a second clip for the other.", modes: [8] });
  } else {
    const camIdx = body.search(CAMERA_RE);
    CAMERA_RE.lastIndex = 0;
    const near = body.slice(Math.max(0, camIdx - 25), camIdx + 40);
    if (!W(SPEED_SLOW.concat(SPEED_FAST, ["steady", "steadily", "smooth", "smoothly", "even"])).test(near) && !/static|locked/i.test(near)) {
      add({ id: "camera-speed", rule: "One camera move", severity: "tip",
        title: "Camera move “" + cams[0] + "” has no speed.",
        why: "An unqualified move gets a default speed.", fix: "Pair it: “slow push-in”, “steady tracking shot”.", modes: [8] });
    } else pass("One camera move", "One move: " + cams[0] + ".");
  }

  // ---------- P5 one pacing set ----------
  // Camera speed and subject speed are separate dials; judge pacing on the
  // sentences that do not carry the camera move.
  const subjectText = body.split(/(?<=[.!?;])\s+/).filter((x) => !CAMERA_RE.test(x) || MOTION_RE.test(x.replace(CAMERA_RE, ""))).join(" ");
  CAMERA_RE.lastIndex = 0;
  const slow = matches(W(SPEED_SLOW), subjectText.replace(new RegExp(CAMERA_RE.source, "gi"), ""));
  const fast = matches(W(SPEED_FAST), subjectText);
  if (slow.length && fast.length) {
    add({ id: "pacing", rule: "One pacing set", severity: "warn",
      title: "Contradictory pacing: " + slow.join(", ") + " against " + fast.join(", ") + ".",
      why: "Speed words act as one global dial per clip; mixing them confuses the read.",
      fix: "Pick one energy for the whole clip. If camera and subject differ (slow camera, galloping riders), say so once and plainly.", modes: [4, 9] });
  }

  // ---------- P6 beats ----------
  const seq = matches(SEQUENCERS, body);
  const sentences = body.split(/[.!?;]+/).filter((s) => MOTION_RE.test(s)).length;
  if (seq.length >= 2 || sentences > 4) {
    add({ id: "beats", rule: "One focused moment", severity: seconds <= 8 ? "warn" : "tip",
      title: "Reads as " + Math.max(seq.length + 1, sentences) + " beats in " + seconds + " s.",
      evidence: seq.length ? "Sequencers: " + seq.join(", ") : undefined,
      why: "A 5 to 8 s clip holds two or three visible changes; more get compressed, skipped or stacked.",
      fix: "Keep one moment; if order matters inside the shot, timestamp it: “[00:06-00:08] the guns open fire”.", modes: [9, 10] });
  }

  // ---------- P7 filler ----------
  const filler = matches(FILLER_RE, body);
  if (filler.length >= 2) {
    add({ id: "filler", rule: "Every word moves something", severity: "tip",
      title: "Filler style words: " + filler.join(", ") + ".",
      why: "If a word can be cut and the clip still makes sense, it is spending attention.",
      fix: "Cut them; the still carries the look.", modes: [4] });
  }

  // ---------- P8 layered motion (anti-tableau) ----------
  const hasSubjectMotion = MOTION_RE.test(body);
  const hasEnv = ENV_RE.test(body);
  const hasCam = camKinds.length > 0;
  const layers = [hasSubjectMotion, hasEnv, hasCam].filter(Boolean).length;
  if (layers < 3) {
    const missing = [!hasSubjectMotion && "subject action", !hasEnv && "environmental motion", !hasCam && "camera move"].filter(Boolean);
    add({ id: "layers", rule: "Layered motion", severity: layers <= 1 ? "warn" : "tip",
      title: "Missing motion layer: " + missing.join(", ") + ".",
      why: "Name only the headline action and the model performs the minimum: a tableau that happens to move.",
      fix: "One subject action with a secondary cue, one or two environment motions (dust drifts, hair lifts in the wind), one camera move.",
      modes: [4] });
  } else pass("Layered motion", "Subject, environment and camera all move.");

  // ---------- P9 direction of travel ----------
  const travels = W(["walks?", "walking", "runs?", "running", "gallops?", "galloping", "charges?", "charging", "rides?", "riding", "advances?", "advancing", "strides?", "striding", "marches?", "marching", "sprints?", "drives?", "driving", "moves?", "moving", "approaches", "approaching", "retreats?", "crosses", "crossing", "trots?", "canters?"]);
  if (travels.test(body)) {
    if (!DIRECTION_TERMS.test(body)) {
      add({ id: "direction", rule: "Direction of travel", severity: "error",
        title: "Travel without a screen or camera anchor.",
        why: "“Walks forward” has no vector; the model can and does reverse it.",
        fix: "Anchor it twice, to camera and to geography: “away from camera toward the guns at the valley head”, “right to left across frame”.",
        modes: [2] });
    } else pass("Direction of travel", "Travel is anchored to camera or screen.");
  }

  // ---------- P10 Frames mode: don't re-describe the still ----------
  if (mode === "frames") {
    const desc = matches(W(STATIC_DESC), body);
    if (desc.length >= 2) {
      add({ id: "redescribe", rule: "The still carries the look", severity: "warn",
        title: "Re-describes what the still shows: " + desc.slice(0, 5).join(", ") + ".",
        why: "In image-to-video the frame is the description; redundant description invites reinterpretation (one design becomes two).",
        fix: "Delete appearance, wardrobe and lighting words; refer to subjects generally (“the singer”, “the riders”).",
        modes: [6, 4] });
    }
    if (!SUBJECT_GENERAL.test(body) && /\b[A-Z][a-z]+\b/.test(body.slice(1)) && /@\w+/.test(body)) {
      add({ id: "subject-ref", rule: "The still carries the look", severity: "tip",
        title: "Character tag in a Frames prompt.",
        why: "The frame already fixes identity; general terms keep the prompt kinetic.",
        fix: "Refer to the subject as “the subject”, “the woman”, “they”.", modes: [6] });
    }
  }

  // ---------- still-side rules ----------
  if (!still) {
    add({ id: "no-still", rule: "The still carries facing and state", severity: mode === "frames" ? "error" : "tip",
      title: mode === "frames" ? "No start-frame description; the still is the contract in Frames mode." : "No start frame described.",
      why: "Facing, formation and prop state only lock when they are pictured.",
      fix: "Describe the still: framing, each subject's facing, travel vector, prop states, light.", modes: [1, 2, 3] });
  } else {
    // S1 facing pictured
    const facingInPrompt = FACING_TERMS.test(body) || TOWARD_CAMERA.test(body);
    const facingInStill = FACING_TERMS.test(still);
    if (!facingInStill) {
      add({ id: "still-facing", rule: "The still carries facing and state", severity: facingInPrompt ? "error" : "warn",
        title: facingInPrompt ? "Facing is asked for in the prompt but not pictured in the still." : "The still does not fix facing.",
        why: "Facing that exists only as prose gets recomposed; a half-turn invites completion toward camera.",
        fix: "Picture it: “all riders square from behind”, “profile, gaze on the doorway”. Then the prompt only holds it.",
        modes: [1, 2] });
    } else if (AMBIGUOUS_FACING.test(still)) {
      add({ id: "still-facing", rule: "The still carries facing and state", severity: "error",
        title: "Ambiguous facing in the still: “" + still.match(AMBIGUOUS_FACING)[0] + "”.",
        why: "A subject caught between facings is the classic turn-to-camera trigger.",
        fix: "Recompose with one clear facing; hips, feet and gaze on the same vector.", modes: [1] });
    } else pass("Still: facing", "Facing is pictured.");

    if (TOWARD_CAMERA.test(still) && travels.test(body) && /away from (?:the )?camera/i.test(body)) {
      add({ id: "facing-conflict", rule: "The still carries facing and state", severity: "error",
        title: "Still faces camera; prompt sends the subject away from camera.",
        why: "The model must turn the subject around, which reads as a reversal.",
        fix: "Recompose the still from behind, or reverse the prompt's direction.", modes: [1, 2] });
    }

    // S2 travel vector
    if (travels.test(body) && !DIRECTION_TERMS.test(still) && !W(["lead room", "space ahead", "room ahead", "open space", "destination", "horizon", "road ahead", "toward"]).test(still)) {
      add({ id: "still-vector", rule: "The still carries facing and state", severity: "warn",
        title: "Travel vector not readable from the still.",
        why: "Direction of motion should be legible from the picture alone, with room ahead of the subject.",
        fix: "Compose lead room in the travel direction and put the destination (or its direction) in frame.", modes: [2] });
    }

    // S3 mid-action
    if (POSED.test(still) && !MID_ACTION.test(still) && hasSubjectMotion) {
      add({ id: "still-posed", rule: "Mid-action still", severity: "warn",
        title: "Still is posed (“" + still.match(POSED)[0] + "”) for a shot that moves.",
        why: "Planted feet and symmetry carry into motion as a sterile tableau.",
        fix: "Catch the subject inside the motion: mid-stride, weight shifting, fabric in tension.", modes: [4] });
    }

    // S4 prop silhouette, S5 specular, S6 prop state
    // Silhouette applies to props a subject holds, not scenery ("guns at the valley head").
    const props = matches(HELD_PROP, still).map((m) => m.match(PROP_RE)[0]);
    PROP_RE.lastIndex = 0;
    const metalAny = METAL.test(still);
    if (props.length || metalAny) {
      const merged = DARK_ON_DARK.test(still) || BODY_BACKDROP.test(still);
      if (props.length && (!SEPARATION.test(still.replace(BODY_BACKDROP, "")) || merged)) {
        add({ id: "prop-silhouette", rule: "Prop silhouette", severity: merged ? "error" : "warn",
          title: (merged ? "Prop set against the body: " : "Prop silhouette not separated: ") + props.join(", ") + ".",
          why: "When a prop's edges merge with the body in frame 1, Veo loses its shape and melts or warps it.",
          fix: "Hold the prop clear of the torso against a contrasting background; check the edge on an enlarged crop.",
          modes: [3, 11] });
      } else if (props.length) pass("Prop silhouette", "Held props are separated from the body.");
      if (METAL.test(still) && SPECULAR.test(still) && !MATTE.test(still)) {
        add({ id: "specular", rule: "Specular highlight", severity: "error",
          title: "Bright highlight on metal: “" + still.match(SPECULAR)[0] + "”.",
          why: "Hot white edges on blades and barrels read as energy once motion starts (the sabre-ignition failure).",
          fix: "Paint the highlight out before animating; describe the metal as matte, dull, unlit.", modes: [3] });
      } else if (METAL.test(still)) pass("Specular highlight", "No hot highlights on metal described.");
      const stateProps = matches(STATEFUL_PROPS, still).filter((x) => !/^guns?$/i.test(x) || HELD_PROP.test(still));
      if (stateProps.length && !PROP_STATE.test(still)) {
        add({ id: "prop-state", rule: "The still carries facing and state", severity: "warn",
          title: "Prop state not pictured for: " + stateProps.join(", ") + ".",
          why: "State described in prose loses to the association in a self-composed shot; pictured state held for 8 s.",
          fix: "Show the state in the still (sheathed at the hip, lowered, unlit) and state it once, positively, in the prompt.", modes: [3] });
      }
    }
    if (SPECULAR.test(still) && /lens flare|flare|blown/i.test(still)) {
      add({ id: "flare", rule: "Specular highlight", severity: "warn",
        title: "Flare or blown highlight in the still.",
        why: "Blown areas give the model nothing to continue and invite glow artefacts.", fix: "Grade the flare out of the start frame.", modes: [3, 9] });
    }

    // S7 contamination / formation
    if (CROWD.test(still)) {
      add({ id: "contamination", rule: "One subject, clean edges", severity: "warn",
        title: "Extra figures in the still: “" + still.match(CROWD)[0] + "”.",
        why: "Midground and flank figures are the model's invention zone.",
        fix: "Clear the flanks and midground of anything the shot does not need; judge the edges on crops.", modes: [7] });
    }
    if (GROUP.test(still) && !STAGGER.test(still)) {
      add({ id: "formation", rule: "Formation and spacing", severity: "warn",
        title: "Group without a pictured stagger.",
        why: "Model-invented composition defaults to symmetry: a parade line.",
        fix: "Compose the stagger into the still, in the front rank as well as in depth.", modes: [5, 12] });
    }
    // S8 thin objects
    const thin = matches(THIN, still);
    if (thin.length) {
      add({ id: "thin", rule: "Thin objects", severity: "warn",
        title: "Thin objects in frame: " + thin.join(", ") + ".",
        why: "Thin, ambiguous objects get re-decided in motion and can grow or morph.",
        fix: "Keep them few, thick and unambiguous, or remove them from the still; never name them in the prompt.", modes: [11] });
      const thinInPrompt = matches(THIN, body);
      if (thinInPrompt.length) {
        add({ id: "thin-named", rule: "Thin objects", severity: "warn",
          title: "Prompt names a thin object: " + thinInPrompt.join(", ") + ".",
          why: "Naming an ambiguous object raises its weight.", fix: "Leave it to the still.", modes: [11] });
      }
    }
    // S9 text
    if (TEXT_IN_FRAME.test(still)) {
      add({ id: "text", rule: "No text in frame", severity: "tip",
        title: "Text or signage in the still: “" + still.match(TEXT_IN_FRAME)[0] + "”.",
        why: "Lettering warps in motion.", fix: "Remove it, or keep it static, large and out of the action.", modes: [6] });
    }
    // S10 design
    if (DESIGN.test(still) && DESIGN.test(body)) {
      add({ id: "design", rule: "One design rule", severity: "warn",
        title: "Prompt re-describes a design the still already shows.",
        why: "Re-description invites a second reading: two flags, two insignia.", fix: "Describe it once, in the still brief; leave it out of the prompt.", modes: [6] });
    }
    // S11 camera room
    if (PUSH_IN.test(body) && TIGHT_FRAMING.test(still)) {
      add({ id: "camera-room", rule: "Camera room", severity: "error",
        title: "Push-in requested on an already tight still.",
        why: "The start frame is at the terminal framing; the move has nowhere to go.",
        fix: "Compose the still wider than the target framing, or supply the pushed-in framing as the end frame.", modes: [8] });
    } else if (PUSH_IN.test(body) && !WIDE_FRAMING.test(still)) {
      add({ id: "camera-room", rule: "Camera room", severity: "tip",
        title: "Push-in with no framing stated for the still.",
        why: "A push-in needs a start wider than its target.", fix: "State the still's framing (wide, medium-wide).", modes: [8] });
    }
    // S12 light logic
    const lights = matches(LIGHT_SOURCES, still);
    if (lights.length >= 3) {
      add({ id: "light", rule: "Light logic", severity: "warn",
        title: "Mixed light sources: " + lights.join(", ") + ".",
        why: "The model has to guess through competing sources and the palette drifts.",
        fix: "One key direction and one palette; any colour language the film needs should already be visible in the still.", modes: [9] });
    }
  }

  // ---------- first-and-last-frame discipline ----------
  if (endFrame) {
    if (mode !== "frames") {
      add({ id: "flf-mode", rule: "First and last frame", severity: "warn",
        title: "End frame supplied outside Frames mode.", why: "First-and-last-frame control is a Frames-mode tool.",
        fix: "Switch to Frames mode for this shot.", modes: [8, 10] });
    }
    if (!/\b(same|unchanged|identical|matching|edit(?:ed)? of|from the start (?:frame|still))\b/i.test(endFrame)) {
      add({ id: "flf-pair", rule: "First and last frame", severity: "warn",
        title: "End frame is not described as an edit of the start frame.",
        why: "Design the pair as one problem: same place, light, cast and lens; one thing changes. Build the end frame by editing the start still.",
        fix: "Make the end frame an edit of the start still and name the one change.", modes: [6, 2] });
    } else pass("First and last frame", "End frame is built from the start frame.");
    const changes = (endFrame.match(/\b(and|while|also|plus)\b/gi) || []).length;
    if (changes >= 3) {
      add({ id: "flf-one-change", rule: "First and last frame", severity: "tip",
        title: "End frame changes several things at once.",
        why: "One clear change reads as action; five read as a glitch.", fix: "Keep one change between the frames.", modes: [9] });
    }
    if (seconds < 6 && PUSH_IN.test(body)) {
      add({ id: "flf-length", rule: "First and last frame", severity: "tip",
        title: "Camera move between frames in under 6 s.", why: "Reveals and camera moves want about 8 s; morphs about 4 s.",
        fix: "Generate at 8 s for a move.", modes: [8] });
    }
  } else {
    if (PUSH_IN.test(body) && mode === "frames") {
      add({ id: "flf-suggest", rule: "First and last frame", severity: "tip",
        title: "A push-in that must register: add an end frame.",
        why: "An end frame that IS the pushed-in framing forces the geometry.",
        fix: "Edit the start still to the target framing and supply it as the last frame.", modes: [8] });
    }
    if (HOLD_BEAT.test(body)) {
      add({ id: "flf-hold", rule: "First and last frame", severity: "warn",
        title: "A beat that must hold to the cut, with no end frame.",
        why: "The model resolves action toward a neutral end state across the clip; a fall recovers by 6 to 7 s.",
        fix: "Supply an end frame with the beat still held, or generate a shorter clip that ends while it holds.", modes: [10] });
    }
  }

  // ---------- timing ----------
  if (LATE_EVENT.test(body) && !TIMESTAMP.test(body)) {
    add({ id: "timing", rule: "Event timing", severity: "warn",
      title: "Late event in prose: “" + body.match(LATE_EVENT)[0] + "”.",
      why: "Event timing inside a clip is weakly controllable in prose.",
      fix: "Timestamp it: “[00:06-00:08] …”.", modes: [9] });
  }

  // ---------- end state as continuous condition ----------
  const risky = TOWARD_CAMERA.test(body) || /away from (?:the )?camera/i.test(body) || PROP_RE.test(body);
  PROP_RE.lastIndex = 0;
  if (risky && !CONTINUOUS.test(body)) {
    add({ id: "end-state", rule: "Continuous conditions", severity: "warn",
      title: "Facing or prop state is not held as a continuous condition.",
      why: "Breakdowns cluster in the back half of the clip, after a clean start.",
      fix: "Close with the condition for the whole shot: “every rider faces away from camera for the whole shot”.", modes: [1, 3] });
  }

  // ---------- score ----------
  let score = 100;
  for (const f of findings) score -= SEVERITY_COST[f.severity] || 0;
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? "A" : score >= 78 ? "B" : score >= 64 ? "C" : score >= 50 ? "D" : "F";
  const errors = findings.filter((f) => f.severity === "error").length;
  const verdict = errors ? "Fix " + errors + " blocking issue" + (errors > 1 ? "s" : "") + " before spending a credit."
    : findings.some((f) => f.severity === "warn") ? "Fireable at 360p draft; tighten the warnings first."
    : "Clean against the playbook. Judge the still on crops, then draft at 360p.";
  const failureModes = {};
  for (const f of findings) for (const m of f.modes || []) {
    if (f.severity === "tip") continue;
    failureModes[m] = failureModes[m] || { id: m, name: FAILURE_MODES[m], findings: [] };
    failureModes[m].findings.push(f.id);
  }
  const order = { error: 0, warn: 1, tip: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { score, grade, verdict, mode, wordCount: wc, seconds, findings, passes, failureModes };
}
