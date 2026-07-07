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

  float h  = heightAt(uv);
  float hL = heightAt(uv - vec2(u_texel.x, 0.0));
  float hR = heightAt(uv + vec2(u_texel.x, 0.0));
  float hB = heightAt(uv - vec2(0.0, u_texel.y));
  float hT = heightAt(uv + vec2(0.0, u_texel.y));

  // Surface normal from the height field (z points up, out of the water).
  vec3 n = normalize(vec3((hL - hR) * 7.0, (hB - hT) * 7.0, 1.0));

  // Broad, slow ambient swell so the resting surface still breathes.
  n.xy += vec2(
    sin(uv.y * 3.0 + u_time * 0.30) + sin(uv.x * 2.2 - u_time * 0.23),
    cos(uv.x * 2.6 - u_time * 0.27) + cos(uv.y * 1.9 + u_time * 0.20)
  ) * 0.008;
  n = normalize(n);

  // Fake perspective: the view grazes the surface toward the top of the
  // screen (a horizon) and looks head-on near the bottom (the viewer), which
  // is what makes the flat plane read as a receding 3D surface.
  float graze = clamp(uv.y, 0.0, 1.0);
  vec3 viewDir = normalize(vec3(0.0, -mix(0.10, 1.25, graze), mix(1.55, 0.45, graze)));

  // Fresnel: grazing angles reflect the sky, head-on sees into the depths.
  float fres = pow(clamp(1.0 - max(dot(n, viewDir), 0.0), 0.0, 1.0), 5.0);

  // Refracted water body, graded by depth; troughs darker, crests brighter.
  vec2 ruv = uv + n.xy * 0.12;
  vec3 deep = vec3(0.003, 0.012, 0.028);
  vec3 shallow = vec3(0.014, 0.072, 0.120);
  vec3 water = mix(deep, shallow, pow(clamp(1.0 - ruv.y, 0.0, 1.0), 1.4));
  water *= 0.72 + 0.55 * clamp(h * 0.5 + 0.5, 0.0, 1.0);

  // Caustics, only where we can see into the water (troughs, low fresnel).
  float ca = sin(ruv.x * 15.0 + u_time * 0.7) * sin(ruv.y * 12.0 - u_time * 0.5);
  ca += 0.6 * sin((ruv.x + ruv.y) * 9.0 + u_time * 0.4);
  water += vec3(0.02, 0.08, 0.11) * max(ca, 0.0) * (1.0 - fres) * 0.10;

  // Muted teal sky reflection (keeps the dark theme while adding a horizon).
  vec3 sky = mix(vec3(0.03, 0.10, 0.18), vec3(0.10, 0.24, 0.36), graze);
  vec3 col = mix(water, sky, fres * 0.9);

  // Subsurface glow through the wave crests (light passing through the tips).
  float sss = clamp(h, 0.0, 1.5);
  col += vec3(0.04, 0.16, 0.18) * sss * sss * 0.5;

  // Sun glint: a sharp specular plus a soft blooming halo around it.
  vec3 sunDir = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 halfVec = normalize(sunDir + viewDir);
  float ndh = max(dot(n, halfVec), 0.0);
  col += vec3(0.55, 0.85, 1.0) * pow(ndh, 260.0) * 2.4;
  col += vec3(0.14, 0.34, 0.44) * pow(ndh, 30.0) * 0.30;

  // Horizon haze so the far surface melts into the sky.
  col = mix(col, vec3(0.08, 0.18, 0.27), smoothstep(0.6, 1.0, uv.y) * 0.45);

  // Vignette to pull focus toward the content.
  vec2 vd = uv - vec2(0.5, 0.48);
  col *= mix(0.7, 1.0, smoothstep(1.15, 0.35, length(vd)));

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
