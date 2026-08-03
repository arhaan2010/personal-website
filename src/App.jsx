import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PROFILE,
  PROJECTS,
  STACK,
  SECTIONS,
  BOOT_LINES,
  LOG_POOL,
} from "./portfolio-data.js";

/* ── type scale ────────────────────────────────────────────────── */
const micro = { fontSize: "10px", letterSpacing: "0.18em" };
const tiny = { fontSize: "11px", letterSpacing: "0.06em" };
const clamp = (v, lo = 4, hi = 96) => Math.max(lo, Math.min(hi, v));
const norm = (s) => (s || "").toUpperCase();

/* ═══ THEMES ════════════════════════════════════════════════════
   Every accent in the app uses Tailwind's emerald-400 utilities.
   This stylesheet remaps those utilities to a CSS variable, so
   swapping one variable retints the whole page.
   ═════════════════════════════════════════════════════════════ */
const THEMES = {
  phosphor: "#4ade80",
  amber: "#fbbf24",
  ice: "#38bdf8",
  blood: "#f87171",
};
const THEME_IDS = Object.keys(THEMES);

const ACCENT_CSS = `
.tp .text-emerald-400{color:var(--accent)}
.tp .bg-emerald-400{background-color:var(--accent)}
.tp .border-emerald-400{border-color:var(--accent)}
.tp .stroke-emerald-400{stroke:var(--accent)}
.tp .hover\\:text-emerald-400:hover{color:var(--accent)}
.tp .hover\\:bg-emerald-400:hover{background-color:var(--accent)}
.tp .hover\\:border-emerald-400:hover{border-color:var(--accent)}
.tp .focus\\:ring-emerald-400:focus{--tw-ring-color:var(--accent)}
.tp ::selection{background:var(--accent);color:#0a0a0a}
`;

function useAccentStylesheet() {
  useEffect(() => {
    if (document.getElementById("tp-accent")) return;
    const el = document.createElement("style");
    el.id = "tp-accent";
    el.textContent = ACCENT_CSS;
    document.head.appendChild(el);
  }, []);
}

/* ── primitives ────────────────────────────────────────────────── */
function Rule() {
  return <div className="h-px w-full bg-neutral-800" />;
}

function PanelHead({ tag, id, right }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2 w-2 shrink-0 border border-neutral-600" />
        <span className="truncate font-bold text-neutral-200" style={micro}>
          {tag}
        </span>
      </div>
      {right || (
        <span className="shrink-0 text-neutral-700" style={micro}>
          {id}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const s = norm(status);
  const cls =
    s === "ACTIVE"
      ? "text-emerald-400 border-emerald-400"
      : s === "BUILD"
      ? "text-neutral-200 border-neutral-600"
      : "text-neutral-600 border-neutral-800";
  return (
    <span className={`shrink-0 border px-2 py-1 ${cls}`} style={micro}>
      {s || "DRAFT"}
    </span>
  );
}

function Tag({ label, active, onClick }) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={`border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
        active
          ? "border-emerald-400 text-emerald-400"
          : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-300"
      }`}
      style={micro}
    >
      {label}
    </Comp>
  );
}

/* ── routing ───────────────────────────────────────────────────── */
function readHash() {
  const h = (typeof window !== "undefined" && window.location.hash) || "";
  const m = h.match(/^#\/p\/(.+)$/);
  return m ? { view: "project", id: decodeURIComponent(m[1]) } : { view: "home", id: null };
}

function useHashRoute() {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const goProject = (id) => {
  window.location.hash = `#/p/${encodeURIComponent(id)}`;
};
const goHome = () => {
  window.location.hash = "";
};

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
        <div
          className="mb-4 border-b border-neutral-800 pb-2 font-bold text-emerald-400"
          style={micro}
        >
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
        <div className="mt-6 text-neutral-800" style={micro}>
          CLICK TO SKIP
        </div>
      </div>
    </div>
  );
}

/* ── attitude source ───────────────────────────────────────────── */
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
      if (DO && typeof DO.requestPermission === "function") {
        if ((await DO.requestPermission()) !== "granted") {
          setMode(NONE);
          return;
        }
      }
      if (DM && typeof DM.requestPermission === "function") await DM.requestPermission();
    } catch {
      setMode(NONE);
      return;
    }
    setMode(LIVE);
  }, [mode]);

  return { mode, att, trace, connect };
}

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
        <div className="relative mx-auto h-36 w-36 overflow-hidden border border-neutral-800 bg-neutral-950">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <g transform={`rotate(${-att.roll} 50 50) translate(0 ${att.pitch * 1.4})`}>
              <rect x="-60" y="-60" width="220" height="110" fill="#0f0f0f" />
              <rect x="-60" y="50" width="220" height="150" fill="#141414" />
              <line
                x1="-60"
                y1="50"
                x2="220"
                y2="50"
                className="stroke-emerald-400"
                strokeWidth="0.7"
              />
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

        <div className="border border-neutral-800 bg-neutral-950 p-2">
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-16 w-full">
            <line x1="0" y1="50" x2="300" y2="50" stroke="#262626" strokeWidth="0.5" />
            <polyline
              points={pts}
              fill="none"
              className="stroke-emerald-400"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-1 text-neutral-700" style={micro}>
            {mode === LIVE ? "GYRO_Z · deviceMotion.rotationRate" : "GYRO_Z · 8kHz · SYNTHETIC"}
          </div>
        </div>

        {mode === NONE && (
          <p
            className="border border-neutral-800 p-3 leading-relaxed text-neutral-500"
            style={tiny}
          >
            This machine reports no motion sensor. Most clamshell laptops don't expose one to the
            browser — open the page on a phone, over HTTPS, and press LINK again.
          </p>
        )}

        <div className="grid grid-cols-3 gap-px bg-neutral-800">
          {[["ROLL", att.roll], ["PITCH", att.pitch], ["YAW", att.yaw]].map(([k, v]) => (
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

/* ── clock helpers ─────────────────────────────────────────────── */
function stamp(off) {
  const d = new Date(Date.now() - off * 4000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function LogFeed() {
  const [lines, setLines] = useState(() =>
    LOG_POOL.slice(0, 5).map((m, i) => ({ id: i, t: stamp(i), m }))
  );
  useEffect(() => {
    let id = 100;
    const iv = setInterval(() => {
      setLines((p) =>
        [
          ...p,
          { id: id++, t: stamp(0), m: LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)] },
        ].slice(-9)
      );
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

/* ═══ 3D MODEL VIEWER ═══════════════════════════════════════════
   npm install @google/model-viewer, then add
       import "@google/model-viewer";
   to main.jsx. The CDN fallback below is only for when that
   package isn't installed.
   ═════════════════════════════════════════════════════════════ */
let mvPromise = null;
function ensureModelViewer() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.customElements && customElements.get("model-viewer")) return Promise.resolve();
  if (mvPromise) return mvPromise;
  mvPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("cdn blocked"));
    document.head.appendChild(s);
  });
  return mvPromise;
}

function ModelFrame({ src, poster, autoRotate }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    let alive = true;
    ensureModelViewer()
      .then(() => alive && setState("ready"))
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, []);

  if (state !== "ready") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-neutral-600" style={micro}>
          {state === "loading" ? "LOADING VIEWER…" : "VIEWER UNAVAILABLE"}
        </span>
        {state === "failed" && (
          <span className="max-w-xs leading-relaxed text-neutral-700" style={tiny}>
            Run <span className="text-neutral-400">npm i @google/model-viewer</span> and import it
            in main.jsx.
          </span>
        )}
      </div>
    );
  }

  const props = {
    src,
    poster,
    "camera-controls": true,
    "touch-action": "pan-y",
    "shadow-intensity": "1",
    "environment-image": "neutral",
    exposure: "0.9",
    "interaction-prompt": "none",
    style: { width: "100%", height: "100%", backgroundColor: "#0a0a0a" },
  };
  if (autoRotate) {
    props["auto-rotate"] = true;
    props["rotation-per-second"] = "18deg";
  }
  return React.createElement("model-viewer", props);
}

/* ── one media slide, reused by the panel and the lightbox ─────── */
function MediaSlide({ item, onBroken, broken, autoRotate }) {
  if (item.type === "model") {
    return <ModelFrame src={item.src} poster={item.poster} autoRotate={autoRotate} />;
  }
  if (broken) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="text-neutral-600" style={micro}>
          NO FILE FOUND
        </span>
        <span className="text-neutral-700" style={tiny}>
          Expected it at public{item.src}
        </span>
      </div>
    );
  }
  if (item.type === "video") {
    return (
      <video
        src={item.src}
        controls
        loop
        muted
        playsInline
        poster={item.poster}
        onError={onBroken}
        className="h-full w-full object-contain"
      />
    );
  }
  return (
    <img
      src={item.src}
      alt={item.caption || ""}
      onError={onBroken}
      className="h-full w-full object-contain"
    />
  );
}

const KIND = { model: "GLB", video: "VID", image: "IMG" };

/* ── media gallery + fullscreen lightbox ───────────────────────── */
function MediaViewer({ media }) {
  const [i, setI] = useState(0);
  const [broken, setBroken] = useState({});
  const [zoom, setZoom] = useState(false);
  const [spin, setSpin] = useState(false);

  const step = useCallback(
    (d) => setI((v) => (v + d + media.length) % media.length),
    [media]
  );

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, step]);

  if (!media || media.length === 0) return null;
  const item = media[i];
  const mark = (k) => () => setBroken((b) => ({ ...b, [k]: true }));

  return (
    <>
      <div className="border border-neutral-800 bg-neutral-950">
        <PanelHead
          tag="MEDIA"
          right={
            <div className="flex items-center gap-2">
              {item.type === "model" && (
                <button
                  onClick={() => setSpin((s) => !s)}
                  className={`border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                    spin
                      ? "border-emerald-400 text-emerald-400"
                      : "border-neutral-800 text-neutral-500 hover:text-neutral-200"
                  }`}
                  style={micro}
                >
                  SPIN
                </button>
              )}
              <button
                onClick={() => setZoom(true)}
                className="border border-neutral-800 px-2 py-1 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                style={micro}
              >
                EXPAND
              </button>
              <span className="text-neutral-700" style={micro}>
                {String(i + 1).padStart(2, "0")}/{String(media.length).padStart(2, "0")}
              </span>
            </div>
          }
        />

        <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
          <MediaSlide
            item={item}
            broken={broken[i]}
            onBroken={mark(i)}
            autoRotate={spin}
          />
        </div>

        {item.caption && (
          <div className="border-t border-neutral-800 px-4 py-2 text-neutral-500" style={tiny}>
            {item.caption}
          </div>
        )}

        {media.length > 1 && (
          <div className="flex flex-wrap gap-px border-t border-neutral-800 bg-neutral-800">
            {media.map((m, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                className={`flex-1 bg-neutral-950 px-3 py-2 hover:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                  k === i ? "text-emerald-400" : "text-neutral-600"
                }`}
                style={micro}
              >
                {KIND[m.type] || "IMG"} {String(k + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        )}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <span className="truncate text-neutral-400" style={tiny}>
              {item.caption || item.src}
            </span>
            <div className="flex items-center gap-2">
              {media.length > 1 && (
                <>
                  <button
                    onClick={() => step(-1)}
                    className="border border-neutral-800 px-2 py-1 text-neutral-400 hover:text-neutral-100"
                    style={micro}
                  >
                    ‹
                  </button>
                  <span className="tabular-nums text-neutral-600" style={micro}>
                    {i + 1}/{media.length}
                  </span>
                  <button
                    onClick={() => step(1)}
                    className="border border-neutral-800 px-2 py-1 text-neutral-400 hover:text-neutral-100"
                    style={micro}
                  >
                    ›
                  </button>
                </>
              )}
              <button
                onClick={() => setZoom(false)}
                className="border border-emerald-400 px-3 py-1 text-emerald-400"
                style={micro}
              >
                ESC
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <MediaSlide item={item} broken={broken[i]} onBroken={mark(i)} autoRotate={spin} />
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ CODE BLOCK ════════════════════════════════════════════════ */
const KEYWORDS = {
  c: "auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|bool|true|false|NULL|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t",
  js: "const|let|var|function|return|if|else|for|while|do|class|extends|new|await|async|import|export|from|default|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|this|switch|case|break|continue",
  py: "def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|lambda|None|True|False|and|or|not|in|is|pass|yield|global|assert|del",
};
const COMMENTS = {
  c: "\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*",
  js: "\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*",
  py: "#[^\\n]*",
};
const TONE = {
  cmt: "text-neutral-600",
  str: "text-emerald-400",
  num: "text-emerald-400",
  kw: "text-neutral-100",
};

function tokenize(code, lang) {
  const L = KEYWORDS[lang] ? lang : "js";
  const re = new RegExp(
    `(${COMMENTS[L]})` +
      `|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')` +
      `|\\b(0[xX][0-9a-fA-F]+|\\d+\\.?\\d*)\\b` +
      `|\\b(${KEYWORDS[L]})\\b`,
    "g"
  );
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: null });
    out.push({ t: m[0], c: m[1] ? "cmt" : m[2] ? "str" : m[3] ? "num" : "kw" });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < code.length) out.push({ t: code.slice(last), c: null });
  return out;
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

function CopyButton({ text, label = "COPY", done = "COPIED" }) {
  const [hit, setHit] = useState(false);
  return (
    <button
      onClick={async () => {
        await writeClipboard(text);
        setHit(true);
        setTimeout(() => setHit(false), 1400);
      }}
      className={`border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
        hit
          ? "border-emerald-400 text-emerald-400"
          : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
      }`}
      style={micro}
    >
      {hit ? done : label}
    </button>
  );
}

function CodeBlock({ label, lang, code }) {
  const [wrap, setWrap] = useState(false);
  const lines = code.split("\n");

  return (
    <div className="border border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-neutral-300" style={tiny}>
            {label}
          </span>
          <span className="shrink-0 text-neutral-700" style={micro}>
            {(lang || "txt").toUpperCase()} · {lines.length}L
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setWrap((w) => !w)}
            className={`border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
              wrap
                ? "border-emerald-400 text-emerald-400"
                : "border-neutral-800 text-neutral-500 hover:text-neutral-200"
            }`}
            style={micro}
          >
            WRAP
          </button>
          <CopyButton text={code} />
        </div>
      </div>

      <div className="flex overflow-x-auto">
        <div
          className="shrink-0 select-none border-r border-neutral-800 px-3 py-4 text-right text-neutral-700"
          style={{ fontSize: "12px", lineHeight: "1.625" }}
        >
          {lines.map((_, k) => (
            <div key={k}>{k + 1}</div>
          ))}
        </div>
        <pre
          className="flex-1 py-4 pl-4 pr-4 leading-relaxed text-neutral-400"
          style={{
            fontSize: "12px",
            whiteSpace: wrap ? "pre-wrap" : "pre",
            wordBreak: wrap ? "break-word" : "normal",
          }}
        >
          <code>
            {tokenize(code, lang).map((tk, k) => (
              <span key={k} className={tk.c ? TONE[tk.c] : undefined}>
                {tk.t}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ── stats strip, computed from the data ───────────────────────── */
function StatsStrip() {
  const s = useMemo(() => {
    const media = PROJECTS.reduce((n, p) => n + (p.media ? p.media.length : 0), 0);
    const snips = PROJECTS.reduce((n, p) => n + (p.code ? p.code.length : 0), 0);
    const open = PROJECTS.reduce((n, p) => n + (p.queue ? p.queue.length : 0), 0);
    const active = PROJECTS.filter((p) => norm(p.status) === "ACTIVE").length;
    return [
      ["PROJECTS", PROJECTS.length],
      ["ACTIVE", active],
      ["MEDIA", media],
      ["SNIPPETS", snips],
      ["OPEN TASKS", open],
    ];
  }, []);

  return (
    <div className="grid grid-cols-2 gap-px border border-neutral-800 bg-neutral-800 sm:grid-cols-5">
      {s.map(([k, v]) => (
        <div key={k} className="bg-neutral-950 px-4 py-4">
          <div className="text-neutral-600" style={micro}>
            {k}
          </div>
          <div className="mt-2 tabular-nums text-emerald-400" style={{ fontSize: "22px" }}>
            {String(v).padStart(2, "0")}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── project card ──────────────────────────────────────────────── */
function ProjectCard({ p }) {
  return (
    <article
      onClick={() => goProject(p.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goProject(p.id);
        }
      }}
      tabIndex={0}
      role="link"
      className="flex cursor-pointer flex-col border border-neutral-800 bg-neutral-950 hover:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <h3
          className="min-w-0 truncate font-bold text-neutral-100"
          style={{ fontSize: "13px", letterSpacing: "0.04em" }}
        >
          {p.name}
        </h3>
        <StatusPill status={p.status} />
      </div>

      <div className="flex-1 space-y-5 p-4">
        <p className="leading-relaxed text-neutral-400" style={{ fontSize: "13px" }}>
          {p.blurb}
        </p>

        <div className="space-y-px bg-neutral-800">
          {p.specs.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 bg-neutral-950 py-2">
              <span className="shrink-0 text-neutral-600" style={micro}>
                {k}
              </span>
              <span className="text-right text-neutral-300" style={tiny}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3">
        <span className="text-neutral-700" style={micro}>
          {p.year || ""}
          {p.media ? ` · ${p.media.length} MEDIA` : ""}
          {p.code ? ` · ${p.code.length} SRC` : ""}
        </span>
        <span className="text-emerald-400" style={micro}>
          OPEN ›
        </span>
      </div>
    </article>
  );
}

/* ═══ PROJECT DETAIL PAGE ═══════════════════════════════════════ */
function ProjectPage({ p }) {
  const idx = PROJECTS.findIndex((x) => x.id === p.id);
  const prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(idx + 1) % PROJECTS.length];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [p.id]);

  /* ←/→ walk projects, Esc returns home */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") goProject(next.id);
      if (e.key === "ArrowLeft") goProject(prev.id);
      if (e.key === "Escape") goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev.id, next.id]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}#/p/${p.id}`
      : `#/p/${p.id}`;

  return (
    <main className="min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={goHome}
          className="border border-neutral-800 px-3 py-2 text-neutral-400 hover:border-emerald-400 hover:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          style={micro}
        >
          ‹ cd ..
        </button>
        <span className="truncate text-neutral-700" style={micro}>
          ~/projects/{p.id}
        </span>
        <span className="ml-auto text-neutral-800" style={micro}>
          ← → SWITCH · ESC HOME
        </span>
      </div>

      <header className="border border-neutral-800 bg-neutral-950">
        <PanelHead
          tag="PROJECT"
          right={
            <div className="flex items-center gap-2">
              {p.year && (
                <span className="text-neutral-700" style={micro}>
                  {p.year}
                </span>
              )}
              <StatusPill status={p.status} />
            </div>
          }
        />
        <div className="space-y-4 p-6">
          <h1
            className="font-bold uppercase leading-none text-neutral-100"
            style={{ fontSize: "clamp(24px, 4.5vw, 40px)", letterSpacing: "-0.02em" }}
          >
            {p.name}
          </h1>
          {p.tagline && (
            <p className="text-neutral-500" style={tiny}>
              {p.tagline}
            </p>
          )}
          <Rule />
          <p className="max-w-2xl leading-relaxed text-neutral-400" style={{ fontSize: "14px" }}>
            {p.blurb}
          </p>

          {p.tags && p.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(p.links || []).map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="border border-neutral-800 px-3 py-2 text-neutral-400 hover:border-emerald-400 hover:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                style={micro}
              >
                {l.label} ↗
              </a>
            ))}
            <CopyButton text={shareUrl} label="COPY LINK" done="LINK COPIED" />
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MediaViewer media={p.media} />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="border border-neutral-800 bg-neutral-950">
            <PanelHead tag="SPECIFICATION" id="SHEET" />
            <div className="p-4">
              <div className="space-y-px bg-neutral-800">
                {p.specs.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-4 bg-neutral-950 py-2"
                  >
                    <span className="shrink-0 text-neutral-600" style={micro}>
                      {k}
                    </span>
                    <span className="text-right text-neutral-300" style={tiny}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {p.queue && p.queue.length > 0 && (
            <div className="border border-neutral-800 bg-neutral-950">
              <PanelHead tag="QUEUE" id={`${p.queue.length} OPEN`} />
              <ul className="space-y-2 p-4">
                {p.queue.map((q) => (
                  <li key={q} className="flex gap-2 text-neutral-400" style={tiny}>
                    <span className="text-emerald-400">›</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {p.body && p.body.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {p.body.map((b) => (
            <section key={b.heading} className="border border-neutral-800 bg-neutral-950">
              <PanelHead tag={b.heading} id="" />
              <p className="p-6 leading-relaxed text-neutral-400" style={{ fontSize: "14px" }}>
                {b.text}
              </p>
            </section>
          ))}
        </div>
      )}

      {p.code && p.code.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-4">
            <h2
              className="border border-neutral-800 px-3 py-1 font-bold text-neutral-200"
              style={micro}
            >
              SOURCE
            </h2>
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-neutral-700" style={micro}>
              {p.code.length} SNIPPET{p.code.length > 1 ? "S" : ""}
            </span>
          </div>
          <div className="space-y-4">
            {p.code.map((c, k) => (
              <CodeBlock key={k} label={c.label} lang={c.lang} code={c.code} />
            ))}
          </div>
        </section>
      )}

      <nav className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { t: prev, dir: "‹ PREV" },
          { t: next, dir: "NEXT ›" },
        ].map(({ t, dir }) => (
          <button
            key={dir}
            onClick={() => goProject(t.id)}
            className="border border-neutral-800 bg-neutral-950 p-4 text-left hover:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <div className="text-neutral-700" style={micro}>
              {dir}
            </div>
            <div className="mt-2 text-neutral-200" style={tiny}>
              {t.name}
            </div>
          </button>
        ))}
      </nav>
    </main>
  );
}

/* ═══ COMMAND LINE ══════════════════════════════════════════════ */
const COMMANDS = [
  "help",
  "ls",
  "open",
  "cat",
  "grep",
  "back",
  "whoami",
  "stack",
  "theme",
  "neofetch",
  "date",
  "clear",
];

const ASCII = [
  "   /\\    ",
  "  /  \\   ",
  " /____\\  ",
  " |    |  ",
  " |    |  ",
  "/|    |\\ ",
];

function CommandBar({ onNavigate, theme, setTheme, inputRef }) {
  const [history, setHistory] = useState([
    { k: "out", v: "session opened. `help` lists commands · ⌘K focuses this line." },
  ]);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [past, setPast] = useState([]);
  const [cursor, setCursor] = useState(-1);
  const scroller = useRef(null);
  const started = useRef(Date.now());

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [history, open]);

  const push = (k, v) => setHistory((p) => [...p, { k, v }]);

  const run = useCallback(
    (raw) => {
      const line = raw.trim();
      if (!line) return;
      push("in", line);
      setPast((p) => [...p, line]);
      setCursor(-1);

      const [cmd, ...rest] = line.split(/\s+/);
      const arg = rest.join(" ").toLowerCase();

      switch (cmd.toLowerCase()) {
        case "help":
          push("out", "NAVIGATE   ls · open <target> · cat <project> · back");
          push("out", "SEARCH     grep <term>");
          push("out", "INFO       whoami · stack · neofetch · date");
          push("out", `DISPLAY    theme <${THEME_IDS.join("|")}> · clear`);
          push("out", "KEYS       ⌘K focus · ESC blur · ↑↓ history · TAB complete");
          break;

        case "ls":
          push("out", "sections/  " + SECTIONS.map((s) => s.id).join("  "));
          push("out", "projects/  " + PROJECTS.map((p) => p.id).join("  "));
          break;

        case "back":
          goHome();
          push("out", "→ /");
          break;

        case "grep": {
          if (!arg) {
            push("err", "usage: grep <term>");
            break;
          }
          const hits = PROJECTS.filter((p) =>
            [p.name, p.blurb, p.tagline, (p.tags || []).join(" ")]
              .join(" ")
              .toLowerCase()
              .includes(arg)
          );
          if (hits.length === 0) push("err", `no match for '${arg}'`);
          else hits.forEach((h) => push("out", `  ${h.id.padEnd(12)} ${h.name}`));
          break;
        }

        case "theme": {
          if (THEME_IDS.includes(arg)) {
            setTheme(arg);
            push("out", `accent → ${arg}`);
          } else {
            push("err", `unknown theme. options: ${THEME_IDS.join(", ")}`);
          }
          break;
        }

        case "neofetch": {
          const lines = [
            `${PROFILE.handle}@${PROFILE.node}`,
            "─────────────────────",
            `location   ${PROFILE.sector}`,
            `projects   ${PROJECTS.length}`,
            `active     ${PROJECTS.filter((p) => norm(p.status) === "ACTIVE").length}`,
            `theme      ${theme}`,
            `uptime     ${Math.floor((Date.now() - started.current) / 1000)}s`,
          ];
          const rows = Math.max(ASCII.length, lines.length);
          for (let r = 0; r < rows; r++) {
            push("out", `${ASCII[r] || "         "}  ${lines[r] || ""}`);
          }
          break;
        }

        case "date":
          push("out", new Date().toString());
          break;

        case "open":
        case "cd":
        case "cat": {
          if (arg === ".." || arg === "/" || arg === "~") {
            goHome();
            push("out", "→ /");
            break;
          }
          const proj = PROJECTS.find((x) => x.id.toLowerCase() === arg);
          if (proj) {
            goProject(proj.id);
            push("out", `→ ${proj.name}`);
            break;
          }
          const sec = SECTIONS.find((s) => s.id === arg);
          if (sec) {
            goHome();
            setTimeout(() => onNavigate(sec.id), 60);
            push("out", `→ ${sec.label}`);
            break;
          }
          push("err", `no such target '${arg || "?"}'. run ls to see what's here.`);
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

        case "rm":
          push("err", "nice try.");
          break;

        default:
          push("err", `command not found: ${cmd}. try help.`);
      }
    },
    [onNavigate, setTheme, theme]
  );

  /* tab completion over commands, then project + section ids */
  const complete = () => {
    const parts = value.split(/\s+/);
    if (parts.length <= 1) {
      const hit = COMMANDS.filter((c) => c.startsWith(parts[0].toLowerCase()));
      if (hit.length === 1) setValue(hit[0] + " ");
      else if (hit.length > 1) push("out", hit.join("  "));
      return;
    }
    const targets = [
      ...PROJECTS.map((p) => p.id),
      ...SECTIONS.map((s) => s.id),
      ...THEME_IDS,
    ];
    const last = parts[parts.length - 1].toLowerCase();
    const hit = targets.filter((t) => t.toLowerCase().startsWith(last));
    if (hit.length === 1) setValue([...parts.slice(0, -1), hit[0]].join(" "));
    else if (hit.length > 1) push("out", hit.join("  "));
  };

  const onKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (past.length === 0) return;
      const n = cursor < 0 ? past.length - 1 : Math.max(0, cursor - 1);
      setCursor(n);
      setValue(past[n]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor < 0) return;
      const n = cursor + 1;
      if (n >= past.length) {
        setCursor(-1);
        setValue("");
      } else {
        setCursor(n);
        setValue(past[n]);
      }
    } else if (e.key === "Escape") {
      e.target.blur();
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950">
      {open && (
        <div ref={scroller} className="max-h-56 overflow-y-auto px-4 py-3 sm:px-6">
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
        <span className="shrink-0 text-emerald-400" style={tiny}>
          {PROFILE.handle}@{PROFILE.node.toLowerCase()} $
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder="type help  ·  ⌘K"
          aria-label="Command input"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-neutral-200 outline-none placeholder:text-neutral-700 focus:ring-0"
          style={tiny}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 border border-neutral-800 px-2 py-1 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          style={micro}
        >
          {open ? "HIDE" : "OUTPUT"}
        </button>
      </form>
    </div>
  );
}

/* ── projects section with search + filters ────────────────────── */
function ProjectExplorer() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState(null);
  const [status, setStatus] = useState(null);

  const allTags = useMemo(() => {
    const s = new Set();
    PROJECTS.forEach((p) => (p.tags || []).forEach((t) => s.add(t)));
    return [...s].sort();
  }, []);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return PROJECTS.filter((p) => {
      if (status && norm(p.status) !== status) return false;
      if (tag && !(p.tags || []).includes(tag)) return false;
      if (!term) return true;
      return [p.name, p.blurb, p.tagline, (p.tags || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [q, tag, status]);

  const clearAll = () => {
    setQ("");
    setTag(null);
    setStatus(null);
  };
  const filtered = q || tag || status;

  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <h2
          className="border border-neutral-800 px-3 py-1 font-bold text-neutral-200"
          style={micro}
        >
          PROJECTS
        </h2>
        <div className="h-px flex-1 bg-neutral-800" />
        <span className="text-neutral-700" style={micro}>
          {shown.length} / {PROJECTS.length}
        </span>
      </div>

      <div className="mb-4 border border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
          <span className="shrink-0 text-emerald-400" style={tiny}>
            grep
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filter by name, tag, or description"
            aria-label="Filter projects"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-neutral-200 outline-none placeholder:text-neutral-700"
            style={tiny}
          />
          {filtered && (
            <button
              onClick={clearAll}
              className="shrink-0 border border-neutral-800 px-2 py-1 text-neutral-500 hover:text-neutral-200"
              style={micro}
            >
              RESET
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 px-4 py-3">
          {["ACTIVE", "BUILD"].map((s) => (
            <Tag
              key={s}
              label={s}
              active={status === s}
              onClick={() => setStatus(status === s ? null : s)}
            />
          ))}
          <span className="mx-2 h-4 w-px bg-neutral-800" />
          {allTags.map((t) => (
            <Tag key={t} label={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)} />
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="border border-neutral-800 bg-neutral-950 p-8 text-center">
          <p className="text-neutral-500" style={tiny}>
            no projects match that filter.
          </p>
          <button
            onClick={clearAll}
            className="mt-4 border border-emerald-400 px-3 py-2 text-emerald-400"
            style={micro}
          >
            RESET FILTERS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

/* ── home view ─────────────────────────────────────────────────── */
function HomeView({ bind }) {
  return (
    <main className="min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-10">
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
                    target="_blank"
                    rel="noreferrer"
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

        <div className="mt-4">
          <StatsStrip />
        </div>
      </section>

      <section ref={bind("projects")} className="scroll-mt-16 pt-12">
        <ProjectExplorer />
      </section>

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
  );
}

/* ═══ SHELL ═════════════════════════════════════════════════════ */
export default function TerminalPortfolio() {
  const [booted, setBooted] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [active, setActive] = useState("system");
  const [theme, setTheme] = useState("phosphor");
  const refs = useRef({});
  const cmdRef = useRef(null);
  const route = useHashRoute();

  useAccentStylesheet();

  const project = route.view === "project" ? PROJECTS.find((p) => p.id === route.id) : null;

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

  /* ⌘K / Ctrl+K focuses the command line from anywhere */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (cmdRef.current) cmdRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* scroll-spy: sidebar tracks whichever section is in view */
  useEffect(() => {
    if (route.view !== "home") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0] && vis[0].target.dataset.sec) setActive(vis[0].target.dataset.sec);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.5, 1] }
    );
    Object.entries(refs.current).forEach(([id, el]) => {
      if (el) {
        el.dataset.sec = id;
        obs.observe(el);
      }
    });
    return () => obs.disconnect();
  }, [route.view]);

  const go = useCallback((id) => {
    setActive(id);
    const el = refs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const bind = (id) => (el) => {
    refs.current[id] = el;
  };

  return (
    <div
      className="tp min-h-screen bg-neutral-950 font-mono text-neutral-300 antialiased"
      style={{ "--accent": THEMES[theme] }}
    >
      {!booted && <Boot onDone={() => setBooted(true)} />}

      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-3 sm:px-6">
        <button
          onClick={goHome}
          className="flex min-w-0 items-center gap-4 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          <span className="truncate font-bold text-neutral-100" style={micro}>
            {PROFILE.handle.toUpperCase()}
          </span>
          <span className="hidden h-3 w-px bg-neutral-800 sm:block" />
          <span className="hidden text-neutral-600 sm:block" style={micro}>
            {PROFILE.sector}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          {/* theme swatches */}
          <div className="hidden items-center gap-1 sm:flex">
            {THEME_IDS.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                aria-label={`${t} theme`}
                title={t}
                className={`h-3 w-3 border ${
                  theme === t ? "border-neutral-300" : "border-neutral-800"
                }`}
                style={{ backgroundColor: THEMES[t] }}
              />
            ))}
          </div>
          <span className="hidden tabular-nums text-neutral-600 sm:inline" style={micro}>
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
        <nav className="sticky top-12 hidden h-screen w-52 shrink-0 border-r border-neutral-800 pt-6 lg:block">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                if (route.view === "project") {
                  goHome();
                  setTimeout(() => go(s.id), 60);
                } else {
                  go(s.id);
                }
              }}
              className={`flex w-full items-center gap-3 border-l-2 px-5 py-3 text-left focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                active === s.id && route.view === "home"
                  ? "border-emerald-400 bg-neutral-900 text-emerald-400"
                  : "border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
              style={micro}
            >
              <span className="text-neutral-700">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </button>
          ))}

          {route.view === "project" && project && (
            <div className="mt-6 border-t border-neutral-800 px-5 pt-4">
              <div className="text-neutral-700" style={micro}>
                VIEWING
              </div>
              <div className="mt-2 text-emerald-400" style={tiny}>
                {project.name}
              </div>
            </div>
          )}

          <div className="mt-auto px-5 pt-8 text-neutral-800" style={micro}>
            ⌘K · TERMINAL
          </div>
        </nav>

        {route.view === "project" ? (
          project ? (
            <ProjectPage p={project} />
          ) : (
            <main className="flex-1 px-6 pt-16">
              <p className="text-red-400" style={tiny}>
                no project with id '{route.id}'.
              </p>
              <button
                onClick={goHome}
                className="mt-4 border border-neutral-800 px-3 py-2 text-neutral-400 hover:border-emerald-400 hover:text-emerald-400"
                style={micro}
              >
                ‹ cd ..
              </button>
            </main>
          )
        ) : (
          <HomeView bind={bind} />
        )}
      </div>

      <CommandBar
        onNavigate={go}
        theme={theme}
        setTheme={setTheme}
        inputRef={cmdRef}
      />
    </div>
  );
}