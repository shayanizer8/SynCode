import { Link } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create a Room",
    description: "Start a real-time coding session with one click.",
  },
  {
    number: "02",
    title: "Invite Your Team",
    description: "Share your room link and collaborate instantly.",
  },
  {
    number: "03",
    title: "Start Coding Together",
    description: "Write, review, and debug side by side.",
  },
];

const Landing = () => {
  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div className="landing-container navbar-content">
          <Link className="brand-link" to="/">
            <ArrowLeftRight className="brand-icon" size={18} aria-hidden="true" />
            <span>SynCode</span>
          </Link>

          <div className="navbar-actions">
            <Link to="/login" className="btn btn-ghost">
              Login
            </Link>
            <Link to="/register" className="btn btn-filled">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <p className="pill">v2.4 KINETIC ARCHITECT IS LIVE</p>
              <h1>Code Together, In Real Time</h1>
              <p className="hero-subtext">
                A collaborative code editor for developers and students. Write, run, and debug
                code with your team live.
              </p>

              <div className="hero-actions">
                <Link to="/register" className="btn btn-filled btn-large">
                  Get Started Free
                </Link>
              </div>

              <p className="social-proof">Trusted by programmers</p>
            </div>

            <div className="editor-mockup" aria-label="Live collaborative editor preview">
              <div className="mockup-header">
                <span className="dot red"></span>
                <span className="dot amber"></span>
                <span className="dot green"></span>
                <span className="mockup-title">index.js - syncode</span>
              </div>
              <div className="mockup-code">
                <pre>
                  <code>{`import { collaboration } from "@syncode/core";

async function initRoom() {
  const session = await collaboration.create({
    roomId: "kinetic-architect-99",
    mode: "real-time",
  });

  return session;
}`}</code>
                </pre>
                <span className="cursor cursor-a" style={{ top: "82px", left: "168px" }}>
                  alex.dev
                </span>
                <span className="cursor cursor-b" style={{ top: "132px", left: "228px" }}>
                  sara.codes
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="workflow-section">
          <div className="landing-container">
            <h2>Get started in seconds</h2>
            <div className="steps-row">
              {steps.map((step, index) => (
                <article key={step.number} className="step-card">
                  <span className="step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < steps.length - 1 ? <span className="step-connector" aria-hidden="true"></span> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-top">
          <div>
            <p className="footer-brand">SynCode</p>
            <p className="footer-tagline">Built for teams that code in sync.</p>
          </div>

          <nav className="footer-links" aria-label="Footer links">
            <a href="#">About</a>
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
          </nav>
        </div>
        <div className="landing-container footer-bottom">© 2026 SynCode. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Landing;
