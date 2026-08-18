import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage, apiErrorStatus } from '../../api'
import {
  parseCryptoDepositAddress,
  type CryptoDepositAddress,
  type CryptoDepositCatalog,
  type CryptoDepositNetwork,
} from '../../depositTypes'
import { pageText } from '../../i18n/pageText'

type CryptoDepositAddressState = Readonly<{
  addresses: Readonly<Record<string, CryptoDepositAddress>>
  freshNetworkID: string | null
  loadingNetworkID: string | null
  staleNetworkIDs: readonly string[]
  errors: Readonly<Record<string, string>>
}>

const initialState: CryptoDepositAddressState = Object.freeze({
  addresses: Object.freeze({}),
  freshNetworkID: null,
  loadingNetworkID: null,
  staleNetworkIDs: Object.freeze([]),
  errors: Object.freeze({}),
})

function addressIdempotencyKey(networkID: string) {
  return `deposit-address:${networkID}:${crypto.randomUUID()}`
}

export function useCryptoDepositAddress(catalog: CryptoDepositCatalog | null, enabled = true) {
  const [state, setState] = useState<CryptoDepositAddressState>(initialState)
  const mounted = useRef(false)
  const generation = useRef(0)
  const active = useRef<Readonly<{
    controller: AbortController
    networkID: string
    promise: Promise<CryptoDepositAddress>
  }> | null>(null)
  const catalogRef = useRef(catalog)
  const addressesRef = useRef<Readonly<Record<string, CryptoDepositAddress>>>(state.addresses)
  const currentNetworkID = useRef<string | null>(null)
  const idempotencyKeys = useRef(new Map<string, string>())
  catalogRef.current = catalog
  addressesRef.current = state.addresses

  const abort = useCallback(() => {
    generation.current += 1
    active.current?.controller.abort()
    active.current = null
    if (mounted.current) setState((current) => ({ ...current, loadingNetworkID: null, freshNetworkID: null }))
  }, [])

  const requestAddress = useCallback((
    networkID: string,
    allowAllocate: boolean,
    externalSignal?: AbortSignal,
  ): Promise<CryptoDepositAddress> => {
    const network: CryptoDepositNetwork | undefined = catalogRef.current?.networks.find((item) => item.networkId === networkID)
    if (!enabled || network === undefined || !network.availability.canReadAddress) {
      return Promise.reject(new Error(pageText('billing.cryptoDepositPanel.addressUnavailable')))
    }
    currentNetworkID.current = networkID
    const trusted = addressesRef.current[networkID]
    if (allowAllocate && trusted !== undefined) return Promise.resolve(trusted)
    if (active.current?.networkID === networkID) return active.current.promise
    if (active.current !== null) {
      generation.current += 1
      active.current.controller.abort()
      active.current = null
    }

    const controller = new AbortController()
    const abortFromCaller = () => controller.abort()
    if (externalSignal?.aborted) controller.abort()
    else externalSignal?.addEventListener('abort', abortFromCaller, { once: true })
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({ ...current, loadingNetworkID: networkID, freshNetworkID: null }))

    const promise = (async () => {
      try {
        let payload: unknown
        const path = `/billing/deposits/${encodeURIComponent(networkID)}/address`
        try {
          payload = await api<unknown>(path, { signal: controller.signal })
        } catch (error) {
          if (apiErrorStatus(error) !== 404 || !allowAllocate || !network.availability.canAllocateAddress) throw error
          let idempotencyKey = idempotencyKeys.current.get(networkID)
          if (idempotencyKey === undefined) {
            idempotencyKey = addressIdempotencyKey(networkID)
            idempotencyKeys.current.set(networkID, idempotencyKey)
          }
          payload = await api<unknown>(path, {
            method: 'PUT',
            body: {},
            idempotencyKey,
            signal: controller.signal,
          })
        }
        const address = parseCryptoDepositAddress(payload, network)
        if (address === null) throw new Error(pageText('billing.cryptoDepositPanel.addressUnavailable'))
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) {
          throw new DOMException('Crypto Deposit address request was superseded.', 'AbortError')
        }
        setState((current) => {
          const errors = { ...current.errors }
          delete errors[networkID]
          return {
            addresses: Object.freeze({ ...current.addresses, [networkID]: address }),
            freshNetworkID: networkID,
            loadingNetworkID: null,
            staleNetworkIDs: Object.freeze(current.staleNetworkIDs.filter((item) => item !== networkID)),
            errors: Object.freeze(errors),
          }
        })
        return address
      } catch (error) {
        if (controller.signal.aborted || generation.current !== requestGeneration) throw error
        const lastTrusted = addressesRef.current[networkID]
        if (mounted.current) {
          setState((current) => ({
            ...current,
            freshNetworkID: null,
            loadingNetworkID: null,
            staleNetworkIDs: Object.freeze(lastTrusted === undefined || current.staleNetworkIDs.includes(networkID)
              ? current.staleNetworkIDs
              : [...current.staleNetworkIDs, networkID]),
            errors: Object.freeze({
              ...current.errors,
              [networkID]: apiErrorMessage(error, pageText('billing.cryptoDepositPanel.addressUnavailable')),
            }),
          }))
        }
        if (lastTrusted !== undefined) return lastTrusted
        throw error
      } finally {
        externalSignal?.removeEventListener('abort', abortFromCaller)
        if (active.current?.controller === controller) active.current = null
      }
    })()
    active.current = Object.freeze({ controller, networkID, promise })
    return promise
  }, [enabled])

  const loadAddress = useCallback((networkID: string, options: Readonly<{ signal: AbortSignal }>) => (
    requestAddress(networkID, true, options.signal)
  ), [requestAddress])

  const refreshCurrent = useCallback(async () => {
    const networkID = currentNetworkID.current
    if (networkID === null) return
    await requestAddress(networkID, false).then(() => undefined)
  }, [requestAddress])

  useEffect(() => {
    mounted.current = true
    if (!enabled) setState(initialState)
    return () => {
      mounted.current = false
      generation.current += 1
      active.current?.controller.abort()
      active.current = null
    }
  }, [enabled])

  return { ...state, loadAddress, refreshCurrent, abort }
}
