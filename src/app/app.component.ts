import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { CraftComponent } from './components/craft/craft.component';
import { CursorComponent } from './components/cursor/cursor.component';
import { FlavorsComponent } from './components/flavors/flavors.component';
import { FooterComponent } from './components/footer/footer.component';
import { HeroComponent } from './components/hero/hero.component';
import { LoaderComponent } from './components/loader/loader.component';
import { MarqueeComponent } from './components/marquee/marquee.component';
import { NavComponent } from './components/nav/nav.component';
import { StoryComponent } from './components/story/story.component';
import { VisitComponent } from './components/visit/visit.component';
import { SmoothScrollService } from './core/scroll/smooth-scroll.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [
    LoaderComponent,
    NavComponent,
    HeroComponent,
    MarqueeComponent,
    FlavorsComponent,
    CraftComponent,
    StoryComponent,
    VisitComponent,
    FooterComponent,
    CursorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <gelora-loader />
    <gelora-nav />
    <main>
      <gelora-hero />
      <gelora-marquee [items]="ticker" />
      <gelora-flavors />
      <gelora-craft />
      <gelora-story />
      <gelora-visit />
    </main>
    <gelora-footer />
    <gelora-cursor />
    <div class="grain" aria-hidden="true"></div>
  `,
})
export class AppComponent {
  readonly ticker = ['Slow-churned daily', 'Bronte pistachio', 'Single-origin cacao', 'Cones baked each morning', 'No shortcuts'];

  constructor() {
    inject(ThemeService); // apply the saved palette before first paint
    const scroll = inject(SmoothScrollService);
    afterNextRender(() => scroll.init());
  }
}
