# LOGOS infrastructure — interface

Single-page prototype of the LOGOS marketing page, login flow and control-plane console.

## Files

| path | what it is |
|---|---|
| `llm-interface.html` | **the source.** Everything lives here — markup, CSS, JS. Images are referenced from `assets/` with relative paths. Edit this. |
| `assets/` | webp images used by the page (logos, plates, orb, wave). |
| `build-preview.py` | generates `preview.html`, a single self-contained copy with images inlined as data URIs. |
| `preview.html` | build output, gitignored. Use it when you need to view the page somewhere that can't reach `assets/` — a chat preview pane, an email attachment. |

Other `.png` / `.jpg` files in the root are working reference material, not used by the page.

## Working on it

Open `llm-interface.html` in a browser directly — no build step, no server.

```
git switch -c your-feature
# edit llm-interface.html
git add llm-interface.html
git commit -m "what changed"
git push -u origin your-feature
```

Then open a pull request.

## Merging

`llm-interface.html` is one large file, so two people editing the same area will
conflict. To keep merges painless:

- Work on separate sections — the CSS blocks are commented by area
  (`ACCESS AGENT`, `BUDGET HERO`, `INSTANCES CONSOLE`, `RING LOGIN`).
- Keep branches short-lived; rebase on `main` before opening a PR.
- **Never commit `preview.html`.** It is 1.5 MB of base64 on a handful of lines
  and will conflict on every single change. It is in `.gitignore` for that reason.

## Structure of llm-interface.html

1. `<style>` — all CSS, grouped by area with `/* ===== SECTION ===== */` banners
2. `#mp-view` — marketing page, enso hero, ring login
3. `#login-view` — full login screen
4. `#cs-view` — console: sidebar, top bar, one `.cs-panel` per page
5. `<script>` — page logic; console state starts at `CI_LIST`
