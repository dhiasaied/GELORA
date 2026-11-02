import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';
import { gsap } from 'gsap';

/** Fades and lifts an element into view when it enters the viewport. */
@Directive({ selector: '[geloraReveal]' })
export class RevealDirective implements OnDestroy {
  readonly delay = input(0, { alias: 'geloraReveal', transform: (v: unknown) => Number(v) || 0 });
  readonly y = input(60);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private tween?: gsap.core.Tween;

  constructor() {
    const zone = inject(NgZone);
    afterNextRender(() =>
      zone.runOutsideAngular(() => {
        this.tween = gsap.from(this.el.nativeElement, {
          y: this.y(),
          autoAlpha: 0,
          duration: 1.2,
          delay: this.delay(),
          ease: 'expo.out',
          scrollTrigger: { trigger: this.el.nativeElement, start: 'top 88%', once: true },
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.tween?.scrollTrigger?.kill();
    this.tween?.kill();
  }
}
