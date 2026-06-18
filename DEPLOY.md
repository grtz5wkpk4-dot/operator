# DEPLOY — the simple way

Three files. No GitHub needed. No database. Just get it live.

## Steps

1. Go to https://app.netlify.com and log in.
2. Click "Add new site" → "Deploy manually".
3. Drag the WHOLE `operator-deploy` folder onto the box.
   (Drag the folder itself — it already has index.html at the top, so no more
   "page not found".)
4. It deploys. You get a URL like `something-random.netlify.app`. Open it —
   the site loads.
5. Make the Operator actually reply: top nav → Site configuration →
   Environment variables → Add a variable:
   - Key:   ANTHROPIC_API_KEY
   - Value: your key from https://console.anthropic.com
6. Redeploy so the key takes effect: Deploys → drag the folder on again
   (or Deploys → Trigger deploy). Done. The Operator now answers.

## If the page loads but the Operator won't reply

That means the function didn't deploy on the drag-and-drop. Use the CLI instead
(more reliable for the server part). In a terminal:

```
npm install -g netlify-cli
netlify login
cd operator-deploy
netlify deploy --prod
```

When it asks: publish directory = `.` (a dot), functions directory =
`netlify/functions`. Then set ANTHROPIC_API_KEY in the dashboard (step 5) and run
`netlify deploy --prod` once more.

## Later (when this is live and working)

We add back, one at a time: the member access gate, rate limiting, and the
per-member memory. None of it changes what's here — it stacks on top.
