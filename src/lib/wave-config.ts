/**
 * Runtime-tunable parameters for the water surface.
 *
 * The simulation and input layers read this mutable object every frame, so the
 * dev-only WaveTuner panel can adjust the look live. In production nothing
 * mutates it, so these defaults are the shipped look.
 */
export interface WaveConfig {
  // Simulation (fed to the update shader / grid each frame)
  waveSpeed: number; // laplacian coefficient - higher = faster propagation
  velocityDamping: number; // per-step velocity retention - lower = fewer trailing rings
  heightDamping: number; // per-step height retention - lower = waves settle sooner
  gridDivisor: number; // sim cells = clientWidth / divisor
  gridCap: number; // max sim cells on an axis - lower = bigger, smoother waves

  // Rendering (fed to the render shader each frame)
  normalScale: number; // slope contrast for light and refraction
  refraction: number; // how far the wave bends the background
  ambientAmp: number; // idle swell amount (0 = perfectly still when at rest)
  causticAmp: number; // shimmer amount (0 = no fine light texture)

  // Pointer input (read in the wave canvas)
  strokeRadius: number; // press width while dragging - main wavelength control
  strokeStrength: number; // max press depth while dragging - amplitude
  strokeSpacing: number; // min uv distance between presses along a stroke
  clickRadius: number; // press width on click
  clickStrength: number; // press depth on click
}

export const WAVE_DEFAULTS: WaveConfig = {
  waveSpeed: 1.25,
  velocityDamping: 0.988,
  heightDamping: 0.9994,
  gridDivisor: 6,
  gridCap: 224,
  normalScale: 5.0,
  refraction: 0.16,
  ambientAmp: 0.006,
  causticAmp: 0.07,
  strokeRadius: 0.06,
  strokeStrength: 1.3,
  strokeSpacing: 0.03,
  clickRadius: 0.12,
  clickStrength: 2.0,
};

export const waveConfig: WaveConfig = { ...WAVE_DEFAULTS };

/** Update one tunable parameter (used by the dev tuner). */
export function setWaveParam<K extends keyof WaveConfig>(key: K, value: WaveConfig[K]): void {
  waveConfig[key] = value;
}

/** Restore every parameter to its shipped default. */
export function resetWaveConfig(): void {
  Object.assign(waveConfig, WAVE_DEFAULTS);
}

/** A plain snapshot of the current values, for copying out of the tuner. */
export function snapshotWaveConfig(): WaveConfig {
  return { ...waveConfig };
}
