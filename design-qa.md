# Design QA — stage-two ring login

## Scope

- Source reference: `/var/folders/0v/6t8b_p4j1nv_b13_y06009vc0000gn/T/codex-clipboard-f514e2a1-0297-4a8a-9085-3660df465ff3.png`
- Implementation: `http://127.0.0.1:5173/#/login`
- Code: `src/designs/login/LoginDesign.tsx` and `src/designs/login/login.css`
- Reference-aspect viewport: 390 × 586 CSS px
- Additional viewport: 1440 × 900 CSS px

## Visual comparison

- Implementation capture: `/tmp/logos-design-ring-qa/implementation.png`
- Side-by-side reference/implementation comparison:
  `/tmp/logos-design-ring-qa/reference-implementation.png`
- The source was scaled to the same 390 × 586 viewport as the implementation
  before comparison.
- Ring scale/placement, heading width, field/button geometry, divider, beta
  entry, back arrow, glow, and responsive containment were reviewed together.
- The original reference has slightly softer raster bloom; the implementation
  uses the exact vector enso asset and therefore stays sharper at runtime.

## Interaction checks

- Empty/invalid e-mail → inline announced validation error — passed.
- Valid e-mail → pending label → reserved confirmation — passed.
- Reserved confirmation → back to sign-up — passed.
- Access for beta users → GitHub/Google/Discord choices — passed.
- Beta back arrow → sign-up — passed.
- Provider choice → sandbox console handoff — passed.
- Browser console errors/warnings — none.

## Build and drift checks

- `npm run build` — passed.
- `npm run drift` after sync — both vendored baselines current; adopted recharge
  paths absorbed to the current infra commit.
- Existing product drift issue #12 covers the remaining Usage mismatch; no
  duplicate issue was filed.

Final result: passed
