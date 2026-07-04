/**
 * Real-time water surface simulation on the GPU (WebGL2).
 *
 * Two RG16F textures ping-pong a height field integrated with the classic
 * discrete wave equation (R = height, G = velocity). Pointer input injects
 * gaussian velocity "splats"; a render pass shades the field with refraction,
 * specular light, and a subtle caustic shimmer.
 *
 * Returns null when WebGL2 or float render targets are unavailable so the
 * caller can fall back to a static background.
 */

export interface WaterSurface {
  /** Push the water at uv (0..1, origin bottom-left) with a given strength. */
  splash(x: number, y: number, radius: number, strength: number): void;
  /** Pause or resume the simulation loop (e.g. when offscreen). */
  setActive(active: boolean): void;
  /** Re-fit the drawing buffer and simulation grid to the canvas size. */
  resize(): void;
  destroy(): void;
}

const VERT = `#version 300 es
const vec2 POS[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 v_uv;
void main() {
  vec2 p = POS[gl_VertexID];
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const UPDATE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform vec2 u_texel;
uniform float u_aspect;
uniform vec2 u_splatPos;
uniform float u_splatRadius;
uniform float u_splatStrength;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec2 f = texture(u_field, v_uv).rg;
  float h = f.r;
  float v = f.g;

  float l = texture(u_field, v_uv - vec2(u_texel.x, 0.0)).r;
  float r = texture(u_field, v_uv + vec2(u_texel.x, 0.0)).r;
  float b = texture(u_field, v_uv - vec2(0.0, u_texel.y)).r;
  float t = texture(u_field, v_uv + vec2(0.0, u_texel.y)).r;

  // Wave equation: neighbours pull the column toward their average.
  float lap = (l + r + b + t) * 0.25 - h;
  v += lap * 1.9;
  v *= 0.986;
  h += v;
  h *= 0.9992;

  // Pointer splat: a gaussian kick to the velocity field.
  if (u_splatStrength != 0.0) {
    vec2 d = v_uv - u_splatPos;
    d.x *= u_aspect;
    float fall = exp(-dot(d, d) / (u_splatRadius * u_splatRadius));
    v += u_splatStrength * fall;
  }

  h = clamp(h, -2.5, 2.5);
  outColor = vec4(h, v, 0.0, 1.0);
}`;

const RENDER_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_field;
uniform vec2 u_texel;
uniform float u_time;
in vec2 v_uv;
out vec4 outColor;

float heightAt(vec2 uv) {
  return texture(u_field, uv).r;
}

void main() {
  vec2 uv = v_uv;

  float hL = heightAt(uv - vec2(u_texel.x, 0.0));
  float hR = heightAt(uv + vec2(u_texel.x, 0.0));
  float hB = heightAt(uv - vec2(0.0, u_texel.y));
  float hT = heightAt(uv + vec2(0.0, u_texel.y));

  vec3 n = normalize(vec3((hL - hR) * 6.0, (hB - hT) * 6.0, 1.0));

  // Gentle ambient swell so the surface feels alive while idle.
  n.xy += vec2(
    sin(uv.y * 9.0 + u_time * 0.42) + sin(uv.x * 6.0 - u_time * 0.31),
    cos(uv.x * 8.0 - u_time * 0.37) + cos(uv.y * 5.0 + u_time * 0.27)
  ) * 0.006;
  n = normalize(n);

  // Refract the deep-sea gradient through the surface.
  vec2 ruv = uv + n.xy * 0.10;
  vec3 deep = vec3(0.004, 0.014, 0.032);
  vec3 mid = vec3(0.012, 0.052, 0.098);
  vec3 col = mix(deep, mid, pow(clamp(1.0 - ruv.y, 0.0, 1.0), 1.5));

  // Soft cyan glow pooling under the light.
  vec2 g = (ruv - vec2(0.5, 0.78)) * vec2(1.5, 1.0);
  col += vec3(0.015, 0.09, 0.14) * exp(-dot(g, g) * 3.0);

  // Caustic shimmer drifting through the refracted background.
  float ca = sin(ruv.x * 42.0 + u_time * 0.8) * sin(ruv.y * 34.0 - u_time * 0.6);
  ca += sin((ruv.x + ruv.y) * 26.0 + u_time * 0.45);
  col += vec3(0.04, 0.12, 0.16) * max(ca, 0.0) * 0.07;

  // Blinn-Phong specular glint from a high key light.
  vec3 lightDir = normalize(vec3(-0.35, 0.5, 0.8));
  vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, halfVec), 0.0), 110.0);
  col += vec3(0.35, 0.72, 0.82) * spec;

  // Faint rim light on ripple crests.
  float crest = (hL + hR + hB + hT) * 0.25;
  col += vec3(0.05, 0.20, 0.26) * clamp(crest * 3.0, 0.0, 1.0) * 0.35;

  // Vignette to pull focus toward the content.
  vec2 vd = uv - vec2(0.5, 0.45);
  float vig = smoothstep(1.2, 0.3, length(vd));
  col *= mix(0.72, 1.0, vig);

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

function link(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
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
  return program;
}

interface Splat {
  x: number;
  y: number;
  radius: number;
  strength: number;
}

export function createWaterSurface(canvas: HTMLCanvasElement): WaterSurface | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;
  if (!gl.getExtension("EXT_color_buffer_float")) return null;

  let updateProgram: WebGLProgram;
  let renderProgram: WebGLProgram;
  try {
    updateProgram = link(gl, VERT, UPDATE_FRAG);
    renderProgram = link(gl, VERT, RENDER_FRAG);
  } catch {
    return null;
  }

  const vao = gl.createVertexArray();

  const uUpdate = {
    field: gl.getUniformLocation(updateProgram, "u_field"),
    texel: gl.getUniformLocation(updateProgram, "u_texel"),
    aspect: gl.getUniformLocation(updateProgram, "u_aspect"),
    splatPos: gl.getUniformLocation(updateProgram, "u_splatPos"),
    splatRadius: gl.getUniformLocation(updateProgram, "u_splatRadius"),
    splatStrength: gl.getUniformLocation(updateProgram, "u_splatStrength"),
  };
  const uRender = {
    field: gl.getUniformLocation(renderProgram, "u_field"),
    texel: gl.getUniformLocation(renderProgram, "u_texel"),
    time: gl.getUniformLocation(renderProgram, "u_time"),
  };

  let simW = 0;
  let simH = 0;
  let textures: WebGLTexture[] = [];
  let framebuffers: WebGLFramebuffer[] = [];
  let readIndex = 0;

  function destroyTargets() {
    for (const t of textures) gl!.deleteTexture(t);
    for (const f of framebuffers) gl!.deleteFramebuffer(f);
    textures = [];
    framebuffers = [];
  }

  function createTargets(): boolean {
    destroyTargets();
    for (let i = 0; i < 2; i++) {
      const tex = gl!.createTexture();
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RG16F, simW, simH, 0, gl!.RG, gl!.HALF_FLOAT, null);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);

      const fbo = gl!.createFramebuffer();
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
      if (gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) !== gl!.FRAMEBUFFER_COMPLETE) {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
        return false;
      }
      if (tex) textures.push(tex);
      if (fbo) framebuffers.push(fbo);
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    readIndex = 0;
    return true;
  }

  function fit(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // The simulation runs on a smaller grid than the drawing buffer.
    const nextW = Math.min(448, Math.max(128, Math.round(canvas.clientWidth / 3)));
    const nextH = Math.min(448, Math.max(128, Math.round(canvas.clientHeight / 3)));
    if (nextW !== simW || nextH !== simH) {
      simW = nextW;
      simH = nextH;
      return createTargets();
    }
    return true;
  }

  if (!fit()) return null;

  const pendingSplats: Splat[] = [];
  let raf = 0;
  let active = true;
  let destroyed = false;
  const start = performance.now();

  function step(splat: Splat | undefined) {
    gl!.useProgram(updateProgram);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffers[1 - readIndex]);
    gl!.viewport(0, 0, simW, simH);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, textures[readIndex]);
    gl!.uniform1i(uUpdate.field, 0);
    gl!.uniform2f(uUpdate.texel, 1 / simW, 1 / simH);
    gl!.uniform1f(uUpdate.aspect, simW / simH);
    if (splat) {
      gl!.uniform2f(uUpdate.splatPos, splat.x, splat.y);
      gl!.uniform1f(uUpdate.splatRadius, splat.radius);
      gl!.uniform1f(uUpdate.splatStrength, splat.strength);
    } else {
      gl!.uniform1f(uUpdate.splatStrength, 0);
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    readIndex = 1 - readIndex;
  }

  function frame() {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (!active) return;

    gl!.bindVertexArray(vao);

    // Two substeps per frame makes waves travel at a pleasing speed.
    step(pendingSplats.shift());
    step(pendingSplats.shift());

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(renderProgram);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, textures[readIndex]);
    gl!.uniform1i(uRender.field, 0);
    gl!.uniform2f(uRender.texel, 1 / simW, 1 / simH);
    gl!.uniform1f(uRender.time, (performance.now() - start) / 1000);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(frame);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    active = false;
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  return {
    splash(x, y, radius, strength) {
      if (destroyed) return;
      // Keep the queue short so bursts of events cannot back up.
      if (pendingSplats.length > 6) pendingSplats.length = 6;
      pendingSplats.push({ x, y, radius, strength });
    },
    setActive(next) {
      active = next && !destroyed;
    },
    resize() {
      if (!destroyed) fit();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      destroyTargets();
      gl.deleteProgram(updateProgram);
      gl.deleteProgram(renderProgram);
      if (vao) gl.deleteVertexArray(vao);
    },
  };
}
