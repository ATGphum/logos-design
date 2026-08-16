/**
 * DESIGN SHIM — stand-in for @stripe/stripe-js and
 * @stripe/react-stripe-js/checkout. Stripe is disabled in the design fixtures
 * (the card method shows as Unavailable, like production), so none of this
 * renders — it only needs to satisfy the type-checker and lazy import.
 */
import type { ReactNode } from 'react'

export type Stripe = Readonly<{ __designShim: true }>

export type StripeCheckoutElementsSdkOptions = Readonly<{ clientSecret: string }>

/* Event/state types are deliberately loose (any): Stripe is disabled in the
   design fixtures, so these code paths never run — they only need to appease
   the type-checker without pulling in the real SDK's type surface. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type StripeExpressCheckoutElementReadyEvent = any
export type StripeExpressCheckoutElementAvailablePaymentMethodsChangeEvent = any
export type StripeExpressCheckoutElementConfirmEvent = any

export async function loadStripe(_publishableKey: string): Promise<Stripe | null> {
  return null
}

export function CheckoutElementsProvider(_props: {
  stripe: Stripe | null | Promise<Stripe | null>
  options: unknown
  children?: ReactNode
}): ReactNode {
  return null
}

export function PaymentElement(_props: {
  options?: any
  onReady?: (event: any) => void
  onChange?: (event: any) => void
  onLoadError?: (event: any) => void
}): ReactNode {
  return null
}

export function ExpressCheckoutElement(_props: {
  options?: any
  onReady?: (event: any) => void
  onAvailablePaymentMethodsChange?: (event: any) => void
  onConfirm?: (event: any) => void
  onLoadError?: (event: any) => void
}): ReactNode {
  return null
}

export function useCheckoutElements(): any {
  return { type: 'loading' }
}
