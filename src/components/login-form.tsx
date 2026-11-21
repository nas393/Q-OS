"use client";

import { FormEvent, useEffect, useState } from "react";
import "./lock.css";

/* Q OS sign-in: the Command centre's orbit around the Q core. Sign-in logic is unchanged (POST /api/auth/login). */
const greetFor = (h: number) => (h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");

export default function LoginForm({ initialError = "" }: { initialError?: string }) {
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [greet, setGreet] = useState("Welcome back");
  useEffect(() => setGreet(greetFor(new Date().getHours())), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ passkey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Wrong passkey.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("Can't reach Q. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lk">
      <section className="lk-core">
        <div className="lk-emblem" aria-hidden="true">
          <div className="lk-sky"><i className="lk-orbit o1"><b/></i><i className="lk-orbit o2"><b/></i><i className="lk-orbit o3"><b/></i></div>
          <svg viewBox="0 0 120 120" className="lk-ring">
            <defs><linearGradient id="lk-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F12D43"/><stop offset="1" stopColor="#EADFCB"/></linearGradient></defs>
            <circle cx="60" cy="60" r="56" className="trk"/>
            <circle cx="60" cy="60" r="56" className="arc"/>
          </svg>
          <img src="/os/q-emblem.webp" alt="" width={84} height={84}/>
        </div>
        <h1><span suppressHydrationWarning>{greet}</span>, <em>Nassim.</em></h1>
        <form className="lk-form" method="post" action="/api/auth/login" onSubmit={submit}>
          <label className="lk-field"><span className="sr">Passkey</span>
            <input type="password" name="passkey" autoComplete="current-password" required maxLength={256} autoFocus placeholder="Passkey" value={passkey} onChange={event => setPasskey(event.target.value)} />
            <button type="submit" disabled={busy || !passkey} aria-label="Enter Q OS">{busy ? <i className="lk-spin"/> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>}</button>
          </label>
          {error && <p className="lk-error" role="alert" aria-live="polite">{error}</p>}
        </form>
      </section>
      <footer className="lk-foot">Q OS</footer>
    </main>
  );
}
