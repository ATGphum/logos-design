/**
 * Agent chat surface — collapsed rail, sidebar, chat main, search overlay,
 * settings view. This is what the console's "Access agent" reveals
 * (prototype csEnter() / body.chat-reveal). Ported from
 * marketing/llm-interface.html lines 4186-4882 + chat scripts 4883-5535.
 */
import { useEffect, useRef, useState } from "react"
import ensoWhite from "../assets/enso.svg"
import ensoInk from "../assets/enso-ink.svg"
import { initialRecentChats, isMobileViewport, MODELS, PROJECTS, type ChatItem, type Project } from "../state"
import { AgentSidebar } from "./AgentSidebar"
import { ConsoleIcon, GearIcon, NewChatIcon, SearchIcon, SidebarFoldIcon } from "./icons"
import { SearchOverlay } from "./SearchOverlay"
import { SettingsView } from "./SettingsView"

interface Message {
  key: number
  role: "user" | "agent"
  text: string
}

const MoonPath = () => <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
const SunPaths = () => (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </>
)

/** friendly model name on mobile: strip date suffixes, dashes to spaces (prettyModel) */
function prettyModel(label: string): string {
  return label
    .replace(/-\d{4}-\d{2}-\d{2}.*$/, "")
    .replace(/-/g, " ")
    .replace(/^[a-zA-Z]+(?=\d)/, "")
}

export interface AgentViewProps {
  light: boolean
  onToggleLight: () => void
  onSetLight: (light: boolean) => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  /** openSettings()/openConsole() fold the chats column away on mobile */
  onCollapseSidebar: () => void
  terminalOpen: boolean
  onToggleTerminal: () => void
  watermarkOn: boolean
  onToggleWatermark: () => void
  isMobile: boolean
  onOpenConsole: () => void
  onBackHome: () => void
}

export function AgentView(props: AgentViewProps) {
  const {
    light,
    onToggleLight,
    onSetLight,
    onToggleSidebar,
    onCollapseSidebar,
    terminalOpen,
    onToggleTerminal,
    watermarkOn,
    onToggleWatermark,
    isMobile,
    onOpenConsole,
    onBackHome,
  } = props

  const [chats, setChats] = useState<ChatItem[]>(initialRecentChats)
  const [projects, setProjects] = useState<Project[]>(PROJECTS)
  const [activeChatId, setActiveChatId] = useState<string | null>("chat-0")
  const [newChatActive, setNewChatActive] = useState(false)
  const [chatTitle, setChatTitle] = useState("Bittensor TAO explained")
  const [heroGreeting, setHeroGreeting] = useState("What shall we reason through?")
  const [messages, setMessages] = useState<Message[]>([])
  const msgKey = useRef(0)
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatAreaRef = useRef<HTMLDivElement>(null)

  const [model, setModel] = useState(MODELS[0].name)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const modelBtnRef = useRef<HTMLButtonElement>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modalAddMemory, setModalAddMemory] = useState(false)
  const [modalInstallSkill, setModalInstallSkill] = useState(false)

  const emptyState = messages.length === 0

  /* Esc: modals first, then search + settings (prototype keydown handler) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (modalAddMemory || modalInstallSkill) {
        setModalAddMemory(false)
        setModalInstallSkill(false)
        return
      }
      setSearchOpen(false)
      setSettingsOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [modalAddMemory, modalInstallSkill])

  /* any document click closes the model menu */
  useEffect(() => {
    if (!modelMenuOpen) return
    const close = () => setModelMenuOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [modelMenuOpen])

  const scrollToBottom = () => {
    const area = chatAreaRef.current
    if (area) area.scrollTop = area.scrollHeight
  }

  useEffect(() => {
    if (messages.length) scrollToBottom()
  }, [messages])

  const selectChat = (id: string, title: string) => {
    setActiveChatId(id)
    setNewChatActive(false)
    setChatTitle(title)
  }

  const newChat = () => {
    setMessages([])
    setHeroGreeting("What shall we reason through?")
    setChatTitle("New chat")
    setActiveChatId(null)
    setNewChatActive(true)
  }

  const startProject = (label: string, greeting: string) => {
    newChat()
    setChatTitle(label)
    if (greeting) setHeroGreeting(greeting)
    inputRef.current?.focus()
  }

  const autoResize = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    setInput("")
    const el = inputRef.current
    if (el) el.style.height = "auto"
    msgKey.current += 2
    setMessages((m) => [...m, { key: msgKey.current - 1, role: "user", text }, { key: msgKey.current, role: "agent", text: "" }])
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  /* positionModelMenu(): own-window overlay, centered on the trigger, clamped to viewport */
  const toggleModelMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (modelMenuOpen) {
      setModelMenuOpen(false)
      return
    }
    const menu = modelMenuRef.current
    const trigger = modelBtnRef.current
    if (menu && trigger) {
      menu.style.position = "fixed"
      menu.style.zIndex = "3000"
      const tr = trigger.getBoundingClientRect()
      menu.style.left = tr.left + tr.width / 2 + "px"
      menu.style.top = "0px"
      const mr = menu.getBoundingClientRect()
      let top = tr.top + tr.height / 2 - mr.height / 2
      top = Math.max(14, Math.min(top, window.innerHeight - mr.height - 14))
      menu.style.top = top + "px"
      menu.style.transformOrigin = "50% 50%"
    }
    setModelMenuOpen(true)
  }

  /* togglePin(): the prototype appendChild's the row into its new list, so pinned
     chats stack in pin order and unpinned chats drop to the end of Recent */
  const togglePin = (id: string) =>
    setChats((cs) => {
      const chat = cs.find((c) => c.id === id)
      return chat ? [...cs.filter((c) => c.id !== id), { ...chat, pinned: !chat.pinned }] : cs
    })
  const deleteChat = (id: string) => setChats((cs) => cs.filter((c) => c.id !== id))
  const deleteProject = (id: string) => setProjects((ps) => ps.filter((p) => p.id !== id))
  const deleteSubchat = (projectId: string, key: string) =>
    setProjects((ps) => ps.map((p) => (p.id === projectId ? { ...p, subs: p.subs.filter((s) => s.key !== key) } : p)))

  const pickSearch = (title: string) => {
    setSearchOpen(false)
    setChatTitle(title)
  }

  /* openSettings(): mobile folds the chats column away first (live check, like the prototype) */
  const openSettings = () => {
    if (isMobileViewport()) onCollapseSidebar()
    setSettingsOpen(true)
  }

  const suggestionLabels = isMobile ? ["Ask LOGOS to code", "Research a topic", "Write something"] : ["Code", "Research", "Write"]

  const inputBar = (
    <div className={"input-bar-wrap" + (emptyState ? " in-hero" : "")}>
      <div className="input-bar">
        <button className="icon-btn input-plus" title="Attach">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <textarea
          id="chat-input"
          ref={inputRef}
          placeholder={isMobile ? "Ask LOGOS" : "Think out loud"}
          rows={1}
          value={input}
          onKeyDown={handleKey}
          onChange={(e) => {
            setInput(e.target.value)
            autoResize()
          }}
        ></textarea>

        <div className={"model-wrap" + (modelMenuOpen ? " mm-open" : "")}>
          <button className="model-selector" ref={modelBtnRef} onClick={toggleModelMenu} title="Select model">
            <span className="model-icon">✦</span>
            <span id="model-name">{isMobile ? prettyModel(model) : model}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div className={"model-menu" + (modelMenuOpen ? " open" : "")} id="model-menu" ref={modelMenuRef} onClick={(e) => e.stopPropagation()}>
            <div className="model-menu-head">Model</div>
            {MODELS.map((m) => (
              <div
                key={m.name}
                className={"model-item" + (model === m.name ? " selected" : "")}
                onClick={() => {
                  setModel(m.name)
                  setModelMenuOpen(false)
                }}
              >
                <div className="m-text">
                  <div className="m-name">{m.name}</div>
                  <div className="m-sum">{m.sum}</div>
                </div>
                <div className="m-right">
                  <svg className="m-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <button className="m-info" onClick={(e) => e.stopPropagation()} title="Details">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9.5" />
                      <line x1="12" y1="11" x2="12" y2="16.5" />
                      <line x1="12" y1="7.6" x2="12.01" y2="7.6" />
                    </svg>
                    <div className="m-desc">{m.desc}</div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="icon-btn mic-btn" title="Voice input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <button className={"send-btn" + (input.trim() === "" ? " hidden" : "")} id="send-btn" onClick={sendMessage} title="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>

      <div className="nav-arrows">
        <button title="Previous">↑</button>
        <button title="Next">↓</button>
        <button className="latest-btn" onClick={scrollToBottom}>
          Latest
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="collapsed-rail" id="collapsed-rail">
        <div className="rail-logo-box">
          <img className="rail-logo" id="rail-logo" alt="LOGOS" src={light ? ensoInk : ensoWhite} />
          <button className="rail-expand" onClick={onToggleSidebar} title="Expand sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round">
              <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
              <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
            </svg>
          </button>
        </div>
        <button className="rail-nav rail-newchat" onClick={newChat} title="New Chat">
          <NewChatIcon />
        </button>
        <button className="rail-nav rail-search" onClick={() => setSearchOpen(true)} title="Search">
          <SearchIcon />
        </button>
        <button className="rail-nav rail-console" onClick={onOpenConsole} title="Console">
          <ConsoleIcon />
        </button>
      </div>

      {/* collapsed settings: gear stays bottom-left when sidebar is folded in */}
      <div className="collapsed-settings" id="collapsed-settings">
        <button className="rail-btn" onClick={openSettings} title="Settings">
          <GearIcon />
        </button>
      </div>

      <AgentSidebar
        light={light}
        chats={chats}
        projects={projects}
        activeChatId={activeChatId}
        newChatActive={newChatActive}
        isMobile={isMobile}
        onSelectChat={selectChat}
        onTogglePin={togglePin}
        onDeleteChat={deleteChat}
        onDeleteProject={deleteProject}
        onDeleteSubchat={deleteSubchat}
        onNewChat={newChat}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenConsole={onOpenConsole}
        onOpenSettings={openSettings}
        onToggleSidebar={onToggleSidebar}
      />

      <button className="chat-home" onClick={onBackHome} title="Back to mainpage">
        {isMobile ? (
          /* straight top-right arrow (mobile script swap) */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
            <line x1="6" y1="18" x2="18" y2="6" />
            <polyline points="9 6 18 6 18 15" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20 Q 13 19 19 6.5" />
            <path d="M13.6 8.2 L19 6.5 L18.4 12.1" />
          </svg>
        )}
      </button>
      <main className="main">
        {/* Top bar */}
        <div className="topbar">
          {/* mobile: chats fold-out button in the agent top bar (same symbol as the sidebar's own fold icon) */}
          <button className="mtop-burger" title="Chats" onClick={onToggleSidebar}>
            <SidebarFoldIcon />
          </button>
          <div className="topbar-title">
            <span id="chat-title">{chatTitle}</span>
            <button title="Edit title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>

          <div className="topbar-tools">
            <button id="terminal-toggle" className={terminalOpen ? "active" : undefined} onClick={onToggleTerminal} title="Toggle terminal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
            </button>
            <button title="Toggle side panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
            <button id="mode-toggle" onClick={onToggleLight} title="Toggle light / dark">
              <svg id="mode-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {light ? <SunPaths /> : <MoonPath />}
              </svg>
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="chat-area" id="chat-area" ref={chatAreaRef}>
          {emptyState ? (
            /* Neutral / empty landing state */
            <div className="empty-state" id="empty-state">
              <div className="hero-scale">
                <div className="hero-watermark" aria-hidden="true">
                  <svg viewBox="0 0 4500 4500" preserveAspectRatio="xMidYMid meet">
                    <use href={ensoWhite + "#enso"} />
                  </svg>
                </div>
                <div className="hero-greeting">{heroGreeting}</div>
                <div id="hero-input-slot">{inputBar}</div>
                <div className="hero-suggestions">
                  <button className="suggestion-pill" onClick={() => startProject("Coding project", "What shall we code?")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>{" "}
                    {suggestionLabels[0]}
                  </button>
                  <button className="suggestion-pill" onClick={() => startProject("Research project", "What shall we research?")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>{" "}
                    {suggestionLabels[1]}
                  </button>
                  <button className="suggestion-pill" onClick={() => startProject("Writing project", "What shall we write?")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>{" "}
                    {suggestionLabels[2]}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <div key={m.key} className="msg-user">
                  <span className="bubble">{m.text}</span>
                </div>
              ) : (
                /* Placeholder agent response (sendMessage stub — wire up your LLM API here) */
                <div key={m.key} className="msg-agent">
                  <div className="result-block">
                    <div className="result-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      THINKING…
                    </div>
                    <div className="result-body" style={{ color: "var(--color-text-muted)" }}>
                      [wire up your API here — see sendMessage() in the script]
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {/* Input bar (bottom position once a conversation exists) */}
        {!emptyState ? inputBar : null}

        <div className="disclaimer" id="main-disclaimer">
          Logos is AI and can make mistakes. Providing trajectory data through usage accelerates its development.
        </div>

        {/* Terminal drawer (slides up from the bottom) */}
        <div className="terminal-panel" id="terminal-panel">
          <div className="term-bar">
            <div className="term-tab active">
              <svg className="term-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span>Terminal 1</span>
              <button className="term-x" title="Close tab">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <button className="term-new" title="New terminal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button className="term-collapse" onClick={onToggleTerminal} title="Close terminal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="term-body">
            <div className="term-line">
              <span className="term-prompt">❯</span>
              <span className="term-cursor"></span>
            </div>
          </div>
        </div>
      </main>

      <SearchOverlay open={searchOpen} titles={chats.filter((c) => !c.pinned).map((c) => c.title)} onClose={() => setSearchOpen(false)} onPick={pickSearch} />

      <SettingsView
        open={settingsOpen}
        light={light}
        watermarkOn={watermarkOn}
        modalAddMemory={modalAddMemory}
        modalInstallSkill={modalInstallSkill}
        onClose={() => setSettingsOpen(false)}
        onSetAppearance={(mode) => onSetLight(mode === "light")}
        onToggleWatermark={onToggleWatermark}
        onOpenModal={(id) => (id === "modal-add-memory" ? setModalAddMemory(true) : setModalInstallSkill(true))}
        onCloseModal={(id) => (id === "modal-add-memory" ? setModalAddMemory(false) : setModalInstallSkill(false))}
      />
    </>
  )
}
