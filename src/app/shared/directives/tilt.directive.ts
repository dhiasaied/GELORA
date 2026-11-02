import { Directive, ElementRef, NgZone, OnDestroy, inject, input } from '@angular/core';
import { gsap } from 'gsap';

/** 3D perspective tilt that follows the pointer, with a moving glare highlight. */
@Directive({ selector: '[geloraTilt]', host: { style: 'transform-style: preserve-3d' } })
export class TiltDirective implements OnDestroy {
  readonly strength = input(10, { alias: 'geloraTilt', transform: (v: unknown) => Number(v) || 10 });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;
  private readonly off: () => void;

  constructor() {
    const zone = inject(NgZone);
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const move = (e: PointerEvent) => {
      const r = this.el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(this.el, {
        rotateY: x * this.strength(),
        rotateX: -y * this.strength(),
        transformPerspective: 900,
        duration: 0.6,
        ease: 'power3.out',
      });
      this.el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
      this.el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    };
    const leave = () => gsap.to(this.el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, 0.5)' });
    if (fine) {
      zone.runOutsideAngular(() => {
        this.el.addEventListener('pointermove', move);
        this.el.addEventListener('pointerleave', leave);
      });
    }
    this.off = () => {
      this.el.removeEventListener('pointermove', move);
      this.el.removeEventListener('pointerleave', leave);
    };
  }

  ngOnDestroy(): void {
    this.off();
  }
}
