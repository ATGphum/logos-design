import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { Message } from "../console/agent/AgentView"
import { pickReply, type Reply } from "./replies"

/**
 * V2's conversation.
 *
 * Two decisions carry most of it:
 *
 *  - Only the person gets a bubble. A bubble is a container, and a container is only
 *    worth drawing when something sits beside it — the user's turn is short and needs an
 *    edge to end at, the agent's is the body of the page and does not. Boxing both made
 *    the answer look like a quoted excerpt of itself.
 *
 *  - The thinking is part of the turn, not a spinner in front of it. Steps arrive one at
 *    a time on a hairline rail, then collapse to a single line you can open again. What
 *    the agent did to reach an answer is the most interesting thing on screen while you
 *    are waiting, so it is shown rather than hidden behind a throbber.
 *
 * Nothing here calls a model — the replies are canned (see replies.ts) so the surface can
 * be judged with real prose in it.
 */

const STEP_MS = 460
const WORD_MS = 17

/* ————— tiny block renderer ————— *
 * Enough markdown for an answer to look like an answer: headings, bullets, fenced code,
 * inline code and bold. Deliberately not a parser — it walks lines once. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith("`")) {
      out.push(
        <code className="v2-tk-code" key={`${keyBase}-${i++}`}>
          {tok.slice(1, -1)}
        </code>,
      )
    } else {
      out.push(<strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>)
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function renderBody(text: string): ReactNode[] {
  const lines = text.split("\n")
  const out: ReactNode[] = []
  let para: string[] = []
  let list: string[] = []
  let code: string[] | null = null
  let lang = ""
  let k = 0

  const flushPara = () => {
    if (!para.length) return
    const joined = para.join(" ")
    out.push(<p key={`p${k++}`}>{renderInline(joined, `p${k}`)}</p>)
    para = []
  }
  const flushList = () => {
    if (!list.length) return
    out.push(
      <ul key={`u${k++}`}>
        {list.map((li, n) => (
          <li key={n}>{renderInline(li, `u${k}-${n}`)}</li>
        ))}
      </ul>,
    )
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith("```")) {
      if (code) {
        out.push(
          <pre className="v2-tk-pre" key={`c${k++}`}>
            {lang ? <span className="v2-tk-lang">{lang}</span> : null}
            <code>{code.join("\n")}</code>
          </pre>,
        )
        code = null
        lang = ""
      } else {
        flushPara()
        flushList()
        code = []
        lang = line.slice(3).trim()
      }
      continue
    }
    if (code) {
      code.push(raw)
      continue
    }

    if (!line.trim()) {
      flushPara()
      flushList()
      continue
    }
    if (line.startsWith("## ")) {
      flushPara()
      flushList()
      out.push(<h3 key={`h${k++}`}>{line.slice(3)}</h3>)
      continue
    }
    if (line.startsWith("- ")) {
      flushPara()
      list.push(line.slice(2))
      continue
    }
    flushList()
    para.push(line.trim())
  }
  flushPara()
  flushList()
  /* an unterminated fence, which happens constantly mid-stream */
  if (code) {
    out.push(
      <pre className="v2-tk-pre" key={`c${k++}`}>
        {lang ? <span className="v2-tk-lang">{lang}</span> : null}
        <code>{code.join("\n")}</code>
      </pre>,
    )
  }
  return out
}

/* ————— the reasoning strip ————— */
function Reasoning({ steps, shown, done, seconds }: { steps: string[]; shown: number; done: boolean; seconds: number }) {
  const [open, setOpen] = useState(true)

  /* collapse itself once the answer starts — it has served its purpose by then, and an
     open strip pushes the answer down the page as it streams */
  useEffect(() => {
    if (done) setOpen(false)
  }, [done])

  return (
    <div className={"v2-tk-think" + (open ? " open" : "") + (done ? " done" : "")}>
      <button className="v2-tk-think-head" onClick={() => setOpen((v) => !v)} type="button">
        {/* Four strands flexing: each runs the same wave, delayed by its position, so
            the movement travels across the group rather than every bar pumping at once.
            Bars rather than a dot lattice — they hold their shape at this size, where
            nine dots mush together. At rest they sit level, which is the idle mark. */}
        <svg className="v2-tk-grid" viewBox="0 0 24 24" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              className="v2-tk-node"
              x={3.5 + i * 5.7}
              y="2.5"
              width="2"
              height="19"
              rx="1"
              style={{ animationDelay: `${i * 0.115}s` }}
            />
          ))}
        </svg>
        <span className="v2-tk-think-title">{done ? `Thought for ${seconds}s` : "Thinking"}</span>
        <svg className="v2-tk-think-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="v2-tk-think-body">
        <div className="v2-tk-think-inner">
          {steps.slice(0, shown).map((s, i) => (
            <div className="v2-tk-step" key={i}>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ————— one agent turn: think, then stream ————— */
function AgentTurn({ prompt, onGrow }: { prompt: string; onGrow: () => void }) {
  const reply: Reply = useMemo(() => pickReply(prompt), [prompt])
  const [shown, setShown] = useState(0)
  const [words, setWords] = useState(0)
  const [phase, setPhase] = useState<"think" | "stream" | "done">("think")
  const [seconds, setSeconds] = useState(0)

  const tokens = useMemo(() => reply.body.split(/(\s+)/), [reply])

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setShown(reply.steps.length)
      setWords(tokens.length)
      setSeconds(reply.steps.length)
      setPhase("done")
      return
    }

    const timers: number[] = []
    const started = Date.now()

    reply.steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setShown(i + 1), STEP_MS * (i + 1)))
    })

    const thinkFor = STEP_MS * (reply.steps.length + 1)
    timers.push(
      window.setTimeout(() => {
        setSeconds(Math.max(1, Math.round((Date.now() - started) / 1000)))
        setPhase("stream")
      }, thinkFor),
    )
    return () => timers.forEach(clearTimeout)
  }, [reply, tokens.length])

  /* the stream itself — one interval, cleared when it runs out */
  useEffect(() => {
    if (phase !== "stream") return
    const id = window.setInterval(() => {
      setWords((w) => {
        if (w >= tokens.length) {
          window.clearInterval(id)
          setPhase("done")
          return w
        }
        return w + 2
      })
    }, WORD_MS)
    return () => window.clearInterval(id)
  }, [phase, tokens.length])

  /* keep the view pinned while the answer grows */
  useEffect(() => {
    onGrow()
  }, [words, shown, phase, onGrow])

  const visible = tokens.slice(0, words).join("")

  return (
    <div className="v2-tk-agent">
      <Reasoning steps={reply.steps} shown={shown} done={phase !== "think"} seconds={seconds} />
      {phase !== "think" ? (
        <div className={"v2-tk-body" + (phase === "stream" ? " streaming" : "")}>
          {renderBody(visible)}
        </div>
      ) : null}
      {phase === "done" ? (
        <div className="v2-tk-actions">
          <button type="button" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2.5" />
              <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button type="button" title="Regenerate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
              <polyline points="20.5 4 20.5 9 15.5 9" />
            </svg>
          </button>
          <button type="button" title="Good response">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 22V10l5-8 1.2.6a2 2 0 0 1 1 2.3L13 10h5.6a2 2 0 0 1 2 2.5l-1.8 7A2 2 0 0 1 16.8 21H7z" />
            </svg>
          </button>
          <button type="button" title="Bad response">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2v12l-5 8-1.2-.6a2 2 0 0 1-1-2.3L11 14H5.4a2 2 0 0 1-2-2.5l1.8-7A2 2 0 0 1 7.2 3H17z" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function V2Thread({ messages }: { messages: Message[] }) {
  const endRef = useRef<HTMLDivElement>(null)

  /* the chat area is the scroller, not the window */
  const scrollToEnd = useRef(() => {
    const area = document.getElementById("chat-area")
    if (area) area.scrollTop = area.scrollHeight
  }).current

  /* each agent turn is paired with the prompt directly before it, so it can pick a reply */
  const pairs = useMemo(() => {
    let lastUser = ""
    return messages.map((m) => {
      if (m.role === "user") lastUser = m.text
      return { m, prompt: lastUser }
    })
  }, [messages])

  useEffect(scrollToEnd, [messages.length, scrollToEnd])

  return (
    <div className="v2-tk">
      {pairs.map(({ m, prompt }) =>
        m.role === "user" ? (
          <div className="v2-tk-user" key={m.key}>
            <div className="v2-tk-bubble">{m.text}</div>
          </div>
        ) : (
          <AgentTurn key={m.key} prompt={prompt} onGrow={scrollToEnd} />
        ),
      )}
      <div ref={endRef} />
    </div>
  )
}
