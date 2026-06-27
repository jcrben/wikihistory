# wikihistory — deployed as **contribgraph** on Wikimedia Toolforge

Visualize a Wikipedia user's edit history as a **GitHub-style contribution graph**
(an edits-per-day heatmap), built on the MediaWiki [`usercontribs`](https://www.mediawiki.org/wiki/API:Usercontribs) API.

Originally created at the **Wikipedia Data Design Challenge 2017**. This is a fork of
[NickSto/wikihistory](https://github.com/NickSto/wikihistory) ("Visualize your edits!",
<https://nstoler.com/wikihistory>).

## Endpoints

Flask app (`server.py`):

- `GET /edits/<username>` — the user's edits over the last 365 days
- `GET /edits_per_day/<username>` — per-day edit counts (**this is the contribution graph**)
- `GET /day_edits/<username>/<date>` — edits on a specific day

`urls.py` / `views.py` provide equivalent **Django** views (so the app can run alongside
others on one server). Frontend lives in `static/wikihistory/` (`index.html`, `script.js`, `spin.js`).

## Setup

```sh
./initproject.sh
# development:
export FLASK_DEBUG=1
./server.py dev        # serves on 127.0.0.1:5000
```

## Deployment

Deployed on **Wikimedia Toolforge** as the tool **`contribgraph`**
(<https://contribgraph.toolforge.org> — **currently down / 404**).
Maintainers: Ben Creasy, Gergő Tisza.

## Status / TODO

- **Dependencies are 2017-era** (Flask 0.12, Werkzeug 0.11) — modernize before any redeploy.
- A 2023 Toolforge **standards review** flagged missing **description**, **license**, and
  **published source**. Description + a `toolinfo.json` are now in this repo; license is open (below).
- Redeploying the Toolforge webservice needs the **Wikimedia developer/LDAP account**.

## License

**[0BSD](https://spdx.org/licenses/0BSD.html)** (Zero-Clause BSD) — see [LICENSE](LICENSE).
Public-domain-equivalent; use freely.

Note: this is a fork of [NickSto/wikihistory](https://github.com/NickSto/wikihistory),
which is itself unlicensed upstream. 0BSD is applied here covering this fork's changes; the
upstream author is being contacted separately about licensing their original portions.
