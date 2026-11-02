import * as THREE from 'three';
import { clay } from './props';
import { clamp } from './util';

const DOWN = new THREE.Vector3(0, -1, 0);

interface ArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
  l1: number;
  l2: number;
  side: 1 | -1;
}

const L1 = 0.7;
const L2 = 0.66;

/**
 * The gelatiere: a clay-figurine character built from soft primitives.
 * Arms are driven by an analytic two-bone IK so hands can reach props
 * anywhere in the scene; the rest of the body is posed procedurally.
 */
export class Gelatiere {
  readonly root = new THREE.Group();
  readonly hips = new THREE.Group();
  readonly spine = new THREE.Group();
  readonly head = new THREE.Group();
  readonly armR: ArmRig;
  readonly armL: ArmRig;
  readonly apronMat: THREE.MeshPhysicalMaterial;
  readonly hatMat: THREE.MeshPhysicalMaterial;

  private readonly legs: THREE.Group[] = [];
  private readonly eyes: THREE.Mesh[] = [];
  private headYaw = 0;
  private headPitch = 0;
  private walkPhase = 0;

  // scratch
  private readonly v1 = new THREE.Vector3();
  private readonly v2 = new THREE.Vector3();
  private readonly v3 = new THREE.Vector3();
  private readonly q1 = new THREE.Quaternion();

  constructor(bump: THREE.Texture, scale = 0.82) {
    const skin = clay('#e7b28c', bump, 0.6);
    const shirt = clay('#f1e8d8', bump);
    this.apronMat = clay('#3f5b45', bump, 0.8);
    this.apronMat.side = THREE.DoubleSide;
    const trousers = clay('#6e6a64', bump);
    const shoes = clay('#3a271c', bump, 0.45);
    const hair = clay('#2a1c15', bump, 0.85);
    this.hatMat = clay('#a59f80', bump, 0.85);
    const black = new THREE.MeshPhysicalMaterial({ color: '#141010', roughness: 0.15, clearcoat: 1 });

    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, p: number[], r?: number[], s?: number[]) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p[0], p[1], p[2]);
      if (r) mesh.rotation.set(r[0], r[1], r[2]);
      if (s) mesh.scale.set(s[0], s[1], s[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    this.root.scale.setScalar(scale);
    this.root.add(this.hips);
    this.hips.position.y = 1.25;

    // ---- legs (pivot at hip so they can swing while walking)
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(0.17 * side, 0, 0);
      add(leg, new THREE.CapsuleGeometry(0.165, 0.86, 8, 20), trousers, [0, -0.6, 0]);
      add(leg, new THREE.SphereGeometry(1, 24, 16), shoes, [0.01 * side, -1.15, 0.09], undefined, [0.19, 0.11, 0.31]);
      this.hips.add(leg);
      this.legs.push(leg);
    }

    // ---- torso
    this.hips.add(this.spine);
    add(this.spine, new THREE.CapsuleGeometry(0.42, 0.5, 10, 28), shirt, [0, 0.58, 0], undefined, [1, 1, 0.76]);
    // apron skirt wrapping the front, slightly flared
    add(
      this.spine,
      new THREE.CylinderGeometry(0.445, 0.53, 1.24, 40, 1, true, -Math.PI * 0.43, Math.PI * 0.86),
      this.apronMat,
      [0, 0.05, 0],
      undefined,
      [1, 1, 0.8],
    );
    add(this.spine, new THREE.BoxGeometry(0.44, 0.42, 0.04), this.apronMat, [0, 0.86, 0.315], [-0.12, 0, 0]);
    add(this.spine, new THREE.TorusGeometry(0.44, 0.028, 8, 48), this.apronMat, [0, 0.42, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1]);
    // neck strap
    add(this.spine, new THREE.TorusGeometry(0.2, 0.022, 8, 32, Math.PI), this.apronMat, [0, 1.07, 0.16], [-0.6, 0, 0]);
    add(this.spine, new THREE.CylinderGeometry(0.13, 0.14, 0.24, 20), skin, [0, 1.3, 0.02]);
    add(this.spine, new THREE.TorusGeometry(0.15, 0.04, 10, 28), shirt, [0, 1.2, 0.02], [Math.PI / 2, 0, 0]);
    // bow tie
    const bow = new THREE.Group();
    bow.position.set(0, 1.18, 0.21);
    add(bow, new THREE.ConeGeometry(0.07, 0.13, 14), black, [-0.065, 0, 0], [0, 0, -Math.PI / 2]);
    add(bow, new THREE.ConeGeometry(0.07, 0.13, 14), black, [0.065, 0, 0], [0, 0, Math.PI / 2]);
    add(bow, new THREE.SphereGeometry(0.035, 12, 10), black, [0, 0, 0.01]);
    this.spine.add(bow);

    // ---- head
    this.head.position.set(0, 1.42, 0.03);
    this.spine.add(this.head);
    const h = this.head;
    add(h, new THREE.SphereGeometry(0.36, 40, 32), skin, [0, 0.36, 0], undefined, [1, 1.08, 0.98]);
    add(h, new THREE.SphereGeometry(0.37, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, [0, 0.4, -0.055], [0.35, 0, 0], [1.03, 1, 1]);
    for (const side of [-1, 1]) {
      add(h, new THREE.SphereGeometry(0.075, 16, 12), skin, [0.355 * side, 0.33, 0], undefined, [0.55, 1, 0.8]);
      this.eyes.push(add(h, new THREE.SphereGeometry(0.038, 16, 12), black, [0.12 * side, 0.43, 0.325]));
      add(h, new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), hair, [0.13 * side, 0.53, 0.33], [0, 0, (Math.PI / 2 - 0.25) * side]);
      // mustache halves curling upward at the tips
      add(h, new THREE.CapsuleGeometry(0.04, 0.13, 6, 12), hair, [0.085 * side, 0.24, 0.355], [0, -0.2 * side, (Math.PI / 2 + 0.28) * side]);
      add(h, new THREE.SphereGeometry(0.03, 10, 8), hair, [0.18 * side, 0.275, 0.33]);
    }
    add(h, new THREE.SphereGeometry(0.085, 20, 16), skin, [0, 0.32, 0.36], undefined, [1, 0.95, 1.1]);
    add(h, new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), clay('#9a4f3c', bump), [0, 0.18, 0.33], [0.2, 0, Math.PI]);
    // soda-jerk paper cap
    const hat = add(h, new THREE.CylinderGeometry(0.17, 0.32, 0.2, 4, 1), this.hatMat, [0, 0.74, -0.02], [-0.12, Math.PI / 4, 0], [1, 1, 1]);
    hat.scale.set(1.25, 1, 0.62);
    hat.rotation.set(-0.12, 0, 0);
    hat.geometry.rotateY(Math.PI / 4);
    add(h, new THREE.TorusGeometry(0.33, 0.02, 6, 40), this.hatMat, [0, 0.645, -0.02], [Math.PI / 2 - 0.12, 0, 0], [1.05, 0.66, 1]);

    // ---- arms
    this.armR = this.buildArm(-1, shirt, skin, add);
    this.armL = this.buildArm(1, shirt, skin, add);
  }

  private buildArm(
    side: 1 | -1,
    shirt: THREE.Material,
    skin: THREE.Material,
    add: (p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, pos: number[], r?: number[], s?: number[]) => THREE.Mesh,
  ): ArmRig {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.47 * side, 1.08, 0);
    this.spine.add(shoulder);
    add(shoulder, new THREE.SphereGeometry(0.15, 20, 16), shirt, [0, 0, 0]);
    add(shoulder, new THREE.CapsuleGeometry(0.125, L1 - 0.2, 8, 18), shirt, [0, -L1 / 2, 0]);
    const elbow = new THREE.Group();
    elbow.position.y = -L1;
    shoulder.add(elbow);
    add(elbow, new THREE.TorusGeometry(0.11, 0.045, 10, 24), shirt, [0, -0.02, 0], [Math.PI / 2, 0, 0]);
    add(elbow, new THREE.CapsuleGeometry(0.095, L2 - 0.18, 8, 18), skin, [0, -L2 / 2, 0]);
    const hand = new THREE.Group();
    hand.position.y = -L2;
    elbow.add(hand);
    add(hand, new THREE.SphereGeometry(0.12, 20, 16), skin, [0, -0.04, 0], undefined, [0.9, 1.15, 0.75]);
    add(hand, new THREE.CapsuleGeometry(0.04, 0.08, 4, 10), skin, [-0.09 * side, -0.02, 0.05], [0, 0, 0.6 * side]);
    return { shoulder, elbow, hand, l1: L1, l2: L2, side };
  }

  /** World-space length of the arm chain, accounting for root scale. */
  private worldLen(arm: ArmRig): [number, number] {
    const s = this.root.getWorldScale(this.v3).x;
    return [arm.l1 * s, arm.l2 * s];
  }

  /** Two-bone IK: place the hand of `arm` at world `target`, elbow bending toward `pole`. */
  solveArm(arm: ArmRig, target: THREE.Vector3, pole: THREE.Vector3): void {
    arm.shoulder.parent!.updateWorldMatrix(true, false);
    const [l1, l2] = this.worldLen(arm);
    const S = arm.shoulder.getWorldPosition(this.v1);
    const dir = this.v2.copy(target).sub(S);
    const d = clamp(dir.length(), 0.05, l1 + l2 - 0.002);
    dir.normalize();
    const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const a = Math.acos(cosA);
    const n = new THREE.Vector3().crossVectors(dir, pole);
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
    n.normalize();
    const upper = dir.clone().applyAxisAngle(n, a);
    const elbowPos = S.clone().addScaledVector(upper, l1);
    const reach = S.clone().addScaledVector(dir, d);
    const fore = reach.sub(elbowPos).normalize();

    const parentQ = arm.shoulder.parent!.getWorldQuaternion(this.q1).invert();
    arm.shoulder.quaternion.setFromUnitVectors(DOWN, upper.applyQuaternion(parentQ));
    arm.shoulder.updateWorldMatrix(false, false);
    const shoulderQ = arm.shoulder.getWorldQuaternion(this.q1).invert();
    arm.elbow.quaternion.setFromUnitVectors(DOWN, fore.applyQuaternion(shoulderQ));
    arm.elbow.updateWorldMatrix(false, true);
  }

  /** Character-local point → world. */
  local(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.root.localToWorld(out.set(x, y, z));
  }

  /** Character-local direction → world (for IK poles). */
  dir(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(x, y, z).applyQuaternion(this.root.getWorldQuaternion(this.q1)).normalize();
  }

  /** Procedural body motion: breathing, walk cycle, lean, head tracking, blinking. */
  animateBody(time: number, dt: number, opts: { lean: number; crouch: number; walkSpeed: number; look: THREE.Vector3 }): void {
    const breathe = Math.sin(time * 1.8) * 0.012;
    this.hips.position.y = 1.25 - opts.crouch + Math.abs(Math.sin(this.walkPhase)) * 0.03 * Math.min(1, opts.walkSpeed * 3);
    this.spine.rotation.x = opts.lean + breathe;
    this.spine.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe * 0.5);

    this.walkPhase += dt * opts.walkSpeed * 14;
    const swing = Math.sin(this.walkPhase) * Math.min(0.45, opts.walkSpeed * 1.6);
    this.legs[0].rotation.x = swing - opts.crouch * 1.2;
    this.legs[1].rotation.x = -swing - opts.crouch * 1.2;

    // head look-at in root space, clamped like a real neck
    this.root.updateWorldMatrix(true, false);
    const local = this.root.worldToLocal(this.v1.copy(opts.look));
    const headPos = this.v2.set(0, this.hips.position.y + 1.42 + 0.36, 0);
    const d = local.sub(headPos);
    const yaw = clamp(Math.atan2(d.x, d.z), -0.9, 0.9);
    const pitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) - opts.lean, -0.5, 0.45);
    const t = 1 - Math.exp(-6 * dt);
    this.headYaw += (yaw - this.headYaw) * t;
    this.headPitch += (pitch - this.headPitch) * t;
    this.head.rotation.set(this.headPitch, this.headYaw, Math.sin(time * 0.9) * 0.04);

    const blink = time % 3.6 < 0.12 ? 0.15 : 1;
    for (const e of this.eyes) e.scale.y = blink;
  }
}
