import React, { useState, useEffect, useRef, useCallback } from "react";

/* ────────────────────────────────────────────────────────────────
   EDIT EVERYTHING HERE. The UI reads from this object only.
   ──────────────────────────────────────────────────────────────── */
const PROFILE = {
  handle: "Arhaan_Sharma",
  node: "projects",
  sector: "Gurugram, India",
  role: "Embedded systems · control loops · Rockets & drones · Machiine learning",
  summary:
    "I like making robots, UAV's, rockets and everything in between. I build the layer where software meets hardware. Currently writing a flight controller from bare metal because the off-the-shelf stack didn't speak to my IMU.",
  links: [
    { label: "GITHUB", href: "https://github.com/arhaan2010" },
    { label: "EMAIL", href: "mailto:arhaansharmadps@gmail.com" },
    { label: "LINKEDIN", href: "https://www.linkedin.com/in/arhaan-sharma-9510b7313/" },
  ],
};

const PROJECTS = [
  {
    id: "fc",
    name: "STM32 based custom flight controller",
    status: "ACTIVE",
    blurb:
      "A flight controller built from scratch, board up. Started because the BMI323 wasn't supported in the mainline Betaflight tree, so the driver got written by hand.",
    specs: [
      ["MCU", "STM32F411CEU6 (Black Pill)"],
      ["IMU", "BMI323 — custom SPI driver"],
      ["LINK", "HGLRC ELRS · CRSF"],
      ["OUTPUT", "DShot / PWM mixer"],
    ],
    queue: ["CRSF parser", "motor mixer", "arming + failsafe logic"],
  },
  {
    id: "wattaware",
    name: "WATTAWARE",
    status: "BUILD",
    blurb:
      "Desktop app that reads live laptop power draw and turns it into cumulative CO₂. Started life as Python sidecars spawned from Electron, then got rewritten as pure Node.",
    specs: [
      ["RUNTIME", "Electron · Node"],
      ["STORE", "Firestore, per-device"],
      ["ID", "node-machine-id"],
      ["CHARTS", "Chart.js"],
    ],
    queue: ["idle-draw calibration", "export to CSV"],
  },
   {
    id: "Sahayak",
    name: "Sahayak",
    status: "Build",
    blurb:
      "A place to empower rural migrant labourers with the knowledge to help them survive in indian metropolitan cities, aiming to improve their living conditions.The website is designed to be a one stop solution for all the problems faced by migrant labourers with a special focus on women empowerment.",
    specs: [
      ["Topics", "Skill Development, interview preparation, multilingual support, Women empowerment"], 
      ["Entrepreneurship", "Startup ideas, business plan, funding, marketing, legal support"],
    ],
    queue: ["Real Time Translation for job interviews", "A more optimised UI/UX for low end devices"],
  },
  {
    id: "rocket",
    name: "TITAN",
    status: "Active",
    blurb:
      "Replace this block in the PROJECTS array. Keep the shape — name, status, blurb, specs, queue — and the card lays itself out.",
    specs: [
      ["FIELD", "value"],
      ["FIELD", "value"],
    ],
    queue: ["todo one", "todo two"],
  },
  {
    id: "war",
    name: "Bahubali",
    status: "Active",
    blurb:
      "An 8Kg double disk War robot with 2, 1.5 kg disks. With custom fabiracted escs, titianium disks and custom aluminum and GFRP parts, the robot is the most technologically advanced robot in the Indian combat robotics scene.",
    specs: [
      ["Weapon", "value"],
      ["Chassis", "value"],
      ["DriveTerrain", "value"],
    ],
    queue: ["titanium support rod fabrication", " Custom ESC firmware development"],
  },
];

const STACK = [
  { name: "C / EMBEDDED", level: 92, note: "Bare-metal, HAL, interrupt-driven loops" },
  { name: "PYTHON", level: 88, note: "Tooling, telemetry, data plumbing" },
  { name: "JAVASCRIPT / NODE", level: 84, note: "Electron, app layer, dashboards" },
  { name: "PCB / HARDWARE", level: 70, note: "Schematic capture, bring-up, debug" },
];

const SECTIONS = [
  { id: "system", label: "SYSTEM" },
  { id: "projects", label: "PROJECTS" },
  { id: "stack", label: "STACK" },
  { id: "contact", label: "CONTACT" },
];

const BOOT_LINES = [
  "POST ......................... OK",
  "clock tree 96MHz ............. OK",
  "spi1 @ 10MHz ................. OK",
  "bmi323 whoami 0x43 ........... OK",
  "gyro bias estimate ........... OK",
  "crsf uart2 420000 ............ OK",
  "control loop 8kHz ............ ARMED",
  "",
  "ready. type `help` for commands.",
];

const LOG_POOL = [
  "gyro_z drift corrected +0.004 rad/s",
  "crsf frame 0x16 · 16ch decoded",
  "rx link quality 100% · rssi -41dBm",
  "loop jitter 12us · within budget",
  "esc telemetry m3 · 21.4C",
  "vbat 16.42V · cells nominal",
  "failsafe armed · 500ms timeout",
  "attitude estimate converged",
];

/* ── small helpers ─────────────────────────────────────────────── */
const micro = { fontSize: "10px", letterSpacing: "0.18em" };
const tiny = { fontSize: "11px", letterSpacing: "0.06em" };

function Rule() {
  return <div className="h-px w-full bg-neutral-800" />;
}

function PanelHead({ tag, id, right }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 border border-neutral-600" />
        <span className="font-bold text-neutral-200" style={micro}>
          {tag}
        </span>
      </div>
      {right || (
        <span className="text-neutral-700" style={micro}>
          {id}
        </span>
      )}
    </div>
  );
}

const clamp = (v, lo = 4, hi = 96) => Math.max(lo, Math.min(hi, v));

/* ── boot overlay ──────────────────────────────────────────────── */
function Boot({ onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= BOOT_LINES.length) {
      const t = setTimeout(onDone, 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v + 1), 130);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 px-6"
      onClick={onDone}
    >
      <div className="w-full max-w-lg font-mono">
        <div className="mb-4 border-b border-neutral-800 pb-2 font-bold text-emerald-400" style={micro}>
          FC_BOOT v0.4.1
        </div>
        {BOOT_LINES.slice(0, n).map((l, i) => (
          <div key={i} className="text-neutral-500" style={tiny}>
            {l.includes("OK") || l.includes("ARMED") ? (
              <>
                <span className="text-neutral-400">{l.slice(0, l.lastIndexOf(" ") + 1)}</span>
                <span className="text-emerald-400">{l.slice(l.lastIndexOf(" ") + 1)}</span>
              </>
            ) : (
              l
            )}
          </div>
        ))}
        <span className="mt-1 inline-block h-3 w-2 bg-emerald-400" />
      </div>
    </div>
  );
}

/* ── attitude source: real device sensor, with sim fallback ────── */
const SIM = "sim";
const LIVE = "live";
const NONE = "none";

function useAttitude() {
  const [mode, setMode] = useState(SIM);
  const [att, setAtt] = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [trace, setTrace] = useState(() => new Array(90).fill(50));
  const heard = useRef(false);

  const pushTrace = useCallback((v) => {
    setTrace((p) => {
      const next = p.slice(1);
      next.push(clamp(v));
      return next;
    });
  }, []);

  /* simulated loop — runs whenever we're not on a real sensor */
  useEffect(() => {
    if (mode === LIVE) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let t = 0;
    const iv = setInterval(() => {
      t += 0.06;
      const roll = Math.sin(t * 0.7) * 14 + Math.sin(t * 2.3) * 2.5;
      const pitch = Math.sin(t * 0.45 + 1) * 7;
      setAtt({ roll, pitch, yaw: (t * 6) % 360 });
      pushTrace(50 - roll * 1.6 + (Math.random() - 0.5) * 4);
    }, 60);
    return () => clearInterval(iv);
  }, [mode, pushTrace]);

  /* real sensor: orientation drives the horizon, rotationRate drives the trace */
  useEffect(() => {
    if (mode !== LIVE) return;

    const onOrient = (e) => {
      if (e.beta === null && e.gamma === null) return;
      heard.current = true;
      setAtt({ roll: e.gamma || 0, pitch: e.beta || 0, yaw: e.alpha || 0 });
    };
    const onMotion = (e) => {
      const r = e.rotationRate;
      if (!r || (r.alpha === null && r.beta === null)) return;
      heard.current = true;
      pushTrace(50 - (r.alpha || 0) * 0.5);
    };

    window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("devicemotion", onMotion);
    // if nothing reports in 1.6s, this machine has no sensor exposed
    const probe = setTimeout(() => {
      if (!heard.current) setMode(NONE);
    }, 1600);

    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("devicemotion", onMotion);
      clearTimeout(probe);
    };
  }, [mode, pushTrace]);

  const connect = useCallback(async () => {
    if (mode === LIVE) {
      setMode(SIM);
      return;
    }
    heard.current = false;

    const DO = typeof window !== "undefined" ? window.DeviceOrientationEvent : null;
    const DM = typeof window !== "undefined" ? window.DeviceMotionEvent : null;
    if (!DO && !DM) {
      setMode(NONE);
      return;
    }
    try {
      // iOS 13+ gates both behind an explicit gesture-triggered prompt
      if (DO && typeof DO.requestPermission === "function") {
        if ((await DO.requestPermission()) !== "granted") {
          setMode(NONE);
          return;
        }
      }
      if (DM && typeof DM.requestPermission === "function") {
        await DM.requestPermission();
      }
    } catch {
      setMode(NONE);
      return;
    }
    setMode(LIVE);
  }, [mode]);

  return { mode, att, trace, connect };
}

/* ── attitude + gyro trace: the hero instrument ────────────────── */
function Attitude() {
  const { mode, att, trace, connect } = useAttitude();

  const pts = trace.map((v, i) => `${(i / (trace.length - 1)) * 300},${v}`).join(" ");

  const badge =
    mode === LIVE
      ? { text: "LIVE", cls: "text-emerald-400 border-emerald-400" }
      : mode === NONE
      ? { text: "NO SENSOR", cls: "text-red-400 border-red-400" }
      : { text: "SIM", cls: "text-neutral-500 border-neutral-800" };

  return (
    <div className="flex h-full flex-col">
      <PanelHead
        tag="ATTITUDE_ESTIMATE"
        right={
          <div className="flex items-center gap-2">
            <span className={`border px-2 py-1 ${badge.cls}`} style={micro}>
              {badge.text}
            </span>
            <button
              onClick={connect}
              className="border border-neutral-800 px-2 py-1 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              style={micro}
            >
              {mode === LIVE ? "UNLINK" : "LINK"}
            </button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* artificial horizon */}
        <div className="relative mx-auto h-36 w-36 overflow-hidden border border-neutral-800 bg-neutral-950">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <g transform={`rotate(${-att.roll} 50 50) translate(0 ${att.pitch * 1.4})`}>
              <rect x="-60" y="-60" width="220" height="110" fill="#0f0f0f" />
              <rect x="-60" y="50" width="220" height="150" fill="#141414" />
              <line x1="-60" y1="50" x2="220" y2="50" stroke="#4ade80" strokeWidth="0.7" />
              {[-30, -15, 15, 30].map((o) => (
                <line
                  key={o}
                  x1={o % 30 === 0 ? 36 : 42}
                  y1={50 + o}
                  x2={o % 30 === 0 ? 64 : 58}
                  y2={50 + o}
                  stroke="#404040"
                  strokeWidth="0.6"
                />
              ))}
            </g>
            <line x1="26" y1="50" x2="43" y2="50" stroke="#e5e5e5" strokeWidth="1.2" />
            <line x1="57" y1="50" x2="74" y2="50" stroke="#e5e5e5" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="1.4" fill="#e5e5e5" />
          </svg>
        </div>

        {/* gyro trace */}
        <div className="border border-neutral-800 bg-neutral-950 p-2">
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-16 w-full">
            <line x1="0" y1="50" x2="300" y2="50" stroke="#262626" strokeWidth="0.5" />
            <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-1 text-neutral-700" style={micro}>
            {mode === LIVE
              ? "GYRO_Z · deviceMotion.rotationRate"
              : "GYRO_Z · 8kHz · SYNTHETIC"}
          </div>
        </div>

        {mode === NONE && (
          <p className="border border-neutral-800 p-3 leading-relaxed text-neutral-500" style={tiny}>
            This machine reports no motion sensor. Most clamshell laptops don't expose one to the
            browser — open the page on a phone or a convertible, over HTTPS, and press LINK again.
          </p>
        )}

        <div className="grid grid-cols-3 gap-px bg-neutral-800">
          {[
            ["ROLL", att.roll],
            ["PITCH", att.pitch],
            ["YAW", att.yaw],
          ].map(([k, v]) => (
            <div key={k} className="bg-neutral-950 px-2 py-3 text-center">
              <div className="text-neutral-600" style={micro}>
                {k}
              </div>
              <div className="mt-1 tabular-nums text-emerald-400" style={{ fontSize: "15px" }}>
                {v.toFixed(1)}°
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── rolling log ───────────────────────────────────────────────── */
function LogFeed() {
  const [lines, setLines] = useState(() =>
    LOG_POOL.slice(0, 5).map((m, i) => ({ id: i, t: stamp(i), m }))
  );
  useEffect(() => {
    let id = 100;
    const iv = setInterval(() => {
      setLines((p) => {
        const next = [
          ...p,
          { id: id++, t: stamp(0), m: LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)] },
        ];
        return next.slice(-9);
      });
    }, 2600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <PanelHead tag="TELEMETRY_STREAM" id="LIVE" />
      <div className="flex-1 space-y-1 overflow-hidden p-4">
        {lines.map((l) => (
          <div key={l.id} className="flex gap-3" style={tiny}>
            <span className="shrink-0 text-neutral-700">{l.t}</span>
            <span className="text-neutral-400">{l.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function stamp(off) {
  const d = new Date(Date.now() - off * 4000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds()
  ).padStart(2, "0")}`;
}

/* ── project card ──────────────────────────────────────────────── */
function ProjectCard({ p }) {
  const tone =
    p.status === "ACTIVE"
      ? "text-emerald-400 border-emerald-400"
      : p.status === "BUILD"
      ? "text-neutral-200 border-neutral-600"
      : "text-neutral-600 border-neutral-800";

  return (
    <article className="flex flex-col border border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h3 className="font-bold text-neutral-100" style={{ fontSize: "13px", letterSpacing: "0.06em" }}>
          {p.name}
        </h3>
        <span className={`border px-2 py-1 ${tone}`} style={micro}>
          {p.status}
        </span>
      </div>

      <div className="flex-1 space-y-5 p-4">
        <p className="leading-relaxed text-neutral-400" style={{ fontSize: "13px" }}>
          {p.blurb}
        </p>

        <div className="space-y-px bg-neutral-800">
          {p.specs.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 bg-neutral-950 py-2">
              <span className="text-neutral-600" style={micro}>
                {k}
              </span>
              <span className="text-right text-neutral-300" style={tiny}>
                {v}
              </span>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 text-neutral-600" style={micro}>
            QUEUE
          </div>
          <ul className="space-y-1">
            {p.queue.map((q) => (
              <li key={q} className="flex gap-2 text-neutral-400" style={tiny}>
                <span className="text-emerald-400">›</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/* ── the command line: this page's signature ───────────────────── */
function CommandBar({ onNavigate }) {
  const [history, setHistory] = useState([
    { k: "out", v: "session opened. `help` lists commands." },
  ]);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const scroller = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [history, open]);

  const push = (k, v) => setHistory((p) => [...p, { k, v }]);

  const run = useCallback(
    (raw) => {
      const line = raw.trim();
      if (!line) return;
      push("in", line);
      const [cmd, ...rest] = line.split(/\s+/);
      const arg = rest.join(" ").toLowerCase();

      switch (cmd.toLowerCase()) {
        case "help":
          push(
            "out",
            "help · ls · open <section> · cat <project> · whoami · stack · clear"
          );
          break;
        case "ls":
          push("out", SECTIONS.map((s) => s.id).join("  ") + "   —   " + PROJECTS.map((p) => p.id).join("  "));
          break;
        case "open":
        case "cd": {
          const hit = SECTIONS.find((s) => s.id === arg);
          if (hit) {
            onNavigate(hit.id);
            push("out", `→ ${hit.label}`);
          } else {
            push("err", `no section '${arg || "?"}'. run ls to see what's here.`);
          }
          break;
        }
        case "cat": {
          const p = PROJECTS.find((x) => x.id === arg);
          if (p) {
            push("out", `${p.name} [${p.status}] — ${p.blurb}`);
            p.specs.forEach(([k, v]) => push("out", `  ${k.padEnd(9)} ${v}`));
            onNavigate("projects");
          } else {
            push("err", `no project '${arg || "?"}'. run ls to see what's here.`);
          }
          break;
        }
        case "whoami":
          push("out", `${PROFILE.handle} — ${PROFILE.role}`);
          break;
        case "stack":
          STACK.forEach((s) => push("out", `  ${s.name.padEnd(20)} ${s.level}%  ${s.note}`));
          break;
        case "clear":
          setHistory([]);
          break;
        case "sudo":
          push("err", "you already have root here. it's your own portfolio.");
          break;
        default:
          push("err", `command not found: ${cmd}. try help.`);
      }
    },
    [onNavigate]
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950">
      {open && (
        <div ref={scroller} className="max-h-48 overflow-y-auto px-4 py-3 sm:px-6">
          {history.map((h, i) => (
            <div
              key={i}
              className={
                h.k === "in"
                  ? "text-neutral-200"
                  : h.k === "err"
                  ? "text-red-400"
                  : "text-neutral-500"
              }
              style={{ ...tiny, whiteSpace: "pre-wrap" }}
            >
              {h.k === "in" ? `$ ${h.v}` : h.v}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
          setValue("");
          setOpen(true);
        }}
        className="flex items-center gap-3 px-4 py-3 sm:px-6"
      >
        <span className="text-emerald-400" style={tiny}>
          {PROFILE.handle}@{PROFILE.node.toLowerCase()} $
        </span>
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="type help"
          aria-label="Command input"
          className="flex-1 bg-transparent text-neutral-200 outline-none placeholder:text-neutral-700 focus:ring-0"
          style={tiny}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="border border-neutral-800 px-2 py-1 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          style={micro}
        >
          {open ? "HIDE" : "OUTPUT"}
        </button>
      </form>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────────── */
export default function TerminalPortfolio() {
  const [booted, setBooted] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [active, setActive] = useState("system");
  const refs = useRef({});

  useEffect(() => {
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setBooted(true);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setClock(stamp(0)), 1000);
    setClock(stamp(0));
    return () => clearInterval(iv);
  }, []);

  const go = useCallback((id) => {
    setActive(id);
    const el = refs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const bind = (id) => (el) => {
    refs.current[id] = el;
  };

  return (
    <div className="min-h-screen bg-neutral-950 font-mono text-neutral-300 antialiased">
      {!booted && <Boot onDone={() => setBooted(true)} />}

      {/* top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="font-bold text-neutral-100" style={micro}>
            {PROFILE.handle.toUpperCase()}_{PROFILE.node}
          </span>
          <span className="hidden h-3 w-px bg-neutral-800 sm:block" />
          <span className="hidden text-neutral-600 sm:block" style={micro}>
            {PROFILE.sector}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="tabular-nums text-neutral-600" style={micro}>
            {clock}
          </span>
          <span className="flex items-center gap-2 border border-neutral-800 px-2 py-1">
            <span className="h-1.5 w-1.5 bg-emerald-400" />
            <span className="text-emerald-400" style={micro}>
              LINK
            </span>
          </span>
        </div>
      </header>

      <div className="flex">
        {/* side nav */}
        <nav className="sticky top-12 hidden h-screen w-52 shrink-0 border-r border-neutral-800 pt-6 lg:block">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={`flex w-full items-center gap-3 border-l-2 px-5 py-3 text-left focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                active === s.id
                  ? "border-emerald-400 bg-neutral-900 text-emerald-400"
                  : "border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
              style={micro}
            >
              <span className="text-neutral-700">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* content */}
        <main className="min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-10">
          {/* SYSTEM */}
          <section ref={bind("system")} className="scroll-mt-16">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="border border-neutral-800 bg-neutral-950 lg:col-span-7">
                <PanelHead tag="OPERATOR" id="SEC.01" />
                <div className="space-y-6 p-6">
                  <h1
                    className="font-bold uppercase leading-none text-neutral-100"
                    style={{ fontSize: "clamp(28px, 6vw, 52px)", letterSpacing: "-0.03em" }}
                  >
                    {PROFILE.handle}
                    <span className="text-emerald-400">_</span>
                  </h1>
                  <p className="text-neutral-500" style={tiny}>
                    {PROFILE.role}
                  </p>
                  <Rule />
                  <p className="max-w-xl leading-relaxed text-neutral-400" style={{ fontSize: "14px" }}>
                    {PROFILE.summary}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PROFILE.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        className="border border-neutral-800 px-3 py-2 text-neutral-400 hover:border-emerald-400 hover:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        style={micro}
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-neutral-800 bg-neutral-950 lg:col-span-5">
                <Attitude />
              </div>
            </div>
          </section>

          {/* PROJECTS */}
          <section ref={bind("projects")} className="scroll-mt-16 pt-12">
            <div className="mb-4 flex items-center gap-4">
              <h2 className="border border-neutral-800 px-3 py-1 font-bold text-neutral-200" style={micro}>
                PROJECTS
              </h2>
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-neutral-700" style={micro}>
                {PROJECTS.length} DEPLOYED
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PROJECTS.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </section>

          {/* STACK */}
          <section ref={bind("stack")} className="scroll-mt-16 pt-12">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="border border-neutral-800 bg-neutral-950 lg:col-span-7">
                <PanelHead tag="STACK" id="SEC.03" />
                <div className="space-y-7 p-6">
                  {STACK.map((s) => (
                    <div key={s.name}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="text-neutral-200" style={tiny}>
                          {s.name}
                        </span>
                        <span className="tabular-nums text-emerald-400" style={micro}>
                          {s.level}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-neutral-800">
                        <div className="h-full bg-emerald-400" style={{ width: `${s.level}%` }} />
                      </div>
                      <div className="mt-2 text-neutral-600" style={micro}>
                        {s.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-neutral-800 bg-neutral-950 lg:col-span-5">
                <LogFeed />
              </div>
            </div>
          </section>

          {/* CONTACT */}
          <section ref={bind("contact")} className="scroll-mt-16 pt-12">
            <div className="border border-neutral-800 bg-neutral-950">
              <PanelHead tag="CONTACT" id="SEC.04" />
              <div className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="text-neutral-200" style={{ fontSize: "15px" }}>
                    Open to hardware and firmware work.
                  </p>
                  <p className="mt-1 text-neutral-600" style={tiny}>
                    Fastest route is email. I read everything.
                  </p>
                </div>
                <a
                  href={PROFILE.links.find((l) => l.label === "EMAIL")?.href || "#"}
                  className="border border-emerald-400 px-5 py-3 font-bold text-emerald-400 hover:bg-emerald-400 hover:text-neutral-950 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  style={micro}
                >
                  SEND MESSAGE
                </a>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-4">
              <span className="text-neutral-700" style={micro}>
                BUILT FROM BARE METAL UP
              </span>
              <span className="text-neutral-700" style={micro}>
                {new Date().getFullYear()} · {PROFILE.node}
              </span>
            </div>
          </section>
        </main>
      </div>

      <CommandBar onNavigate={go} />
    </div>
  );
}