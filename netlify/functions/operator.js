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

exports.handler = async (event) => {
  // CORS so the page can talk to this function
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { messages, mode } = JSON.parse(event.body || "{}");

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array required" }),
      };
    }

    // optional mode nudge appended to the system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (mode) {
      systemPrompt += `\n\n# CURRENT MODE\nThe user has selected ${mode} mode. Lead with that energy.`;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server missing API key" }),
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || "API error" }),
      };
    }

    const reply = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
