/**
 * Recharge page — ADOPTED from the real product (logos-infra web-ui,
 * components/billing/BillingPage). Unlike the ported designs, this is the
 * production page running on design fixtures:
 *
 *  - upstream/           adopted copies (provenance in UPSTREAM.json;
 *                        `npm run sync` three-way-merges upstream changes in)
 *  - upstream/api.ts     fixture shim — balance, products, history
 *  - other *Shim files   stand-ins for app-only deps (wallet, stripe, i18n)
 *
 * The vendored infra skin (console-skin + tokens) styles it via the
 * production class names BillingPage already carries (logos-console-root,
 * cs-billing-root). Theme follows the sandbox toggle.
 */
import { useTheme } from "../../vendor/webui/theme"
import "../../vendor/infra/styles/logos-tokens.css"
import "../../vendor/infra/styles/console-skin.css"
import { BillingPage } from "./upstream/components/billing/BillingPage"
import "./recharge.css"

export default function RechargeDesign() {
  const { resolvedMode } = useTheme()
  return (
    <div className={`rc-adopted-frame${resolvedMode === "dark" ? " rc-adopted-night" : ""}`}>
      <BillingPage mode={resolvedMode === "dark" ? "dark" : "light"} buyerEmail="scout@logos.design" />
    </div>
  )
}
