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
  the shims below. Keep the layout path-aligned with the product repo — the
  drift tooling depends on it.

## Shims (design-only stand-ins, all marked `DESIGN SHIM`)

| file | replaces | why |
|---|---|---|
| `upstream/api.ts` | real HTTP client | fixture payloads (see below); POSTs fail with a "checkout is simulated" message |
| `upstream/i18n/pageText.ts` | i18next lookup | direct en/pages.json lookup + `{{var}}`/`{var}`/ICU-plural interpolation |
| `upstream/hooks/billing/injectedTaoWalletConnector.ts` | @polkadot wallet connector | no wallet ever detected → manual-transfer design path |
| `upstream/hooks/billing/taoChainClient.ts` | dedot chain client | never talks to a chain |
| `upstream/components/logos/` | radix primitive kit | minimal `LogosDialog` only |
| `upstream/components/billing/stripeShim.ts` | @stripe SDKs | types only; Stripe disabled in fixtures |
| `upstream/components/billing/qrcodeShim.ts` | qrcode package | placeholder QR SVG |
| `upstream/components/common/useTranslationShim.ts` | react-i18next | en/common.json lookup |

Three files carry a one-line import rewrite marked `// DESIGN SHIM (was …)`:
`TaoCheckout.tsx` (qrcode), `StripeCheckout.tsx` (stripe), `FilterSelect.tsx`
(react-i18next). Expect sync conflicts on those lines only if upstream touches
the same imports.

## Fixtures (`upstream/api.ts`)

- Balance **$60.936934** (production screenshot parity; micros exact)
- Products: custom amount $1–$10,000 + quick $20/$50/$100, TAO-only
  (card shows Unavailable, like the live console)
- History: two settled TAO recharges ($50, $20), credited, taostats links
- Crypto deposit (deposit-v3): one Bittensor network with native TAO,
  an allocated ss58 address (QR via the qrcode shim), one credited deposit
  (2.5 TAO → $11.25) and one just-detected deposit (1.2 TAO)
- All payloads satisfy the strict `billingTypes`/`topupTypes`/`depositTypes`
  parsers — edit fixtures with the parsers open, they reject silently

Deposit-v3 (absorbed 2026-08-17): recharge options moved behind the
`Add credits` dialog (method picker → crypto network/asset → personal
address); history merges recharges + crypto deposits. The upstream sidebar
item renamed Recharge → Billing — mirrored in the console design's nav
(the page header itself still says Recharge upstream).

## Open questions / handoff

- Checkout POSTs are simulated (inline sandbox error). If designing the
  full order-status flow matters, the api shim needs a small in-memory
  order state machine — raise it when needed.
- The older hand-built prototype on the `recharge-page` branch predates this
  adoption; superseded — close or mine it for exploration ideas.
