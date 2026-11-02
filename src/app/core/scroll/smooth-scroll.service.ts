import { Injectable, NgZone, inject } from '@angular/core';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scrolling wired into GSAP's ticker and ScrollTrigger. */
@Injectable({ providedIn: 'root' })
export class SmoothScrollService {
  private readonly zone = inject(NgZone);
  private lenis?: Lenis;

  init(): void {
    if (this.lenis) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.zone.runOutsideAngular(() => {
      if (!reduced) {
        this.lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        this.lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => this.lenis?.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }
      ScrollTrigger.refresh();
    });
  }

  scrollTo(target: string | number | HTMLElement, offset = 0, immediate = false): void {
    if (this.lenis) {
      this.lenis.scrollTo(target, { offset, immediate, duration: immediate ? 0 : 1.6 });
      return;
    }
    const y =
      typeof target === 'number'
        ? target
        : ((typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target)?.getBoundingClientRect().top ?? 0) +
          window.scrollY;
    window.scrollTo({ top: y + offset, behavior: immediate ? 'auto' : 'smooth' });
  }

  stop(): void {
    this.lenis?.stop();
  }

  start(): void {
    this.lenis?.start();
  }
}
