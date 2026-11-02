import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let uid = 0;

/** Illustrated cone with a scoop, tinted by any gelato color. */
@Component({
  selector: 'gelora-cone-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 120 170" role="img" [attr.aria-label]="label()">
      <defs>
        <radialGradient [attr.id]="id + 'g'" cx="38%" cy="32%" r="70%">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".55" />
          <stop offset=".45" [attr.stop-color]="color()" stop-opacity="1" />
          <stop offset="1" [attr.stop-color]="shade()" />
        </radialGradient>
        <linearGradient [attr.id]="id + 'c'" x1="0" x2="1">
          <stop offset="0" stop-color="#c88440" />
          <stop offset=".5" stop-color="#e2a862" />
          <stop offset="1" stop-color="#b8742f" />
        </linearGradient>
        <clipPath [attr.id]="id + 'k'"><path d="M24 74 L60 166 L96 74 Z" /></clipPath>
      </defs>
      <ellipse cx="60" cy="166" rx="26" ry="3.5" fill="#000" opacity=".12" />
      <path d="M24 74 L60 166 L96 74 Z" [attr.fill]="'url(#' + id + 'c)'" />
      <g [attr.clip-path]="'url(#' + id + 'k)'" stroke="#9a5d24" stroke-width="2.2" opacity=".75">
        @for (i of lines; track i) {
          <line [attr.x1]="i" y1="70" [attr.x2]="i + 70" y2="170" />
          <line [attr.x1]="i + 70" y1="70" [attr.x2]="i" y2="170" />
        }
      </g>
      <rect x="20" y="68" width="80" height="10" rx="5" fill="#d18f48" />
      <path
        d="M22 72 C14 46 30 20 60 18 C90 20 106 46 98 72 C92 78 84 70 78 77 C72 82 66 74 60 79 C54 74 48 82 42 77 C36 70 28 78 22 72 Z"
        [attr.fill]="'url(#' + id + 'g)'"
      />
      @if (dipped()) {
        <path
          d="M24 52 C28 30 44 18 60 18 C78 18 92 30 96 52 C92 58 88 52 86 64 C84 70 80 66 80 56 C74 60 70 56 66 60 C64 74 58 74 58 60 C52 62 46 58 40 60 C38 68 34 68 34 58 C30 56 26 58 24 52 Z"
          fill="#3d2014"
        />
        <ellipse cx="46" cy="30" rx="9" ry="4" fill="#fff" opacity=".22" transform="rotate(-25 46 30)" />
        @for (n of nuts; track $index) {
          <rect [attr.x]="n[0]" [attr.y]="n[1]" width="6" height="4" rx="1.5" [attr.fill]="n[2]" [attr.transform]="'rotate(' + n[3] + ' ' + n[0] + ' ' + n[1] + ')'" />
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: 100%; overflow: visible; }
  `,
})
export class ConeArtComponent {
  readonly color = input('#b8c98a');
  readonly dipped = input(false);
  readonly label = input('Gelato cone');

  readonly id = `gc${uid++}`;
  readonly lines = [-60, -44, -28, -12, 4, 20, 36, 52, 68, 84];
  readonly nuts: [number, number, string, number][] = [
    [44, 26, '#8fae4f', 20],
    [58, 22, '#a6bf5d', -30],
    [70, 30, '#6f8f3a', 45],
    [52, 36, '#b7c977', 10],
    [64, 40, '#8fae4f', -15],
    [38, 40, '#a6bf5d', 60],
    [78, 42, '#7d5c3e', 30],
  ];

  readonly shade = computed(() => {
    const n = parseInt(this.color().slice(1), 16);
    const f = (v: number) => Math.round(v * 0.72);
    return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  });
}
