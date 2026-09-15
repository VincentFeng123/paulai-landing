import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Command,
  Eye,
  LockKeyhole,
  Menu,
  Monitor,
  Pause,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AppPreview from "./AppPreview";

gsap.registerPlugin(ScrollTrigger);
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;
export function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`mark ${className}`}
      style={{
        maskImage: `url("${asset("paul-mark.svg")}")`,
        WebkitMaskImage: `url("${asset("paul-mark.svg")}")`,
      }}
      aria-hidden="true"
    />
  );
}
const steps = [
  {
    label: "Notice the moment",
    title: (
      <>
        Sometimes, you open it
        <br />
        without even thinking.
      </>
    ),
    description:
      "Another tab. Another video. Paul notices when you open an app or site you’ve chosen to watch. Awareness is a good place to start.",
    icon: Eye,
    heading: "A familiar detour.",
    sub: "You opened youtube.com",
    question: "What did you come here for?",
    choices: ["Something specific", "Just browsing"],
    foot: "A little awareness goes a long way.",
  },
  {
    label: "Make a little space",
    title: (
      <>
        A small pause.
        <br />A different possibility.
      </>
    ),
    description:
      "A gentle check-in creates a little room between the impulse and the next click. Choose the amount of support that feels right for you.",
    icon: Pause,
    heading: "One small pause.",
    sub: "A moment with Paul",
    question: "Could this wait five minutes?",
    choices: ["Take a little break", "Open anyway"],
    foot: "One intervention per session. Room to breathe.",
  },
  {
    label: "Choose what’s next",
    title: (
      <>
        Your time.
        <br />
        Your call.
      </>
    ),
    description:
      "Keep going with intention, plan some time, or step away. Paul helps you make the choice — and understand your patterns as you go.",
    icon: SlidersHorizontal,
    heading: "Make it intentional.",
    sub: "You’re in charge",
    question: "What would feel good right now?",
    choices: ["Make a little room", "Continue with intention"],
    foot: "Small choices. A little more intention.",
  },
];
const faqs = [
  [
    "What is Paul?",
    "Paul is a desktop companion for more intentional screen time. Choose the apps and sites you want to watch, set your boundaries, and get a thoughtful pause when a familiar habit starts. Your dashboard helps you see patterns in your recorded activity.",
  ],
  [
    "Does Paul block apps and websites?",
    "You choose the level of support: awareness, delay, intent, friction, or a block. Levels 0–3 let you dismiss or continue. Level 4 can block selected domains or close selected apps for 30 minutes. Planned-use windows let you make room for intentional sessions.",
  ],
  [
    "What does Paul record?",
    "After you consent, Paul records active app names, window titles, available browser domains, session times, and any answers you choose to give. Activity is stored locally on your computer. It does not capture screenshots, keystrokes, or page content.",
  ],
  [
    "How does the AI part work?",
    "You can connect a compatible chat provider in Settings using your own key and model. When you send a message, the conversation and relevant activity context are shared with that provider; raw window titles are excluded. Without a configured provider, chat uses scripted local replies.",
  ],
  [
    "Where can I try Paul?",
    "You can explore the interactive dashboard and mindful-moment demo on this page. The desktop app is being built for macOS and Windows. This page currently offers a preview; public installer downloads are not available here yet.",
  ],
];

function MomentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const completionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (choice) completionRef.current?.focus();
  }, [choice]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (open) {
      setChoice(null);
      if (!ref.current?.open) ref.current?.showModal();
    } else if (ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="moment-dialog"
      aria-labelledby="moment-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-top">
        <span className="brand">
          <Mark />
          paul
        </span>
        <button
          className="icon-button"
          aria-label="Close preview"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      <div className="dialog-body" aria-live="polite">
        <span className="eyebrow">A MOMENT WITH PAUL</span>
        <h2 id="moment-title">
          {choice ? "That sounds like a good start." : "What brought you here?"}
        </h2>
        <p>
          {choice === "room"
            ? "Let this be your cue. Look away from the screen, relax your shoulders, and take one unhurried breath."
            : choice === "intent"
              ? "Keep that intention in mind. A small, clear reason can change the way you spend the next few minutes."
              : "No right answer. Just a little space to notice what you need."}
        </p>
        {choice ? (
          <button
            ref={completionRef}
            className="button primary full"
            onClick={onClose}
          >
            Back with a little more intention <ArrowRight size={17} />
          </button>
        ) : (
          <div className="moment-choices">
            <button onClick={() => setChoice("room")}>
              <Pause size={19} />
              <span>
                Make a little room<small>I could use a moment away.</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
            <button onClick={() => setChoice("intent")}>
              <Eye size={19} />
              <span>
                Explore with intention
                <small>I’m here to learn about Paul.</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          </div>
        )}
      </div>
      <p className="dialog-note">
        <LockKeyhole size={12} /> Just a preview. Your answers aren’t saved or
        sent.
      </p>
    </dialog>
  );
}

export default function App() {
  const page = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [momentOpen, setMomentOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const media = gsap.matchMedia();
    const ctx = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero-enter", {
          y: 24,
          opacity: 0,
          duration: 1,
          stagger: 0.11,
          ease: "power3.out",
          clearProps: "all",
        });
        gsap.utils
          .toArray<HTMLElement>("[data-reveal]")
          .forEach((el) =>
            gsap.from(el, {
              y: 28,
              opacity: 0,
              duration: 0.85,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
              clearProps: "all",
            }),
          );
        gsap.fromTo(
          ".preview-window",
          { y: 45 },
          {
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".product-stage",
              start: "top bottom",
              end: "top 20%",
              scrub: 0.7,
            },
          },
        );
        gsap.from(".philosophy-word", {
          opacity: 0.18,
          stagger: 0.16,
          ease: "none",
          scrollTrigger: {
            trigger: ".philosophy",
            start: "top 75%",
            end: "bottom 60%",
            scrub: 0.6,
          },
        });
      });
      media.add(
        "(min-width: 850px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)",
        () => {
          const panels = gsap.utils.toArray<HTMLElement>(".flow-panel");
          gsap.set(".flow-pin", { height: "min(780px, 100svh)" });
          gsap.set(".flow-panels", { position: "relative", flex: 1 });
          gsap.set(panels, { position: "absolute", inset: 0 });
          gsap.set(panels.slice(1), { autoAlpha: 0, y: 28 });
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: ".flow-pin",
              start: "top top",
              end: "+=1450",
              scrub: 0.65,
              pin: true,
              anticipatePin: 1,
              onUpdate: (self) =>
                setActiveStep(Math.min(2, Math.floor(self.progress * 3))),
            },
          });
          timeline
            .to(".flow-progress", { scaleX: 1, duration: 3, ease: "none" }, 0)
            .to(panels[0], { autoAlpha: 0, y: -24, duration: 0.25 }, 0.85)
            .to(panels[1], { autoAlpha: 1, y: 0, duration: 0.35 }, 1.0)
            .to(panels[1], { autoAlpha: 0, y: -24, duration: 0.25 }, 1.85)
            .to(panels[2], { autoAlpha: 1, y: 0, duration: 0.35 }, 2.0);
          return () => setActiveStep(0);
        },
      );
    }, page);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      media.revert();
      ctx.revert();
    };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div ref={page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-inner container">
          <a
            className="brand"
            href="#"
            aria-label="Paul home"
            onClick={closeMenu}
          >
            <Mark />
            paul
          </a>
          <nav
            className={`navigation ${menuOpen ? "is-open" : ""}`}
            aria-label="Main navigation"
            id="main-navigation"
          >
            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>
            <a href="#your-space" onClick={closeMenu}>
              Your space
            </a>
            <a href="#questions" onClick={closeMenu}>
              Questions
            </a>
          </nav>
          <a
            className="button primary nav-cta"
            href="#experience"
            onClick={closeMenu}
          >
            Meet Paul <ArrowUpRight size={15} />
          </a>
          <button
            className="menu-toggle icon-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-enter hero-eyebrow">
            <span className="status-dot" /> A QUIET COMPANION FOR YOUR DIGITAL
            LIFE
          </div>
          <h1 className="hero-enter" id="hero-title">
            A little less scrolling.
            <br />
            <span>A little more living.</span>
          </h1>
          <p className="hero-enter hero-description">
            Meet Paul. A thoughtful pause between you and your next scroll.
            <br className="desktop-break" /> Make room for the things you meant
            to do.
          </p>
          <div className="hero-enter hero-actions">
            <a className="button primary" href="#experience">
              Meet your quiet companion <ArrowUpRight size={17} />
            </a>
            <a className="text-link" href="#how-it-works">
              See how it works <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-enter platform-note">
            <span>
              <Command size={13} /> macOS
            </span>
            <span className="note-divider" />
            <span>
              <Monitor size={13} /> Windows
            </span>
            <span className="platform-separator">·</span>
            <span>Designed to feel at home.</span>
          </div>
        </section>

        <section
          className="product-stage container"
          id="experience"
          aria-labelledby="preview-title"
        >
          <div className="preview-caption">
            <h2 id="preview-title">A little more space for what matters.</h2>
            <span>
              MEET YOUR NEW DESKTOP COMPANION <ArrowDown size={13} />
            </span>
          </div>
          <div className="preview-window">
            <AppPreview />
          </div>
          <div className="product-under">
            <span>
              <LockKeyhole size={13} /> Local-first, by design.
            </span>
            <p>A calm place to understand your habits.</p>
            <span>
              <span className="status-dot" /> Your attention. Your terms.
            </span>
          </div>
        </section>

        <section
          className="philosophy container"
          aria-labelledby="philosophy-title"
        >
          <span className="eyebrow" data-reveal>
            THE SPACE BETWEEN IMPULSE AND ACTION
          </span>
          <h2 id="philosophy-title">
            {"You didn’t sit down to lose an hour. Sometimes, all you need is a moment to remember that."
              .split(" ")
              .map((word, i) => (
                <span className="philosophy-word" key={i}>
                  {word}{" "}
                </span>
              ))}
          </h2>
          <p data-reveal>Paul helps you find that moment.</p>
        </section>

        <section
          className="flow-section"
          id="how-it-works"
          aria-label="How Paul works"
        >
          <div className="flow-pin">
            <div className="flow-top container">
              <span className="eyebrow">
                A LITTLE MORE INTENTION, ONE MOMENT AT A TIME
              </span>
              <span className="scroll-cue">
                SCROLL TO EXPLORE <ArrowDown size={13} />
              </span>
            </div>
            <div className="flow-panels container">
              {steps.map((step, index) => (
                <article
                  className={`flow-panel flow-panel-${index}`}
                  key={step.label}
                >
                  <div className="flow-copy">
                    <div className="step-label">
                      <span>0{index + 1}</span>
                      {step.label}
                    </div>
                    <h2>{step.title}</h2>
                    <p>{step.description}</p>
                    <div className="flow-annotation">
                      <step.icon size={15} strokeWidth={1.5} />
                      {index === 0
                        ? "You choose what Paul watches."
                        : index === 1
                          ? "Five levels. As gentle or firm as you need."
                          : "No streaks. No scores. Just you, learning."}
                    </div>
                  </div>
                  <div className="intervention-scene">
                    <div className="scene-line line-one" />
                    <div className="scene-line line-two" />
                    <div className="intervention-card">
                      <div className="intervention-top">
                        <span className="brand">
                          <Mark />
                          paul
                        </span>
                        <span className="eyebrow">A QUIET CHECK-IN</span>
                      </div>
                      <div className="intervention-icon">
                        <step.icon size={25} strokeWidth={1.3} />
                      </div>
                      <p className="intervention-heading">{step.heading}</p>
                      <span className="intervention-sub">{step.sub}</span>
                      <p className="intervention-question">{step.question}</p>
                      <div
                        className="illustrated-choices"
                        aria-label="Example choices"
                      >
                        <span>
                          {step.choices[0]}
                          <ArrowUpRight size={14} />
                        </span>
                        <span>{step.choices[1]}</span>
                      </div>
                      <div className="intervention-foot">{step.foot}</div>
                    </div>
                    <span className="scene-caption">
                      AN EXAMPLE MOMENT WITH PAUL
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="flow-bottom container">
              <div className="flow-track">
                <span className="flow-progress" />
              </div>
              <div className="flow-step-labels">
                {steps.map((s, i) => (
                  <span
                    className={activeStep === i ? "active" : ""}
                    key={s.label}
                  >
                    0{i + 1} <span>{["Notice", "Pause", "Choose"][i]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="your-space container" id="your-space">
          <div className="section-intro" data-reveal>
            <span className="eyebrow">SUPPORT THAT FEELS LIKE SUPPORT</span>
            <h2>
              Built around you.
              <br />
              <span>And the life beyond your screen.</span>
            </h2>
          </div>
          <div className="features">
            <article data-reveal>
              <div
                className="feature-visual boundaries-visual"
                aria-hidden="true"
              >
                <div className="mini-row">
                  <span>YouTube</span>
                  <span className="mini-pill">Intent</span>
                </div>
                <div className="mini-row">
                  <span>Reddit</span>
                  <span className="mini-pill">A gentle pause</span>
                </div>
                <div className="mini-row">
                  <span>Your evening</span>
                  <span className="mini-pill dark">Protected</span>
                </div>
              </div>
              <span className="feature-number">01 / YOUR BOUNDARIES</span>
              <h3>A nudge, or a firmer line.</h3>
              <p>
                Choose the apps, sites, and times that matter. Adjust the
                support from a simple check-in to a temporary block.
              </p>
            </article>
            <article data-reveal>
              <div className="feature-visual rhythm-visual" aria-hidden="true">
                <div className="rhythm-bars">
                  {[
                    26, 43, 31, 68, 50, 82, 64, 45, 35, 56, 39, 27, 42, 30, 22,
                    16, 24, 14,
                  ].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <span>Small moments make a clearer picture.</span>
              </div>
              <span className="feature-number">02 / YOUR PATTERNS</span>
              <h3>Understand the habit.</h3>
              <p>
                See when a quick check becomes a longer stay. Reflect on what
                you came for, and how you felt afterward.
              </p>
            </article>
            <article data-reveal>
              <div className="feature-visual planned-visual" aria-hidden="true">
                <div className="planned-icon">
                  <Play size={17} fill="currentColor" />
                </div>
                <div>
                  <strong>A little time, on purpose.</strong>
                  <span>Planned use · 20 minutes</span>
                </div>
                <Check size={17} />
              </div>
              <span className="feature-number">03 / YOUR CHOICE</span>
              <h3>Enjoy your screen, too.</h3>
              <p>
                Some time online is time well spent. Plan a session and use it
                with intention, with room to enjoy it.
              </p>
            </article>
          </div>
        </section>

        <section
          className="privacy-section container"
          aria-labelledby="privacy-title"
        >
          <div className="privacy-copy" data-reveal>
            <span className="privacy-icon">
              <ShieldCheck size={27} strokeWidth={1.3} />
            </span>
            <span className="eyebrow">YOUR PATTERNS. YOUR CONTROL.</span>
            <h2 id="privacy-title">
              Personal by nature.
              <br />
              <span>Local by design.</span>
            </h2>
            <p>
              Your habits are personal. Paul stores your activity on your
              computer and gives you the controls to pause, export, or delete
              it.
            </p>
          </div>
          <div className="privacy-facts" data-reveal>
            <div>
              <LockKeyhole size={18} />
              <span>
                <strong>No account to create.</strong>
                <p>Your activity lives locally. No telemetry or cloud sync.</p>
              </span>
            </div>
            <div>
              <Eye size={18} />
              <span>
                <strong>Awareness, with your consent.</strong>
                <p>
                  You choose what to watch. No screenshots, keystrokes, or page
                  content.
                </p>
              </span>
            </div>
            <div>
              <Sparkles size={18} />
              <span>
                <strong>Optional AI. Your provider.</strong>
                <p>
                  Connect a chat provider if you want to. Relevant context is
                  shared only when you send a message.
                </p>
              </span>
            </div>
          </div>
        </section>

        <section
          className="faq-section container"
          id="questions"
          aria-labelledby="faq-title"
        >
          <div data-reveal>
            <span className="eyebrow">A FEW THINGS YOU MIGHT WONDER</span>
            <h2 id="faq-title">A little clarity.</h2>
          </div>
          <div className="faq-list" data-reveal>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing container" aria-labelledby="closing-title">
          <Mark className="closing-mark" />
          <span className="eyebrow" data-reveal>
            A QUIETER RELATIONSHIP WITH YOUR SCREEN
          </span>
          <h2 id="closing-title" data-reveal>
            Make a little room.
            <br />
            <span>See what comes back.</span>
          </h2>
          <p data-reveal>Start with one small pause.</p>
          <button
            className="button primary"
            onClick={() => setMomentOpen(true)}
            data-reveal
          >
            Try a moment with Paul <ArrowUpRight size={17} />
          </button>
          <span className="closing-note">
            An interactive preview. No sign-up needed.
          </span>
        </section>
      </main>
      <footer className="site-footer container">
        <a className="brand" href="#" aria-label="Paul home">
          <Mark />
          paul
        </a>
        <p>A little more intention.</p>
        <a
          href="https://github.com/VincentFeng123/paulai-landing"
          target="_blank"
          rel="noreferrer"
        >
          Made with care <ArrowUpRight size={13} />
        </a>
        <span>© {new Date().getFullYear()} Paul</span>
      </footer>
      <MomentDialog open={momentOpen} onClose={() => setMomentOpen(false)} />
    </div>
  );
}
