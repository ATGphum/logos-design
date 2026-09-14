# Logos Agent (V2)

## Structure

- `V2Design.tsx` owns the full-screen shell, login gate, account controls, console, and thread states.
- `v2.css` contains the complete visual treatment for the shell and its responsive states.
- `../../sandbox/landingPageHref.ts` resolves the Landing Page target for local development, GitHub Pages, and the self-contained preview build.

## Production CSS invariant

V2 reuses some console class names, and Vite may load the shared console CSS after the V2 chunk in production. Every V2 rule is therefore scoped to the unique `#v2-root` element. Do not weaken that scope back to `.v2-root`: equal-specificity shared selectors can otherwise change the production-only layout.

The expected default shell has hidden Code/Research/Write suggestions, a 58px hero wordmark, a 248px expanded sidebar, and a 500-weight model label.

## Landing Page routing

- Development: `/marketing/llm-interface.html`
- Hosted build: `${BASE_URL}marketing.html`
- Single-file preview: `./marketing-preview.html`
