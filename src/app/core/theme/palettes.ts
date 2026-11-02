export interface Palette {
  id: string;
  /** Flavor shown in the hero card and flavor list. */
  flavor: string;
  notes: string;
  price: string;
  /** Scoop color, also drives the 3D gelato. */
  gelato: string;
  /** Buttons, highlights, progress rail. */
  accent: string;
  /** Text color on top of the accent. */
  accentInk: string;
  /** Gelatiere apron in the 3D scene. */
  apron: string;
  bg: string;
  bgDeep: string;
  ink: string;
  dark: boolean;
}

export const PALETTES: Palette[] = [
  {
    id: 'pistachio',
    flavor: 'Pistachio Crunch',
    notes: 'Bronte pistachio, toasted nibs, a pinch of sea salt.',
    price: '€4.80',
    gelato: '#b8c98a',
    accent: '#e9c46a',
    accentInk: '#2f2a22',
    apron: '#3f5b45',
    bg: '#e8dcc8',
    bgDeep: '#d6c5a8',
    ink: '#2f2a22',
    dark: false,
  },
  {
    id: 'strawberry',
    flavor: 'Strawberry Silk',
    notes: 'Alba strawberries folded into fresh cream.',
    price: '€4.50',
    gelato: '#f0a3ae',
    accent: '#e66a7f',
    accentInk: '#fff6f3',
    apron: '#7a2e3b',
    bg: '#f3e2dc',
    bgDeep: '#e8cbc2',
    ink: '#3a2226',
    dark: false,
  },
  {
    id: 'mango',
    flavor: 'Mango Sunset',
    notes: 'Alphonso mango, passion fruit ribbon.',
    price: '€4.60',
    gelato: '#f5b54a',
    accent: '#f08a24',
    accentInk: '#2b1c0b',
    apron: '#2f4858',
    bg: '#f2e2c6',
    bgDeep: '#e6cfa6',
    ink: '#2b2116',
    dark: false,
  },
  {
    id: 'blueberry',
    flavor: 'Blueberry Cloud',
    notes: 'Wild blueberries, mascarpone, lemon zest.',
    price: '€4.70',
    gelato: '#a3a9e3',
    accent: '#7a6ff0',
    accentInk: '#ffffff',
    apron: '#2c2e5e',
    bg: '#e4e2ee',
    bgDeep: '#cfcbe0',
    ink: '#221f3a',
    dark: false,
  },
  {
    id: 'fiordilatte',
    flavor: 'Fior di Latte',
    notes: 'Just milk, cream and patience. The purist’s scoop.',
    price: '€4.20',
    gelato: '#f4ecd6',
    accent: '#c99a5b',
    accentInk: '#22180c',
    apron: '#5b4636',
    bg: '#efe7da',
    bgDeep: '#e0d3be',
    ink: '#2a221a',
    dark: false,
  },
  {
    id: 'cacao',
    flavor: 'Midnight Cacao',
    notes: '72% single-origin cacao, smoked caramel.',
    price: '€5.10',
    gelato: '#7a4a2e',
    accent: '#e0a95c',
    accentInk: '#1b130d',
    apron: '#1f2a24',
    bg: '#1d1713',
    bgDeep: '#2a211b',
    ink: '#f3e7d6',
    dark: true,
  },
];

/* ---------- color helpers (custom palette from any hex) ---------- */

export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 1) + 1) % 1;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Build a harmonious light palette around a single picked color. */
export function paletteFromHex(hex: string): Palette {
  const [h, s] = hexToHsl(hex);
  const sat = Math.max(0.25, s);
  const accent = hslToHex(h, Math.min(0.85, sat + 0.1), 0.6);
  return {
    id: 'custom',
    flavor: 'Your Signature',
    notes: 'A scoop mixed to your exact shade.',
    price: '€5.00',
    gelato: hex,
    accent,
    accentInk: hexToHsl(accent)[2] > 0.6 ? '#1d1a16' : '#ffffff',
    apron: hslToHex(h, Math.min(0.45, sat), 0.26),
    bg: hslToHex(h, Math.min(0.4, sat * 0.6), 0.9),
    bgDeep: hslToHex(h, Math.min(0.35, sat * 0.5), 0.82),
    ink: hslToHex(h, 0.3, 0.14),
    dark: false,
  };
}
