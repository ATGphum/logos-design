/**
 * The adopted product Recharge page (see NOTES.md) as an embeddable unit:
 * vendored infra skin + BillingPage. Used by the standalone #/recharge design
 * AND mounted inside the console design's Recharge sidebar panel, mirroring
 * where the page lives in the product (navigation.ts → items.recharge).
 */
import "../../vendor/infra/styles/logos-tokens.css"
import "../../vendor/infra/styles/console-skin.css"
/* Design overrides must load wherever this page mounts — the console panel renders
   this component directly, bypassing RechargeDesign (the gallery wrapper). */
import "./recharge.css"
import { BillingPage } from "./upstream/components/billing/BillingPage"

export default function AdoptedRechargePage({ night }: { night: boolean }) {
  return <BillingPage mode={night ? "dark" : "light"} buyerEmail="scout@logos.design" />
}
