import { lazy, type ComponentType, type LazyExoticComponent } from "react"

export type DesignStatus = "exploration" | "proposed" | "shipped"

export interface DesignEntry {
  /** URL hash slug — the design renders at #/<id> */
  id: string
  title: string
  description: string
  status: DesignStatus
  /** webui area this design maps to, for raychen's benefit */
  maps_to: string
  component: LazyExoticComponent<ComponentType>
}

/**
 * Every design registers here. One folder per design under src/designs/,
 * default-exporting its root component. Keep class names prefixed per
 * design (lg-*, cs-*) — design CSS is global.
 */
export const designs: DesignEntry[] = [
  {
    id: "login",
    title: "Login",
    description:
      "Full login screen — sign-in gate, ring login, night theme. Ported from llm-interface.html #login-view.",
    status: "proposed",
    maps_to: "logos-webui login / auth surface",
    component: lazy(() => import("./login/LoginDesign")),
  },
  {
    id: "console",
    title: "Control-plane console",
    description:
      "Console shell (sidebar, topbar), instances, access agent, budget hero, settings. Ported from llm-interface.html #cs-view.",
    status: "proposed",
    maps_to: "logos-webui workbench / console surfaces",
    component: lazy(() => import("./console/ConsoleDesign")),
  },
  {
    id: "recharge",
    title: "Recharge (adopted)",
    description:
      "The real console Recharge/balance page adopted from logos-infra web-ui, running on design fixtures — balance, quick amounts, TAO checkout, history.",
    status: "shipped",
    maps_to: "logos-infra web-ui/src/components/billing (BillingPage)",
    component: lazy(() => import("./recharge/RechargeDesign")),
  },
]
