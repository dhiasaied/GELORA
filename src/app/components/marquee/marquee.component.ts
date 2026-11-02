import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject, input } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Infinite ticker whose speed and direction react to scroll velocity. */
@Component({
  selector: 'gelora-marquee',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="track" aria-hidden="true">
      @for (copy of [0, 1]; track copy) {
        <div class="group">
          @for (item of items(); track $index) {
            <span class="item display">{{ item }}</span>
            <svg class="star" viewBox="0 0 24 24"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" /></svg>
          }
        </div>
      }
    </div>
    <p class="sr-only">{{ items().join(', ') }}</p>
  `,
  styles: `
    :host {
      display: block;
      overflow: hidden;
      padding: 26px 0;
      background: var(--ink);
      color: var(--bg);
      transform: rotate(-2deg) scale(1.04);
      margin: -10px 0;
      position: relative;
      z-index: 2;
    }
    .track { display: flex; width: max-content; will-change: transform; }
    .group { display: flex; align-items: center; flex: none; }
    .item { font-size: clamp(30px, 4.6vw, 64px); padding: 0 28px; white-space: nowrap; }
    .star { width: 26px; height: 26px; fill: var(--accent); flex: none; }
  `,
})
export class MarqueeComponent {
  readonly items = input<string[]>([]);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() =>
      zone.runOutsideAngular(() => {
        const track = host.querySelector<HTMLElement>('.track')!;
        let x = 0;
        let dir = -1;
        let boost = 0;
        const st = ScrollTrigger.create({
          trigger: host,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            dir = self.direction === 1 ? -1 : 1;
            boost = Math.min(8, Math.abs(self.getVelocity()) / 300);
          },
        });
        const tick = (_: number, dt: number) => {
          const w = track.scrollWidth / 2;
          boost *= 0.94;
          x += dir * (0.6 + boost) * (dt / 16);
          if (x <= -w) x += w;
          if (x > 0) x -= w;
          track.style.transform = `translate3d(${x}px,0,0)`;
        };
        gsap.ticker.add(tick);
        destroyRef.onDestroy(() => {
          st.kill();
          gsap.ticker.remove(tick);
        });
      }),
    );
  }
}
