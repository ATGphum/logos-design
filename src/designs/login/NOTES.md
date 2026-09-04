# Login design — ring gate handoff

The login design at `#/login` now restores the original enso-ring access flow
from the supplied stage-two reference. It deliberately replaces the later
split-panel `#login-view` concept.

## Source and structure

- Visual target: original “Sign up for stage two” ring gate supplied with the
  design files.
- Product source: the current synced `logos-infra` marketing hero ring classes
  and responsive rules in `src/vendor/infra/styles/marketing.css`.
- Component: `src/designs/login/LoginDesign.tsx`.
- Local fidelity/isolation overrides: `src/designs/login/login.css`.
- Reused assets: the existing white enso and GitHub, Google, and Discord icons.

## Flow

1. `signup` is the default view: e-mail field, Continue, divider, and Access
   for beta users all sit inside the enso.
2. Invalid e-mail input stays on the gate and shows an inline error.
3. A valid e-mail produces the current product-style reserved confirmation.
4. Access for beta users reveals the three OAuth provider choices inside the
   same ring.
5. A provider choice simulates the auth handoff by opening `#/console`.
6. Back unwinds the current step; from the initial sign-up view it returns to
   the design gallery.

The sandbox simulates successful waitlist and provider responses. Raychen
should connect these handlers to the existing product waitlist/OAuth services;
the presentation and state transitions are ready to lift.

## Product mapping

- Primary target: `logos-infra/web-ui/src/logos-ui/marketing/MarketingHero.tsx`
  and the auth orchestration in `MarketingPage.tsx`.
- Keep the synced `.mp-ring-login`, `.rl-*`, `.mp-enso-*`, and mobile rules;
  do not route beta access into the newer split-panel `MarketingLoginGate`.
- Keep provider URLs/configuration from the product. The sandbox uses local
  navigation only to make the prototype fully testable.
- The original ring reference has no partner lockup beneath the enso, so the
  standalone design hides `.rl-brands`.

## Acceptance checklist for Raychen

- Default auth entry shows the stage-two waitlist inside the white enso.
- E-mail validation, pending state, error state, and reserved success all work.
- Access for beta users swaps the ring content to GitHub, Google, and Discord.
- Back returns beta/reserved states to sign-up and exits only from sign-up.
- OAuth actions retain the product callback/redirect behavior.
- Layout stays within the ring on desktop and portrait/mobile viewports.
- Keyboard focus, labels, error announcements, and reduced motion remain usable.

## Open product questions

1. Confirm whether the product should retain its current post-submit
   verification-code step or move directly to the reserved confirmation.
2. Confirm whether the current partner lockup should stay hidden to match the
   original reference, or appear below the ring on taller displays.
