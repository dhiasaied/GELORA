import * as THREE from 'three';
import { Materials, buildCone, clay, scoopGeometry } from './props';
import { terrazzo, woodGrain } from './textures';
import { rng } from './util';

export interface Shop {
  group: THREE.Group;
  wallMat: THREE.MeshStandardMaterial;
  counterMat: THREE.MeshStandardMaterial;
  /** Gelato tubs in the back display, one follows the active palette. */
  featuredTub: THREE.MeshPhysicalMaterial;
  lampMat: THREE.MeshStandardMaterial;
}

/** The gelateria around the stage: terrazzo counter, display case, shelves, lamps. */
export function buildShop(m: Materials): Shop {
  const g = new THREE.Group();
  const r = rng(5);

  // Counter top the figure stands on.
  const counterMat = new THREE.MeshStandardMaterial({ map: terrazzo(), roughness: 0.55, metalness: 0 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 9), counterMat);
  counter.position.set(0, -0.25, 1.2);
  counter.receiveShadow = true;
  g.add(counter);

  // Back wall
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e8dcc8', roughness: 0.95 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), wallMat);
  wall.position.set(0, 6, -9);
  g.add(wall);

  // Back cabinetry with the display case on top
  const wood = new THREE.MeshStandardMaterial({ map: woodGrain(), roughness: 0.7 });
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 1.6), wood);
  cabinet.position.set(0, 0.2, -5);
  cabinet.receiveShadow = true;
  g.add(cabinet);
  const caseTop = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 1.7), counterMat);
  caseTop.position.set(0, 1.04, -5);
  g.add(caseTop);

  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.05,
    transmission: 0,
    transparent: true,
    opacity: 0.12,
    metalness: 0,
    clearcoat: 1,
    depthWrite: false,
  });
  const pane = new THREE.Mesh(new THREE.BoxGeometry(13.6, 1.1, 0.02), glass);
  pane.position.set(0, 1.62, -4.25);
  pane.rotation.x = -0.25;
  g.add(pane);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(13.7, 0.04, 0.04), m.metal);
  frame.position.set(0, 2.15, -4.12);
  g.add(frame);

  // Tubs of gelato inside the case
  const tubColors = ['#f0a3ae', '#f4ecd6', '#7a4a2e', '#f5b54a', '#a3a9e3', '#c9e0a5', '#e8d7b5', '#f2c4ce'];
  const featuredTub = new THREE.MeshPhysicalMaterial({ color: '#b8c98a', roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#fff') });
  const tubGeo = new THREE.BoxGeometry(0.95, 0.25, 0.75);
  const moundGeo = scoopGeometry(4, 0.4);
  for (let i = 0; i < 12; i++) {
    const x = -6 + i * 1.08;
    const tub = new THREE.Mesh(tubGeo, m.metal);
    tub.position.set(x, 1.2, -5);
    g.add(tub);
    const mat = i === 6 || i === 2 ? featuredTub : clay(tubColors[i % tubColors.length], m.clayBump, 0.6);
    const mound = new THREE.Mesh(moundGeo, mat);
    mound.position.set(x + (r() - 0.5) * 0.1, 1.38, -5);
    mound.scale.set(1.15, 0.55 + r() * 0.25, 0.9);
    mound.rotation.y = r() * Math.PI;
    g.add(mound);
  }

  // Wall shelves with bottles and jars
  const bottleMat = new THREE.MeshPhysicalMaterial({ color: '#3a2a1c', roughness: 0.12, clearcoat: 1, metalness: 0.1 });
  const bottleGreen = new THREE.MeshPhysicalMaterial({ color: '#2f3d2a', roughness: 0.12, clearcoat: 1 });
  const labelMat = new THREE.MeshStandardMaterial({ color: '#efe4cf', roughness: 0.8 });
  for (const sy of [3.2, 4.6]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.7), wood);
    shelf.position.set(-1, sy, -8.6);
    shelf.receiveShadow = true;
    g.add(shelf);
    for (let i = 0; i < 9; i++) {
      const x = -5 + i * 1 + r() * 0.3;
      const tall = 0.6 + r() * 0.5;
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, tall, 20), r() > 0.5 ? bottleMat : bottleGreen);
      body.position.y = tall / 2;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 0.22, 16), body.material);
      neck.position.y = tall + 0.1;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, tall * 0.35, 20, 1, true), labelMat);
      label.position.y = tall * 0.45;
      bottle.add(body, neck, label);
      bottle.position.set(x, sy + 0.05, -8.5);
      g.add(bottle);
    }
  }

  // Display cones in wall holders (echoing the hero cone)
  for (let i = 0; i < 5; i++) {
    const c = buildCone(m);
    c.scale.setScalar(0.8);
    c.position.set(2.2 + i * 0.95, 3.4 + (i % 2) * 0.25, -8.3);
    c.rotation.z = (r() - 0.5) * 0.2;
    g.add(c);
    if (i % 2 === 0) {
      const top = new THREE.Mesh(moundGeo, clay(tubColors[(i * 3) % tubColors.length], m.clayBump, 0.6));
      top.position.set(c.position.x, c.position.y + 0.12, c.position.z);
      top.scale.setScalar(0.8);
      g.add(top);
    }
  }

  // Warm pendant lamps
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd59a', emissiveIntensity: 2.2 });
  const shadeMat = clay('#2d2a26', m.clayBump, 0.5);
  for (const x of [-3.2, 3.6]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 4, 6), shadeMat);
    cord.position.set(x, 7.5, -3.5);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.45, 32, 1, true), shadeMat);
    shade.material = shadeMat.clone();
    (shade.material as THREE.Material).side = THREE.DoubleSide;
    shade.position.set(x, 5.4, -3.5);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), lampMat);
    bulb.position.set(x, 5.2, -3.5);
    g.add(cord, shade, bulb);
  }

  // Potted plant silhouettes for depth (stylized clay leaves)
  const leafMat = clay('#4f6b3f', m.clayBump, 0.7);
  const potMat = clay('#d8cbb4', m.clayBump, 0.6);
  for (const [px, pz, ps] of [
    [-6.5, -7.5, 1.4],
    [7.5, -6.8, 1.2],
  ]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.38, 0.9, 24), potMat);
    pot.position.set(px, 1.5, pz);
    g.add(pot);
    for (let i = 0; i < 14; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), leafMat);
      leaf.scale.set(0.5, 1.4, 0.15);
      leaf.position.set(px + (r() - 0.5) * 1.2 * ps, 2.4 + r() * 1.6 * ps, pz + (r() - 0.5) * 0.8);
      leaf.rotation.set(r() - 0.5, r() * 3, (r() - 0.5) * 1.6);
      g.add(leaf);
    }
  }

  return { group: g, wallMat, counterMat, featuredTub, lampMat };
}
