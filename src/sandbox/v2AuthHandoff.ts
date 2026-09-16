const V2_AUTH_HANDOFF_KEY = "logos-design:v2-auth-handoff"

/** Carry the sandbox's simulated OAuth success across the landing-page boundary. */
export function markV2AuthHandoff() {
  try {
    window.sessionStorage.setItem(V2_AUTH_HANDOFF_KEY, "1")
  } catch {
    // Navigation should still work when storage is unavailable.
  }
}

/** Read once so opening V2 directly still shows its own login gate. */
export function consumeV2AuthHandoff(): boolean {
  try {
    const authenticated = window.sessionStorage.getItem(V2_AUTH_HANDOFF_KEY) === "1"
    window.sessionStorage.removeItem(V2_AUTH_HANDOFF_KEY)
    return authenticated
  } catch {
    return false
  }
}
