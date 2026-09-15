import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Home,
  Lightbulb,
  Shield,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import "./preview.css";

type PreviewTab = "Today" | "Boundaries" | "Patterns";
const tabs = [
  { name: "Today", icon: Home },
  { name: "Boundaries", icon: Shield },
  { name: "Patterns", icon: Clock3 },
] as const;
const levels = ["Awareness", "Delay", "Intent", "Friction", "Block"];
const descriptions = [
  "Notice the moment. Choose what you came for.",
  "A five-minute pause, if you want it.",
  "Name your intent. Choose a time limit.",
  "Take ten seconds before continuing.",
  "A thirty-minute boundary for watched items.",
];

function PaulMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`preview-mark ${className}`}
      style={{
        maskImage: `url("${import.meta.env.BASE_URL}paul-mark.svg")`,
        WebkitMaskImage: `url("${import.meta.env.BASE_URL}paul-mark.svg")`,
      }}
    />
  );
}

function RhythmChart() {
  return (
    <section className="preview-rhythm" aria-labelledby="preview-rhythm-title">
      <div className="preview-section-heading">
        <div>
          <h4 id="preview-rhythm-title">Your screen-time rhythm</h4>
          <p>Time on watched apps and sites</p>
        </div>
        <span className="preview-period">Last 7 days</span>
      </div>
      <div className="preview-chart">
        <div className="preview-chart-axis" aria-hidden="true">
          <span>120m</span>
          <span>60m</span>
          <span>0</span>
        </div>
        <div className="preview-chart-plot">
          <div className="preview-chart-grid" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <svg
            viewBox="0 0 520 126"
            preserveAspectRatio="none"
            role="img"
            aria-label="Illustrative activity: 85, 108, 66, 81, 40, 52, and 38 minutes over seven days."
          >
            <path
              className="preview-chart-line"
              d="M 4 37 L 89 13 L 174 57 L 260 41 L 346 84 L 432 71 L 516 86"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
            {[
              [4, 37],
              [89, 13],
              [174, 57],
              [260, 41],
              [346, 84],
              [432, 71],
              [516, 86],
            ].map(([cx, cy]) => (
              <circle
                key={cx}
                cx={cx}
                cy={cy}
                r="3"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>
      </div>
      <div className="preview-chart-days" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={index} className={index === 6 ? "is-today" : ""}>
            {day}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function AppPreview() {
  const [tab, setTab] = useState<PreviewTab>("Today");
  const [level, setLevel] = useState(2);
  const [watching, setWatching] = useState({ YouTube: true, Reddit: true });
  const [planned, setPlanned] = useState(false);
  const [paused, setPaused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusPanel = useRef(false);
  function openPanel(next: PreviewTab) {
    if (next === tab) {
      panelRef.current?.focus({ preventScroll: true });
      return;
    }
    focusPanel.current = true;
    setTab(next);
  }
  useEffect(() => {
    if (focusPanel.current) {
      panelRef.current?.focus({ preventScroll: true });
      focusPanel.current = false;
    }
  }, [tab]);

  return (
    <div
      className="app-preview"
      aria-label="Interactive Paul desktop app preview"
    >
      <div className="preview-titlebar">
        <div className="preview-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span>Paul</span>
        <span className="preview-window-label">Interactive preview</span>
      </div>
      <div className="preview-body">
        <aside className="preview-sidebar">
          <div className="preview-brand">
            <PaulMark />
            <span>paul</span>
          </div>
          <div
            className="preview-navigation"
            role="tablist"
            aria-label="Explore the Paul app"
          >
            {tabs.map(({ name, icon: Icon }, index) => (
              <button
                key={name}
                type="button"
                role="tab"
                id={`preview-tab-${name.toLowerCase()}`}
                aria-selected={tab === name}
                aria-controls="preview-panel"
                tabIndex={tab === name ? 0 : -1}
                className={tab === name ? "is-active" : ""}
                onClick={() => setTab(name)}
                onKeyDown={(event) => {
                  const direction = ["ArrowRight", "ArrowDown"].includes(
                    event.key,
                  )
                    ? 1
                    : ["ArrowLeft", "ArrowUp"].includes(event.key)
                      ? -1
                      : 0;
                  if (!direction && event.key !== "Home" && event.key !== "End")
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : (index + direction + tabs.length) % tabs.length;
                  setTab(tabs[next].name);
                  (
                    event.currentTarget.parentElement?.children[next] as
                      | HTMLButtonElement
                      | undefined
                  )?.focus();
                }}
              >
                <Icon size={17} strokeWidth={1.5} />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <div className="preview-sidebar-note">
            <PaulMark />
            <h4>One small pause.</h4>
            <p>
              Make room for a<br />
              different next step.
            </p>
          </div>
          <span className="preview-sidebar-status">
            <span
              className={`preview-status-dot ${paused ? "is-paused" : ""}`}
            />
            {paused ? "Taking a pause" : "Watching quietly"}
          </span>
        </aside>
        <div
          ref={panelRef}
          className="preview-main"
          id="preview-panel"
          role="tabpanel"
          aria-labelledby={`preview-tab-${tab.toLowerCase()}`}
          tabIndex={0}
        >
          {tab === "Today" && (
            <>
              <header className="preview-page-heading">
                <div>
                  <h3>Good afternoon.</h3>
                  <p>A little more space for what matters.</p>
                </div>
                <span className="preview-today-label">Your day</span>
              </header>
              <div className="preview-stats">
                {[
                  {
                    label: "Watched today",
                    value: "38",
                    unit: "min",
                    Icon: Clock3,
                  },
                  { label: "Episodes this week", value: "12", Icon: Globe2 },
                  { label: "Interrupted", value: "5", Icon: ArrowDownRight },
                ].map(({ label, value, unit, Icon }) => (
                  <div className="preview-stat" key={label}>
                    <Icon size={18} strokeWidth={1.5} />
                    <span>{label}</span>
                    <strong>
                      {value}
                      {unit && <small> {unit}</small>}
                    </strong>
                  </div>
                ))}
              </div>
              <RhythmChart />
              <section
                className="preview-watched"
                aria-labelledby="preview-watched-title"
              >
                <div className="preview-section-heading">
                  <h4 id="preview-watched-title">Your watched items</h4>
                  <button
                    type="button"
                    className="preview-text-button"
                    onClick={() => openPanel("Boundaries")}
                  >
                    Manage
                    <ChevronRight size={13} />
                  </button>
                </div>
                {(Object.keys(watching) as (keyof typeof watching)[]).map(
                  (name) => (
                    <button
                      type="button"
                      key={name}
                      className="preview-watched-row"
                      onClick={() => openPanel("Boundaries")}
                      aria-label={`Adjust the sample boundary for ${name}`}
                    >
                      <span className="preview-site-icon">
                        <Globe2 size={17} strokeWidth={1.5} />
                      </span>
                      <span className="preview-watch-name">
                        <strong>{name}</strong>
                        <small>Website · All day</small>
                      </span>
                      <span className="preview-boundary-tag">
                        <span
                          className={`preview-status-dot ${!watching[name] || paused ? "is-paused" : ""}`}
                        />
                        {!watching[name] || paused
                          ? "Paused"
                          : name === "YouTube" && planned
                            ? "Planned use"
                            : levels[level]}
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  ),
                )}
              </section>
              <div className="preview-monitor">
                <span>
                  <span
                    className={`preview-status-dot ${paused ? "is-paused" : ""}`}
                  />
                  {paused ? "Watching is paused" : `Watching · Level ${level}`}
                </span>
                <button
                  type="button"
                  className="preview-text-button"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={
                    paused
                      ? "Resume watching in this sample preview"
                      : "Pause watching in this sample preview"
                  }
                >
                  {paused ? "Resume watching" : "Pause watching"}
                </button>
              </div>
            </>
          )}
          {tab === "Boundaries" && (
            <>
              <header className="preview-page-heading">
                <div>
                  <h3>Your boundaries.</h3>
                  <p>A little help, at the level you choose.</p>
                </div>
                <SlidersHorizontal size={21} strokeWidth={1.5} />
              </header>
              <section
                className="preview-level-card"
                aria-labelledby="preview-level-title"
              >
                <div className="preview-section-heading">
                  <h4 id="preview-level-title">How Paul steps in</h4>
                  <span className="preview-small">Try a level</span>
                </div>
                <div
                  className="preview-levels"
                  role="group"
                  aria-label="Sample intervention level"
                >
                  {levels.map((name, index) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={level === index}
                      aria-label={`Level ${index}: ${name}`}
                      onClick={() => setLevel(index)}
                    >
                      {index}
                    </button>
                  ))}
                </div>
                <div className="preview-level-description" aria-live="polite">
                  <strong>{levels[level]}</strong>
                  <p>{descriptions[level]}</p>
                </div>
              </section>
              <section className="preview-boundary-items">
                <h4>Watched items</h4>
                {(Object.keys(watching) as (keyof typeof watching)[]).map(
                  (name) => (
                    <div className="preview-toggle-row" key={name}>
                      <span className="preview-site-icon">
                        <Globe2 size={17} strokeWidth={1.5} />
                      </span>
                      <span className="preview-watch-name">
                        <strong>{name}</strong>
                        <small>
                          {watching[name]
                            ? "Watching · All day"
                            : "Watching paused"}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="preview-toggle"
                        role="switch"
                        aria-checked={watching[name]}
                        aria-label={`Watch ${name} in this sample preview`}
                        onClick={() =>
                          setWatching((current) => ({
                            ...current,
                            [name]: !current[name],
                          }))
                        }
                      >
                        <span />
                      </button>
                    </div>
                  ),
                )}
              </section>
              <section className="preview-planned">
                <Clock3 size={19} strokeWidth={1.5} />
                <div>
                  <h4>Make room for planned use.</h4>
                  <p>
                    {planned
                      ? "YouTube · 20 minutes of planned time."
                      : "Choose a time. Paul gives you space."}
                  </p>
                </div>
                <button
                  type="button"
                  className="preview-action-button"
                  onClick={() => setPlanned((value) => !value)}
                  aria-label={
                    planned
                      ? "End the sample planned-use window"
                      : "Try a sample twenty-minute planned-use window"
                  }
                >
                  {planned ? (
                    <>
                      <Check size={14} />
                      Planned
                    </>
                  ) : (
                    <>
                      Try it
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </section>
              <p className="preview-interaction-note">
                Explore freely. These controls only change the sample.
              </p>
            </>
          )}
          {tab === "Patterns" && (
            <>
              <header className="preview-page-heading">
                <div>
                  <h3>The pattern, in perspective.</h3>
                  <p>Small observations. A clearer picture.</p>
                </div>
              </header>
              <div className="preview-pattern-summary">
                <span className="preview-site-icon">
                  <TrendingDown size={20} strokeWidth={1.5} />
                </span>
                <div>
                  <span>Average session</span>
                  <strong>
                    24 min <ArrowRight size={18} strokeWidth={1.5} /> 16 min
                  </strong>
                </div>
                <p>
                  Same part
                  <br />
                  of last week
                </p>
              </div>
              <RhythmChart />
              <section className="preview-insight">
                <Lightbulb size={20} strokeWidth={1.5} />
                <div>
                  <h4>A moment worth noticing.</h4>
                  <p>Your longer sessions tend to start in the evening.</p>
                  <span>Based on 6 sample observations</span>
                </div>
              </section>
              <p className="preview-interaction-note">
                Real patterns appear as Paul gets to know your rhythm.
              </p>
            </>
          )}
        </div>
        <aside
          className="preview-rail"
          aria-label="Paul companion and sample activity"
        >
          <section className="preview-profile">
            <div className="preview-avatar">
              <PaulMark />
              <span
                className={`preview-profile-status ${paused ? "is-paused" : ""}`}
              />
            </div>
            <h4>Paul</h4>
            <p>A quiet companion</p>
            <div className="preview-target">
              <span>The change you chose</span>
              <p>
                Less scrolling.
                <br />
                More of my evening.
              </p>
            </div>
          </section>
          <div className="preview-activity-heading">
            <span />
            <h4>Activity</h4>
            <span />
          </div>
          <div className="preview-activity-entry">
            <Globe2 size={15} strokeWidth={1.5} />
            <div>
              <div>
                <strong>YouTube</strong>
                <time>2:14 PM</time>
              </div>
              <p>12 min · Completed</p>
              <span>“Watch something specific”</span>
            </div>
          </div>
          <div className="preview-activity-entry">
            <Globe2 size={15} strokeWidth={1.5} />
            <div>
              <div>
                <strong>Reddit</strong>
                <time>11:32 AM</time>
              </div>
              <p>8 min · Interrupted</p>
              <span>A small pause. A different choice.</span>
            </div>
          </div>
          <button
            type="button"
            className="preview-rail-action"
            onClick={() => openPanel("Patterns")}
          >
            See the bigger picture
            <ArrowRight size={14} />
          </button>
          <span className="preview-local">
            <Shield size={12} strokeWidth={1.5} />
            Local by default. Yours by design.
          </span>
        </aside>
      </div>
      <div className="preview-sample-label">
        <span className="preview-status-dot" />
        Illustrative preview · Sample activity
      </div>
    </div>
  );
}
