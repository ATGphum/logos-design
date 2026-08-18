import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiErrorMessage } from '../../api'
import { parseCryptoDepositCatalog, type CryptoDepositCatalog } from '../../depositTypes'
import { pageText } from '../../i18n/pageText'

type CryptoDepositCatalogState = Readonly<{
  catalog: CryptoDepositCatalog | null
  available: boolean
  fresh: boolean
  loading: boolean
  error: string
}>

const initialState: CryptoDepositCatalogState = Object.freeze({
  catalog: null,
  available: false,
  fresh: false,
  loading: false,
  error: '',
})

export function useCryptoDepositCatalog(enabled = true) {
  const [state, setState] = useState<CryptoDepositCatalogState>(() => ({ ...initialState, loading: enabled }))
  const mounted = useRef(false)
  const generation = useRef(0)
  const active = useRef<Readonly<{ controller: AbortController; promise: Promise<void> }> | null>(null)

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
        const payload = await api<unknown>('/billing/deposits/catalog', { signal: controller.signal })
        const catalog = parseCryptoDepositCatalog(payload)
        if (catalog === null) throw new Error(pageText('billing.cryptoDepositPanel.catalogUnavailable'))
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
        setState({ catalog, available: true, fresh: true, loading: false, error: '' })
      } catch (error) {
        if (!mounted.current || controller.signal.aborted || generation.current !== requestGeneration) return
        setState((current) => ({
          ...current,
          available: current.catalog !== null,
          fresh: false,
          loading: false,
          error: apiErrorMessage(error, pageText('billing.cryptoDepositPanel.catalogUnavailable')),
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
    else setState(initialState)
    return () => {
      mounted.current = false
      generation.current += 1
      active.current?.controller.abort()
      active.current = null
    }
  }, [enabled, refresh])

  return { ...state, refresh, abort }
}
