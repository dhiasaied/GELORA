import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SmoothScrollService } from '../../core/scroll/smooth-scroll.service';
import { ThemeService } from '../../core/theme/theme.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SplitTextDirective } from '../../shared/directives/split-text.directive';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { ConeArtComponent } from '../cone-art/cone-art.component';

@Component({
  selector: 'gelora-flavors',
  imports: [ConeArtComponent, RevealDirective, SplitTextDirective, TiltDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flavors.component.html',
  styleUrl: './flavors.component.scss',
})
export class FlavorsComponent {
  readonly theme = inject(ThemeService);
  private readonly scroll = inject(SmoothScrollService);

  /** Selecting a flavor paints the whole site, then shows it being made. */
  choose(id: string): void {
    this.theme.select(id);
    this.scroll.scrollTo(0);
  }
}
