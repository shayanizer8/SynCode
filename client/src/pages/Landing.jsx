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
              <h1>
                <span>Code Together.</span>
                <span>In Real Time.</span>
              </h1>
              <p className="hero-subtext">
                A collaborative code editor for developers and students. Write, run, and debug
                with your team in one shared workspace.
              </p>

              <div className="hero-actions">
                <Link to="/register" className="btn btn-filled btn-large">
                  Get Started Free
                </Link>
              </div>

              <p className="social-proof">Trusted by programmers</p>
            </div>

            <div className="editor-mockup" aria-label="Live collaborative editor preview">
              <div className="mockup-topbar">
                <div className="mockup-brand">
                  <span className="dot red"></span>
                  <span className="dot amber"></span>
                  <span className="dot green"></span>
                  <span className="mockup-title">SynCode workspace</span>
                </div>
                <div className="mockup-actions">
                  <span className="mockup-chip">JAVA</span>
                  <span className="mockup-button">Invite</span>
                  <span className="mockup-button mockup-button-run">Run</span>
                </div>
              </div>

              <div className="mockup-workspace">
                <aside className="mockup-sidebar">
                  <p className="mockup-panel-label">Explorer</p>
                  <div className="mockup-file-tree">
                    <div className="mockup-folder">src</div>
                    <div className="mockup-file active">Main.java</div>
                    <div className="mockup-file">RoomChat.java</div>
                  </div>
                </aside>

                <div className="mockup-editor">
                  <div className="mockup-tabbar">
                    <span className="mockup-tab active">Main.java</span>
                    <span className="mockup-tab">+</span>
                  </div>

                  <div className="mockup-code">
                    <div className="editor-line">
                      <span className="line-number">1</span>
                      <code>
                        <span className="token-keyword">public class</span> Main {"{"}
                      </code>
                    </div>
                    <div className="editor-line">
                      <span className="line-number">2</span>
                      <code>
                        &nbsp;&nbsp;<span className="token-keyword">public static void</span> main(
                        <span className="token-type">String</span>[] args) {"{"}
                      </code>
                    </div>
                    <div className="editor-line is-active">
                      <span className="line-number">3</span>
                      <code>
                        &nbsp;&nbsp;&nbsp;&nbsp;System.out.println(
                        <span className="token-string">"Welcome to SynCode"</span>);
                      </code>
                      <span className="cursor cursor-a" style={{ top: "-24px", left: "220px" }}>
                        ali
                      </span>
                    </div>
                    <div className="editor-line">
                      <span className="line-number">4</span>
                      <code>&nbsp;&nbsp;{"}"}</code>
                    </div>
                    <div className="editor-line">
                      <span className="line-number">5</span>
                      <code>{"}"}</code>
                    </div>
                  </div>

                  <div className="mockup-console">
                    <div className="mockup-console-bar">
                      <span>Output</span>
                      <span className="mockup-console-chip">ready</span>
                    </div>
                    <p>Click Run to execute your current file.</p>
                  </div>
                </div>

                <aside className="mockup-collab">
                  <div className="mockup-collab-head">
                    <p>Collaborators</p>
                    <span>1 active</span>
                  </div>
                  <div className="mockup-member">
                    <span className="presence-avatar presence-avatar-a">A</span>
                    <div>
                      <strong>Ali</strong>
                      <small>owner • online</small>
                    </div>
                  </div>
                  <div className="mockup-member">
                    <span className="presence-avatar presence-avatar-b">Z</span>
                    <div>
                      <strong>Zain</strong>
                      <small>editor • offline</small>
                    </div>
                  </div>
                </aside>
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
