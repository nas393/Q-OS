"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QMd from "@/components/q-md";
import { I } from "@/components/shell/icons";
import { QMark } from "@/components/shell/q-mark";
import "./twin.css";
import "../chat/chat.css";

type Conv = { id: string; title: string; updated_at?: string };
type Msg = { role: "user" | "assistant"; content: string };
type Role = "partner" | "ceo" | "commercial" | "cfo" | "coo" | "cso" | "negotiator" | "chief_of_staff" | "devils_advocate";
const ROLES: { value: Role; label: string }[] = [
  { value: "partner", label: "Executive Partner" }, { value: "ceo", label: "CEO / General Manager" },
  { value: "commercial", label: "Commercial Director" }, { value: "cfo", label: "CFO lens" },
  { value: "coo", label: "COO / Operations" }, { value: "cso", label: "Chief Strategy Officer" },
  { value: "negotiator", label: "Negotiator" }, { value: "chief_of_staff", label: "Chief of Staff" },
  { value: "devils_advocate", label: "Devil's Advocate" }
];
const QUICK: [string, string][] = [
  ["Challenge my strategy", "Review my current strategy. Identify weak assumptions, strategic gaps, risks and the highest-value correction."],
  ["Commercial decision", "Act as my Commercial Director. Analyse this decision through revenue, gross margin, volume, channel impact, pricing and execution risk."],
  ["Board-level view", "Give me a board-level assessment: situation, strategic options, trade-offs, recommendation, risks and next actions."],
  ["Devil's Advocate", "Challenge my position. Give me the strongest opposing case, what could fail, what evidence is missing and your verdict."],
  ["Build an execution plan", "Turn this objective into an execution plan with priorities, owners to assign, milestones, dependencies and measurable outcomes."]
];

export default function TwinWorkspace() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [convId, setConvId] = useState<string>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<Role>("partner");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      const r = await fetch("/api/chat?workspace=twin", { cache: "no-store" });
      if (!r.ok) throw new Error("Conversation storage unavailable");
      const data = await r.json();
      setConvs(data.conversations ?? []);
      setStatus("online");
    } catch { setStatus("offline"); }
  }, []);
  useEffect(() => { void loadConvs(); }, [loadConvs]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function openConversation(id: string) {
    setHistoryOpen(false); setError("");
    try {
      const r = await fetch("/api/chat/" + id + "?workspace=twin", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Could not open conversation");
      setConvId(id);
      setMsgs((data.messages ?? []).map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant", content: m.content
      })));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open conversation"); }
  }
  function newConversation() {
    setConvId(undefined); setMsgs([]); setError(""); setHistoryOpen(false); box.current?.focus();
  }
  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput(""); setError(""); setBusy(true);
    setMsgs(current => [...current, { role: "user", content: message }, { role: "assistant", content: "" }]);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ message, workspace: "twin", role, ...(convId ? { conversationId: convId } : {}) })
      });
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? ("Executive Twin returned " + r.status));
      }
      setStatus("online");
      const reader = r.body.getReader(), decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const item = await reader.read();
        if (item.done) break;
        buffer += decoder.decode(item.value, { stream: true });
        const parts = buffer.split("\n\n"); buffer = parts.pop() ?? "";
        for (const part of parts) {
          let event: { delta?: string; conversationId?: string; error?: string };
          try { event = JSON.parse(part.replace(/^data: /, "")); } catch { continue; }
          if (event.error) throw new Error(event.error);
          if (event.conversationId) setConvId(event.conversationId);
          if (event.delta) setMsgs(current => {
            const next = [...current];
            next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + event.delta };
            return next;
          });
        }
      }
      await loadConvs();
    } catch (e) {
      setStatus("offline");
      setMsgs(current => {
        const next = [...current];
        next[next.length - 1] = { role: "assistant", content: "Executive Twin could not answer: " + (e instanceof Error ? e.message : "Service unavailable") + "." };
        return next;
      });
    } finally { setBusy(false); }
  }
  useEffect(() => {
    const el = box.current; if (!el) return;
    el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }, [input]);

  const current = convs.find(c => c.id === convId);
  const statusLabel = status === "online" ? "Private workspace online" : status === "offline" ? "Storage or AI unavailable" : "Connecting";
  return <div className="qa twin">
    <aside className={"qa-list" + (historyOpen ? " open" : "")} aria-label="Executive Twin conversations">
      <div className="qa-list-h"><h2>Private history</h2><button className="btn sm primary" onClick={newConversation}><I n="plus"/>New</button></div>
      <div className="qa-convs">
        {convs.length ? convs.map(c => <button key={c.id} className="qa-conv" aria-current={c.id === convId ? "true" : undefined} onClick={() => openConversation(c.id)}>
          <span>{c.title.replace(/^Executive Twin · /, "")}</span>
          {c.updated_at && <time>{new Date(c.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>}
        </button>) : <p className="qa-none">{status === "offline" ? "History is unavailable." : "Your Executive Twin discussions will appear here."}</p>}
      </div>
      <div className="tw-private"><I n="lock"/>Owner-only · separate from Q Assistant</div>
    </aside>
    {historyOpen && <button className="qa-scrim" aria-label="Close conversation history" onClick={() => setHistoryOpen(false)}/>}
    <section className="qa-main" aria-label="Executive Twin workspace">
      <header className="qa-h">
        <button className="icon-btn qa-hist-btn" onClick={() => setHistoryOpen(v => !v)} aria-label="Conversation history" aria-expanded={historyOpen}><I n="list"/></button>
        <div className="qa-t">
          <h1>{current?.title.replace(/^Executive Twin · /, "") ?? "Executive Twin"}</h1>
          <span className={"live" + (status === "online" ? "" : " off")}><i/>{statusLabel} · analysis and recommendations only</span>
        </div>
        <label className="tw-role-label" htmlFor="twin-role">Perspective</label>
        <select id="twin-role" className="tw-role" value={role} onChange={e => setRole(e.target.value as Role)} aria-label="Executive perspective">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button className="btn sm qa-new-h" onClick={newConversation} aria-label="New conversation"><I n="plus"/>New</button>
      </header>
      <div className="qa-thread" aria-live="polite">
        {!msgs.length && <div className="qa-hello">
          <QMark size={56}/><h2>Your strategic counterpart.</h2>
          <p>Think through decisions, challenge assumptions and build execution plans. Switch perspectives without changing the owner-only workspace.</p>
          <div className="tw-boundary"><I n="shield-check"/>Private to the owner. No autonomous actions, external messages, spending or access changes.</div>
          <div className="qa-quick">{QUICK.map(([label, prompt]) => <button key={label} className="chip" onClick={() => send(prompt)} disabled={busy || status === "offline"}>{label}</button>)}</div>
        </div>}
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="qa-msg me">{m.content}</div>
          : <div key={i} className="qa-msg q"><QMark size={28}/><div className="qa-body">{m.content ? <QMd text={m.content}/> : <span className="qa-typing" aria-label="Executive Twin is thinking"><i/><i/><i/></span>}</div></div>)}
        {error && <p className="banner err" role="alert">{error}</p>}
        <div ref={end}/>
      </div>
      <form className="qa-compose" onSubmit={e => { e.preventDefault(); void send(input); }}>
        <label className="sr" htmlFor="twin-input">Message Executive Twin</label>
        <textarea id="twin-input" ref={box} rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} placeholder="Put a decision, problem or objective on the table…" maxLength={12000} enterKeyHint="send"/>
        <button type="submit" className="btn primary qa-send" disabled={busy || !input.trim() || status === "offline"} aria-label="Send"><I n="send"/></button>
        <small className="qa-note">Enter to send · Shift+Enter for a new line · Recommendations are not actions.</small>
      </form>
    </section>
  </div>;
}
