/**
 * GPU fluid simulation (stable fluids / Navier-Stokes) for the cursor trail.
 *
 * Pointer movement injects velocity and dye into a low-resolution grid.
 * Each frame: advect velocity, apply vorticity confinement (the swirl),
 * solve pressure with Jacobi iterations, project to a divergence-free
 * field, then advect the dye through it. The display pass composites the
 * dye over a deep-sea gradient with a subtle chromatic split.
 *
 * Returns null when WebGL2 or float render targets are unavailable.
 */

export interface FluidSurface {
  /** Inject velocity and dye at uv (origin bottom-left). dx/dy in uv units. */
  splat(x: number, y: number, dx: number, dy: number, power?: number): void;
  /** A soft radial burst, used for clicks and the initial reveal. */
  burst(x: number, y: number): void;
  setActive(active: boolean): void;
  resize(): void;
  destroy(): void;
}

const SIM_RES = 160;
const DYE_RES = 704;
const PRESSURE_ITERATIONS = 20;
const VELOCITY_DISSIPATION = 0.3;
const DYE_DISSIPATION = 2.2;
const PRESSURE_DECAY = 0.8;
const CURL_STRENGTH = 24;
const SPLAT_FORCE = 4200;
const SPLAT_RADIUS = 0.0011;

const VERT = `#version 300 es
const vec2 POS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 v_uv;
void main() {
  vec2 p = POS[gl_VertexID];
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const ADVECTION_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texel;
uniform float u_dt;
uniform float u_dissipation;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 coord = v_uv - u_dt * texture(u_velocity, v_uv).xy * u_texel;
  vec4 result = texture(u_source, coord);
  float decay = 1.0 + u_dissipation * u_dt;
  outColor = result / decay;
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_target;
uniform vec2 u_point;
uniform vec3 u_color;
uniform float u_radius;
uniform float u_aspect;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 p = v_uv - u_point;
  p.x *= u_aspect;
  vec3 splat = exp(-dot(p, p) / u_radius) * u_color;
  vec3 base = texture(u_target, v_uv).xyz;
  outColor = vec4(base + splat, 1.0);
}`;

const CURL_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float L = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).y;
  float R = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).y;
  float B = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).x;
  float vorticity = R - L - T + B;
  outColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform sampler2D u_curl;
uniform vec2 u_texel;
uniform float u_curlStrength;
uniform float u_dt;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float L = texture(u_curl, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_curl, v_uv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_curl, v_uv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_curl, v_uv + vec2(0.0, u_texel.y)).x;
  float C = texture(u_curl, v_uv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= u_curlStrength * C;
  force.y *= -1.0;

  vec2 velocity = texture(u_velocity, v_uv).xy;
  velocity += force * u_dt;
  velocity = clamp(velocity, vec2(-1000.0), vec2(1000.0));
  outColor = vec4(velocity, 0.0, 1.0);
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float L = texture(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
  float T = texture(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
  vec2 C = texture(u_velocity, v_uv).xy;

  // Solid walls: reflect the normal component at the borders.
  if (v_uv.x - u_texel.x < 0.0) L = -C.x;
  if (v_uv.x + u_texel.x > 1.0) R = -C.x;
  if (v_uv.y - u_texel.y < 0.0) B = -C.y;
  if (v_uv.y + u_texel.y > 1.0) T = -C.y;

  float divergence = 0.5 * (R - L + T - B);
  outColor = vec4(divergence, 0.0, 0.0, 1.0);
}`;

const CLEAR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_target;
uniform float u_value;
in vec2 v_uv;
out vec4 outColor;
void main() {
  outColor = u_value * texture(u_target, v_uv);
}`;

const PRESSURE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float L = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
  float divergence = texture(u_divergence, v_uv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  outColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUBTRACT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float L = texture(u_pressure, v_uv - vec2(u_texel.x, 0.0)).x;
  float R = texture(u_pressure, v_uv + vec2(u_texel.x, 0.0)).x;
  float B = texture(u_pressure, v_uv - vec2(0.0, u_texel.y)).x;
  float T = texture(u_pressure, v_uv + vec2(0.0, u_texel.y)).x;
  vec2 velocity = texture(u_velocity, v_uv).xy;
  velocity -= vec2(R - L, T - B) * 0.5;
  outColor = vec4(velocity, 0.0, 1.0);
}`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_dye;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec2 uv = v_uv;

  // A whisper of chromatic split, echoing light bending through water.
  float intensity = length(texture(u_dye, uv).rgb);
  float off = 0.0006 + intensity * 0.0014;
  float r = texture(u_dye, uv + vec2(off, 0.0)).r;
  float g = texture(u_dye, uv).g;
  float b = texture(u_dye, uv - vec2(off, 0.0)).b;
  // Cool the mix toward blue so the wake always reads as water.
  vec3 dye = vec3(r, g, b) * vec3(0.45, 0.85, 1.1);

  // Deep-sea base gradient.
  vec3 deep = vec3(0.004, 0.012, 0.028);
  vec3 mid = vec3(0.010, 0.040, 0.078);
  vec3 col = mix(deep, mid, pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.6));

  vec2 g2 = (uv - vec2(0.5, 0.85)) * vec2(1.5, 1.0);
  col += vec3(0.010, 0.055, 0.09) * exp(-dot(g2, g2) * 3.2);

  col += dye;

  // Vignette.
  vec2 vd = uv - vec2(0.5, 0.45);
  col *= mix(0.78, 1.0, smoothstep(1.25, 0.3, length(vd)));

  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log ?? "unknown"}`);
  }
  return shader;
}

type Uniforms = Record<string, WebGLUniformLocation | null>;

interface Program {
  program: WebGLProgram;
  uniforms: Uniforms;
}

function createProgram(gl: WebGL2RenderingContext, frag: string, names: string[]): Program {
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`program link failed: ${log ?? "unknown"}`);
  }
  const uniforms: Uniforms = {};
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
  return { program, uniforms };
}

interface Target {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
}

function hsv(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

interface PendingSplat {
  x: number;
  y: number;
  dx: number;
  dy: number;
  power: number;
}

export function createFluidSurface(canvas: HTMLCanvasElement): FluidSurface | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;
  if (!gl.getExtension("EXT_color_buffer_float")) return null;

  let programs: {
    advection: Program;
    splat: Program;
    curl: Program;
    vorticity: Program;
    divergence: Program;
    clear: Program;
    pressure: Program;
    gradient: Program;
    display: Program;
  };
  try {
    programs = {
      advection: createProgram(gl, ADVECTION_FRAG, [
        "u_velocity",
        "u_source",
        "u_texel",
        "u_dt",
        "u_dissipation",
      ]),
      splat: createProgram(gl, SPLAT_FRAG, [
        "u_target",
        "u_point",
        "u_color",
        "u_radius",
        "u_aspect",
      ]),
      curl: createProgram(gl, CURL_FRAG, ["u_velocity", "u_texel"]),
      vorticity: createProgram(gl, VORTICITY_FRAG, [
        "u_velocity",
        "u_curl",
        "u_texel",
        "u_curlStrength",
        "u_dt",
      ]),
      divergence: createProgram(gl, DIVERGENCE_FRAG, ["u_velocity", "u_texel"]),
      clear: createProgram(gl, CLEAR_FRAG, ["u_target", "u_value"]),
      pressure: createProgram(gl, PRESSURE_FRAG, ["u_pressure", "u_divergence", "u_texel"]),
      gradient: createProgram(gl, GRADIENT_SUBTRACT_FRAG, ["u_pressure", "u_velocity", "u_texel"]),
      display: createProgram(gl, DISPLAY_FRAG, ["u_dye"]),
    };
  } catch {
    return null;
  }

  const vao = gl.createVertexArray();

  function createTarget(width: number, height: number, internal: number, format: number): Target {
    const texture = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, internal, width, height, 0, format, gl!.HALF_FLOAT, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    const fbo = gl!.createFramebuffer();
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, texture, 0);
    if (gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) !== gl!.FRAMEBUFFER_COMPLETE) {
      throw new Error("framebuffer incomplete");
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    if (!texture || !fbo) throw new Error("target allocation failed");
    return { texture, fbo, width, height, texelX: 1 / width, texelY: 1 / height };
  }

  function createDouble(width: number, height: number, internal: number, format: number) {
    let read = createTarget(width, height, internal, format);
    let write = createTarget(width, height, internal, format);
    return {
      get read() {
        return read;
      },
      get write() {
        return write;
      },
      swap() {
        const tmp = read;
        read = write;
        write = tmp;
      },
      destroy() {
        gl!.deleteTexture(read.texture);
        gl!.deleteFramebuffer(read.fbo);
        gl!.deleteTexture(write.texture);
        gl!.deleteFramebuffer(write.fbo);
      },
    };
  }

  function simSize(base: number): [number, number] {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    return aspect >= 1
      ? [Math.round(base * aspect), base]
      : [base, Math.round(base / Math.max(0.0001, aspect))];
  }

  let velocity: ReturnType<typeof createDouble>;
  let dye: ReturnType<typeof createDouble>;
  let pressure: ReturnType<typeof createDouble>;
  let curlTarget: Target;
  let divergenceTarget: Target;

  function allocate() {
    const [simW, simH] = simSize(SIM_RES);
    const [dyeW, dyeH] = simSize(DYE_RES);
    velocity = createDouble(simW, simH, gl!.RG16F, gl!.RG);
    dye = createDouble(dyeW, dyeH, gl!.RGBA16F, gl!.RGBA);
    pressure = createDouble(simW, simH, gl!.R16F, gl!.RED);
    curlTarget = createTarget(simW, simH, gl!.R16F, gl!.RED);
    divergenceTarget = createTarget(simW, simH, gl!.R16F, gl!.RED);
  }

  function release() {
    velocity?.destroy();
    dye?.destroy();
    pressure?.destroy();
    if (curlTarget) {
      gl!.deleteTexture(curlTarget.texture);
      gl!.deleteFramebuffer(curlTarget.fbo);
    }
    if (divergenceTarget) {
      gl!.deleteTexture(divergenceTarget.texture);
      gl!.deleteFramebuffer(divergenceTarget.fbo);
    }
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  fitCanvas();
  try {
    allocate();
  } catch {
    return null;
  }

  function blit(target: Target | null) {
    if (target) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
      gl!.viewport(0, 0, target.width, target.height);
    } else {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, canvas.width, canvas.height);
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function bindTexture(unit: number, texture: WebGLTexture): number {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    return unit;
  }

  const pending: PendingSplat[] = [];
  let hueBase = Math.random();
  let raf = 0;
  let active = true;
  let destroyed = false;
  let lastTime = performance.now();

  function applySplat(s: PendingSplat) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const { splat } = programs;
    gl!.useProgram(splat.program);
    gl!.uniform1f(splat.uniforms.u_aspect, aspect);
    gl!.uniform2f(splat.uniforms.u_point, s.x, s.y);

    // Velocity kick along the stroke direction.
    gl!.uniform1i(splat.uniforms.u_target, bindTexture(0, velocity.read.texture));
    gl!.uniform1f(splat.uniforms.u_radius, SPLAT_RADIUS);
    gl!.uniform3f(splat.uniforms.u_color, s.dx * SPLAT_FORCE, s.dy * SPLAT_FORCE, 0);
    blit(velocity.write);
    velocity.swap();

    // Dye locked to a watery cyan-blue band (never drifts into green).
    hueBase += 0.0012;
    const hue = 0.55 + 0.04 * Math.sin(hueBase * Math.PI * 2);
    const [r, g, b] = hsv(hue, 0.7, 1);
    const power = s.power;
    gl!.uniform1i(splat.uniforms.u_target, bindTexture(0, dye.read.texture));
    gl!.uniform1f(splat.uniforms.u_radius, SPLAT_RADIUS * 1.15);
    gl!.uniform3f(splat.uniforms.u_color, r * power, g * power, b * power);
    blit(dye.write);
    dye.swap();
  }

  function stepSimulation(dt: number) {
    const {
      advection,
      curl,
      vorticity,
      divergence,
      clear,
      pressure: pressureP,
      gradient,
    } = programs;
    const vTexel: [number, number] = [velocity.read.texelX, velocity.read.texelY];

    // Curl and vorticity confinement keep the smoke lively and swirling.
    gl!.useProgram(curl.program);
    gl!.uniform2f(curl.uniforms.u_texel, vTexel[0], vTexel[1]);
    gl!.uniform1i(curl.uniforms.u_velocity, bindTexture(0, velocity.read.texture));
    blit(curlTarget);

    gl!.useProgram(vorticity.program);
    gl!.uniform2f(vorticity.uniforms.u_texel, vTexel[0], vTexel[1]);
    gl!.uniform1i(vorticity.uniforms.u_velocity, bindTexture(0, velocity.read.texture));
    gl!.uniform1i(vorticity.uniforms.u_curl, bindTexture(1, curlTarget.texture));
    gl!.uniform1f(vorticity.uniforms.u_curlStrength, CURL_STRENGTH);
    gl!.uniform1f(vorticity.uniforms.u_dt, dt);
    blit(velocity.write);
    velocity.swap();

    gl!.useProgram(divergence.program);
    gl!.uniform2f(divergence.uniforms.u_texel, vTexel[0], vTexel[1]);
    gl!.uniform1i(divergence.uniforms.u_velocity, bindTexture(0, velocity.read.texture));
    blit(divergenceTarget);

    gl!.useProgram(clear.program);
    gl!.uniform1i(clear.uniforms.u_target, bindTexture(0, pressure.read.texture));
    gl!.uniform1f(clear.uniforms.u_value, PRESSURE_DECAY);
    blit(pressure.write);
    pressure.swap();

    gl!.useProgram(pressureP.program);
    gl!.uniform2f(pressureP.uniforms.u_texel, vTexel[0], vTexel[1]);
    gl!.uniform1i(pressureP.uniforms.u_divergence, bindTexture(1, divergenceTarget.texture));
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl!.uniform1i(pressureP.uniforms.u_pressure, bindTexture(0, pressure.read.texture));
      blit(pressure.write);
      pressure.swap();
    }

    gl!.useProgram(gradient.program);
    gl!.uniform2f(gradient.uniforms.u_texel, vTexel[0], vTexel[1]);
    gl!.uniform1i(gradient.uniforms.u_pressure, bindTexture(0, pressure.read.texture));
    gl!.uniform1i(gradient.uniforms.u_velocity, bindTexture(1, velocity.read.texture));
    blit(velocity.write);
    velocity.swap();

    gl!.useProgram(advection.program);
    gl!.uniform2f(advection.uniforms.u_texel, vTexel[0], vTexel[1]);
    gl!.uniform1f(advection.uniforms.u_dt, dt);
    gl!.uniform1i(advection.uniforms.u_velocity, bindTexture(0, velocity.read.texture));
    gl!.uniform1i(advection.uniforms.u_source, bindTexture(0, velocity.read.texture));
    gl!.uniform1f(advection.uniforms.u_dissipation, VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    gl!.uniform1i(advection.uniforms.u_velocity, bindTexture(0, velocity.read.texture));
    gl!.uniform1i(advection.uniforms.u_source, bindTexture(1, dye.read.texture));
    gl!.uniform1f(advection.uniforms.u_dissipation, DYE_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  function frame() {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    if (!active) return;

    gl!.bindVertexArray(vao);

    let s = pending.shift();
    let applied = 0;
    while (s && applied < 8) {
      applySplat(s);
      applied += 1;
      s = pending.shift();
    }

    stepSimulation(dt);

    gl!.useProgram(programs.display.program);
    gl!.uniform1i(programs.display.uniforms.u_dye, bindTexture(0, dye.read.texture));
    blit(null);
  }
  raf = requestAnimationFrame(frame);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    active = false;
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  return {
    splat(x, y, dx, dy, power = 0.1) {
      if (destroyed) return;
      if (pending.length > 24) pending.length = 24;
      pending.push({ x, y, dx, dy, power });
    },
    burst(x, y) {
      if (destroyed) return;
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const speed = 0.0022 + Math.random() * 0.0012;
        pending.push({
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          power: 0.16,
        });
      }
    },
    setActive(next) {
      active = next && !destroyed;
      if (active) lastTime = performance.now();
    },
    resize() {
      if (destroyed) return;
      fitCanvas();
      // Reallocating keeps texel sizes true to the new aspect ratio.
      release();
      try {
        allocate();
      } catch {
        destroyed = true;
      }
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      release();
      for (const p of Object.values(programs)) gl.deleteProgram(p.program);
      if (vao) gl.deleteVertexArray(vao);
    },
  };
}
