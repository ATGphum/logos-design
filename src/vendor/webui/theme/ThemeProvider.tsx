import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { applyThemeCss, createThemeRuntimeVars } from "./mapping"
import { resolveThemeVariant } from "./resolve"
import type { ColorScheme, DesktopTheme, ThemeMode } from "./types"
import oc2 from "./themes/oc-2.json"

const STORAGE_THEME_ID = "affent.theme-id"
const STORAGE_COLOR_SCHEME = "affent.theme"
const STYLE_ELEMENT_ID = "affent-theme"
const themeModes: readonly ThemeMode[] = ["light", "dark"]

const themes: DesktopTheme[] = [
  oc2 as unknown as DesktopTheme,
]

interface ThemeContextValue {
  theme: DesktopTheme
  colorScheme: ColorScheme
  resolvedMode: ThemeMode
  setColorScheme: (scheme: ColorScheme) => void
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveMode(scheme: ColorScheme): ThemeMode {
  if (scheme === "system") {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark"
    }
    return "light"
  }
  return scheme
}

function isThemeMode(value: string | null): value is ThemeMode {
  return Boolean(value && (themeModes as readonly string[]).includes(value))
}

function getStorageScheme(): ColorScheme {
  try {
    if (typeof localStorage === "undefined") return "system"
    const stored = localStorage.getItem(STORAGE_COLOR_SCHEME)
    if (stored === "system") return stored
    if (isThemeMode(stored)) return stored
    return "system"
  } catch {
    return "system"
  }
}

function getStorageThemeId(): string {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_THEME_ID)
      if (stored) return stored
    }
  } catch {}
  return themes[0]?.id ?? "oc-2"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getStorageScheme)
  const [themeId, setThemeId] = useState(getStorageThemeId)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const resolvedMode = resolveMode(colorScheme)

  const theme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? themes[0]!,
    [themeId],
  )

  const updateStyle = useCallback(() => {
    const mode = resolveMode(colorScheme)
    const css = applyThemeCss(theme, mode)
    const runtimeVars = createThemeRuntimeVars(resolveThemeVariant(mode === "dark" ? theme.dark : theme.light, mode === "dark"), mode)
    const runtimeCss = Object.entries(runtimeVars)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n")

    styleRef.current!.textContent = `:root {\n${css}\n}\n:root {\n${runtimeCss}\n}`
    document.documentElement.dataset.theme = mode
  }, [theme, colorScheme])

  useEffect(() => {
    let element = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
    if (!element) {
      element = document.createElement("style")
      element.id = STYLE_ELEMENT_ID
      document.head.appendChild(element)
    }
    styleRef.current = element
    updateStyle()

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!mediaQuery) return
    const handleChange = () => {
      if (colorScheme === "system") updateStyle()
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [colorScheme, updateStyle])

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme)
    try { localStorage.setItem(STORAGE_COLOR_SCHEME, scheme) } catch {}
  }, [])

  const setTheme = useCallback((id: string) => {
    setThemeId(id)
    try { localStorage.setItem(STORAGE_THEME_ID, id) } catch {}
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colorScheme, resolvedMode, setColorScheme, setTheme }),
    [theme, colorScheme, resolvedMode, setColorScheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
