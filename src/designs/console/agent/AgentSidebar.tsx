/**
 * Agent chat sidebar — logo, nav, pinned / projects / recent chats, footer.
 * Ported from marketing/llm-interface.html lines 4212-4410 plus the sidebar
 * behaviors in the chat script (pin/delete, section fold, resize, flash).
 */
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import ensoWhite from "../assets/enso.svg"
import ensoInk from "../assets/enso-ink.svg"
import type { ChatItem, Project } from "../state"
import { ChevronDown, ConsoleIcon, GearIcon, NewChatIcon, PinIcon, PlusIcon, SearchIcon, SidebarFoldIcon, TrashIcon } from "./icons"

export interface AgentSidebarProps {
  light: boolean
  chats: ChatItem[]
  projects: Project[]
  activeChatId: string | null
  newChatActive: boolean
  isMobile: boolean
  onSelectChat: (id: string, title: string) => void
  onTogglePin: (id: string) => void
  onDeleteChat: (id: string) => void
  onDeleteProject: (id: string) => void
  onNewChat: () => void
  onOpenSearch: () => void
  onOpenConsole: () => void
  onOpenSettings: () => void
  onToggleSidebar: () => void
}

/** expand/collapse arrows swapped by toggleProjectSubs() — verbatim path data */
const CollapseArrows = () => (
  <svg className="expand-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)
const ExpandArrows = () => (
  <svg className="expand-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

function ChatRow({
  chat,
  active,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  chat: ChatItem
  active: boolean
  onSelect: () => void
  onTogglePin: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={"section-item" + (active ? " active" : "")}
      data-pinned={chat.pinned ? "1" : "0"}
      data-status={chat.status}
      onClick={onSelect}
    >
      <span className="item-main">
        <span className="item-title">{chat.title}</span>
      </span>
      <span className="item-right">
        <span className="item-status"></span>
        <span className="chat-actions">
          {/* completed chats get a dark-green dot (revealed with the hover actions) */}
          {chat.status === "completed" ? <span className="chat-dot-done" title="Completed"></span> : null}
          <button
            className="chat-action pin"
            title={chat.pinned ? "Unpin" : "Pin"}
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin()
            }}
          >
            <PinIcon />
          </button>
          <button
            className="chat-action trash"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <TrashIcon />
          </button>
        </span>
      </span>
    </div>
  )
}

/** toggleSection(): fold a chat-list section with the prototype's max-height animation */
function useSectionFold() {
  const listRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const toggle = () => {
    const list = listRef.current
    if (!list) return
    const isCollapsed = list.classList.contains("section-collapsed")
    setCollapsed(!isCollapsed)
    if (isCollapsed) {
      list.classList.remove("section-collapsed")
      list.style.maxHeight = list.scrollHeight + "px"
      const done = (e: TransitionEvent) => {
        if (e.propertyName !== "max-height") return
        list.style.maxHeight = "none"
        list.removeEventListener("transitionend", done)
      }
      list.addEventListener("transitionend", done)
    } else {
      list.style.maxHeight = list.scrollHeight + "px"
      void list.offsetHeight
      requestAnimationFrame(() => {
        list.classList.add("section-collapsed")
        list.style.maxHeight = "0px"
      })
    }
  }
  return { listRef, collapsed, toggle }
}

export function AgentSidebar(props: AgentSidebarProps) {
  const {
    light,
    chats,
    projects,
    activeChatId,
    newChatActive,
    isMobile,
    onSelectChat,
    onTogglePin,
    onDeleteChat,
    onDeleteProject,
    onNewChat,
    onOpenSearch,
    onOpenConsole,
    onOpenSettings,
    onToggleSidebar,
  } = props

  const sidebarRef = useRef<HTMLElement>(null)
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({})
  const [subsOpen, setSubsOpen] = useState(false)
  const projectsFold = useSectionFold()
  const recentFold = useSectionFold()

  const pinned = chats.filter((c) => c.pinned)
  const recent = chats.filter((c) => !c.pinned)

  /* slick click feedback on sidebar chats + functions (prototype flash handler) */
  const flash = (e: ReactMouseEvent) => {
    const target = e.target as HTMLElement
    const el = target.closest<HTMLElement>(".section-item, .nav-btn")
    if (!el || !sidebarRef.current?.contains(el)) return
    el.classList.remove("flash")
    void el.offsetWidth
    el.classList.add("flash")
    el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true })
  }

  /* drag-to-resize the sidebar from its right edge */
  const resizerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sb = sidebarRef.current
    const rz = resizerRef.current
    if (!sb || !rz) return
    let resizing = false
    const down = (e: MouseEvent) => {
      e.preventDefault()
      resizing = true
      sb.classList.add("no-trans")
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    }
    const move = (e: MouseEvent) => {
      if (!resizing) return
      let w = e.clientX - sb.getBoundingClientRect().left
      w = Math.max(168, Math.min(380, w))
      sb.style.setProperty("--sidebar-width", w + "px")
    }
    const up = () => {
      if (!resizing) return
      resizing = false
      sb.classList.remove("no-trans")
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    rz.addEventListener("mousedown", down)
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
    return () => {
      rz.removeEventListener("mousedown", down)
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
  }, [])

  return (
    <aside className="sidebar" ref={sidebarRef} onClick={flash}>
      <div className="sidebar-logo">
        {/* Logo icon: enso mark, swapped to ink in light mode (prototype ensoURI) */}
        <img className="logo-img" alt="LOGOS" src={light ? ensoInk : ensoWhite} />
        <span className="logo-word">LOGOS</span>
        <button className="sidebar-fold" onClick={onToggleSidebar} title="Collapse sidebar">
          <span className="fold-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </span>
          <SidebarFoldIcon />
        </button>
      </div>
      <div className="sidebar-resizer" id="sidebar-resizer" title="Drag to resize" ref={resizerRef}></div>

      <nav className="sidebar-nav">
        <button className="nav-btn" onClick={onOpenSearch}>
          <SearchIcon />
          Search
        </button>
        <button className={"nav-btn" + (newChatActive ? " active" : "")} id="new-chat-btn" onClick={onNewChat}>
          <NewChatIcon />
          New chat
        </button>
        <button className="nav-btn" onClick={onOpenConsole}>
          <ConsoleIcon />
          Console
        </button>
      </nav>

      <div className="sidebar-section">
        {/* PINNED (hidden until something is pinned) */}
        <div className="section-label" id="pinned-label" style={{ display: pinned.length > 0 ? undefined : "none" }}>
          <svg className="label-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 4l6 6-3 1-2 5-2-2-4 4-1-1 4-4-2-2 5-2z" />
          </svg>
          Pinned
          <span className="label-count" id="pinned-count">
            {pinned.length || ""}
          </span>
        </div>
        <div id="pinned-list" style={{ display: pinned.length > 0 ? undefined : "none" }}>
          {pinned.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onSelect={() => onSelectChat(chat.id, chat.title)}
              onTogglePin={() => onTogglePin(chat.id)}
              onDelete={() => onDeleteChat(chat.id)}
            />
          ))}
        </div>

        {/* PROJECTS */}
        <div
          className={"section-label sec-toggle" + (projectsFold.collapsed ? " collapsed" : "")}
          style={{ marginTop: 2 }}
          onClick={projectsFold.toggle}
        >
          <span className="label-text">Projects</span>
          <ChevronDown />
          <span className="label-actions">
            <button
              className="label-action"
              title={subsOpen ? "Collapse projects" : "Expand projects"}
              onClick={(e) => {
                e.stopPropagation()
                setSubsOpen((v) => !v)
              }}
            >
              {subsOpen ? <ExpandArrows /> : <CollapseArrows />}
            </button>
            <button className="label-action" onClick={(e) => e.stopPropagation()} title="New project">
              <PlusIcon />
            </button>
          </span>
        </div>
        <div id="projects-list" className={subsOpen ? "subs-open" : undefined} ref={projectsFold.listRef}>
          {projects.map((proj) => (
            <div key={proj.id} className={"project" + (openProjects[proj.id] ? " open" : "")}>
              <div className="section-item" data-pinned="0" onClick={() => onSelectChat(proj.id, proj.chatKey)}>
                <span className="item-main">
                  <span
                    className="proj-caret-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenProjects((m) => ({ ...m, [proj.id]: !m[proj.id] }))
                    }}
                  >
                    <svg className="proj-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </span>
                  <span className="item-title">{proj.title}</span>
                </span>
                {/* hover actions for project folders (＋ then 🗑) */}
                <span className="chat-actions">
                  <button className="chat-action add" onClick={(e) => e.stopPropagation()} title="New chat in project">
                    <PlusIcon />
                  </button>
                  <button
                    className="chat-action trash"
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteProject(proj.id)
                    }}
                  >
                    <TrashIcon />
                  </button>
                </span>
              </div>
              <div className="project-sub">
                {proj.subs.map((sub) => (
                  <div key={sub.key} className="section-item subchat" onClick={() => onSelectChat(proj.id + sub.key, sub.key)}>
                    <span className="item-main">
                      <span className="item-title">{sub.title}</span>
                    </span>
                    <span className="chat-actions">
                      <button className="chat-action trash" onClick={(e) => e.stopPropagation()} title="Delete chat">
                        <TrashIcon />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RECENT CHATS */}
        <div
          className={"section-label sec-toggle" + (recentFold.collapsed ? " collapsed" : "")}
          style={{ marginTop: 16 }}
          onClick={recentFold.toggle}
        >
          <span className="label-text">Recent chats</span>
          <ChevronDown />
        </div>
        <div id="recent-list" ref={recentFold.listRef}>
          {recent.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onSelect={() => onSelectChat(chat.id, chat.title)}
              onTogglePin={() => onTogglePin(chat.id)}
              onDelete={() => onDeleteChat(chat.id)}
            />
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="nav-btn" onClick={onOpenSettings}>
          <GearIcon />
          Settings
        </button>
        {/* mobile: new-chat bubble next to the settings bubble */}
        {isMobile ? (
          <button className="nav-btn mfoot-new" title="New chat" onClick={onNewChat}>
            <NewChatIcon />
          </button>
        ) : null}
      </div>
    </aside>
  )
}
