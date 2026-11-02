import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clayBump, waffle } from './textures';
import { fbm, rng } from './util';

/* ==========================================================================
   Shared materials
   ========================================================================== */

export interface Materials {
  gelato: THREE.MeshPhysicalMaterial;
  chocolate: THREE.MeshPhysicalMaterial;
  chocolateCoat: THREE.MeshPhysicalMaterial;
  waffle: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshPhysicalMaterial;
  clayBump: THREE.Texture;
  /** uCut for the chocolate shell: local Y below which the coat is not drawn yet. */
  coatCut: { value: number };
}

export function createMaterials(): Materials {
  const bump = clayBump();
  const w = waffle();
  const coatCut = { value: 1 };

  const chocolateProps: THREE.MeshPhysicalMaterialParameters = {
    color: '#3d2014',
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    sheen: 0.3,
    sheenColor: new THREE.Color('#8a4a2a'),
  };
  const chocolateCoat = new THREE.MeshPhysicalMaterial(chocolateProps);
  // Wavy reveal edge so the coat looks poured rather than sliced.
  chocolateCoat.onBeforeCompile = (shader) => {
    shader.uniforms['uCut'] = coatCut;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;\nuniform float uCut;')
      .replace(
        'void main() {',
        `void main() {
          float ang = atan(vLocalPos.z, vLocalPos.x);
          float edge = uCut + 0.035 * sin(ang * 6.0) + 0.018 * sin(ang * 11.0 + 1.7);
          if (vLocalPos.y < edge) discard;`,
      );
  };

  return {
    gelato: new THREE.MeshPhysicalMaterial({
      color: '#b8c98a',
      roughness: 0.62,
      sheen: 0.7,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color('#ffffff'),
      clearcoat: 0.12,
      clearcoatRoughness: 0.6,
      bumpMap: bump,
      bumpScale: 0.6,
    }),
    chocolate: new THREE.MeshPhysicalMaterial(chocolateProps),
    chocolateCoat,
    waffle: new THREE.MeshStandardMaterial({
      map: w.map,
      bumpMap: w.bump,
      bumpScale: 2.2,
      roughness: 0.78,
      side: THREE.DoubleSide,
    }),
    metal: new THREE.MeshStandardMaterial({ color: '#d6d6d4', metalness: 1, roughness: 0.26 }),
    copper: new THREE.MeshStandardMaterial({ color: '#c47b4b', metalness: 1, roughness: 0.32 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f4efe6', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    clayBump: bump,
    coatCut,
  };
}

export function clay(color: THREE.ColorRepresentation, bump: THREE.Texture, roughness = 0.72): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    sheen: 0.35,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color('#ffffff'),
    bumpMap: bump,
    bumpScale: 0.35,
  });
}

/* ==========================================================================
   Gelato scoop geometry
   ========================================================================== */

export const SCOOP_R = 0.38;

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Surface point of a hand-scooped ball along unit direction d (local units). */
export function scoopPoint(d: THREE.Vector3, out = new THREE.Vector3(), seed = 0): THREE.Vector3 {
  const ang = Math.atan2(d.z, d.x);
  const ridges = 0.024 * Math.sin(ang * 7 + d.y * 6 + seed) * smooth(-0.6, 0.2, d.y);
  const lumps = 0.06 * fbm(d.x * 2.3 + seed, d.y * 2.3, d.z * 2.3);
  const r = SCOOP_R * (1 + lumps + ridges);
  out.copy(d).multiplyScalar(r);
  out.y *= 0.88;
  // Flatten the underside into a lip that rests on the cone rim.
  const t = smooth(-0.2, -0.78, d.y);
  out.y = THREE.MathUtils.lerp(out.y, -0.34 * SCOOP_R, t);
  const lip = 1 + 0.12 * t * (1 - t) * 2;
  out.x *= lip;
  out.z *= lip;
  return out;
}

export function scoopGeometry(seed = 0, detail = 1): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, Math.round(112 * detail), Math.round(84 * detail));
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    scoopPoint(d, p, seed);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}

/* ==========================================================================
   Cone + wire stand
   ========================================================================== */

export const CONE_LEN = 1.25;
export const CONE_R = 0.36;

/** Waffle cone with its origin at the rim center, apex pointing down. */
export function buildCone(m: Materials): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector2(Math.max(0.004, CONE_R * t), -CONE_LEN * (1 - t)));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), m.waffle);
  body.castShadow = true;
  body.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CONE_R, 0.034, 14, 64), m.waffle);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  g.add(body, rim);
  return g;
}

export function buildStand(m: Materials, ringY: number): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.035, 64), m.metal);
  base.position.y = 0.0175;
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.02, 10, 64), m.metal);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.035;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, ringY, 16), m.metal);
  rod.position.set(0, ringY / 2, -0.37);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.13, 12), m.metal);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, ringY, -0.305);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.017, 12, 64), m.metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = ringY;
  // Decorative curl halfway up the rod.
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 32, Math.PI * 1.6), m.metal);
  curl.position.set(0, ringY * 0.45, -0.3);
  curl.rotation.y = Math.PI / 2;
  for (const o of [base, baseRing, rod, arm, ring, curl]) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
  g.add(base, baseRing, rod, arm, ring, curl);
  return g;
}

/* ==========================================================================
   Gelato pan, chocolate bowl, nut tray
   ========================================================================== */

export function buildTray(m: Materials, w = 1.3, d = 0.78): { group: THREE.Group; surface: THREE.Mesh } {
  const g = new THREE.Group();
  const h = 0.2;
  const pan = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.metal);
  pan.position.y = h / 2;
  pan.castShadow = pan.receiveShadow = true;
  const lip = 0.035;
  const rims = [
    [w + lip, lip, lip, 0, h, d / 2],
    [w + lip, lip, lip, 0, h, -d / 2],
    [lip, lip, d + lip, w / 2, h, 0],
    [lip, lip, d + lip, -w / 2, h, 0],
  ];
  for (const [rx, ry, rz, px, py, pz] of rims) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(rx, ry, rz), m.metal);
    r.position.set(px, py, pz);
    r.castShadow = true;
    g.add(r);
  }

  const geo = new THREE.PlaneGeometry(w - 0.06, d - 0.06, 96, 60);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const ex = 1 - Math.pow(Math.abs(x) / ((w - 0.06) / 2), 6);
    const ey = 1 - Math.pow(Math.abs(y) / ((d - 0.06) / 2), 6);
    const edge = Math.max(0, ex) * Math.max(0, ey);
    // Rolling waves of gelato with a scooped crater near the right side.
    let z = 0.05 + 0.06 * fbm(x * 2.2, y * 2.2, 0.5) + 0.018 * Math.sin(x * 10 + Math.sin(y * 8) * 1.5);
    const cx = x - w * 0.22;
    const cy = y - 0.05;
    z -= 0.07 * Math.exp(-(cx * cx + cy * cy) / 0.02);
    z += 0.04 * Math.exp(-((cx - 0.14) ** 2 + cy * cy) / 0.01);
    pos.setZ(i, z * edge);
  }
  geo.computeVertexNormals();
  const surface = new THREE.Mesh(geo, m.gelato);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = h - 0.005;
  surface.receiveShadow = true;
  surface.castShadow = true;
  g.add(pan, surface);
  return { group: g, surface };
}

export function buildBowl(m: Materials): THREE.Group {
  const g = new THREE.Group();
  const profile = [
    [0.0, 0.0],
    [0.2, 0.0],
    [0.3, 0.05],
    [0.35, 0.13],
    [0.37, 0.22],
    [0.36, 0.235],
    [0.335, 0.22],
    [0.31, 0.12],
    [0.23, 0.05],
    [0.0, 0.035],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), m.ceramic);
  bowl.castShadow = bowl.receiveShadow = true;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.325, 48), m.chocolate);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.19;
  g.add(bowl, pool);
  return g;
}

const NUT_COLORS = ['#8fae4f', '#a6bf5d', '#6f8f3a', '#b7c977', '#7d5c3e'];

export function nutGeometry(): THREE.BufferGeometry {
  const g = new THREE.DodecahedronGeometry(0.034, 0);
  g.scale(1, 0.62, 0.8);
  return g;
}

export function buildNutTray(m: Materials, nutMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.42), m.metal);
  pan.position.y = 0.035;
  pan.castShadow = pan.receiveShadow = true;
  const count = 70;
  const nuts = new THREE.InstancedMesh(nutGeometry(), nutMat, count);
  const r = rng(42);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    o.position.set((r() - 0.5) * 0.52, 0.08 + r() * 0.035, (r() - 0.5) * 0.32);
    o.rotation.set(r() * 6, r() * 6, r() * 6);
    o.updateMatrix();
    nuts.setMatrixAt(i, o.matrix);
    nuts.setColorAt(i, c.set(NUT_COLORS[Math.floor(r() * NUT_COLORS.length)]));
  }
  nuts.castShadow = true;
  g.add(pan, nuts);
  return g;
}

export function nutColor(i: number): string {
  return NUT_COLORS[i % NUT_COLORS.length];
}

/* ==========================================================================
   Hand tools
   ========================================================================== */

export const TOOL_LEN = 0.66;

/** Long-handled gelato scoop built along +X; the bowl sits at x = TOOL_LEN. */
export function buildScoopTool(m: Materials, wood: THREE.Material): { group: THREE.Group; ball: THREE.Mesh } {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.24, 6, 16), wood);
  grip.rotation.z = -Math.PI / 2;
  grip.position.x = 0.1;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, TOOL_LEN - 0.2, 12), m.metal);
  shaft.rotation.z = -Math.PI / 2;
  shaft.position.x = 0.22 + (TOOL_LEN - 0.2) / 2 - 0.02;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.metal);
  bowl.material = m.metal.clone();
  (bowl.material as THREE.Material).side = THREE.DoubleSide;
  bowl.position.x = TOOL_LEN;
  const ball = new THREE.Mesh(scoopGeometry(2.5, 0.45), m.gelato);
  ball.position.set(TOOL_LEN, 0.04, 0);
  ball.scale.setScalar(0);
  for (const o of [grip, shaft, bowl, ball]) o.castShadow = true;
  g.add(grip, shaft, bowl, ball);
  return { group: g, ball };
}

/** Copper pouring jug; origin at body center, spout on -X, handle on +X. */
export function buildPitcher(m: Materials): { group: THREE.Group; spout: THREE.Vector3; handle: THREE.Vector3 } {
  const g = new THREE.Group();
  const profile = [
    [0.0, -0.15],
    [0.12, -0.15],
    [0.145, -0.1],
    [0.15, 0.02],
    [0.13, 0.12],
    [0.135, 0.16],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), m.copper);
  (body.material as THREE.Material).side = THREE.DoubleSide;
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 16, 1, true), m.copper);
  spout.position.set(-0.16, 0.13, 0);
  spout.rotation.z = Math.PI / 2 + 0.5;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 10, 24, Math.PI * 1.15), m.copper);
  handle.position.set(0.15, 0.01, 0);
  handle.rotation.z = -Math.PI / 2 - 0.2;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.128, 32), m.chocolate);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.1;
  for (const o of [body, spout, handle]) o.castShadow = true;
  g.add(body, spout, handle, fill);
  return { group: g, spout: new THREE.Vector3(-0.21, 0.16, 0), handle: new THREE.Vector3(0.2, 0.0, 0) };
}
