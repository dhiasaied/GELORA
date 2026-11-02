import { ChangeDetectionStrategy, Component, NgZone, inject, signal } from '@angular/core';
import { AppStateService } from '../../core/app-state.service';
import { NAV_LINKS } from '../../core/data/content';
import { SmoothScrollService } from '../../core/scroll/smooth-scroll.service';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ColorPickerComponent } from '../color-picker/color-picker.component';

@Component({
  selector: 'gelora-nav',
  imports: [MagneticDirective, ColorPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  host: { '[class.is-scrolled]': 'scrolled()', '[class.is-hidden]': 'hidden()', '[class.is-open]': 'state.menuOpen()' },
})
export class NavComponent {
  readonly state = inject(AppStateService);
  private readonly scroll = inject(SmoothScrollService);
  readonly links = NAV_LINKS;
  readonly scrolled = signal(false);
  readonly hidden = signal(false);
  readonly active = signal('#top');

  constructor() {
    const zone = inject(NgZone);
    let last = 0;
    zone.runOutsideAngular(() =>
      window.addEventListener(
        'scroll',
        () => {
          const y = window.scrollY;
          const scrolled = y > 40;
          const hidden = y > last && y > window.innerHeight * 5.2;
          if (scrolled !== this.scrolled() || hidden !== this.hidden()) {
            zone.run(() => {
              this.scrolled.set(scrolled);
              this.hidden.set(hidden && !this.state.menuOpen());
            });
          }
          last = y;
        },
        { passive: true },
      ),
    );
  }

  go(target: string, event?: Event): void {
    event?.preventDefault();
    this.active.set(target);
    this.state.menuOpen.set(false);
    this.scroll.start();
    this.scroll.scrollTo(target === '#top' ? 0 : target);
  }

  toggleMenu(): void {
    const open = !this.state.menuOpen();
    this.state.menuOpen.set(open);
    if (open) this.scroll.stop();
    else this.scroll.start();
  }
}
