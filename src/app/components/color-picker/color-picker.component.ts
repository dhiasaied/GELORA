import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { hslToHex } from '../../core/theme/palettes';

/** Flavor palette selector: presets plus a free custom color that re-tints the whole site and 3D scene. */
@Component({
  selector: 'gelora-color-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  host: {
    '(document:pointerdown)': 'onOutside($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
})
export class ColorPickerComponent {
  readonly theme = inject(ThemeService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement as HTMLElement;
  readonly open = signal(false);
  readonly customHex = computed(() => this.theme.palette().gelato);

  toggle(): void {
    this.open.update((v) => !v);
  }

  pick(id: string): void {
    this.theme.select(id);
  }

  custom(event: Event): void {
    this.theme.custom((event.target as HTMLInputElement).value);
  }

  hexInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value.trim();
    const hex = v.startsWith('#') ? v : `#${v}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) this.theme.custom(hex.toLowerCase());
  }

  surprise(): void {
    this.theme.custom(hslToHex(Math.random(), 0.45 + Math.random() * 0.35, 0.62 + Math.random() * 0.12));
  }

  onOutside(e: PointerEvent): void {
    if (this.open() && !this.el.contains(e.target as Node)) this.open.set(false);
  }
}
