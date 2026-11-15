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
      <div className="lk-bg" aria-hidden="true"/>
      <section className="lk-core">
        <img src="/os/n-mark.png" alt="" width={110} height={100} className="nmark"/>
        <p className="lk-name">NASSIM <span style={{color:"#E5132B"}}>OS</span></p>
        <h1><small>The Restless</small>Architect</h1>
        <p className="lk-roles">Builder · Strategist · Creator · Explorer</p>
        <form className="lk-form" method="post" action="/api/auth/login" onSubmit={submit}>
          <label className="lk-field"><span className="sr">Passkey</span>
            <input type="password" name="passkey" autoComplete="current-password" required maxLength={256} autoFocus placeholder="Passkey" value={passkey} onChange={event => setPasskey(event.target.value)} />
            <button type="submit" disabled={busy || !passkey} aria-label="Enter">{busy ? <i className="lk-spin"/> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>}</button>
          </label>
          {error && <p className="lk-error" role="alert" aria-live="polite">{error}</p>}
        </form>
      </section>
      <footer className="lk-foot">Think beyond · Build with purpose · Leave a legacy</footer>
    </main>
  );
}
