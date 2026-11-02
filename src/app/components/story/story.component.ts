import { ChangeDetectionStrategy, Component } from '@angular/core';
import { STORY } from '../../core/data/content';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { SplitTextDirective } from '../../shared/directives/split-text.directive';

@Component({
  selector: 'gelora-story',
  imports: [SplitTextDirective, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="story container" id="story">
      <span class="eyebrow" geloraReveal>Our story</span>
      <p class="story__text" geloraSplit="scrub">{{ story }}</p>
      <div class="story__sign" geloraReveal>
        <span class="story__badge display" aria-hidden="true">G</span>
        <div>
          <strong>Marco &amp; Lina</strong>
          <span>Founders, chief tasters</span>
        </div>
      </div>
    </section>
  `,
  styles: `
    .story {
      padding-block: clamp(110px, 16vw, 220px);
    }
    .story__text {
      margin: 30px 0 50px;
      font-family: var(--font-display);
      font-size: clamp(30px, 4.2vw, 64px);
      line-height: 1.12;
      letter-spacing: -0.01em;
      max-width: 1180px;
    }
    .story__sign {
      display: flex;
      align-items: center;
      gap: 16px;
      strong { display: block; font-size: 16px; }
      span { font-size: 13px; color: var(--ink-soft); }
    }
    .story__badge {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--gelato);
      color: var(--ink);
      font-size: 28px;
      line-height: 1;
      box-shadow: inset 0 -6px 12px rgba(0, 0, 0, 0.12);
    }
  `,
})
export class StoryComponent {
  readonly story = STORY;
}
