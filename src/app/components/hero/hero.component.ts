import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AppStateService } from '../../core/app-state.service';
import { STEPS } from '../../core/data/content';
import { SmoothScrollService } from '../../core/scroll/smooth-scroll.service';
import { ThemeService } from '../../core/theme/theme.service';
import { GelatoScene } from '../../scene/gelato-scene';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ConeArtComponent } from '../cone-art/cone-art.component';

/**
 * Scroll-driven hero: a tall section with a sticky WebGL stage. Scroll progress
 * through the section drives the 3D story; the overlay mirrors the current step.
 */
@Component({
  selector: 'gelora-hero',
  imports: [ConeArtComponent, MagneticDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  readonly theme = inject(ThemeService);
  private readonly state = inject(AppStateService);
  private readonly scroll = inject(SmoothScrollService);
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;

  readonly steps = STEPS;
  readonly step = signal(0);
  readonly current = computed(() => STEPS[this.step()]);
  readonly flavorLines = computed(() => {
    const words = this.theme.palette().flavor.split(' ');
    return [words[0], words.slice(1).join(' ')];
  });

  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private scene?: GelatoScene;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const p = this.theme.palette();
      this.scene?.setPalette(p);
    });

    effect(() => {
      if (this.state.introDone()) this.zone.runOutsideAngular(() => this.intro());
    });

    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        const cleanup = this.init();
        destroyRef.onDestroy(cleanup);
      });
    });
  }

  private init(): () => void {
    const section = this.section().nativeElement;
    const canvas = this.canvas().nativeElement;

    try {
      this.scene = new GelatoScene(canvas, {
        onFirstFrame: () => this.zone.run(() => this.state.sceneReady.set(true)),
      });
      this.scene.setPalette(this.theme.palette(), true);
    } catch (err) {
      // No WebGL: keep the page usable, the overlay still tells the story.
      console.warn('GELORA: WebGL unavailable', err);
      this.host.classList.add('no-webgl');
      this.zone.run(() => this.state.sceneReady.set(true));
    }

    gsap.set(this.host.querySelectorAll('[data-intro]'), { autoAlpha: 0, y: 30 });
    gsap.set(this.host.querySelectorAll('.hero__title .word'), { yPercent: 115 });

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const p = self.progress;
        this.scene?.setProgress(p);
        this.host.style.setProperty('--p', p.toFixed(4));
        const s = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
        if (s !== this.step()) this.zone.run(() => this.step.set(s));
      },
    });

    const onPointer = (e: PointerEvent) =>
      this.scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    window.addEventListener('pointermove', onPointer, { passive: true });

    const ro = new ResizeObserver(() => this.scene?.resize());
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => this.scene?.setActive(entry.isIntersecting), { rootMargin: '100px' });
    io.observe(section);

    return () => {
      st.kill();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      this.scene?.dispose();
    };
  }

  private intro(): void {
    const q = (s: string) => this.host.querySelectorAll(s);
    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .to(q('.hero__title .word'), { yPercent: 0, duration: 1.4, stagger: 0.08 })
      .to(q('[data-intro]'), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08 }, '-=1.1');
  }

  goTo(i: number): void {
    const section = this.section().nativeElement;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    this.scroll.scrollTo(top + span * (i / STEPS.length + 0.17));
  }

  next(): void {
    if (this.step() < STEPS.length - 1) this.goTo(this.step() + 1);
    else this.scroll.scrollTo('#flavors');
  }

  taste(): void {
    this.scroll.scrollTo('#flavors');
  }
}
