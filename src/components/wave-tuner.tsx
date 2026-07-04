"use client";

import { useState } from "react";

import {
  resetWaveConfig,
  setWaveParam,
  snapshotWaveConfig,
  waveConfig,
  type WaveConfig,
} from "@/lib/wave-config";

interface Field {
  key: keyof WaveConfig;
  label: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: Field[] = [
  { key: "gridCap", label: "Grid cap (LOWER = bigger waves)", min: 48, max: 320, step: 4 },
  { key: "gridDivisor", label: "Grid divisor", min: 3, max: 16, step: 1 },
  { key: "strokeRadius", label: "Stroke radius (wavelength)", min: 0.02, max: 0.3, step: 0.005 },
  { key: "strokeStrength", label: "Stroke strength (amplitude)", min: 0.2, max: 4, step: 0.05 },
  { key: "strokeSpacing", label: "Stroke spacing", min: 0.01, max: 0.12, step: 0.005 },
  { key: "clickRadius", label: "Click radius", min: 0.04, max: 0.4, step: 0.01 },
  { key: "clickStrength", label: "Click strength", min: 0.5, max: 5, step: 0.1 },
  { key: "waveSpeed", label: "Wave speed", min: 0.4, max: 1.9, step: 0.05 },
  {
    key: "velocityDamping",
    label: "Persistence (fewer rings <-)",
    min: 0.95,
    max: 0.999,
    step: 0.001,
  },
  { key: "refraction", label: "Refraction depth", min: 0.05, max: 0.5, step: 0.01 },
  { key: "normalScale", label: "Normal scale (contrast)", min: 1, max: 12, step: 0.5 },
  { key: "ambientAmp", label: "Ambient ripple (0 = still)", min: 0, max: 0.02, step: 0.001 },
  { key: "causticAmp", label: "Caustic shimmer (0 = off)", min: 0, max: 0.2, step: 0.005 },
];

/**
 * Dev-only live tuner for the water surface. Renders nothing in production.
 * Sliders mutate the shared waveConfig, which the simulation reads every
 * frame, so changes are visible instantly. Use "Copy values" to grab the
 * current settings once the look is right.
 */
export function WaveTuner() {
  const [, force] = useState(0);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (process.env.NODE_ENV !== "development") return null;

  const rerender = () => force((n) => n + 1);

  const setValue = (key: keyof WaveConfig, value: number) => {
    setWaveParam(key, value);
    rerender();
  };

  const reset = () => {
    resetWaveConfig();
    rerender();
  };

  const copy = () => {
    void navigator.clipboard?.writeText(JSON.stringify(snapshotWaveConfig(), null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 bottom-3 z-[100] rounded-md bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-cyan-300 ring-1 ring-slate-700"
      >
        wave tuner
      </button>
    );
  }

  return (
    <div className="fixed right-3 bottom-3 z-[100] max-h-[85vh] w-72 overflow-y-auto rounded-lg bg-slate-950/90 p-3 font-mono text-[11px] text-slate-200 ring-1 ring-slate-700 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-cyan-300">Wave Tuner (dev)</span>
        <button type="button" onClick={() => setOpen(false)} className="px-1 text-slate-400">
          x
        </button>
      </div>

      {FIELDS.map((f) => {
        const value = waveConfig[f.key];
        return (
          <label key={f.key} className="mb-2 block">
            <span className="flex justify-between text-slate-400">
              <span>{f.label}</span>
              <span className="text-cyan-300">{value}</span>
            </span>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={value}
              onChange={(e) => setValue(f.key, Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
        );
      })}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 rounded bg-cyan-500 px-2 py-1 font-semibold text-slate-950"
        >
          {copied ? "Copied!" : "Copy values"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded bg-slate-800 px-2 py-1 text-slate-200"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
