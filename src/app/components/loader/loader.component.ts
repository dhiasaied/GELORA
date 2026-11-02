import { ChangeDetectionStrategy, Component, ElementRef, NgZone, effect, inject, signal, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { AppStateService } from '../../core/app-state.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ConeArtComponent } from '../cone-art/cone-art.component';

/** Preloader: counts up while the 3D stage compiles, then lifts like a curtain. */
@Component({
  selector: 'gelora-loader',
  imports: [ConeArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!gone()) {
      <div class="loader" #root role="status" aria-live="polite">
        <div class="loader__inner">
          <div class="loader__cone"><gelora-cone-art [color]="theme.palette().gelato" /></div>
          <div class="loader__brand display">Gelora</div>
          <div class="loader__sub">Gelateria · Est. small batch</div>
        </div>
        <div class="loader__count display"><span #count>0</span>%</div>
        <div class="loader__bar"><span #bar></span></div>
      </div>
    }
  `,
  styleUrl: './loader.component.scss',
})
export class LoaderComponent {
  readonly theme = inject(ThemeService);
  private readonly state = inject(AppStateService);
  private readonly zone = inject(NgZone);

  readonly gone = signal(false);
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly count = viewChild<ElementRef<HTMLElement>>('count');
  private readonly bar = viewChild<ElementRef<HTMLElement>>('bar');

  private readonly progress = { v: 0 };
  private started = false;

  constructor() {
    document.body.classList.add('is-loading');
    effect(() => {
      const root = this.root()?.nativeElement;
      if (!root || this.started) return;
      this.started = true;
      this.zone.runOutsideAngular(() => {
        // Climb to 80% on our own, the last stretch waits for the scene.
        gsap.to(this.progress, { v: 80, duration: 1.4, ease: 'power2.out', onUpdate: () => this.paint() });
      });
    });
    effect(() => {
      if (this.state.sceneReady() && this.started) this.finish();
    });
  }

  private paint(): void {
    const v = Math.round(this.progress.v);
    const c = this.count()?.nativeElement;
    const b = this.bar()?.nativeElement;
    if (c) c.textContent = String(v);
    if (b) b.style.transform = `scaleX(${v / 100})`;
  }

  private finish(): void {
    const root = this.root()?.nativeElement;
    if (!root) return;
    this.zone.runOutsideAngular(() => {
      const tl = gsap.timeline({ delay: 0.5 });
      tl.to(this.progress, { v: 100, duration: 0.7, ease: 'power2.inOut', onUpdate: () => this.paint() })
        .to(root.querySelector('.loader__inner'), { y: -40, autoAlpha: 0, duration: 0.6, ease: 'power3.in' })
        .to(root, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
        .add(() => {
          document.body.classList.remove('is-loading');
          this.zone.run(() => this.state.introDone.set(true));
        }, '-=0.65')
        .add(() => this.zone.run(() => this.gone.set(true)));
    });
  }
}
