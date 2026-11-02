import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, afterNextRender, inject } from '@angular/core';
import { gsap } from 'gsap';
import { CRAFT } from '../../core/data/content';
import { SplitTextDirective } from '../../shared/directives/split-text.directive';

/** "How it's made": pinned horizontal scroll on large screens, stacked panels on small ones. */
@Component({
  selector: 'gelora-craft',
  imports: [SplitTextDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './craft.component.html',
  styleUrl: './craft.component.scss',
})
export class CraftComponent {
  readonly items = CRAFT;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() =>
      zone.runOutsideAngular(() => {
        const mm = gsap.matchMedia();
        mm.add('(min-width: 900px)', () => {
          const track = host.querySelector<HTMLElement>('.craft__track')!;
          const pin = host.querySelector<HTMLElement>('.craft__pin')!;
          const distance = () => track.scrollWidth - window.innerWidth;
          const tween = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: pin,
              start: 'top top',
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });
          host.querySelectorAll<HTMLElement>('.panel__big').forEach((el) => {
            gsap.from(el, {
              yPercent: 40,
              opacity: 0,
              ease: 'none',
              scrollTrigger: { trigger: el, containerAnimation: tween, start: 'left 95%', end: 'left 40%', scrub: true },
            });
          });
        });
        mm.add('(max-width: 899px)', () => {
          host.querySelectorAll<HTMLElement>('.panel').forEach((el) =>
            gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }),
          );
        });
        // Count-up stats
        host.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
          const end = Number(el.dataset['count']);
          const o = { v: 0 };
          gsap.to(o, {
            v: end,
            duration: 1.6,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            onUpdate: () => {
              el.textContent = String(Math.round(o.v));
            },
          });
        });
        destroyRef.onDestroy(() => mm.revert());
      }),
    );
  }
}
