import { Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { gsap } from 'gsap';

/** Pulls an element slightly toward the pointer while hovered. */
@Directive({ selector: '[geloraMagnetic]' })
export class MagneticDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;
  private readonly off: () => void;

  constructor() {
    const zone = inject(NgZone);
    const move = (e: PointerEvent) => {
      const r = this.el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(this.el, { x: x * 0.28, y: y * 0.35, duration: 0.5, ease: 'power3.out' });
    };
    const leave = () => gsap.to(this.el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
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
