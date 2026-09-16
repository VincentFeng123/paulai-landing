import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Eye,
  LockKeyhole,
  Pause,
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
        Catch the scroll.
        <br />
        Before it catches you.
      </>
    ),
    description:
      "You went online for one thing. Now you’re somewhere else. Paul notices when you open the apps and sites you’ve chosen to watch.",
    icon: Eye,
  },
  {
    label: "Make a little space",
    title: (
      <>
        Put a pause
        <br />
        in the pattern.
      </>
    ),
    description:
      "A gentle check-in creates a little room between the impulse and the next click. Choose the amount of support that feels right for you.",
    icon: Pause,
  },
  {
    label: "Choose what’s next",
    title: (
      <>
        Make the next
        <br />
        20 minutes yours.
      </>
    ),
    description:
      "Stay for a reason. Set aside some time. Or close the tab. Planned use gives you room to enjoy your screen on purpose.",
    icon: SlidersHorizontal,
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
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) =>
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
          { y: 60, scale: 0.965, rotateX: 5, transformPerspective: 1200 },
          {
            y: 0,
            scale: 1,
            rotateX: 0,
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
        "(min-width: 1100px) and (min-height: 900px) and (prefers-reduced-motion: no-preference)",
        () => {
          const panels = gsap.utils.toArray<HTMLElement>(".flow-panel");
          gsap.set(".flow-pin", { height: "100svh" });
          gsap.set(".flow-panels", { position: "relative", flex: 1 });
          gsap.set(panels, { position: "absolute", inset: 0 });
          gsap.set(panels.slice(1), { autoAlpha: 0, y: 28 });
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: ".flow-pin",
              start: "top top",
              end: "+=1150",
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
          panels.forEach((panel, chapter) => {
            const layers = panel.querySelectorAll<HTMLElement>(".float-layer");
            layers.forEach((layer, index) => {
              const distance = 24 + (index % 3) * 15;
              timeline.fromTo(
                layer,
                { y: distance },
                {
                  y: -distance * 0.35,
                  duration: 0.85,
                  ease: "none",
                  immediateRender: false,
                },
                chapter + 0.08,
              );
            });
          });
          return () => setActiveStep(0);
        },
      );
      media.add(
        "(prefers-reduced-motion: no-preference) and (max-width: 1099px), (prefers-reduced-motion: no-preference) and (max-height: 899px)",
        () => {
          gsap.utils
            .toArray<HTMLElement>(".intervention-scene")
            .forEach((scene) => {
              scene
                .querySelectorAll<HTMLElement>(".float-layer")
                .forEach((layer, index) => {
                  const distance = 28 + (index % 3) * 17;
                  gsap.fromTo(
                    layer,
                    { y: distance },
                    {
                      y: -distance * 0.4,
                      ease: "none",
                      scrollTrigger: {
                        trigger: scene,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 0.8,
                      },
                    },
                  );
                });
            });
        },
      );
    }, page);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      media.revert();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-inner container">
          <a className="brand" href="#" aria-label="Paul home">
            <Mark />
            paul
          </a>
          <a className="button primary nav-cta" href="#experience">
            Explore Paul
          </a>
        </div>
      </header>
      <main id="main">
        <section className="hero-shell" aria-labelledby="hero-title">
          <div className="hero container">
            <h1 className="hero-enter" id="hero-title">
              You had
              <br />
              <span>better plans.</span>
            </h1>
            <div className="hero-support hero-enter">
              <p className="hero-description">
                Paul helps you catch the mindless scroll, take a breath, and get
                back to what you meant to do.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#experience">
                  Explore Paul <ArrowUpRight size={19} />
                </a>
                <a className="hero-story-link" href="#how-it-works">
                  Meet your moment of pause <ArrowDown size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          className="flow-section"
          id="how-it-works"
          aria-label="How Paul works"
        >
          <div className="flow-pin">
            <div className="flow-top container">
              <span className="eyebrow">01. HOW PAUL HELPS</span>
              <span className="scroll-cue">
                SCROLL TO EXPLORE <ArrowDown size={13} />
              </span>
            </div>
            <div className="flow-navigation container">
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
                  <div
                    className={`intervention-scene scene-${index}`}
                    aria-label={`Illustrative preview: ${step.label}`}
                  >
                    {index === 0 ? (
                      <div className="floating-notice">
                        <span className="floating-domain float-layer">
                          youtube.com <ArrowUpRight size={16} />
                        </span>
                        <Mark className="floating-mark float-layer" />
                        <p className="floating-question float-layer">
                          What did you
                          <br />
                          come here for?
                        </p>
                        <div className="floating-answers float-layer">
                          <span>
                            Something specific <ArrowRight size={19} />
                          </span>
                          <span>Just browsing</span>
                        </div>
                      </div>
                    ) : index === 1 ? (
                      <div className="floating-pause">
                        <span className="floating-overline float-layer">
                          A LITTLE SPACE TO DECIDE
                        </span>
                        <div className="floating-timer float-layer">
                          05<span>:00</span>
                        </div>
                        <p className="floating-caption float-layer">
                          The feed can wait.
                        </p>
                        <div className="floating-answers float-layer">
                          <span>
                            Take a breath <Pause size={18} />
                          </span>
                          <span>Or continue. It’s your call.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="floating-planned">
                        <span className="floating-overline float-layer">
                          TIME YOU CHOSE
                        </span>
                        <div className="floating-timer float-layer">
                          20<span>:00</span>
                        </div>
                        <span
                          className="floating-time-rule float-layer"
                          aria-hidden="true"
                        />
                        <p className="floating-caption float-layer">
                          A tutorial. Then back to your day.
                        </p>
                        <span className="floating-domain float-layer">
                          YouTube · Planned use
                        </span>
                      </div>
                    )}
                    <span className="scene-caption">ILLUSTRATIVE PREVIEW</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="product-stage container"
          id="experience"
          aria-labelledby="preview-title"
        >
          <h2 className="sr-only" id="preview-title">
            Explore the Paul app
          </h2>
          <div className="preview-window">
            <AppPreview />
          </div>
          <div className="product-under">
            <p>Made for macOS and Windows.</p>
            <span>Interactive preview · Sample activity</span>
          </div>
        </section>

        <section
          className="philosophy container"
          aria-labelledby="philosophy-title"
        >
          <span className="eyebrow" data-reveal>
            SOUND FAMILIAR?
          </span>
          <h2 id="philosophy-title">
            {"“Just five minutes” shouldn’t take your whole evening."
              .split(" ")
              .map((word, i) => (
                <span className="philosophy-word" key={i}>
                  {word}{" "}
                </span>
              ))}
          </h2>
          <p data-reveal>
            Your attention is valuable. Start treating it that way.
          </p>
        </section>

        <section
          className="privacy-section container"
          id="your-space"
          aria-labelledby="privacy-title"
        >
          <div className="privacy-copy" data-reveal>
            <span className="eyebrow">02. YOUR PRIVACY</span>
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
            <span className="eyebrow">03. QUESTIONS</span>
            <h2 id="faq-title">
              Questions,
              <br /> answered.
            </h2>
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
          <h2 id="closing-title" data-reveal>
            Go do
            <br />
            <span>your thing.</span>
          </h2>
          <div className="closing-actions" data-reveal>
            <p>Start with one intentional moment.</p>
            <button
              className="button primary"
              onClick={() => setMomentOpen(true)}
            >
              Try a moment with Paul <ArrowUpRight size={17} />
            </button>
            <span className="closing-note">
              An interactive preview. No sign-up needed.
            </span>
          </div>
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
          Made for a more intentional life. <ArrowUpRight size={13} />
        </a>
        <span>© {new Date().getFullYear()} Paul</span>
      </footer>
      <MomentDialog open={momentOpen} onClose={() => setMomentOpen(false)} />
    </div>
  );
}
