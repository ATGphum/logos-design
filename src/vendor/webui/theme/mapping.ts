import { resolveThemeVariant, themeToCss } from "./resolve"
import type { DesktopTheme, ResolvedTheme, ThemeMode } from "./types"

export function themeModeIsDarkSurface(themeMode: ThemeMode): boolean {
  return themeMode === "dark"
}

export function getThemeCodeEditorTheme(themeMode: ThemeMode): "light" | "vs-dark" {
  return themeModeIsDarkSurface(themeMode) ? "vs-dark" : "light"
}

export function applyThemeCss(theme: DesktopTheme, themeMode: ThemeMode): string {
  const isDark = themeModeIsDarkSurface(themeMode)
  const tokens = resolveThemeVariant(isDark ? theme.dark : theme.light, isDark)
  return themeToCss(tokens)
}

interface ThemeCompatPalette {
  bg: string
  bgSubtle: string
  surface: string
  raised: string
  panelSoft: string
  composer: string
  overlaySurface: string
  userBubble: string
  text: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  textInverse: string
  borderSubtle: string
  border: string
  borderStrong: string
  accent: string
  accentHover: string
  accentActive: string
  accentMuted: string
  accentContrast: string
  danger: string
  dangerHover: string
  dangerMuted: string
  dangerFg: string
  warning: string
  warningMuted: string
  warningFg: string
  success: string
  successMuted: string
  successFg: string
  info: string
  infoMuted: string
  infoBorder: string
  focusRing: string
  selection: string
  overlay: string
  imageBackdrop: string
  imageControlBg: string
  imageControlHover: string
  imageControlBorder: string
  imageControlText: string
  imageCanvas: string
  shadowXs: string
  shadowSm: string
  shadowMd: string
  shadowLg: string
  accentShadow: string
  codeBg: string
  codeBorder: string
  codeKeyword: string
  codeString: string
  codeFunction: string
  codeNumber: string
  codeType: string
  codeAdded: string
  codeDeleted: string
  chartInput: string
  chartOutput: string
  chartTool: string
  chartContext: string
  chartRetrieval: string
  chartMemory: string
  chartCost: string
  chartNeutral: string
  chartGradientStop: string
  chartSegmentText: string
  previewSwatch: string
}

const themePalettes: Record<ThemeMode, ThemeCompatPalette> = {
  light: {
    bg: "#fafaf8",
    bgSubtle: "#f4f4f1",
    surface: "#ffffff",
    raised: "#ffffff",
    panelSoft: "#f1f1ee",
    composer: "#ffffff",
    overlaySurface: "#ffffff",
    userBubble: "#f3eee3",
    text: "#171717",
    textSecondary: "#525252",
    textTertiary: "#737373",
    textDisabled: "#a3a3a3",
    textInverse: "#ffffff",
    borderSubtle: "rgba(0, 0, 0, 0.06)",
    border: "rgba(0, 0, 0, 0.09)",
    borderStrong: "rgba(0, 0, 0, 0.18)",
    accent: "#171717",
    accentHover: "#000000",
    accentActive: "#000000",
    accentMuted: "rgba(23, 23, 23, 0.08)",
    accentContrast: "#ffffff",
    danger: "#c93434",
    dangerHover: "#a82727",
    dangerMuted: "#ffe6e6",
    dangerFg: "#8b1d1d",
    warning: "#171717",
    warningMuted: "rgba(23, 23, 23, 0.08)",
    warningFg: "#171717",
    success: "#168a4a",
    successMuted: "#e6f8ed",
    successFg: "#0f5a35",
    info: "#2563eb",
    infoMuted: "#eaf2ff",
    infoBorder: "#8ab0ff",
    focusRing: "rgba(23, 23, 23, 0.28)",
    selection: "rgba(23, 23, 23, 0.14)",
    overlay: "rgba(15, 23, 42, 0.18)",
    imageBackdrop: "rgba(5, 5, 5, 0.88)",
    imageControlBg: "rgba(5, 5, 5, 0.46)",
    imageControlHover: "rgba(255, 255, 255, 0.16)",
    imageControlBorder: "rgba(255, 255, 255, 0.26)",
    imageControlText: "#ffffff",
    imageCanvas: "#ffffff",
    shadowXs: "0 1px 2px rgba(15, 23, 42, 0.05)",
    shadowSm: "0 8px 24px rgba(26, 26, 26, 0.06)",
    shadowMd: "0 16px 40px rgba(26, 26, 26, 0.08)",
    shadowLg: "0 24px 64px rgba(15, 23, 42, 0.14)",
    accentShadow: "0 10px 24px rgba(23, 23, 23, 0.12)",
    codeBg: "#fafaf8",
    codeBorder: "#ece7dc",
    codeKeyword: "#171717",
    codeString: "#18794e",
    codeFunction: "#2563eb",
    codeNumber: "#c2410c",
    codeType: "#0f766e",
    codeAdded: "#168a4a",
    codeDeleted: "#c93434",
    chartInput: "#45d7e8",
    chartOutput: "#f25097",
    chartTool: "#4f7cff",
    chartContext: "#3dd68c",
    chartRetrieval: "#ffb038",
    chartMemory: "#8b5cf6",
    chartCost: "#ff9e2c",
    chartNeutral: "#8893a5",
    chartGradientStop: "#0b1020",
    chartSegmentText: "#0b1020",
    previewSwatch: "#171717",
  },
  dark: {
    bg: "#0b0b0a",
    bgSubtle: "#040404",
    surface: "#121211",
    raised: "#1a1a18",
    panelSoft: "#1e1e1c",
    composer: "#4c4944",
    overlaySurface: "#1a1a18",
    userBubble: "#26231e",
    text: "#f2f1ed",
    textSecondary: "#c9c5bd",
    textTertiary: "#9d9991",
    textDisabled: "#6d6962",
    textInverse: "#11100f",
    borderSubtle: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.1)",
    borderStrong: "rgba(255, 255, 255, 0.2)",
    accent: "#f2f1ed",
    accentHover: "#ffffff",
    accentActive: "#dedbd3",
    accentMuted: "rgba(242, 241, 237, 0.12)",
    accentContrast: "#11100f",
    danger: "#ff7a66",
    dangerHover: "#ff9888",
    dangerMuted: "#351a16",
    dangerFg: "#ffb6aa",
    warning: "#f2f1ed",
    warningMuted: "rgba(242, 241, 237, 0.12)",
    warningFg: "#f2f1ed",
    success: "#65d58b",
    successMuted: "#162d1e",
    successFg: "#91efad",
    info: "#9bbcff",
    infoMuted: "#1b2740",
    infoBorder: "#465d87",
    focusRing: "rgba(242, 241, 237, 0.34)",
    selection: "rgba(242, 241, 237, 0.18)",
    overlay: "rgba(0, 0, 0, 0.42)",
    imageBackdrop: "rgba(0, 0, 0, 0.88)",
    imageControlBg: "rgba(0, 0, 0, 0.5)",
    imageControlHover: "rgba(255, 255, 255, 0.16)",
    imageControlBorder: "rgba(255, 255, 255, 0.28)",
    imageControlText: "#ffffff",
    imageCanvas: "#ffffff",
    shadowXs: "0 1px 2px rgba(0, 0, 0, 0.24)",
    shadowSm: "0 8px 24px rgba(0, 0, 0, 0.22)",
    shadowMd: "0 16px 40px rgba(0, 0, 0, 0.3)",
    shadowLg: "0 28px 76px rgba(0, 0, 0, 0.42)",
    accentShadow: "0 10px 24px rgba(242, 241, 237, 0.14)",
    codeBg: "#171716",
    codeBorder: "#302f2d",
    codeKeyword: "#f2f1ed",
    codeString: "#6ee7b7",
    codeFunction: "#7fb2ff",
    codeNumber: "#fdba74",
    codeType: "#7dd3c7",
    codeAdded: "#60d59b",
    codeDeleted: "#ff8b8b",
    chartInput: "#67e8f9",
    chartOutput: "#ff75b5",
    chartTool: "#8ab7ff",
    chartContext: "#6ee7b7",
    chartRetrieval: "#f2f1ed",
    chartMemory: "#b59cff",
    chartCost: "#ffb86b",
    chartNeutral: "#aeb8c7",
    chartGradientStop: "#050505",
    chartSegmentText: "#0f0f0e",
    previewSwatch: "#f2f1ed",
  },
}


export function getThemePreviewSwatches(themeMode: ThemeMode): readonly [string, string, string] {
  const p = themePalettes[themeMode]
  return [p.bg, p.surface, p.previewSwatch]
}

export function getThemeTerminalFallbacks(themeMode: ThemeMode) {
  const p = themePalettes[themeMode]
  return {
    text: p.text,
    muted: p.textSecondary,
    background: p.surface,
    surface: p.panelSoft,
    primary: p.accent,
    success: p.success,
    warning: p.warning,
    error: p.danger,
    selection: p.selection,
  } as const
}

export function getThemeFeedbackSnapshotColors(themeMode: ThemeMode) {
  const p = themePalettes[themeMode]
  return {
    background: p.bg,
    panel: p.raised,
    border: p.borderStrong,
    title: p.text,
    heading: p.textSecondary,
    body: p.textTertiary,
    footer: p.textDisabled,
  } as const
}

const spacingTokens = {
  "space-0": "0px",
  "space-2": "2px",
  "space-4": "4px",
  "space-6": "6px",
  "space-8": "8px",
  "space-12": "12px",
  "space-16": "16px",
  "space-20": "20px",
  "space-24": "24px",
  "space-32": "32px",
  "space-40": "40px",
  "space-48": "48px",
  "space-64": "64px",
  "space-80": "80px",
  "space-96": "96px",
}

const structureTokens = {
  "radius-xs": "6px",
  "radius-sm": "8px",
  "radius-md": "12px",
  "radius-lg": "16px",
  "radius-xl": "24px",
  "radius-full": "999px",
  "font-size-display": "32px",
  "line-height-display": "40px",
  "font-size-title": "24px",
  "line-height-title": "32px",
  "font-size-subtitle": "20px",
  "line-height-subtitle": "28px",
  "font-size-body": "14px",
  "line-height-body": "22px",
  "font-size-caption": "12px",
  "line-height-caption": "16px",
  "font-size-label": "13px",
  "line-height-label": "18px",
  "duration-none": "0s",
  "duration-xs": "120ms",
  "duration-sm": "180ms",
  "duration-md": "240ms",
  "duration-lg": "320ms",
  "duration-xl": "420ms",
  "ease-out": "cubic-bezier(0.22, 1, 0.36, 1)",
  "ease-in": "cubic-bezier(0.64, 0, 0.78, 0)",
  "ease-layout": "cubic-bezier(0.65, 0, 0.35, 1)",
  "ease-linear": "linear",
  "z-index-base": "0",
  "z-index-dropdown": "100",
  "z-index-sticky": "200",
  "z-index-overlay": "300",
  "z-index-modal": "400",
  "z-index-toast": "500",
  "z-index-command": "600",
  "z-index-tooltip": "700",
}

export function createThemeRuntimeVars(_tokens: ResolvedTheme, themeMode: ThemeMode): Record<string, string> {
  const p = themePalettes[themeMode]

  return {
    "color-bg-page": p.bg,
    "color-bg-subtle": p.bgSubtle,
    "color-surface-default": p.surface,
    "color-surface-raised": p.raised,
    "color-surface-subtle": p.panelSoft,
    "color-surface-overlay": p.overlaySurface,
    "color-composer": p.composer,
    "color-message-user-bg": p.userBubble,
    "color-text-primary": p.text,
    "color-text-secondary": p.textSecondary,
    "color-text-tertiary": p.textTertiary,
    "color-text-disabled": p.textDisabled,
    "color-text-inverse": p.textInverse,
    "color-border-subtle": p.borderSubtle,
    "color-border-default": p.border,
    "color-border-strong": p.borderStrong,
    "color-accent": p.accent,
    "color-accent-hover": p.accentHover,
    "color-accent-active": p.accentActive,
    "color-accent-muted": p.accentMuted,
    "color-accent-contrast": p.accentContrast,
    "color-danger": p.danger,
    "color-danger-hover": p.dangerHover,
    "color-danger-muted": p.dangerMuted,
    "color-warning": p.warning,
    "color-warning-muted": p.warningMuted,
    "color-success": p.success,
    "color-success-muted": p.successMuted,
    "color-info": p.info,
    "color-info-muted": p.infoMuted,
    "color-info-border": p.infoBorder,
    "color-focus-ring": p.focusRing,
    "color-selection": p.selection,
    "color-overlay": p.overlay,
    "color-image-backdrop": p.imageBackdrop,
    "color-image-control-bg": p.imageControlBg,
    "color-image-control-hover": p.imageControlHover,
    "color-image-control-border": p.imageControlBorder,
    "color-image-control-text": p.imageControlText,
    "color-image-canvas": p.imageCanvas,
    "color-code-bg": p.codeBg,
    "color-code-border": p.codeBorder,
    "color-code-keyword": p.codeKeyword,
    "color-code-string": p.codeString,
    "color-code-function": p.codeFunction,
    "color-code-number": p.codeNumber,
    "color-code-type": p.codeType,
    "color-code-added": p.codeAdded,
    "color-code-deleted": p.codeDeleted,
    "color-chart-input": p.chartInput,
    "color-chart-output": p.chartOutput,
    "color-chart-tool": p.chartTool,
    "color-chart-context": p.chartContext,
    "color-chart-retrieval": p.chartRetrieval,
    "color-chart-memory": p.chartMemory,
    "color-chart-cost": p.chartCost,
    "color-chart-neutral": p.chartNeutral,
    "color-chart-gradient-stop": p.chartGradientStop,
    "color-chart-segment-text": p.chartSegmentText,
    "shadow-xs": p.shadowXs,
    "shadow-sm": p.shadowSm,
    "shadow-md": p.shadowMd,
    "shadow-lg": p.shadowLg,
    "shadow-accent": p.accentShadow,
    ...spacingTokens,
    ...structureTokens,

    "app-font-sans":
      "\"MiSans\", ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    "app-font-mono":
      "\"JetBrains Mono\", \"SFMono-Regular\", ui-monospace, Menlo, Consolas, monospace",
    "app-bg": "var(--color-bg-page)",
    "app-bg-muted": "var(--color-bg-subtle)",
    "app-surface": "var(--color-surface-default)",
    "app-surface-strong": "var(--color-surface-raised)",
    "app-border": "var(--color-border-default)",
    "app-border-strong": "var(--color-border-strong)",
    "app-fg": "var(--color-text-primary)",
    "app-fg-muted": "var(--color-text-secondary)",
    "app-fg-subtle": "var(--color-text-tertiary)",
    "app-accent": "var(--color-accent)",
    "app-accent-soft": "var(--color-accent-muted)",
    "app-danger": "var(--color-danger)",
    "app-danger-fg": p.dangerFg,
    "app-danger-surface": "var(--color-danger-muted)",
    "app-danger-border": "var(--color-danger)",
    "app-warning": "var(--color-warning)",
    "app-warning-fg": p.warningFg,
    "app-warning-surface": "var(--color-warning-muted)",
    "app-warning-border": "var(--color-warning)",
    "app-success": "var(--color-success)",
    "app-success-fg": p.successFg,
    "app-success-surface": "var(--color-success-muted)",
    "app-success-border": "var(--color-success)",
    "app-shadow-soft": "var(--shadow-sm)",
    "app-shadow-strong": "var(--shadow-md)",
    "app-radius-sm": "var(--radius-sm)",
    "app-radius-md": "var(--radius-md)",
    "app-radius-lg": "var(--radius-lg)",
    "app-viewport-height": "100vh",
    "app-topbar-height": "var(--space-0)",
    "composer-clearance": "clamp(var(--space-20), 3.5vh, var(--space-40))",
    "scroll-safe-top": "clamp(calc(var(--space-96) + var(--space-80)), 28vh, calc((var(--space-96) * 2) + var(--space-64) + var(--space-4)))",
  }
}
