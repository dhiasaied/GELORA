import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Gelatiere } from './character';
import { buildShop, Shop } from './environment';
import {
  CONE_LEN,
  Materials,
  SCOOP_R,
  TOOL_LEN,
  buildBowl,
  buildCone,
  buildNutTray,
  buildPitcher,
  buildScoopTool,
  buildStand,
  buildTray,
  clay,
  createMaterials,
  nutColor,
  nutGeometry,
  scoopGeometry,
  scoopPoint,
} from './props';
import { clamp, damp, ease, k, rng, seg } from './util';

export interface ScenePalette {
  gelato: string;
  apron: string;
  bg: string;
  accent: string;
  dark: boolean;
}

/* ---------- stage layout (world units, counter top at y = 0) ---------- */
const CONE_X = 0;
const CONE_Z = 0.25;
const RING_Y = 0.96;
/** Rim height once the cone sits in the stand ring. */
const RIM_Y = RING_Y + CONE_LEN * (1 - 0.245 / 0.36);
const CONE_SEAT = new THREE.Vector3(CONE_X, RIM_Y, CONE_Z);
const CONE_START = new THREE.Vector3(0.48, 1.95, 0.7);
const SCOOP_POS = new THREE.Vector3(CONE_X, RIM_Y + 0.34 * SCOOP_R, CONE_Z);
const TRAY_POS = new THREE.Vector3(-0.62, 0, 1.2);
const TIP_TRAY = new THREE.Vector3(-0.3, 0.33, 1.12);
const TIP_CONE = new THREE.Vector3(CONE_X, SCOOP_POS.y + 0.1, CONE_Z);
const BOWL_POS = new THREE.Vector3(0.62, 0, 1.25);
const NUT_TRAY_POS = new THREE.Vector3(1.55, 0, 1.15);
const PITCHER_POS = new THREE.Vector3(0.24, SCOOP_POS.y + 0.62, CONE_Z);
const PINCH = new THREE.Vector3(0.1, SCOOP_POS.y + 0.78, CONE_Z + 0.1);
const NUT_COUNT = 46;

/* ---------- camera path: [progress, position, look target] ---------- */
const CAM_KEYS: [number, [number, number, number], [number, number, number]][] = [
  [0.0, [0.5, 2.5, 8.8], [0.45, 1.45, 0.3]],
  [0.25, [-0.4, 2.3, 8.2], [0.15, 1.3, 0.55]],
  [0.5, [0.6, 2.7, 7.8], [0.3, 1.65, 0.35]],
  [0.75, [0.2, 2.9, 7.3], [0.25, 1.8, 0.3]],
  [1.0, [1.0, 2.6, 7.8], [0.4, 1.75, 0.35]],
];

export class GelatoScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  private composer?: EffectComposer;
  private bokeh?: BokehPass;

  private readonly m: Materials;
  private readonly shop: Shop;
  private readonly chef: Gelatiere;
  private readonly cone: THREE.Group;
  private readonly scoop: THREE.Mesh;
  private readonly coat: THREE.Mesh;
  private readonly drips: THREE.Mesh[] = [];
  private readonly tool: { group: THREE.Group; ball: THREE.Mesh };
  private readonly pitcher: { group: THREE.Group; spout: THREE.Vector3; handle: THREE.Vector3 };
  private readonly stream: THREE.Mesh;
  private readonly bowl: THREE.Group;
  private readonly nutTray: THREE.Group;
  private readonly nuts: THREE.InstancedMesh;
  private readonly nutTargets: THREE.Vector3[] = [];
  private readonly nutJitter: THREE.Vector3[] = [];
  private readonly trayGelato: THREE.Mesh;

  private readonly camPos: THREE.CatmullRomCurve3;
  private readonly camLook: THREE.CatmullRomCurve3;
  private layout = { x: 0, y: 0, dist: 1 };

  private target = 0;
  private p = 0;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private time = 0;
  private lastShift = 1.05;
  private active = true;
  private raf = 0;
  private clock = new THREE.Clock();
  private readonly mobile: boolean;
  private firstFrame?: () => void;

  // scratch vectors
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly obj = new THREE.Object3D();

  constructor(private readonly canvas: HTMLCanvasElement, opts: { onFirstFrame?: () => void } = {}) {
    this.firstFrame = opts.onFirstFrame;
    this.mobile = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.mobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();
    this.scene.background = new THREE.Color('#e8dcc8');
    this.scene.fog = new THREE.Fog('#e8dcc8', 13, 34);

    this.m = createMaterials();
    this.addLights();

    this.shop = buildShop(this.m);
    this.scene.add(this.shop.group);

    // Hero props
    const stand = buildStand(this.m, RING_Y);
    stand.position.set(CONE_X, 0, CONE_Z);
    this.scene.add(stand);

    this.cone = buildCone(this.m);
    this.scene.add(this.cone);

    this.scoop = new THREE.Mesh(scoopGeometry(0, this.mobile ? 0.7 : 1), this.m.gelato);
    this.scoop.position.copy(SCOOP_POS);
    this.scoop.castShadow = this.scoop.receiveShadow = true;
    this.scoop.scale.setScalar(0);
    this.scene.add(this.scoop);

    this.coat = new THREE.Mesh(this.scoop.geometry, this.m.chocolateCoat);
    this.coat.scale.setScalar(1.035);
    this.coat.visible = false;
    this.scoop.add(this.coat);
    this.buildDrips();

    const tray = buildTray(this.m);
    tray.group.position.copy(TRAY_POS);
    this.trayGelato = tray.surface;
    this.scene.add(tray.group);

    this.bowl = buildBowl(this.m);
    this.bowl.position.copy(BOWL_POS);
    this.bowl.scale.setScalar(0);
    this.scene.add(this.bowl);

    const nutMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    this.nutTray = buildNutTray(this.m, nutMat);
    this.nutTray.position.copy(NUT_TRAY_POS);
    this.nutTray.scale.setScalar(0);
    this.scene.add(this.nutTray);

    this.nuts = new THREE.InstancedMesh(nutGeometry(), nutMat, NUT_COUNT);
    this.nuts.castShadow = true;
    this.nuts.frustumCulled = false;
    this.prepareNuts();
    this.scene.add(this.nuts);

    const wood = clay('#8a5a36', this.m.clayBump, 0.5);
    this.tool = buildScoopTool(this.m, wood);
    this.tool.group.scale.setScalar(0);
    this.scene.add(this.tool.group);

    this.pitcher = buildPitcher(this.m);
    this.pitcher.group.scale.setScalar(0);
    this.scene.add(this.pitcher.group);

    const streamGeo = new THREE.CylinderGeometry(0.022, 0.03, 1, 14, 1, true);
    streamGeo.translate(0, -0.5, 0);
    this.stream = new THREE.Mesh(streamGeo, this.m.chocolate);
    this.stream.visible = false;
    this.scene.add(this.stream);

    this.chef = new Gelatiere(this.m.clayBump);
    this.chef.root.position.set(1.05, 0, -0.05);
    this.chef.root.rotation.y = -0.42;
    this.scene.add(this.chef.root);

    this.camPos = new THREE.CatmullRomCurve3(CAM_KEYS.map(([, p]) => new THREE.Vector3(...p)));
    this.camLook = new THREE.CatmullRomCurve3(CAM_KEYS.map(([, , l]) => new THREE.Vector3(...l)));

    if (!this.mobile) this.setupComposer();
    this.resize();
    this.loop();
  }

  /* ======================= public API ======================= */

  setProgress(p: number): void {
    this.target = clamp(p);
  }

  /** Pointer in -1..1 normalized device coordinates. */
  setPointer(x: number, y: number): void {
    this.pointer.set(x, y);
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.clock.getDelta();
      this.loop();
    } else cancelAnimationFrame(this.raf);
  }

  setPalette(p: ScenePalette, instant = false): void {
    const d = instant ? 0 : 1.1;
    const tw = (color: THREE.Color, hex: string) => {
      const c = new THREE.Color(hex);
      gsap.to(color, { r: c.r, g: c.g, b: c.b, duration: d, ease: 'power2.inOut' });
    };
    tw(this.m.gelato.color, p.gelato);
    tw(this.shop.featuredTub.color, p.gelato);
    tw(this.chef.apronMat.color, p.apron);
    const bg = new THREE.Color(p.bg);
    tw(this.scene.background as THREE.Color, p.bg);
    tw(this.scene.fog!.color, p.bg);
    tw(this.shop.wallMat.color, '#' + bg.clone().offsetHSL(0, 0, p.dark ? 0.04 : -0.04).getHexString());
    tw(this.shop.lampMat.emissive, p.dark ? '#ffbf70' : '#ffd59a');
    gsap.to(this.renderer, { toneMappingExposure: p.dark ? 0.75 : 0.92, duration: d });
    gsap.to(this.scene, { environmentIntensity: p.dark ? 0.25 : 0.42, duration: d });
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    const aspect = w / h;
    if (aspect >= 1.05) {
      // text on the left, stage on the right
      this.layout = { x: -0.5 * aspect + 0.1, y: 0, dist: aspect > 2 ? 0.95 : 1 };
      this.camera.fov = 30;
    } else if (aspect >= 0.75) {
      this.layout = { x: -0.2, y: 0.35, dist: 1.25 };
      this.camera.fov = 32;
    } else {
      // phones: stage sits in the lower half under the headline
      this.layout = { x: 0.35, y: 1.05, dist: 1.6 };
      this.camera.fov = 34;
    }
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.active = false;
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          Object.values(mat).forEach((v) => (v as THREE.Texture)?.isTexture && (v as THREE.Texture).dispose());
          mat.dispose();
        });
      }
    });
    this.composer?.dispose();
    this.renderer.dispose();
  }

  /* ======================= setup ======================= */

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight('#fff1dc', '#8a6a4a', 0.4));

    const key = new THREE.DirectionalLight('#ffe7c7', 2.6);
    key.position.set(-4.5, 7.5, 5.5);
    key.target.position.set(0.3, 0.8, 0.4);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(this.mobile ? 1024 : 2048);
    const sc = key.shadow.camera;
    sc.left = -4;
    sc.right = 4;
    sc.top = 4;
    sc.bottom = -3;
    sc.near = 1;
    sc.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 5;
    this.scene.add(key, key.target);

    const fill = new THREE.DirectionalLight('#dde6ff', 0.55);
    fill.position.set(6, 3, 5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight('#ffd3a0', 1.4);
    rim.position.set(2.5, 4, -6);
    this.scene.add(rim);

    const bounce = new THREE.PointLight('#ffcf9e', 3, 6, 2);
    bounce.position.set(0.4, 0.6, 2.4);
    this.scene.add(bounce);
  }

  private setupComposer(): void {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 7, aperture: 0.0016, maxblur: 0.0065 });
    this.composer.addPass(this.bokeh);
    this.composer.addPass(new OutputPass());
  }

  private buildDrips(): void {
    const r = rng(9);
    const d = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
      // drips hang where the wavy coat edge dips lowest
      const ang = (-Math.PI / 2 + i * Math.PI * 2) / 6;
      const len = 0.1 + r() * 0.16;
      const geo = new THREE.CapsuleGeometry(0.03, len, 6, 12);
      geo.translate(0, -len / 2, 0);
      const drip = new THREE.Mesh(geo, this.m.chocolate);
      d.set(Math.cos(ang), -0.5, Math.sin(ang)).normalize();
      scoopPoint(d, p).multiplyScalar(1.03);
      drip.position.copy(p);
      // tilt inward to follow the cone wall
      drip.rotation.set(Math.sin(ang) * -0.28, 0, Math.cos(ang) * 0.28);
      drip.scale.set(1, 0, 1);
      drip.castShadow = true;
      this.coat.add(drip);
      this.drips.push(drip);
    }
  }

  private prepareNuts(): void {
    const r = rng(21);
    const d = new THREE.Vector3();
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    for (let i = 0; i < NUT_COUNT; i++) {
      d.set(r() * 2 - 1, 0.45 + r() * 0.8, r() * 2 - 1).normalize();
      scoopPoint(d, p).multiplyScalar(1.06);
      this.nutTargets.push(p.clone().add(SCOOP_POS));
      this.nutJitter.push(new THREE.Vector3((r() - 0.5) * 0.12, (r() - 0.5) * 0.06, (r() - 0.5) * 0.12));
      this.nuts.setColorAt(i, color.set(nutColor(Math.floor(r() * 5))));
    }
  }

  /* ======================= frame loop ======================= */

  private loop = (): void => {
    if (!this.active) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.time += dt;
    this.p = damp(this.p, this.target, 5, dt);
    if (Math.abs(this.p - this.target) < 1e-4) this.p = this.target;
    this.pointerSmooth.x = damp(this.pointerSmooth.x, this.pointer.x, 3, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, this.pointer.y, 3, dt);

    this.choreograph(dt);
    this.updateCamera();

    if (this.composer && this.bokeh) {
      (this.bokeh.uniforms as Record<string, THREE.IUniform>)['focus'].value = this.camera.position.distanceTo(SCOOP_POS);
      this.composer.render(dt);
    } else this.renderer.render(this.scene, this.camera);

    if (this.firstFrame) {
      this.firstFrame();
      this.firstFrame = undefined;
    }
  };

  private updateCamera(): void {
    const p = this.p;
    const pos = this.camPos.getPoint(p, this.a);
    const look = this.camLook.getPoint(p, this.look);
    const { x, y, dist } = this.layout;
    pos.sub(look).multiplyScalar(dist).add(look);
    pos.x += x + this.pointerSmooth.x * 0.35;
    pos.y += y - this.pointerSmooth.y * 0.18;
    look.x += x;
    look.y += y;
    // slow breathing drift so the frame never feels static
    pos.x += Math.sin(this.time * 0.35) * 0.06;
    pos.y += Math.cos(this.time * 0.3) * 0.04;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
  }

  /** The whole scroll story: cone → scoop → chocolate dip → pistachio crunch. */
  private choreograph(dt: number): void {
    const p = this.p;
    const t = this.time;
    const chef = this.chef;

    /* ----- body: walk toward the work, lean in, look at the action ----- */
    const shift =
      1.05 - 0.22 * k(p, 0.03, 0.09) + 0.22 * k(p, 0.17, 0.23) - 0.36 * k(p, 0.245, 0.3) + 0.36 * k(p, 0.36, 0.43);
    const walkSpeed = Math.abs(shift - this.lastShift) / Math.max(dt, 1e-3);
    this.lastShift = shift;
    chef.root.position.x = shift;
    const lean =
      0.16 * (k(p, 0.04, 0.1) - k(p, 0.16, 0.22)) +
      0.42 * (k(p, 0.25, 0.3) - k(p, 0.35, 0.42)) +
      0.1 * (k(p, 0.77, 0.81) - k(p, 0.93, 0.97));
    const crouch = 0.12 * (k(p, 0.25, 0.3) - k(p, 0.35, 0.42));

    const coneFocus = this.b.set(CONE_X, RIM_Y + 0.2, CONE_Z + 0.1);
    const look = this.c.copy(coneFocus);
    look.lerp(this.a.copy(TIP_TRAY), k(p, 0.24, 0.28) - k(p, 0.34, 0.4));
    look.lerp(this.camera.position, k(p, 0.95, 0.99));
    chef.animateBody(t, dt, { lean, crouch, walkSpeed, look });
    chef.root.updateWorldMatrix(true, true);

    /* ----- step 01: the cone travels from the hands into the stand ----- */
    const ct = ease.inOut(seg(p, 0.06, 0.17));
    const conePos = this.cone.position.lerpVectors(CONE_START, CONE_SEAT, ct);
    conePos.y += Math.sin(Math.PI * ct) * 0.28 - Math.sin(seg(p, 0.17, 0.21) * Math.PI) * 0.025;
    if (ct < 1) conePos.y += Math.sin(t * 2) * 0.015 * (1 - ct);
    this.cone.rotation.set(-0.22 * (1 - ct), 0, 0.32 * (1 - ct));

    const gripR = new THREE.Vector3(-0.3, -0.16, 0.1).add(conePos);
    const gripL = new THREE.Vector3(0.3, -0.16, 0.1).add(conePos);
    const restR = chef.local(-0.62, 1.3, 0.18);
    const restL = chef.local(0.62, 1.3, 0.18);
    const hipL = chef.local(0.56, 1.55, 0.12);
    const presentR = chef.local(-0.8, 2.05, 0.8);

    /* ----- step 02: scoop from the pan, carry it over, drop it on the cone ----- */
    const carry = seg(p, 0.36, 0.43);
    const tip = new THREE.Vector3().lerpVectors(TIP_TRAY, TIP_CONE, ease.inOut(carry));
    tip.y += Math.sin(Math.PI * carry) * 0.35;
    if (p > 0.3 && p < 0.35) tip.y += Math.sin(seg(p, 0.3, 0.35) * Math.PI) * -0.05;
    const shoulderR = chef.armR.shoulder.getWorldPosition(new THREE.Vector3());
    const aim = shoulderR.clone().add(chef.dir(0, -0.6, 0.55).multiplyScalar(0.8));
    const toolHand = tip.clone().addScaledVector(aim.sub(tip).normalize(), TOOL_LEN);

    /* ----- step 03: chocolate pour ----- */
    const pIn = ease.out(seg(p, 0.47, 0.53));
    const pOut = ease.in(seg(p, 0.73, 0.77));
    const pg = this.pitcher.group;
    pg.scale.setScalar(ease.outBack(seg(p, 0.47, 0.52)) * (1 - pOut));
    pg.visible = pg.scale.x > 0.001;
    pg.position.copy(PITCHER_POS).add(this.a.set(0.3 * (1 - pIn) + 0.3 * pOut, -0.12 * (1 - pIn), 0.2 * (1 - pIn)));
    pg.rotation.set(0, 0, 0.15 + 0.95 * k(p, 0.52, 0.56) - 0.95 * k(p, 0.69, 0.72));
    pg.updateMatrixWorld(true);
    const handle = pg.localToWorld(this.pitcher.handle.clone());
    const spout = pg.localToWorld(this.pitcher.spout.clone());

    /* ----- step 04: pistachio pinch ----- */
    const sprinkling = seg(p, 0.79, 0.94);
    const pinch = PINCH.clone();
    if (sprinkling > 0 && sprinkling < 1) pinch.add(this.a.set(Math.sin(t * 14) * 0.035, 0, Math.cos(t * 11) * 0.025));

    /* ----- right hand: chained blends, each window replaces the previous pose ----- */
    const R = gripR.clone();
    R.lerp(restR, k(p, 0.17, 0.23));
    R.lerp(toolHand, k(p, 0.245, 0.3));
    R.lerp(handle, k(p, 0.47, 0.52));
    R.lerp(pinch, k(p, 0.74, 0.79));
    R.lerp(presentR, k(p, 0.94, 0.99));

    const L = gripL.clone();
    L.lerp(restL, k(p, 0.17, 0.23));
    L.lerp(hipL, k(p, 0.47, 0.53));

    chef.solveArm(chef.armR, R, chef.dir(-0.6, -0.35, -0.8));
    chef.solveArm(chef.armL, L, chef.dir(0.9, -0.2, -0.5 + 0.4 * k(p, 0.47, 0.53)));

    /* ----- scoop tool follows the real hand ----- */
    const toolScale = ease.outBack(seg(p, 0.245, 0.275)) * (1 - ease.in(seg(p, 0.455, 0.49)));
    const tg = this.tool.group;
    tg.scale.setScalar(toolScale);
    tg.visible = toolScale > 0.001;
    if (tg.visible) {
      const hand = chef.armR.hand.getWorldPosition(this.a);
      tg.position.copy(hand);
      const dir = tip.clone().sub(hand).normalize();
      tg.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    }
    const ballIn = ease.outBack(seg(p, 0.3, 0.345)) * 0.36 * (1 - ease.inOut(seg(p, 0.42, 0.455)));
    this.tool.ball.scale.setScalar(ballIn);
    this.tool.ball.visible = ballIn > 0.001;

    const sc = ease.outBack(seg(p, 0.42, 0.47));
    this.scoop.scale.setScalar(sc);
    this.scoop.visible = sc > 0.001;
    // the pan's gelato surface "loses" a scoop
    this.trayGelato.scale.z = 1 - 0.15 * k(p, 0.3, 0.345);

    /* ----- chocolate coat + stream + drips ----- */
    this.bowl.scale.setScalar(ease.outBack(seg(p, 0.49, 0.54)));
    this.bowl.visible = this.bowl.scale.x > 0.001;
    this.coat.visible = p > 0.54;
    this.m.coatCut.value = THREE.MathUtils.lerp(0.42, -0.17, ease.out(seg(p, 0.555, 0.7)));
    this.drips.forEach((d, i) => {
      d.scale.y = ease.out(seg(p, 0.63 + i * 0.012, 0.7 + i * 0.012));
      d.visible = d.scale.y > 0.001;
    });

    const scoopTop = SCOOP_POS.y + 0.36;
    const full = Math.max(0, spout.y - scoopTop);
    const grow = seg(p, 0.545, 0.565);
    const drop = seg(p, 0.69, 0.71);
    const len = full * grow * (1 - drop);
    this.stream.visible = len > 0.002;
    if (this.stream.visible) {
      this.stream.position.set(spout.x, spout.y - full * drop, spout.z);
      const wobble = 1 + Math.sin(t * 24) * 0.12;
      this.stream.scale.set(wobble, len, wobble);
    }

    /* ----- pistachio crunch ----- */
    this.nutTray.scale.setScalar(ease.outBack(seg(p, 0.74, 0.79)));
    this.nutTray.visible = this.nutTray.scale.x > 0.001;
    const hand = chef.armR.hand.getWorldPosition(this.a);
    for (let i = 0; i < NUT_COUNT; i++) {
      const a0 = 0.785 + i * 0.0028;
      const s = seg(p, a0, a0 + 0.04);
      const o = this.obj;
      if (s <= 0) {
        o.scale.setScalar(0);
      } else {
        const start = this.b.copy(hand).add(this.nutJitter[i]);
        const end = this.nutTargets[i];
        o.position.set(
          THREE.MathUtils.lerp(start.x, end.x, ease.out(s)),
          THREE.MathUtils.lerp(start.y, end.y, ease.in(s)),
          THREE.MathUtils.lerp(start.z, end.z, ease.out(s)),
        );
        o.rotation.set(i + s * 6, i * 1.7 + s * 4, 0);
        o.scale.setScalar(Math.min(1, s * 4));
      }
      o.updateMatrix();
      this.nuts.setMatrixAt(i, o.matrix);
    }
    this.nuts.instanceMatrix.needsUpdate = true;
  }
}
