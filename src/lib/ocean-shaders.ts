/**
 * Ocean surface shaders for the 3D hero.
 *
 * The vertex shader displaces a horizontal plane by a height field made of:
 *   1. a few summed directional swell waves (the ambient, always-moving sea), and
 *   2. mouse-driven ripple rings that expand outward from where the cursor
 *      touches the water and decay with age and distance.
 * Normals are derived by sampling the same height function at small offsets,
 * so lighting stays consistent with the displacement.
 *
 * The fragment shader shades it as deep water: a depth gradient, a sharp sun
 * glint (the sparkle), a fresnel rim toward the sky, and a faint view-angle
 * iridescence so crests catch a subtle rainbow - the "premium" cue.
 */

export const MAX_RIPPLES = 24;

export const OCEAN_VERTEX = /* glsl */ `
precision highp float;

uniform float u_time;
// Each ripple: xy = position on the plane, z = start time, w = strength.
uniform vec4 u_ripples[${MAX_RIPPLES}];

varying vec3 v_worldPos;
varying vec3 v_normal;
varying float v_height;

const float RIPPLE_SPEED = 3.2;   // how fast a ring travels outward (units/s)
const float RIPPLE_WAVES = 7.0;   // spatial frequency of the ring
const float RIPPLE_LIFE = 4.5;    // seconds before a ripple fully fades

// Contribution of one ripple ring to the height at plane position p.
float rippleAt(vec2 p, vec4 ripple) {
  float age = u_time - ripple.z;
  if (age < 0.0 || age > RIPPLE_LIFE) return 0.0;
  float dist = distance(p, ripple.xy);
  float radius = age * RIPPLE_SPEED;
  // A travelling ring: a narrow band of oscillation around the wavefront.
  float band = exp(-pow(dist - radius, 2.0) * 0.6);
  float wave = sin((dist - radius) * RIPPLE_WAVES);
  float timeDecay = 1.0 - age / RIPPLE_LIFE;
  float distDecay = 1.0 / (1.0 + dist * 0.35);
  return ripple.w * wave * band * timeDecay * timeDecay * distDecay;
}

// Ambient directional swell - a small sum of sine waves in different directions.
float swellAt(vec2 p) {
  float h = 0.0;
  h += sin(p.x * 0.18 + u_time * 0.55) * 0.55;
  h += sin((p.x * 0.11 + p.y * 0.16) + u_time * 0.42) * 0.42;
  h += sin((p.y * 0.22 - p.x * 0.07) - u_time * 0.35) * 0.30;
  h += sin((p.x * 0.33 + p.y * 0.05) + u_time * 0.9) * 0.12;
  return h;
}

float heightAt(vec2 p) {
  float h = swellAt(p);
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    h += rippleAt(p, u_ripples[i]);
  }
  return h;
}

void main() {
  vec2 p = position.xy; // plane is authored in XY, rotated to XZ by the mesh
  float h = heightAt(p);

  // Derive the normal from the height field via finite differences.
  float e = 0.6;
  float hx = heightAt(p + vec2(e, 0.0));
  float hy = heightAt(p + vec2(0.0, e));
  vec3 tangentX = vec3(e, 0.0, hx - h);
  vec3 tangentY = vec3(0.0, e, hy - h);
  vec3 normal = normalize(cross(tangentX, tangentY));

  vec3 displaced = vec3(position.xy, h);

  v_height = h;
  // World-space normal (mesh has only rotation + translation, no scale).
  v_normal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  v_worldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const OCEAN_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 u_cameraPos;
uniform vec3 u_sunDir;
uniform vec3 u_deepColor;
uniform vec3 u_shallowColor;
uniform vec3 u_skyColor;
uniform vec3 u_sunColor;

varying vec3 v_worldPos;
varying vec3 v_normal;
varying float v_height;

// Cheap iridescence: map an angle to a smooth rainbow.
vec3 iridescence(float t) {
  return 0.5 + 0.5 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + t));
}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 viewDir = normalize(u_cameraPos - v_worldPos);
  vec3 sunDir = normalize(u_sunDir);

  // Base water colour: deeper in the troughs, brighter on the crests.
  float crest = clamp(v_height * 0.5 + 0.5, 0.0, 1.0);
  vec3 base = mix(u_deepColor, u_shallowColor, crest * crest);

  // Fresnel: grazing angles reflect the sky, head-on shows the deep water.
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
  vec3 color = mix(base, u_skyColor, fresnel * 0.85);

  // Sharp specular sun glint - the sparkle across the surface.
  vec3 halfVec = normalize(sunDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), 220.0);
  color += u_sunColor * spec * 2.2;

  // A broader, softer glimmer band.
  float glimmer = pow(max(dot(normal, halfVec), 0.0), 40.0);
  color += u_sunColor * glimmer * 0.18;

  // Faint iridescence keyed to view angle, strongest on the fresnel rim.
  float irisT = dot(normal, viewDir) * 0.5 + v_height * 0.08;
  color += iridescence(irisT) * fresnel * 0.10;

  // Distance haze so the surface melts into the horizon fog colour.
  float dist = length(u_cameraPos - v_worldPos);
  float haze = smoothstep(40.0, 150.0, dist);
  color = mix(color, u_skyColor, haze * 0.6);

  gl_FragColor = vec4(color, 1.0);
}
`;
