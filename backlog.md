# wikihistory / contribgraph — backlog

Deferred, low-priority items. Active work + status: see global todo `0653a9`.

## License (deferred — leaving unlicensed for now)
- Upstream [NickSto/wikihistory](https://github.com/NickSto/wikihistory) is **unlicensed**
  (all-rights-reserved by default), so this fork can't declare an open-source license
  unilaterally.
- **Action when revisited:** reach out to the upstream author (Nick Stockton / NickSto) to
  add or agree on a license, then declare a matching license here + in `toolinfo.json`.
- Decision 2026-06-27: leave unlicensed for now; not blocking the modernize/redeploy work.

## Cache persistence in Git (production mechanism — TODO)
- The app writes per-year caches + `cache/searched-users.json` to the working tree
  (committed to Git as durable, accumulating data; past years are immutable).
- **Do NOT git-commit per request** from the Flask handler on the live Toolforge tool —
  that would be slow and fragile. Instead add a **periodic/debounced commit job** (cron
  or a small wrapper) that commits `cache/` changes, e.g. every N minutes, and pushes.
- Locally/dev we just commit the accumulated cache by hand (as we did 2026-06-27).
- Consider size over time: if caches grow large, revisit (e.g., prune, or move to a data
  store) — fine for now.
