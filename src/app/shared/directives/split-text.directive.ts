import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';
import { gsap } from 'gsap';

/**
 * Splits text into masked words that slide up when scrolled into view.
 * `mode="scrub"` instead fades words in as you scroll through the element.
 * Lines are preserved with `|` in the source text.
 */
@Directive({ selector: '[geloraSplit]' })
export class SplitTextDirective implements OnDestroy {
  readonly mode = input<'rise' | 'scrub' | 'manual', string>('rise', {
    alias: 'geloraSplit',
    transform: (v: string) => (v === 'scrub' || v === 'manual' ? v : 'rise'),
  });
  readonly delay = input(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private ctx?: gsap.Context;

  constructor() {
    const zone = inject(NgZone);
    afterNextRender(() => zone.runOutsideAngular(() => this.build()));
  }

  /** Words of this element (useful for parent-driven intro timelines). */
  get words(): HTMLElement[] {
    return Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('.split-inner'));
  }

  private build(): void {
    const host = this.el.nativeElement as HTMLElement;
    const text = (host.textContent ?? '').trim().replace(/\s+/g, ' ');
    host.setAttribute('aria-label', text.replace(/\|/g, ''));
    host.textContent = '';
    for (const line of text.split('|')) {
      const lineEl = document.createElement('span');
      lineEl.className = 'split-line';
      lineEl.setAttribute('aria-hidden', 'true');
      line
        .trim()
        .split(' ')
        .forEach((word, i, arr) => {
          const w = document.createElement('span');
          w.className = 'split-word';
          const inner = document.createElement('span');
          inner.className = 'split-inner';
          inner.textContent = word;
          w.appendChild(inner);
          lineEl.appendChild(w);
          if (i < arr.length - 1) lineEl.appendChild(document.createTextNode(' '));
        });
      host.appendChild(lineEl);
    }

    const words = this.words;
    this.ctx = gsap.context(() => {
      if (this.mode() === 'rise') {
        gsap.from(words, {
          yPercent: 115,
          rotate: 4,
          duration: 1.2,
          delay: this.delay(),
          ease: 'expo.out',
          stagger: 0.05,
          scrollTrigger: { trigger: host, start: 'top 85%', once: true },
        });
      } else if (this.mode() === 'scrub') {
        gsap.fromTo(
          words,
          { opacity: 0.14 },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.05,
            scrollTrigger: { trigger: host, start: 'top 80%', end: 'bottom 45%', scrub: true },
          },
        );
      } else {
        gsap.set(words, { yPercent: 115 });
      }
    }, host);
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
  }
}
