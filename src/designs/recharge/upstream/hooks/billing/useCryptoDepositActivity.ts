import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import {
  parseCryptoDepositActivity,
  type CryptoDepositActivity,
  type CryptoDepositCatalog,
} from '../../depositTypes'
import { pageText } from '../../i18n/pageText'
import { cryptoDepositActivityNeedsShortPolling } from './depositRefreshPolicy'

type CryptoDepositActivityState = Readonly<{
  activity: CryptoDepositActivity
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
}>

const emptyActivity: CryptoDepositActivity = Object.freeze({
  schemaVersion: 'crypto-deposit-activity-v1',
  items: Object.freeze([]),
})
const initialState: CryptoDepositActivityState = Object.freeze({
  activity: emptyActivity,
  available: false,
  fresh: false,
  loading: false,
  error: '',
})

export function useCryptoDepositActivity(
  enabled = true,
  catalog: CryptoDepositCatalog | null = null,
  onNewCredit?: (depositID: string, ledgerEntryID: string) => void,
) {
  const [state, setState] = useState<CryptoDepositActivityState>(() => ({ ...initialState, loading: enabled }))
  const mounted = useRef(false)
  const generation = useRef(0)
  const active = useRef<Readonly<{ controller: AbortController; promise: Promise<void> }> | null>(null)
  const catalogRef = useRef(catalog)
  const onNewCreditRef = useRef(onNewCredit)
  const seenCredits = useRef(new Set<string>())
  const hasTrustedSnapshot = useRef(false)
  catalogRef.current = catalog
  onNewCreditRef.current = onNewCredit

  const abort = useCallback(() => {
    generation.current += 1
    active.current?.controller.abort()
    active.current = null
    if (mounted.current) setState((current) => ({ ...current, loading: false, fresh: false }))
  }, [])

  const refresh = useCallback((): Promise<void> => {
    if (!enabled) return Promise.resolve()
    if (active.current !== null) return active.current.promise
    const controller = new AbortController()
    const requestGeneration = generation.current + 1
    generation.current = requestGeneration
    setState((current) => ({ ...current, loading: true, fresh: false, error: '' }))
    const promise = (async () => {
      try {
        const payload = await api<unknown>('/billing/deposits/activity', { signal: controller.signal })
        const activity = parseCryptoDepositActivity(payload, catalogRef.current)
        if (activity === null) throw new Error(pageText('dynamic.billing.rechargeHistoryRefreshFailed'))
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
        setState({ activity, available: true, fresh: true, loading: false, error: '' })
        for (const item of activity.items) {
          if (item.status !== 'credited' || item.ledgerEntryId === null) continue
          const identity = `${item.depositId}:${item.ledgerEntryId}`
          if (seenCredits.current.has(identity)) continue
          seenCredits.current.add(identity)
          if (hasTrustedSnapshot.current) onNewCreditRef.current?.(item.depositId, item.ledgerEntryId)
        }
        hasTrustedSnapshot.current = true
      } catch (error) {
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
        setState((current) => ({
          ...current,
          available: current.available,
          fresh: false,
          loading: false,
          error: apiErrorMessage(error, pageText('dynamic.billing.rechargeHistoryRefreshFailed')),
        }))
      } finally {
        if (active.current?.controller === controller) active.current = null
      }
    })()
    active.current = Object.freeze({ controller, promise })
    return promise
  }, [enabled])

  useEffect(() => {
    mounted.current = true
    if (enabled) void refresh()
    else {
      seenCredits.current.clear()
      hasTrustedSnapshot.current = false
      setState(initialState)
    }
    return () => {
      mounted.current = false
      generation.current += 1
      active.current?.controller.abort()
      active.current = null
    }
  }, [enabled, refresh])

  const needsShortPolling = useMemo(
    () => cryptoDepositActivityNeedsShortPolling(state.activity),
    [state.activity],
  )
  return { ...state, needsShortPolling, refresh, abort }
}
