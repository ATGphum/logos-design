/**
 * DESIGN SHIM — stand-in for react-i18next's useTranslation, backed by the
 * adopted English copy. Supports the dotted-path lookups the shared
 * components use (namespace 'common'); unknown keys fall back to the key.
 */
import commonEN from '../../i18n/locales/en/common.json'

const namespaces: Record<string, unknown> = { common: commonEN }

function lookup(source: unknown, path: string): unknown {
  let current = source
  for (const part of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function useTranslation(namespace = 'common') {
  const table = namespaces[namespace]
  const t = (key: string): string => {
    const value = lookup(table, key)
    return typeof value === 'string' ? value : key
  }
  return { t }
}
