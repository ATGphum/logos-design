/** The landing page has different filenames in source, hosted, and single-file demos. */
export function getLandingPageHref(): string {
  if (import.meta.env.DEV) return "/marketing/llm-interface.html"
  if (import.meta.env.MODE === "single") return "./marketing-preview.html"
  return `${import.meta.env.BASE_URL}marketing.html`
}
