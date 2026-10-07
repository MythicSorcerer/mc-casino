import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <section className="landing">
      <div className="landing-copy">
        <p className="eyebrow">A SMALL ARCADE BETWEEN WORLDS</p>
        <h1>Luck has<br />another side.</h1>
        <p className="lede">Step into a late-night game room inspired by the worlds we build together. The local demo is open; its balance and coinflip are test data, not Minecraft currency.</p>
        <div className="actions">
          <Link className="button primary" to="/games">Enter the game hall <span>↗</span></Link>
          <Link className="button" to="/dashboard">View demo room</Link>
        </div>
        <p className="landing-note">SINGLE LOCAL DEMO ACCOUNT · NO REAL TRANSFERS</p>
      </div>
      <div className="landing-art" aria-hidden="true">
        <div className="orbit one" /><div className="orbit two" /><div className="orbit three" />
        <div className="moon">異</div>
        <p className="art-caption">THE NIGHT MARKET · OPEN LATE</p>
      </div>
    </section>
  )
}
