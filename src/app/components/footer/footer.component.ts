import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NAV_LINKS } from '../../core/data/content';
import { SmoothScrollService } from '../../core/scroll/smooth-scroll.service';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';

@Component({
  selector: 'gelora-footer',
  imports: [MagneticDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="container footer__top">
        <p class="footer__tag display">Made slowly,<br />eaten quickly.</p>
        <nav class="footer__links" aria-label="Footer">
          @for (l of links; track l.target) {
            <a [href]="l.target" (click)="go(l.target, $event)">{{ l.label }}</a>
          }
        </nav>
        <div class="footer__social">
          <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
          <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok">TT</a>
          <a href="mailto:ciao@gelora.example" aria-label="Email">&#64;</a>
        </div>
        <button type="button" class="round-btn footer__up" geloraMagnetic (click)="go('#top')" aria-label="Back to top">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="footer__word display" aria-hidden="true">Gelora</div>
      <div class="container footer__bottom">
        <span>© {{ year }} GELORA Gelateria</span>
        <span>Small batch · Hand finished</span>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      position: relative;
      overflow: hidden;
      padding-top: 80px;
      background: var(--ink);
      color: var(--bg);
    }
    .footer__top {
      display: grid;
      grid-template-columns: 1.4fr 1fr auto auto;
      gap: 30px;
      align-items: start;
    }
    .footer__tag { margin: 0; font-size: clamp(30px, 3.4vw, 48px); line-height: 1.02; }
    .footer__links { display: grid; gap: 8px; }
    .footer__links a {
      width: fit-content;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.75;
      transition: opacity 0.3s, color 0.3s;
    }
    .footer__links a:hover { opacity: 1; color: var(--accent); }
    .footer__social { display: flex; gap: 10px; }
    .footer__social a {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid color-mix(in srgb, var(--bg) 25%, transparent);
      font-size: 12px;
      font-weight: 700;
      transition: background-color 0.3s, color 0.3s;
    }
    .footer__social a:hover { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
    .footer__word {
      margin-top: 40px;
      font-size: 27vw;
      line-height: 0.78;
      text-align: center;
      letter-spacing: -0.02em;
      background: linear-gradient(180deg, var(--gelato) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      transform: translateY(6%);
      user-select: none;
    }
    .footer__bottom {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
      padding-block: 22px;
      font-size: 12px;
      opacity: 0.7;
      border-top: 1px solid color-mix(in srgb, var(--bg) 18%, transparent);
    }
    @media (max-width: 860px) {
      .footer__top { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 520px) {
      .footer__top { grid-template-columns: 1fr; }
    }
  `,
})
export class FooterComponent {
  private readonly scroll = inject(SmoothScrollService);
  readonly links = NAV_LINKS;
  readonly year = new Date().getFullYear();

  go(target: string, e?: Event): void {
    e?.preventDefault();
    this.scroll.scrollTo(target === '#top' ? 0 : target);
  }
}
