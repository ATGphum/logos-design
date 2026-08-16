/**
 * DESIGN SHIM — stand-in for the `qrcode` package. Renders a deterministic
 * placeholder QR-looking SVG as a data URI so the manual-transfer panel keeps
 * its production layout without the dependency.
 */
export type QRCodeToDataURLOptions = Readonly<{
  errorCorrectionLevel?: string
  margin?: number
  width?: number
  color?: Readonly<{ dark?: string; light?: string }>
}>

function pseudoRandom(seed: number) {
  let state = seed || 1
  return () => {
    state = (state * 48271) % 2147483647
    return state / 2147483647
  }
}

async function toDataURL(text: string, options: QRCodeToDataURLOptions = {}): Promise<string> {
  const size = 25
  const cell = 8
  const width = options.width ?? size * cell
  const dark = options.color?.dark ?? '#000000'
  const light = options.color?.light ?? '#ffffff'
  let seed = 0
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647
  const random = pseudoRandom(seed)
  const cells: string[] = []
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7" fill="${dark}"/>` +
    `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="${light}"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${dark}"/>`
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinder = (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8)
      if (!inFinder && random() > 0.5) cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${dark}"/>`)
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${width}" height="${width}">` +
    `<rect width="${size}" height="${size}" fill="${light}"/>` +
    cells.join('') + finder(0, 0) + finder(size - 7, 0) + finder(0, size - 7) +
    '</svg>'
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export default { toDataURL }
