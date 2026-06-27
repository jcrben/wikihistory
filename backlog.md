# wikihistory / contribgraph — backlog

Deferred, low-priority items. Active work + status: see global todo `0653a9`.

## License (deferred — leaving unlicensed for now)
- Upstream [NickSto/wikihistory](https://github.com/NickSto/wikihistory) is **unlicensed**
  (all-rights-reserved by default), so this fork can't declare an open-source license
  unilaterally.
- **Action when revisited:** reach out to the upstream author (Nick Stockton / NickSto) to
  add or agree on a license, then declare a matching license here + in `toolinfo.json`.
- Decision 2026-06-27: leave unlicensed for now; not blocking the modernize/redeploy work.

## Visibility: who can see the on-wiki widget (important)

The widget renders via **personal JS** (`User:ImperfectlyInformed/common.js` → imports
`wikihistory.js`). MediaWiki rule: **personal JS only runs for that account, when logged in.**

Consequence — three tiers of "who sees it on `User:.../wikihistory`":

1. **Only you (current state).** It's in *your* common.js, so only ImperfectlyInformed,
   logged in, sees the graph. Everyone else sees just the userbox. No admin needed.

2. **Per-viewer opt-in (no admin for the viewer).** Anyone who wants contribution graphs
   can get them by either (a) copying the script into *their own* common.js, or (b)
   enabling it if it's registered as an **opt-in Gadget**. Then *they* see the graph on
   any user's `/wikihistory` page they visit. Key point: this is driven by the **viewer's**
   config, not the page owner's — installing it themselves only makes *them* see it; it
   does NOT make it visible to people who haven't installed it.
   - Registering it as an opt-in Gadget (so it appears in Special:Preferences→Gadgets)
     requires an **interface-admin** to add it to `MediaWiki:Gadgets-definition` +
     `MediaWiki:Gadget-<name>.js`. Sharing it as a plain userscript (documented at
     [[Wikipedia:User scripts]]) needs **no admin** — each user just imports it.

3. **Everyone, automatically (incl. anonymous) → needs admin + consensus.** The ONLY way
   non-installing/anonymous visitors see it is a **default site-wide Gadget**: an
   interface-admin registers it with the `default` flag (and ResourceLoader-compatible so
   it can load for anonymous users). That typically needs community consensus too.

So the split is real: opt-in (no admin, but only opt-ers see it) vs default gadget (admin
+ consensus, everyone sees it). There is no way to make *your page* show JS-rendered
content to a viewer who hasn't loaded the script somehow — Wikipedia doesn't execute
arbitrary per-page JS for other viewers (security).

Possible future path: publish `userscript/contribgraph-userpage.js` as a shared userscript
(generalize it to any user's `/wikihistory` or a config var), then optionally pursue
opt-in Gadget status.

## Cache persistence in Git (production mechanism — TODO)
- The app writes per-year caches + `cache/searched-users.json` to the working tree
  (committed to Git as durable, accumulating data; past years are immutable).
- **Do NOT git-commit per request** from the Flask handler on the live Toolforge tool —
  that would be slow and fragile. Instead add a **periodic/debounced commit job** (cron
  or a small wrapper) that commits `cache/` changes, e.g. every N minutes, and pushes.
- Locally/dev we just commit the accumulated cache by hand (as we did 2026-06-27).
- Consider size over time: if caches grow large, revisit (e.g., prune, or move to a data
  store) — fine for now.
