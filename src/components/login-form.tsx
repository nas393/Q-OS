"use client";

import { FormEvent, useState } from "react";
import "./lock.css";

export default function LoginForm({ initialError = "" }: { initialError?: string }) {
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

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
        setError(typeof payload.error === "string" ? payload.error : "Access denied. Check your passkey and try again.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("The authentication service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lk">
      <div className="lk-glow" aria-hidden="true"/>
      <section className="lk-card">
        <div className="lk-orb"><img src="/os/q-emblem.webp" alt="" width={88} height={88}/></div>
        <p className="lk-kicker"><i/>Q OS · Private command centre</p>
        <h1>Welcome back, Nassim.</h1>
        <p className="lk-sub">Enter your passkey to open the command centre.</p>
        <form className="lk-form" method="post" action="/api/auth/login" onSubmit={submit}>
          <label className="lk-field"><span className="sr">Passkey</span>
            <svg className="lk-lock" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
            <input type="password" name="passkey" autoComplete="current-password" required maxLength={256} autoFocus placeholder="Passkey" value={passkey} onChange={event => setPasskey(event.target.value)} />
            <button type="submit" disabled={busy || !passkey} aria-label="Enter">{busy ? <i className="lk-spin"/> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>}</button>
          </label>
          {error && <p className="lk-error" role="alert" aria-live="polite">{error}</p>}
        </form>
        <ul className="lk-stats" aria-hidden="true"><li><b>Portfolio</b><span>Live status</span></li><li><b>Q</b><span>Strategic AI</span></li><li><b>Alerts</b><span>Builds · gold · uptime</span></li></ul>
      </section>
      <footer className="lk-foot">The Restless Architect · Think beyond · Build with purpose</footer>
    </main>
  );
}
