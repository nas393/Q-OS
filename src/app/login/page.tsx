export const dynamic="force-dynamic";
export const metadata={title:"Sign in"};

/* Owner sign-in. The form posts to the existing login route, which checks the passkey and sets the session. */
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const sp=await searchParams;
  return <main className="signin">
    <section className="card" aria-labelledby="signin-h">
      <div>
        <h1 id="signin-h" className="h1">Q OS</h1>
        <p className="lede">Owner sign-in.</p>
      </div>
      <form method="post" action="/api/auth/login">
        <label htmlFor="passkey">Passkey</label>
        <input id="passkey" name="passkey" type="password" autoComplete="current-password" required/>
        <button type="submit" className="btn primary">Sign in</button>
      </form>
      {sp.error&&<p role="alert" className="error">{sp.error}</p>}
    </section>
  </main>;
}
