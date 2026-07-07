import { site } from "@/lib/site";

// Deterministic per-boat lanes (no Math.random, so SSR and client agree).
// Negative delays spread the boats out across the screen from the first frame.
const LANES = [
  {
    top: "56%",
    sailDur: 34,
    sailDelay: -4,
    bobDur: 4.6,
    bobDelay: -0.3,
    scale: 0.95,
    opacity: 0.95,
  },
  {
    top: "69%",
    sailDur: 45,
    sailDelay: -24,
    bobDur: 5.4,
    bobDelay: -1.1,
    scale: 0.8,
    opacity: 0.7,
  },
  { top: "62%", sailDur: 39, sailDelay: -13, bobDur: 4.1, bobDelay: -2.0, scale: 1.02, opacity: 1 },
  {
    top: "77%",
    sailDur: 50,
    sailDelay: -33,
    bobDur: 5.9,
    bobDelay: -0.7,
    scale: 0.76,
    opacity: 0.65,
  },
  {
    top: "59%",
    sailDur: 31,
    sailDelay: -17,
    bobDur: 4.4,
    bobDelay: -1.6,
    scale: 0.9,
    opacity: 0.88,
  },
  {
    top: "72%",
    sailDur: 43,
    sailDelay: -9,
    bobDur: 5.1,
    bobDelay: -2.4,
    scale: 0.84,
    opacity: 0.78,
  },
];

function Boat() {
  return (
    <svg
      viewBox="0 0 48 40"
      className="h-8 w-10 drop-shadow-[0_4px_8px_rgba(2,12,24,0.6)]"
      aria-hidden="true"
    >
      {/* mast */}
      <line x1="21" y1="6" x2="21" y2="28" stroke="#94a3b8" strokeWidth="1.5" />
      {/* flag */}
      <path d="M21 6 L28 8 L21 10 Z" fill="#22d3ee" />
      {/* sail */}
      <path d="M21 8 L21 27 L37 27 Z" fill="#38bdf8" fillOpacity="0.9" />
      {/* hull */}
      <path
        d="M6 28 L42 28 L37 36 Q24 39 11 36 Z"
        fill="#1e293b"
        stroke="#22d3ee"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * A fleet of little boats sailing across the water, each carrying a
 * skill/certification label from site.floats. Purely decorative motion, so it
 * is hidden for visitors who prefer reduced motion and never blocks pointing.
 */
export function WaterBoats() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {site.floats.map((float, index) => {
        const lane = LANES[index % LANES.length];
        return (
          <div
            key={float.label}
            className="boat-sail-anim absolute left-0 will-change-transform"
            style={{
              top: lane.top,
              animationDuration: `${lane.sailDur}s`,
              animationDelay: `${lane.sailDelay}s`,
            }}
          >
            <div style={{ transform: `scale(${lane.scale})`, opacity: lane.opacity }}>
              <div
                className="boat-bob-anim flex flex-col items-center will-change-transform"
                style={{
                  animationDuration: `${lane.bobDur}s`,
                  animationDelay: `${lane.bobDelay}s`,
                }}
              >
                <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-slate-950/70 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-slate-200 backdrop-blur-sm">
                  <span aria-hidden="true">{float.icon}</span>
                  {float.label}
                </span>
                <Boat />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
