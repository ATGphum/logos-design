/** Inline SVG icons shared across the agent chat surface — verbatim from the prototype. */

export const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.8V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.8a2 2 0 0 0 .5 1.3l1.5 1.7a1 1 0 0 1-.8 1.7H7.8a1 1 0 0 1-.8-1.7l1.5-1.7A2 2 0 0 0 9 10.8z" />
  </svg>
)

export const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

export const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const NewChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)

export const ConsoleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9l3 3-3 3" />
    <line x1="12" y1="15" x2="17" y2="15" />
  </svg>
)

export const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const SidebarFoldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round">
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
  </svg>
)

export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5" />
    <line x1="12" y1="11" x2="12" y2="16.5" />
    <line x1="12" y1="7.6" x2="12.01" y2="7.6" />
  </svg>
)

export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export const ChevronDown = ({ strokeWidth = 2.5 }: { strokeWidth?: number }) => (
  <svg
    className="sec-chevron"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const BackChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

/** Projects — used by V2, where projects are picked rather than unfolded. */
export const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2a1.5 1.5 0 0 1 1.2.6l1 1.4h7.6A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5z" />
  </svg>
)

/* ===== V2 nav set =====
 * The stock glyphs are Feather at stroke 2: a full-height pencil, a magnifier whose head
 * fills the box, a terminal inside a frame. They read heavy beside 15px type. These are
 * drawn to a smaller optical size inside the same 24 box, at stroke 1.5, with the frames
 * dropped — the mark itself carries the meaning.
 */
export const SearchIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <line x1="15.4" y1="15.4" x2="20" y2="20" />
  </svg>
)

export const NewChatIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

/* no frame — a prompt and a caret is the whole idea */
export const ConsoleIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 7.5 10 12l-5 4.5" />
    <line x1="12.5" y1="17" x2="19" y2="17" />
  </svg>
)

/* projects are collections, so a stack rather than a folder */
export const ProjectsIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4.5" width="16" height="10" rx="2.2" />
    <path d="M6.6 17.6h10.8" />
    <path d="M8.8 20.4h6.4" />
  </svg>
)

export const UserIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.6" r="3.4" />
    <path d="M5.4 19.5a6.6 6.6 0 0 1 13.2 0" />
  </svg>
)

/* Composer glyphs. The stock mic runs its paths to y=1 and y=23 inside a 24 box, so at
 * 17px it touches both edges and the base clips; it also has no round caps, which is why
 * it reads as broken rather than drawn. This one is inset and capped. */
export const MicIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9.2" y="3" width="5.6" height="10.4" rx="2.8" />
    <path d="M6 11.4v1a6 6 0 0 0 12 0v-1" />
    <line x1="12" y1="19.4" x2="12" y2="21.4" />
  </svg>
)

/** The model marker, drawn rather than the character ✦ set as text. */
export const SparkIconV2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.5c0 4.1 3.4 7.5 7.5 7.5-4.1 0-7.5 3.4-7.5 7.5 0-4.1-3.4-7.5-7.5-7.5 4.1 0 7.5-3.4 7.5-7.5z" />
  </svg>
)
