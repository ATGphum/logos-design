import type { ColorValue, DesktopTheme, HexColor, ResolvedTheme, ThemeVariant } from "./types"
import { blend, generateNeutralScale, generateScale, hexToOklch, hexToRgb, shift, withAlpha } from "./color"

export function resolveThemeVariant(variant: ThemeVariant, isDark: boolean): ResolvedTheme {
  const colors = getColors(variant)
  const { overrides = {} } = variant

  const neutral = generateNeutralScale(colors.neutral, isDark, colors.ink)
  const primary = generateScale(colors.primary, isDark)
  const success = generateScale(colors.success, isDark)
  const warning = generateScale(colors.warning, isDark)
  const error = generateScale(colors.error, isDark)
  const info = generateScale(colors.info, isDark)
  const interactive = generateScale(colors.interactive, isDark)
  const amber = generateScale(shift(colors.warning, isDark ? { h: -16, l: -0.058, c: 1.14 } : { h: -22, l: -0.082, c: 0.94 }), isDark)
  const diffAdd = generateScale(colors.diffAdd ?? shift(colors.success, { c: isDark ? 0.7 : 0.55, l: isDark ? -0.18 : 0.14 }), isDark)
  const diffDelete = generateScale(colors.diffDelete ?? shift(colors.error, { c: isDark ? 0.82 : 0.7, l: isDark ? -0.08 : 0.08 }), isDark)

  const ink = colors.ink ?? colors.neutral
  const tint = colors.compact ? hexToOklch(ink) : undefined
  const body = tint
    ? shift(ink, { l: isDark ? Math.max(0, 0.88 - tint.l) * 0.4 : -Math.max(0, tint.l - 0.18) * 0.24, c: isDark ? 1.04 : 1.02 })
    : undefined

  const backgroundOverride = overrides["background-base"]
  const backgroundHex = getHex(backgroundOverride)
  const overlay = Boolean(backgroundOverride) && !backgroundHex

  const background = backgroundHex ?? neutral[0]
  const alphaTone = (color: HexColor, alpha: number) =>
    overlay ? (withAlpha(color, alpha) as ColorValue) : blend(color, background, alpha)
  const borderTone = (light: number, dark: number) =>
    alphaTone(ink, isDark ? Math.min(1, dark + 0.024 + (colors.compact ? 0.08 : 0)) : Math.min(1, light + 0.024))

  const neutralAlpha = generateNeutralAlphaScale(neutral, isDark)
  const brandb = primary[8]
  const brandh = primary[9]
  const interb = interactive[isDark ? 6 : 4]
  const interh = interactive[isDark ? 7 : 5]
  const interw = interactive[isDark ? 5 : 3]
  const succb = success[isDark ? 6 : 4]
  const succs = success[10]
  const warnb = warning[isDark ? 6 : 4]
  const warns = warning[10]
  const critb = error[isDark ? 6 : 4]
  const crits = error[10]
  const infob = info[isDark ? 6 : 4]
  const infos = info[10]
  const lum = (hex: HexColor) => {
    const rgb = hexToRgb(hex)
    const lift = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
    return 0.2126 * lift(rgb.r) + 0.7152 * lift(rgb.g) + 0.0722 * lift(rgb.b)
  }
  const hit = (a: HexColor, b: HexColor) => {
    const x = lum(a), y = lum(b)
    const light = Math.max(x, y), darkL = Math.min(x, y)
    return (light + 0.05) / (darkL + 0.05)
  }
  const on = (fill: HexColor) => {
    const light = "#ffffff" as HexColor, dark = "#000000" as HexColor
    return hit(light, fill) > hit(dark, fill) ? light : dark
  }

  const tokens: ResolvedTheme = {}

  tokens["background-base"] = neutral[0]
  tokens["background-weak"] = neutral[2]
  tokens["background-strong"] = neutral[0]
  tokens["background-stronger"] = isDark ? neutral[1] : "#fcfcfc"

  tokens["surface-base"] = neutralAlpha[1]
  tokens["surface-base-hover"] = neutralAlpha[2]
  tokens["surface-base-active"] = neutralAlpha[2]
  tokens["surface-raised-base"] = neutralAlpha[0]
  tokens["surface-float-base"] = isDark ? neutral[1] : neutral[11]
  tokens["surface-raised-base-hover"] = neutralAlpha[1]
  tokens["surface-raised-base-active"] = neutralAlpha[2]
  tokens["surface-raised-strong"] = isDark ? neutralAlpha[3] : neutral[0]
  tokens["surface-raised-strong-hover"] = isDark ? neutralAlpha[5] : "#ffffff"
  tokens["surface-raised-stronger"] = isDark ? neutralAlpha[5] : "#ffffff"
  tokens["surface-raised-stronger-hover"] = isDark ? neutralAlpha[6] : "#ffffff"
  tokens["surface-weak"] = neutralAlpha[2]
  tokens["surface-weaker"] = neutralAlpha[3]
  tokens["surface-strong"] = isDark ? neutralAlpha[6] : "#ffffff"

  tokens["surface-brand-base"] = brandb
  tokens["surface-brand-hover"] = brandh
  tokens["surface-interactive-base"] = interb
  tokens["surface-interactive-hover"] = interh
  tokens["surface-interactive-weak"] = interw
  tokens["surface-success-base"] = succb
  tokens["surface-success-strong"] = succs
  tokens["surface-warning-base"] = warnb
  tokens["surface-warning-strong"] = warns
  tokens["surface-critical-base"] = critb
  tokens["surface-critical-strong"] = crits
  tokens["surface-info-base"] = infob
  tokens["surface-info-strong"] = infos

  tokens["text-base"] = colors.compact ? (body as HexColor) : neutral[10]
  tokens["text-weak"] = colors.compact ? shift(body as HexColor, { l: isDark ? -0.11 : 0.11, c: 0.9 }) : neutral[8]
  tokens["text-weaker"] = colors.compact ? shift(body as HexColor, { l: isDark ? -0.2 : 0.21, c: isDark ? 0.78 : 0.72 }) : neutral[7]
  tokens["text-strong"] = colors.compact ? (isDark ? blend("#ffffff", body as HexColor, 0.9) : shift(body as HexColor, { l: -0.07, c: 1.04 })) : neutral[11]
  tokens["text-interactive-base"] = interactive[isDark ? 10 : 9]
  tokens["text-on-brand-base"] = on(brandb)
  tokens["text-on-interactive-base"] = on(interb)
  tokens["text-on-success-base"] = on(succb)
  tokens["text-on-success-weak"] = on(succb)
  tokens["text-on-success-strong"] = on(succs)
  tokens["text-on-critical-base"] = on(critb)
  tokens["text-on-critical-weak"] = on(critb)
  tokens["text-on-critical-strong"] = on(crits)
  tokens["text-on-warning-base"] = on(warnb)
  tokens["text-on-warning-weak"] = on(warnb)
  tokens["text-on-warning-strong"] = on(warns)
  tokens["text-on-info-base"] = on(infob)
  tokens["text-on-info-weak"] = on(infob)
  tokens["text-on-info-strong"] = on(infos)
  tokens["text-on-brand-weak"] = on(brandb)
  tokens["text-on-brand-weaker"] = on(brandb)
  tokens["text-on-brand-strong"] = on(brandh)

  tokens["button-primary-base"] = neutral[11]
  tokens["button-secondary-base"] = isDark ? neutral[2] : neutral[0]
  tokens["button-secondary-hover"] = isDark ? neutral[3] : neutral[1]
  tokens["button-ghost-hover"] = neutralAlpha[1]
  tokens["button-ghost-hover2"] = neutralAlpha[2]

  tokens["border-base"] = colors.compact ? borderTone(0.22, 0.16) : neutralAlpha[6]
  tokens["border-hover"] = colors.compact ? borderTone(0.28, 0.2) : neutralAlpha[7]
  tokens["border-weak-base"] = colors.compact ? borderTone(0.1, 0.08) : neutralAlpha[isDark ? 5 : 4]
  tokens["border-weaker-base"] = colors.compact ? borderTone(0.06, 0.04) : neutralAlpha[2]
  tokens["border-strong-base"] = colors.compact ? borderTone(0.34, 0.24) : neutralAlpha[isDark ? 7 : 6]
  tokens["border-interactive-base"] = interactive[6]
  tokens["border-success-base"] = success[isDark ? 6 : 6]
  tokens["border-success-selected"] = success[8]
  tokens["border-warning-base"] = warning[isDark ? 6 : 6]
  tokens["border-warning-selected"] = warning[8]
  tokens["border-critical-base"] = error[isDark ? 6 : 6]
  tokens["border-critical-selected"] = error[8]
  tokens["border-info-base"] = info[isDark ? 6 : 6]
  tokens["border-info-selected"] = info[8]

  tokens["icon-base"] = colors.compact && !isDark ? tokens["text-weak"] : neutral[isDark ? 9 : 8]
  tokens["icon-weak-base"] = neutral[isDark ? 5 : 6]
  tokens["icon-strong-base"] = neutral[11]
  tokens["icon-success-base"] = success[isDark ? 8 : 6]
  tokens["icon-warning-base"] = amber[isDark ? 8 : 6]
  tokens["icon-critical-base"] = error[isDark ? 8 : 9]
  tokens["icon-diff-add-base"] = diffAdd[10]
  tokens["icon-diff-delete-base"] = diffDelete[9]

  tokens["syntax-comment"] = colors.compact ? "var(--text-weak)" : (isDark ? "#8f8f8f" : "#7a7a7a")
  tokens["syntax-string"] = isDark ? "#00ceb9" : "#006656"
  tokens["syntax-keyword"] = isDark ? "#edb2f1" : "#a753ae"
  tokens["syntax-primitive"] = isDark ? "#ffba92" : "#fb4804"
  tokens["syntax-property"] = isDark ? "#ff9ae2" : "#ed6dc8"
  tokens["syntax-type"] = isDark ? "#ecf58c" : "#596600"
  tokens["syntax-constant"] = isDark ? "#93e9f6" : "#007b80"
  tokens["syntax-variable"] = "var(--text-strong)"
  tokens["syntax-diff-add"] = diffAdd[10]
  tokens["syntax-diff-delete"] = diffDelete[10]

  if (!("text-stronger" in overrides)) {
    tokens["text-stronger"] = tokens["text-strong"]
  }

  for (const [key, value] of Object.entries(overrides)) {
    tokens[key] = value
  }

  return tokens
}

interface ThemeColors {
  compact: boolean
  neutral: HexColor
  ink?: HexColor
  primary: HexColor
  accent: HexColor
  success: HexColor
  warning: HexColor
  error: HexColor
  info: HexColor
  interactive: HexColor
  diffAdd?: HexColor
  diffDelete?: HexColor
}

function getColors(variant: ThemeVariant): ThemeColors {
  if (variant.palette && variant.seeds) throw new Error("Theme variant cannot define both `palette` and `seeds`")
  if (variant.palette) {
    return {
      compact: true,
      neutral: variant.palette.neutral,
      ink: variant.palette.ink,
      primary: variant.palette.primary,
      accent: variant.palette.accent ?? variant.palette.info,
      success: variant.palette.success,
      warning: variant.palette.warning,
      error: variant.palette.error,
      info: variant.palette.info,
      interactive: variant.palette.interactive ?? variant.palette.primary,
      diffAdd: variant.palette.diffAdd,
      diffDelete: variant.palette.diffDelete,
    }
  }
  if (variant.seeds) {
    return {
      compact: false,
      neutral: variant.seeds.neutral,
      ink: undefined,
      primary: variant.seeds.primary,
      accent: variant.seeds.info,
      success: variant.seeds.success,
      warning: variant.seeds.warning,
      error: variant.seeds.error,
      info: variant.seeds.info,
      interactive: variant.seeds.interactive,
      diffAdd: variant.seeds.diffAdd,
      diffDelete: variant.seeds.diffDelete,
    }
  }
  throw new Error("Theme variant requires `palette` or `seeds`")
}

function generateNeutralAlphaScale(neutralScale: HexColor[], isDark: boolean): HexColor[] {
  const alphas = isDark
    ? [0.038, 0.066, 0.1, 0.142, 0.19, 0.252, 0.334, 0.446, 0.58, 0.718, 0.854, 0.985]
    : [0.03, 0.06, 0.1, 0.145, 0.2, 0.265, 0.35, 0.47, 0.61, 0.74, 0.86, 0.97]
  return alphas.map((alpha) => blend(neutralScale[11], neutralScale[0], alpha))
}

function getHex(value: ColorValue | undefined): HexColor | undefined {
  if (!value?.startsWith("#")) return
  return value as HexColor
}

export function resolveTheme(theme: DesktopTheme): { light: ResolvedTheme; dark: ResolvedTheme } {
  return {
    light: resolveThemeVariant(theme.light, false),
    dark: resolveThemeVariant(theme.dark, true),
  }
}

export function themeToCss(tokens: ResolvedTheme): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n")
}
