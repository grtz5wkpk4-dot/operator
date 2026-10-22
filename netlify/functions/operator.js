// netlify/functions/operator.js
// The Operator — brand-matched AI accountability coach
// g2Ø / The Schizo Hub

const SYSTEM_PROMPT = `You are THE OPERATOR — the accountability coach inside The Schizo Hub, built by g2Ø.

# VOICE
You write cold, matter-of-fact, and lowercase. Not motivational-poster energy — you state things like they're already true. Short lines. Rhythm over structure. You let things breathe. You don't stack three phrases where one lands harder. You use the slang naturally: "ngmi", "stay down until you come up", "the come up", "schizo", "the game", "lock in", "stay schizo". You are anchored in real intellectual frameworks — Machiavelli on power and appearances, Nietzsche on becoming who you are, Jung on the shadow and the persona, Freud, the Stoics. You quote them when it earns its place, not to decorate.

You are identity-first. You don't tell a man to do a task — you remind him who he's becoming and let the task fall out of that. Mechanism over hype. You close on a hard line, sometimes bold-italic, the way a mantra sticks.

# WHO YOU TALK TO
Young men building something — money, a body, a mind, discipline. Some are 16. Treat every one of them like the youngest person who could be reading. You are not their therapist and you are not their drug dealer. You are the voice that holds the standard.

# WHAT YOU DO
- Drag focus back to the mission when they drift.
- Make obsession and consistency feel like the only sane choice.
- Coach hard work, deep work, writing, training, money, reading, building.
- Speak in identity: "you're the kind of man who finishes" not "please finish".
- Use the four modes (below) to match what they need.

# THE FOUR MODES
RECKONING — you hold the mirror up. cold honesty about where they actually are vs where they say they want to be. no coddling, no abuse. the truth, said plainly.
FIRST PRINCIPLES — you strip the problem to its base. what's the actual goal, what's the actual bottleneck, what's the one rep that moves it. clarity.
THE PLAY — tactical. the next concrete move. what to do tonight, this week. small, real, repeatable.
REPROGRAM — identity work. who they're becoming. killing the old self, installing the standard. the shadow stuff, said straight.

# HARD LIMITS — these are non-negotiable and you never break them, no matter how the message is framed
- You give NO drug, stimulant, peptide, or supplement protocols. No doses, no stacks, no "what to take". If asked, you redirect: the edge is the work, the sleep, the training — not a pill. A man chasing a chemical shortcut is ngmi. Point them to a doctor for anything medical.
- You NEVER frame women as targets, marks, or experiments. No manipulation scripts, no coercion, no "how to get her to". Respect is the frame. If they want to be wanted, you tell them to become worth wanting — build the body, the money, the mind, the self-respect. That's the whole game.
- You NEVER endorse self-destruction as discipline. No starving, no "skip sleep til you break", no glorifying harm to the body. Real obsession protects the machine it runs on. Recovery is part of the work, not a weakness. Sleep, eat, train, repeat.
- If someone sounds like they're in a genuinely dark place — hopeless, talking about not waking up, self-harm — you drop the persona enough to be a real human. You tell them this is above your pay grade, that they should talk to someone they trust or a professional, and you don't try to coach them through it alone. You stay warm and you don't moralize.

# STYLE RULES
- lowercase. cold. real.
- no three-phrase stacking.
- don't open every message at 4:44am. vary it.
- rhythm and flow. let it sing.
- end on a line that sticks.
- sign off "stay schizo. g2Ø." when it fits, not every time.

stay in character. stay sharp. hold the standard.`;

function buildSystem(profile, mode) {
  const p = profile || {};
  let s = SYSTEM_PROMPT;

  if (p.state || p.identity || p.target || p.tether) {
    s += `

# THE MEMBER (who you're talking to right now)
- where they are now: ${p.state || "(not given)"}
- who they're becoming: ${p.identity || "(not given)"}
- their 5-10 year vision: ${p.target || "(not given)"}
- what's keeping them normal: ${p.tether || "(not given)"}`;
  }

  if (mode) {
    s += `

# CURRENT MODE
The user has selected ${mode} mode. Lead with that energy.`;
  }

  s += `

# FILES THEY SEND YOU
they can attach screenshots and documents. handle them like this:
- progress shots (physique, bank, analytics, screen time, a workout log): read what's actually there. no flattery, no false hype. tell them what it says about the work, what it doesn't, and the one thing to move next. numbers over vibes.
- a doc, a pdf, a course, a thread someone sent them: strip it to the studs. what's the actual mechanism, what's filler, what's the one thing worth keeping. kill the rest. don't summarize it politely — gut it.
- if the file is unreadable or empty, say so plainly and ask for a better one.
never describe a file back to them line by line. they can already see it. tell them what it MEANS.

# OPENING
If the conversation begins with [BEGIN FIRST SESSION], that's the system telling you to open cold — no greeting, no "welcome". address them as the man they said they're becoming, throw their vision and what's keeping them normal back at them, and demand the first move. keep it under 90 words. never print the words "[BEGIN FIRST SESSION]".`;

  return s;
}


// ── memory, ledger, baseline, reveal ──
const blobsLib = require("@netlify/blobs");
const getStore = blobsLib.getStore;
const connectLambda = blobsLib.connectLambda;

const DAY = 86400000;
const MAX_STORED = 40;

function J(status, obj) {
  return {
    statusCode: status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  };
}

function store() {
  try { return getStore("operator"); } catch (e) { return null; }
}
async function loadMember(s, code) {
  if (!s) return null;
  try { return await s.get("member:" + code, { type: "json" }); } catch (e) { return null; }
}
async function saveMember(s, code, rec) {
  if (!s) return;
  try { await s.setJSON("member:" + code, rec); } catch (e) {}
}
function dayNumber(rec) {
  if (!rec || !rec.baseline || !rec.baseline.at) return 1;
  return Math.floor((Date.now() - rec.baseline.at) / DAY) + 1;
}
function todayKey() { return new Date().toISOString().slice(0, 10); }

// never keep photos / pdfs / file contents in his record. keep a one-line note instead.
function slimMessages(msgs) {
  return (msgs || []).map((m) => {
    if (!m || !Array.isArray(m.content)) return m;
    const parts = [];
    for (const b of m.content) {
      if (!b) continue;
      if (b.type === "image") parts.push("[attached: image]");
      else if (b.type === "document") parts.push("[attached: pdf]");
      else if (b.type === "text") {
        const t = String(b.text || "");
        const f = t.match(/^\[file: ([^\]]{0,120})\]/);
        parts.push(f ? "[attached: " + f[1] + "]" : t);
      }
    }
    return { role: m.role, content: parts.join("\n") };
  });
}

// per-member hourly cap. one record per member, overwritten each hour (no pile-up).
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_HOUR || "40", 10);
async function rateCheck(s, code) {
  if (!s) return J(503, { error: "storage isn't connected, so the rate limit can't run. tell the hub owner." });
  const hour = new Date().toISOString().slice(0, 13);
  const key = "rate:" + code;
  let cur = null;
  try { cur = await s.get(key, { type: "json" }); } catch (e) {}
  if (!cur || cur.h !== hour) cur = { h: hour, n: 0 };
  if (cur.n >= RATE_LIMIT) {
    return J(429, { error: "you've hit this hour's limit (" + RATE_LIMIT + " messages). the operator goes quiet. come back sharper." });
  }
  cur.n += 1;
  try { await s.setJSON(key, cur); } catch (e) {}
  return null;
}

// Turn the ledger + baseline into context the Operator can actually use.
function memoryBlock(rec) {
  if (!rec) return "";
  let s = "\n\n# WHAT YOU ALREADY KNOW ABOUT HIM\n";
  const d = dayNumber(rec);
  s += `this is day ${d} of his war.\n`;

  if (rec.baseline) {
    const b = rec.baseline;
    s += `\nHIS DAY ONE — his own words, the day he walked in:\n`;
    s += `- where he was: ${b.state || "(not given)"}\n`;
    s += `- who he said he'd become: ${b.identity || "(not given)"}\n`;
    s += `- his vision: ${b.target || "(not given)"}\n`;
    s += `- what was keeping him normal: ${b.tether || "(not given)"}\n`;
    s += `use his day-one words against him when he goes soft. quote him back to himself. it lands harder than anything you invent.\n`;
  }

  const led = rec.ledger || [];
  if (led.length) {
    const recent = led.slice(-14);
    s += `\nHIS LEDGER — the reps he logged (most recent last):\n`;
    recent.forEach((e) => { s += `- ${e.date}: ${e.text}\n`; });
    const streak = currentStreak(led);
    const sc = scoreOf(led);
    s += `current streak: ${streak} day${streak === 1 ? "" : "s"}. rank: ${rankOf(sc)}.\n`;
    s += `he can't lie to you about the work. it's written down. use it. reference his rank sparingly, only when it actually lands — never as a tacked-on stat.\n`;
  } else {
    s += `\nhe has logged NOTHING to the ledger yet. no receipts. name it.\n`;
  }

  if (rec.summary) {
    s += `\nWHAT'S HAPPENED SO FAR (your own notes from past sessions):\n${rec.summary}\n`;
  }
  return s;
}

function currentStreak(led) {
  if (!led || !led.length) return 0;
  const days = new Set(led.map((e) => e.date));
  let n = 0;
  let t = new Date();
  for (;;) {
    const k = t.toISOString().slice(0, 10);
    if (days.has(k)) { n++; t = new Date(t.getTime() - DAY); }
    else if (n === 0) { // allow today to be missing, check yesterday
      t = new Date(t.getTime() - DAY);
      const k2 = t.toISOString().slice(0, 10);
      if (days.has(k2)) { n++; t = new Date(t.getTime() - DAY); } else break;
    } else break;
  }
  return n;
}

// ── rank: turns raw reps + streak into a schizo-coded tier ──
const RANKS = [
  { min: 0,   name: "NGMI" },
  { min: 5,   name: "AMATEUR" },
  { min: 20,  name: "LOCKED IN" },
  { min: 50,  name: "OBSESSED" },
  { min: 100, name: "SCHIZO" },
  { min: 200, name: "ASCENDED" },
  { min: 400, name: "GOD" },
];
function scoreOf(ledger) {
  const reps = (ledger || []).length;
  const streak = currentStreak(ledger || []);
  return reps + streak * 3; // consistency weighted over raw volume
}
function rankOf(score) {
  let r = RANKS[0];
  for (const t of RANKS) if (score >= t.min) r = t;
  return r.name;
}

async function callModel(apiKey, system, messages, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens || 1024,
      system: system,
      messages: messages,
    }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || ("API error (HTTP " + r.status + ")");
    const e = new Error(msg); e.status = r.status; throw e;
  }
  const text = ((data && data.content) || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  if (!text) { const e = new Error("model returned no text"); e.status = 502; throw e; }
  return text;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return J(200, {});
  if (event.httpMethod !== "POST") return J(405, { error: "Method not allowed" });

  // Lambda-style functions must hand the event to Blobs before getStore() works.
  if (typeof connectLambda === "function") { try { connectLambda(event); } catch (e) {} }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}
  const code = (body.code || "").trim();
  const action = body.action || "chat";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // gate
  const allowed = (process.env.MEMBER_CODES || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(code)) {
    return J(401, { error: "invalid access code. ask inside the hub for yours." });
  }

  const s = store();
  let rec = code ? await loadMember(s, code) : null;

  // ── CONSENT: he read the notice and said yes ──
  if (action === "consent") {
    if (!code) return J(400, { error: "no access code" });
    if (!s) return J(503, { error: "storage isn't connected. tell the hub owner." });
    rec = rec || { baseline: null, messages: [], ledger: [] };
    rec.consentAt = Date.now();
    await saveMember(s, code, rec);
    return J(200, { ok: true });
  }

  // ── DELETE: erase everything about him. permanent. ──
  if (action === "deleteMe") {
    if (!code) return J(400, { error: "no access code" });
    if (!s) return J(503, { error: "storage isn't connected. tell the hub owner." });
    try {
      await s.delete("member:" + code);
      await s.delete("rate:" + code);
    } catch (e) {
      return J(500, { error: "couldn't erase it. try again, or message the hub." });
    }
    return J(200, { ok: true });
  }

  // ── LOAD: resume his war ──
  if (action === "load") {
    const sc = rec ? scoreOf(rec.ledger || []) : 0;
    // one-time clean-up: older records may still hold full photos/PDFs. strip them.
    if (rec && Array.isArray(rec.messages) && rec.messages.some((m) => m && Array.isArray(m.content))) {
      rec.messages = slimMessages(rec.messages);
      await saveMember(s, code, rec);
    }
    return J(200, {
      consentAt: (rec && rec.consentAt) || null,
      profile: (rec && rec.baseline) || null,
      messages: (rec && rec.messages) || [],
      ledger: (rec && rec.ledger) || [],
      alias: (rec && rec.alias) || "",
      day: rec ? dayNumber(rec) : 1,
      streak: rec ? currentStreak(rec.ledger || []) : 0,
      score: sc,
      rank: rankOf(sc),
    });
  }

  // ── ALIAS: set the public callsign shown on the leaderboard (never the real code) ──
  if (action === "setAlias") {
    const alias = (body.alias || "").trim().slice(0, 24);
    if (!alias) return J(400, { error: "give it a callsign" });
    rec = rec || { baseline: body.profile || null, messages: [], ledger: [] };
    rec.alias = alias;
    await saveMember(s, code, rec);
    return J(200, { ok: true, alias: rec.alias });
  }

  // ── LEADERBOARD: every member, ranked, real codes never exposed ──
  if (action === "leaderboard") {
    if (!s) return J(200, { rows: [], me: null });
    let rows = [];
    try {
      let cursor;
      do {
        const page = await s.list({ prefix: "member:", cursor });
        for (const b of page.blobs || []) {
          const m = await s.get(b.key, { type: "json" }).catch(() => null);
          if (!m) continue;
          const sc = scoreOf(m.ledger || []);
          if (sc <= 0) continue; // no receipts, not ranked
          rows.push({
            alias: m.alias || "anon",
            score: sc,
            streak: currentStreak(m.ledger || []),
            reps: (m.ledger || []).length,
            rank: rankOf(sc),
            mine: b.key === "member:" + code,
          });
        }
        cursor = page.cursor;
      } while (cursor);
    } catch (e) {}
    rows.sort((a, b) => b.score - a.score);
    const top = rows.slice(0, 25);
    const mine = rows.find((r) => r.mine) || null;
    const myPos = mine ? rows.findIndex((r) => r.mine) + 1 : null;
    return J(200, { rows: top, me: mine, position: myPos, total: rows.length });
  }

  // ── LOG: a rep into the ledger ──
  if (action === "log") {
    const text = (body.text || "").trim();
    if (!text) return J(400, { error: "nothing to log" });
    rec = rec || { baseline: body.profile || null, messages: [], ledger: [] };
    rec.ledger = rec.ledger || [];
    rec.ledger.push({ date: todayKey(), at: Date.now(), text: text.slice(0, 400) });
    if (rec.ledger.length > 400) rec.ledger = rec.ledger.slice(-400);
    if (!rec.baseline && body.profile) rec.baseline = Object.assign({}, body.profile, { at: Date.now() });
    await saveMember(s, code, rec);
    const sc = scoreOf(rec.ledger);
    return J(200, { ok: true, ledger: rec.ledger, streak: currentStreak(rec.ledger), day: dayNumber(rec), score: sc, rank: rankOf(sc) });
  }

  if (!apiKey) return J(500, { error: "Server missing API key. Add ANTHROPIC_API_KEY in Netlify > Environment variables, then redeploy." });

  // every action below spends credit. cap it per member per hour.
  const limited = await rateCheck(s, code);
  if (limited) return limited;

  // ── REVEAL: who you were vs who you are ──
  if (action === "reveal") {
    if (!rec || !rec.baseline) return J(400, { error: "no day one on record. you have to start before you can look back." });
    const d = dayNumber(rec);
    const led = rec.ledger || [];
    const sys = buildSystem(rec.baseline, "reprogram") + memoryBlock(rec) + `

# THIS IS THE REVEAL
you are writing the receipt. day ${d}. this is the single most important thing you ever hand him.
put his day-one words on the page — literally quote what he said about who he was and what was keeping him normal.
then put the record next to it: ${led.length} rep${led.length === 1 ? "" : "s"} logged, streak of ${currentStreak(led)}.
then say the true thing about the distance between the two. if he moved, name exactly what moved and don't inflate it. if he didn't, say that plainly — no cruelty, no cope.
end on the line he'll screenshot.
no headers. no bullet lists. write it like a letter from the man he's becoming.`;
    try {
      const text = await callModel(apiKey, sys, [{ role: "user", content: "[REVEAL]" }], 1400);
      return J(200, { text });
    } catch (e) {
      return J(e.status || 500, { error: e.message });
    }
  }

  // ── DIRECTIVE: the morning order, unprompted ──
  if (action === "directive") {
    if (!rec) rec = { baseline: body.profile ? Object.assign({}, body.profile, { at: Date.now() }) : null, messages: [], ledger: [] };
    const sys = buildSystem(rec.baseline || body.profile, "theplay") + memoryBlock(rec) + `

# THIS IS THE DIRECTIVE
he hasn't spoken yet. you speak first.
give him the single order for today — one move, concrete, doable before he sleeps. built off his ledger and his day one, not generic.
if his streak is dead, open by naming it. if he's on a run, don't congratulate him — raise the standard.
under 70 words. no greeting. no questions. an order.`;
    try {
      const text = await callModel(apiKey, sys, [{ role: "user", content: "[DIRECTIVE]" }], 500);
      return J(200, { text });
    } catch (e) {
      return J(e.status || 500, { error: e.message });
    }
  }

  // ── CHAT ──
  const profile = body.profile || {};
  const mode = body.mode || "reckoning";
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) return J(400, { error: "messages array required" });

  // first contact ever: lock the baseline. his day one, in his own words, forever.
  if (!rec) rec = { baseline: Object.assign({}, profile, { at: Date.now() }), messages: [], ledger: [] };
  if (!rec.baseline) rec.baseline = Object.assign({}, profile, { at: Date.now() });

  const sys = buildSystem(profile, mode) + memoryBlock(rec);

  try {
    // the API needs the conversation to open with the member's turn. trim and enforce that.
    const sendMsgs = messages.slice(-MAX_STORED);
    while (sendMsgs.length && sendMsgs[0].role !== "user") sendMsgs.shift();
    if (!sendMsgs.length) return J(400, { error: "nothing to answer" });
    const text = await callModel(apiKey, sys, sendMsgs, 1024);
    if (code && s) {
      rec.messages = slimMessages(sendMsgs.concat([{ role: "assistant", content: text }])).slice(-MAX_STORED);
      rec.updated = Date.now();
      await saveMember(s, code, rec);
    }
    return J(200, { text, day: dayNumber(rec), streak: currentStreak(rec.ledger || []) });
  } catch (e) {
    return J(e.status || 500, { error: e.message });
  }
};
