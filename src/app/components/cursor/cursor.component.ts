import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject } from '@angular/core';
import { gsap } from 'gsap';

/** Soft trailing cursor ring that swells over interactive elements (fine pointers only). */
@Component({
  selector: 'gelora-cursor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ring"></div><div class="dot"></div>`,
  styles: `
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 150; display: none; }
    :host(.is-on) { display: block; }
    .ring, .dot { position: fixed; top: 0; left: 0; border-radius: 50%; will-change: transform; }
    .ring {
      width: 40px; height: 40px; margin: -20px 0 0 -20px;
      border: 1.5px solid var(--ink);
      opacity: .5;
      transition: width .4s var(--ease-out), height .4s var(--ease-out), margin .4s var(--ease-out),
        background-color .4s, opacity .4s, border-color .4s;
    }
    .dot { width: 6px; height: 6px; margin: -3px 0 0 -3px; background: var(--ink); }
    :host(.is-hover) .ring {
      width: 70px; height: 70px; margin: -35px 0 0 -35px;
      background: color-mix(in srgb, var(--accent) 35%, transparent); border-color: var(--accent); opacity: 1;
    }
    :host(.is-down) .ring { width: 30px; height: 30px; margin: -15px 0 0 -15px; }
  `,
})
export class CursorComponent {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      zone.runOutsideAngular(() => {
        host.classList.add('is-on');
        const ring = host.querySelector<HTMLElement>('.ring')!;
        const dot = host.querySelector<HTMLElement>('.dot')!;
        const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
        const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
        const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
        const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
        const move = (e: PointerEvent) => {
          rx(e.clientX);
          ry(e.clientY);
          dx(e.clientX);
          dy(e.clientY);
          const t = e.target as Element | null;
          host.classList.toggle('is-hover', !!t?.closest('a, button, label, input, select, [role="radio"]'));
        };
        const down = () => host.classList.add('is-down');
        const up = () => host.classList.remove('is-down');
        window.addEventListener('pointermove', move, { passive: true });
        window.addEventListener('pointerdown', down);
        window.addEventListener('pointerup', up);
        destroyRef.onDestroy(() => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerdown', down);
          window.removeEventListener('pointerup', up);
        });
      });
    });
  }
}
