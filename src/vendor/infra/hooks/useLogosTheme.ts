import { useEffect, useState } from 'react'

const LOGOS_THEME_KEY = 'logos-theme'

export type PaletteMode = 'light' | 'dark'

function readInitialTheme(): PaletteMode {
  const saved = window.localStorage.getItem(LOGOS_THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'dark'
}

export function useLogosTheme() {
  const [mode, setMode] = useState<PaletteMode>(readInitialTheme)

  useEffect(() => {
    window.localStorage.setItem(LOGOS_THEME_KEY, mode)
    document.documentElement.setAttribute('data-logos-mode', mode)
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.style.colorScheme = mode
    document.body.setAttribute('data-logos-mode', mode)
    document.body.classList.toggle('light', mode === 'light')
    document.body.classList.toggle('dark', mode === 'dark')
  }, [mode])

  return { mode, setMode }
}
