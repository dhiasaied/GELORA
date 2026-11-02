import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { PALETTES, Palette, paletteFromHex } from './palettes';

const STORAGE_KEY = 'gelora.palette';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly palettes = PALETTES;
  readonly palette = signal<Palette>(this.restore());

  constructor() {
    effect(() => this.apply(this.palette()));
  }

  select(id: string): void {
    const found = PALETTES.find((p) => p.id === id);
    if (found) this.palette.set(found);
  }

  custom(hex: string): void {
    this.palette.set(paletteFromHex(hex));
  }

  private apply(p: Palette): void {
    const root = this.doc.documentElement;
    const ink = p.ink;
    const vars: Record<string, string> = {
      '--bg': p.bg,
      '--bg-deep': p.bgDeep,
      '--ink': ink,
      '--ink-soft': withAlpha(ink, 0.68),
      '--line': withAlpha(ink, 0.16),
      '--surface': p.dark ? 'rgba(40, 32, 26, 0.55)' : 'rgba(255, 250, 240, 0.55)',
      '--accent': p.accent,
      '--accent-ink': p.accentInk,
      '--gelato': p.gelato,
      '--apron': p.apron,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset['scheme'] = p.dark ? 'dark' : 'light';
    this.doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p.id === 'custom' ? { custom: p.gelato } : { id: p.id }));
    } catch {
      /* storage unavailable: palette simply isn't remembered */
    }
  }

  private restore(): Palette {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { id?: string; custom?: string };
        if (saved.custom && /^#[0-9a-f]{6}$/i.test(saved.custom)) return paletteFromHex(saved.custom);
        const found = PALETTES.find((p) => p.id === saved.id);
        if (found) return found;
      }
    } catch {
      /* ignore */
    }
    return PALETTES[0];
  }
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
