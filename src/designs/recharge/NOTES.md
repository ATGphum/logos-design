# Recharge (adopted) — notes

First **adopted** design: this is the real product page
(`logos-infra web-ui/src/components/billing/BillingPage`) running in the
sandbox on fixtures — not a port. `npm run sync` three-way-merges upstream
changes into everything under `upstream/` (provenance: `UPSTREAM.json`).

## Structure

- `RechargeDesign.tsx` — gallery mount: vendored infra skin (tokens +
  console-skin) + `BillingPage` + theme bridge. `recharge.css` (`rc-*`) only
  frames the page.
- `upstream/**` — adopted copies. Everything is verbatim upstream **except**
  the sandbox shims and intentional handoff changes below. Keep the layout
  path-aligned with the product repo — the drift tooling depends on it.

## Shims (design-only stand-ins, all marked `DESIGN SHIM`)

| file | replaces | why |
|---|---|---|
| `upstream/api.ts` | real HTTP client | fixture payloads (see below); POSTs fail with a "checkout is simulated" message |
| `upstream/i18n/pageText.ts` | i18next lookup | direct en/pages.json lookup + `{{var}}`/`{var}`/ICU-plural interpolation |
| `upstream/components/logos/` | radix primitive kit | minimal `LogosDialog` only |
| `upstream/components/billing/stripeShim.ts` | @stripe SDKs | types only; Stripe disabled in fixtures |
| `upstream/components/billing/qrcodeShim.ts` | qrcode package | placeholder QR SVG |
| `upstream/components/common/useTranslationShim.ts` | react-i18next | en/common.json lookup |

Three files carry a one-line import rewrite marked `// DESIGN SHIM (was …)`:
`CryptoDepositPanel.tsx` (qrcode), `StripeCheckout.tsx` (stripe), and
`FilterSelect.tsx` (react-i18next). Expect sync conflicts on those lines only
if upstream touches the same imports.

## Fixtures (`upstream/api.ts`)

- Balance **$60.936934** in exact nanos (displayed as **$60.94**)
- Products: custom amount $1–$10,000 + quick $20/$50/$100, Stripe disabled
  (card shows Unavailable, like the live console)
- History: two settled historical Stripe recharges ($50, $20), credited
- Crypto deposit (deposit-v3): one Bittensor network with native TAO,
  an allocated ss58 address (QR via the qrcode shim), one credited deposit
  (2.5 TAO → $11.25) and one just-detected deposit (1.2 TAO)
- All payloads satisfy the strict `billingTypes`/`topupTypes`/`depositTypes`
  parsers — edit fixtures with the parsers open, they reject silently

Deposit-v3 (absorbed 2026-08-17): recharge options moved behind the
`Add credits` dialog; with the only supported network/asset now selected
automatically, crypto goes directly from the method picker to the personal
address. History merges Stripe recharges + crypto deposits. The upstream
sidebar item renamed Recharge → Billing — mirrored in the console design's
nav (the page header itself still says Recharge upstream).

## Design handoff (ahead of product)

These are the intentional product changes. They are marked `DESIGN HANDOFF`
inside the adopted copy so `npm run handoff` distinguishes them from
sandbox-only dependency shims:

- `BillingPage.tsx` — use **Billing** as the page title; remove the duplicate
  eyebrow and description.
- `RechargeOverview.tsx` — put the exact two-decimal balance and **Add
  credits** action on one row; remove the verified pill, explanatory fact row,
  and the duplicate ready-state action card. Error/pending states remain.
- `RechargeHistory.tsx` + `CryptoDepositActivity.tsx` — replace the tall
  payment/deposit cards with one shared Date / Amount / Status / Actions
  table; keep the history section keyboard-foldable and initially open.
- `CryptoDepositPanel.tsx` — treat hidden-tab request cancellation as
  recoverable and resume loading the personal address when the page becomes
  visible, instead of showing a false address error.
- `recharge.css` — carries the responsive table, fold, balance-row, and
  light/dark styling for those composition changes. Port the relevant
  `.rc-*` rules into the product Billing stylesheet; do not copy the sandbox
  frame rules.

The upstream sync at `logos-infra@29a184b67b` is fully absorbed. It removed
the legacy TAO checkout, moved top-up credit accounting to nanos, added
Stripe cancellation, bypassed the single crypto network/asset selector, and
standardized displayed amounts to two decimals. The handoff above is based on
that schema, not the older TAO checkout flow.

## Open questions / handoff

- Checkout POSTs are simulated (inline sandbox error). If designing the
  full order-status flow matters, the api shim needs a small in-memory
  order state machine — raise it when needed.
- The older hand-built prototype on the `recharge-page` branch predates this
  adoption; superseded — close or mine it for exploration ideas.
