/**
 * Settings view + modals — ported from marketing/llm-interface.html lines 4612-4882
 * and the settings helpers in the chat script (nav switching, appearance segment,
 * language segment, watermark toggle, config tabs, modals).
 */
import { useState, type ReactNode } from "react"
import { BackChevron, CloseIcon, InfoIcon, PlusIcon, SearchIcon } from "./icons"

type NavKey = "general" | "memory" | "skills" | "config" | "version"

const NAV_META: Record<NavKey, { title: string; topsub: string }> = {
  general: { title: "General Settings", topsub: "Global" },
  memory: { title: "Memory", topsub: "Memory for help me make a demo for logos" },
  skills: { title: "Skills", topsub: "Manage reusable workflows and runtime skills" },
  config: { title: "Config", topsub: "Model credentials, environment variables, SSH and Git access" },
  version: { title: "Version", topsub: "Check the running build version, commit hash, and update time." },
}

function MiniSwitch({ initialOn = true, on, onToggle }: { initialOn?: boolean; on?: boolean; onToggle?: () => void }) {
  const [selfOn, setSelfOn] = useState(initialOn)
  const isOn = on !== undefined ? on : selfOn
  return (
    <button className={"mini-switch" + (isOn ? " on" : "")} onClick={onToggle || (() => setSelfOn((v) => !v))}>
      <span className="ms-knob"></span>
    </button>
  )
}

function Modal({
  id,
  open,
  title,
  onClose,
  children,
}: {
  id: string
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className={"set-modal-overlay" + (open ? " open" : "")}
      id={id}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="set-modal">
        <div className="modal-head">
          <div className="mh-title">{title}</div>
          <button className="modal-x" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {children}
        <div className="modal-foot">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-save" onClick={onClose}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export interface SettingsViewProps {
  open: boolean
  light: boolean
  watermarkOn: boolean
  modalAddMemory: boolean
  modalInstallSkill: boolean
  onClose: () => void
  onSetAppearance: (mode: "light" | "dark") => void
  onToggleWatermark: () => void
  onOpenModal: (id: "modal-add-memory" | "modal-install-skill") => void
  onCloseModal: (id: "modal-add-memory" | "modal-install-skill") => void
}

export function SettingsView(props: SettingsViewProps) {
  const { open, light, watermarkOn, modalAddMemory, modalInstallSkill, onClose, onSetAppearance, onToggleWatermark, onOpenModal, onCloseModal } =
    props
  const [navKey, setNavKey] = useState<NavKey>("general")
  const [cfgTab, setCfgTab] = useState<"keyconfig" | "environment" | "access">("keyconfig")
  const [language, setLanguage] = useState("English")

  const navBtn = (key: NavKey, ico: ReactNode, t: string, d: string) => (
    <button className={"set-nav" + (navKey === key ? " active" : "")} onClick={() => setNavKey(key)}>
      <span className="set-ico">{ico}</span>
      <span className="set-text">
        <span className="t">{t}</span>
        <span className="d">{d}</span>
      </span>
    </button>
  )

  return (
    <>
      <div className={"settings-view" + (open ? " open" : "")} id="settings-view">
        <aside className="settings-side">
          <div className="settings-head">
            <button className="set-back-x" onClick={onClose} title="Back">
              <BackChevron />
            </button>
            <div>
              <div className="sh-title">Settings</div>
              <div className="sh-sub">Global controls</div>
            </div>
          </div>

          <div className="settings-search">
            <SearchIcon />
            <input type="text" placeholder="Search settings…" spellCheck={false} />
          </div>

          <nav className="settings-nav">
            {navBtn(
              "general",
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9.5" />
                <line x1="2.5" y1="12" x2="21.5" y2="12" />
                <path d="M12 2.5a14 14 0 0 1 0 19 14 14 0 0 1 0-19z" />
              </svg>,
              "General",
              "Language and appearance",
            )}
            {navBtn(
              "memory",
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0" />
              </svg>,
              "Memory",
              "Session memory",
            )}
            {navBtn(
              "skills",
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 4.3L18.5 9l-4.6 1.7L12 15l-1.9-4.3L5.5 9l4.6-1.7z" />
                <path d="M18 14l.8 1.9 2 .8-2 .8-.8 1.9-.8-1.9-2-.8 2-.8z" />
              </svg>,
              "Skills",
              "Reusable workflows",
            )}
            {navBtn(
              "config",
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="15.5" r="3.5" />
                <path d="M10 13l8-8 3 3-2 2 2 2-3 3-2-2-2 2z" />
              </svg>,
              "Config",
              "Secrets and SSH",
            )}
            {navBtn("version", <InfoIcon />, "Version", "Build and commit")}
          </nav>

          <button className="settings-back" onClick={onClose}>
            <BackChevron />
            Back to chats
          </button>
        </aside>

        <main className="settings-main">
          <div className="settings-topbar">
            <div className="stb-title">Settings</div>
            <div className="stb-sub">Global controls</div>
          </div>
          <div className="settings-content">
            <h1 id="settings-h1">{NAV_META[navKey].title}</h1>
            <div className="sc-sub" id="settings-topsub">
              {NAV_META[navKey].topsub}
            </div>

            <div id="settings-general" className="settings-panel" style={{ display: navKey === "general" ? undefined : "none" }}>
              <div className="settings-card">
                <div className="sc-head">
                  <div className="sch-t">Theme</div>
                  <div className="sch-d">Select interface theme</div>
                </div>
                <div className="sc-body">
                  <div className="sc-field">Appearance mode</div>
                  <div className="seg-options" id="appearance-seg">
                    <button className={"seg-opt" + (light ? " selected" : "")} data-mode="light" onClick={() => onSetAppearance("light")}>
                      Light
                    </button>
                    <button className={"seg-opt" + (!light ? " selected" : "")} data-mode="dark" onClick={() => onSetAppearance("dark")}>
                      Dark
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="sc-head">
                  <div className="sch-t">Language</div>
                  <div className="sch-d">Select interface language</div>
                </div>
                <div className="sc-body">
                  <div className="seg-options">
                    <button className={"seg-opt" + (language === "Chinese" ? " selected" : "")} onClick={() => setLanguage("Chinese")}>
                      Chinese
                    </button>
                    <button className={"seg-opt" + (language === "English" ? " selected" : "")} onClick={() => setLanguage("English")}>
                      English
                    </button>
                  </div>
                </div>
              </div>

              <div className="wm-toggle-row">
                <span className="wm-label">Ambient background mark</span>
                <MiniSwitch on={watermarkOn} onToggle={onToggleWatermark} />
              </div>
            </div>

            {/* MEMORY */}
            <div id="settings-memory" className="settings-panel" style={{ display: navKey === "memory" ? undefined : "none" }}>
              <div className="mem-actions">
                <button className="mem-add" onClick={() => onOpenModal("modal-add-memory")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add memory
                </button>
                <button className="mem-refresh">Refresh</button>
              </div>
              <div className="mem-status">unauthorized</div>
              <div className="settings-card">
                <div className="sc-head">
                  <div className="sch-t">Memory for help me make a demo for logos</div>
                  <div className="sch-d">No memory yet</div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="sr-t">Read memories</div>
                  </div>
                  <MiniSwitch />
                </div>
                <div className="set-row">
                  <div>
                    <div className="sr-t">Generate memories</div>
                  </div>
                  <MiniSwitch />
                </div>
              </div>
              <div className="settings-card">
                <div className="sc-head">
                  <div className="sch-t">Buckets</div>
                </div>
                <div className="set-row">
                  <div>
                    <div className="sr-t">User memory</div>
                    <div className="sr-d">No memory yet</div>
                  </div>
                  <span className="mem-badge">Empty</span>
                </div>
                <div className="set-row">
                  <div>
                    <div className="sr-t">Core memory</div>
                    <div className="sr-d">No memory yet</div>
                  </div>
                  <span className="mem-badge">Empty</span>
                </div>
                <div className="set-empty-row">No buckets yet</div>
              </div>
            </div>

            {/* SKILLS */}
            <div id="settings-skills" className="settings-panel" style={{ display: navKey === "skills" ? undefined : "none" }}>
              <div className="mem-actions">
                <button className="mem-add" onClick={() => onOpenModal("modal-install-skill")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Install skill
                </button>
                <button className="mem-refresh">Refresh</button>
              </div>
              <div className="mem-status">unauthorized</div>
              <div className="settings-card">
                <div className="sc-head">
                  <div className="sch-t">Available skills</div>
                  <div className="sch-d">0 skills installed</div>
                </div>
                <div className="set-empty-row">No skills loaded</div>
              </div>
            </div>

            {/* CONFIG */}
            <div id="settings-config" className="settings-panel" style={{ display: navKey === "config" ? undefined : "none" }}>
              <div className="mem-actions">
                <button className="mem-refresh">Refresh</button>
              </div>
              <div className="mem-status">unauthorized</div>
              <div className="cfg-tabs">
                <button className={"cfg-tab" + (cfgTab === "keyconfig" ? " active" : "")} onClick={() => setCfgTab("keyconfig")}>
                  Key config
                </button>
                <button className={"cfg-tab" + (cfgTab === "environment" ? " active" : "")} onClick={() => setCfgTab("environment")}>
                  Environment
                </button>
                <button className={"cfg-tab" + (cfgTab === "access" ? " active" : "")} onClick={() => setCfgTab("access")}>
                  Access
                </button>
              </div>

              <div id="cfg-keyconfig" style={{ display: cfgTab === "keyconfig" ? undefined : "none" }}>
                <div className="settings-card">
                  <div className="sc-head">
                    <div className="sch-t">Connect a model provider</div>
                    <div className="sch-d">Choose a provider, enter a key, discover available models, then select the models Logos may use.</div>
                  </div>
                  <div className="sc-body">
                    <div className="cfg-grid">
                      <div className="cfg-field">
                        <label>Provider</label>
                        <select className="cfg-select" defaultValue="OpenAI">
                          <option>OpenAI</option>
                          <option>Anthropic</option>
                          <option>Qwen</option>
                          <option>GLM</option>
                          <option>Custom</option>
                        </select>
                      </div>
                      <div className="cfg-field">
                        <label>Base URL</label>
                        <input className="cfg-input" type="text" defaultValue="https://api.openai.com/v1" />
                      </div>
                      <div className="cfg-field">
                        <label>API key</label>
                        <input className="cfg-input" type="text" placeholder="Stored server-side after saving selected models" />
                      </div>
                      <div className="cfg-field">
                        <label>Credential ref</label>
                        <input className="cfg-input" type="text" placeholder="Optional platform credential handle" />
                      </div>
                    </div>
                    <div className="cfg-foot">
                      <div className="cfg-hint">Enter an API key or credential ref before discovering models.</div>
                      <div className="cfg-actions">
                        <button className="btn-soft">Discover models</button>
                        <button className="btn-gold">Save selected models</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="sc-head">
                    <div className="sch-t">Configured keys</div>
                    <div className="sch-d">Expand a key to enable models, discover more models with the saved key, and choose the default model.</div>
                  </div>
                  <div className="set-empty-row">No model providers configured</div>
                </div>
              </div>

              <div id="cfg-environment" style={{ display: cfgTab === "environment" ? undefined : "none" }}>
                <div className="settings-card">
                  <div className="sc-head">
                    <div className="sch-t">Environment variables</div>
                    <div className="sch-d">Variables passed to the runtime.</div>
                  </div>
                  <div className="set-empty-row">No variables set</div>
                </div>
              </div>

              <div id="cfg-access" style={{ display: cfgTab === "access" ? undefined : "none" }}>
                <div className="settings-card">
                  <div className="sc-head">
                    <div className="sch-t">SSH & Git access</div>
                    <div className="sch-d">Keys and tokens used for repository access.</div>
                  </div>
                  <div className="set-empty-row">No access credentials configured</div>
                </div>
              </div>
            </div>

            {/* VERSION */}
            <div id="settings-version" className="settings-panel" style={{ display: navKey === "version" ? undefined : "none" }}>
              <div className="mem-actions">
                <button className="mem-refresh">Refresh</button>
              </div>
              <div className="mem-status">unauthorized</div>
            </div>

            <div id="settings-placeholder" className="settings-placeholder" style={{ display: "none" }}>
              This section is coming soon.
            </div>
          </div>
        </main>
      </div>

      {/* Add memory modal */}
      <Modal id="modal-add-memory" open={modalAddMemory} title="Add memory" onClose={() => onCloseModal("modal-add-memory")}>
        <div className="modal-body">
          <div className="modal-field">
            <label>Target</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Topic</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Content</label>
            <textarea className="modal-textarea"></textarea>
          </div>
        </div>
      </Modal>

      {/* Install skill modal */}
      <Modal id="modal-install-skill" open={modalInstallSkill} title="Install skill" onClose={() => onCloseModal("modal-install-skill")}>
        <div className="modal-body">
          <div className="modal-field">
            <label>
              Skill name <span className="req">*</span>
            </label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Description</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Display name</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Short description</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Default prompt</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>
              Skill body <span className="req">*</span>
            </label>
            <textarea className="modal-textarea" style={{ minHeight: 170 }}></textarea>
          </div>
          <div className="modal-field">
            <label>Source</label>
            <input className="modal-input" type="text" />
          </div>
          <div className="modal-field">
            <label>Required tools</label>
            <input className="modal-input" type="text" placeholder="tool1, tool2, tool3" />
          </div>
        </div>
      </Modal>
    </>
  )
}
