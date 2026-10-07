import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <section className="login-wrap">
      <div className="login-intro">
        <div><p className="eyebrow">PLAYER GATE / DEMO</p><h1>Come on in.<br />It’s a test room.</h1><p className="small">Mythic's Casino is not connected to an account provider yet. The local demo opens as one shared player.</p></div>
        <div className="login-mark" aria-hidden="true">異</div>
      </div>
      <div className="login-form-panel">
        <p className="section-kicker">LOCAL PREVIEW</p><h2>Authentication is not configured.</h2>
        <p className="small">This form is intentionally inactive. Entering credentials here would not sign you in, so no credentials are collected.</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>Player name<input name="username" autoComplete="off" placeholder="No account required" disabled /></label>
          <label>Password<input name="password" type="password" autoComplete="off" placeholder="Unavailable in demo" disabled /></label>
          <button type="button" className="button" disabled>Sign-in unavailable</button>
        </form>
        <p className="login-lock">You can still explore the local demo room. It uses a single shared account and a seeded balance.</p>
        <Link className="button primary" to="/dashboard">Continue to demo room ↗</Link>
      </div>
    </section>
  )
}
