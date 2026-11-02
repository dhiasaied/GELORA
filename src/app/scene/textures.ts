import * as THREE from 'three';
import { rng } from './util';

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Fine fingerprint-like noise used as a bump map to give everything a clay feel. */
export function clayBump(): THREE.Texture {
  const r = rng(7);
  const tex = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        const v = Math.floor(100 + r() * 60);
        ctx.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.3})`;
        const rad = 0.6 + r() * 2.4;
        ctx.beginPath();
        ctx.arc(r() * s, r() * s, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    false,
  );
  tex.repeat.set(3, 3);
  return tex;
}

/** Waffle-cone diamond grid: color map + bump map pair. */
export function waffle(): { map: THREE.Texture; bump: THREE.Texture } {
  const drawGrid = (ctx: CanvasRenderingContext2D, s: number, base: string, line: string, lw: number) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    const r = rng(3);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(120,60,15,${r() * 0.12})`;
      ctx.fillRect(r() * s, r() * s, 2 + r() * 6, 2 + r() * 6);
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    const step = s / 6;
    for (let i = -6; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step + s, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * step, s);
      ctx.lineTo(i * step + s, 0);
      ctx.stroke();
    }
  };
  const map = canvasTexture(512, (ctx, s) => drawGrid(ctx, s, '#d89b55', 'rgba(150,82,28,0.85)', 9));
  const bump = canvasTexture(512, (ctx, s) => drawGrid(ctx, s, '#ffffff', '#000000', 12), false);
  map.repeat.set(3, 2);
  bump.repeat.set(3, 2);
  return { map, bump };
}

/** Warm speckled terrazzo for the counter top. */
export function terrazzo(): THREE.Texture {
  const r = rng(11);
  const tex = canvasTexture(1024, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#e3d4bb');
    g.addColorStop(1, '#d9c7a9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const chips = ['#c9b18e', '#a98b66', '#d8c6a6', '#8f7a60', '#f6efe2', '#b49a7a'];
    for (let i = 0; i < 5200; i++) {
      ctx.fillStyle = chips[Math.floor(r() * chips.length)];
      ctx.globalAlpha = 0.35 + r() * 0.5;
      const w = 1 + r() * (r() > 0.97 ? 9 : 3.2);
      ctx.beginPath();
      ctx.ellipse(r() * s, r() * s, w, w * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  tex.repeat.set(3, 1.6);
  return tex;
}

/** Soft vertical wood grain for back cabinetry. */
export function woodGrain(): THREE.Texture {
  const r = rng(19);
  const tex = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#9a7651';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = `rgba(${60 + r() * 40},${38 + r() * 25},${20 + r() * 15},${0.15 + r() * 0.25})`;
      ctx.lineWidth = 1 + r() * 3;
      const x = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + r() * 20 - 10, s * 0.3, x + r() * 20 - 10, s * 0.7, x + r() * 10 - 5, s);
      ctx.stroke();
    }
  });
  return tex;
}
