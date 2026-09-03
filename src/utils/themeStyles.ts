import { ThemeMode, FontFamily, HighlightStyle } from '../types';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  bg: string;
  readerBg: string;
  text: string;
  mutedText: string;
  cardBg: string;
  border: string;
  controlBg: string;
  accent: string;
}

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Sophisticated Dark',
    bg: 'bg-[#0A0A0B]',
    readerBg: 'bg-[#0A0A0B]',
    text: 'text-slate-300',
    mutedText: 'text-slate-500',
    cardBg: 'bg-[#16161A]',
    border: 'border-white/10',
    controlBg: 'bg-[#0D0D0F]/95',
    accent: '#f59e0b',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    bg: 'bg-[#070b14]',
    readerBg: 'bg-[#0a0f1d]',
    text: 'text-[#e2e8f0]',
    mutedText: 'text-[#94a3b8]',
    cardBg: 'bg-[#131b2e]',
    border: 'border-cyan-500/20',
    controlBg: 'bg-[#0a0f1d]/95',
    accent: '#38bdf8',
  },
  sepia: {
    id: 'sepia',
    name: 'Warm Sepia',
    bg: 'bg-[#f4ecd8]',
    readerBg: 'bg-[#fbf7ee]',
    text: 'text-[#433422]',
    mutedText: 'text-[#85705a]',
    cardBg: 'bg-[#ede3cc]',
    border: 'border-[#dfd3b9]',
    controlBg: 'bg-[#ece1c7]/90',
    accent: '#b45309',
  },
  light: {
    id: 'light',
    name: 'Clean Day',
    bg: 'bg-[#f8fafc]',
    readerBg: 'bg-[#ffffff]',
    text: 'text-[#1e293b]',
    mutedText: 'text-[#64748b]',
    cardBg: 'bg-[#f1f5f9]',
    border: 'border-[#e2e8f0]',
    controlBg: 'bg-[#ffffff]/90',
    accent: '#2563eb',
  },
  paper: {
    id: 'paper',
    name: 'Vintage Book',
    bg: 'bg-[#ebe5d8]',
    readerBg: 'bg-[#f7f4ed]',
    text: 'text-[#2b2520]',
    mutedText: 'text-[#7a6f64]',
    cardBg: 'bg-[#e2dcce]',
    border: 'border-[#d4ccbd]',
    controlBg: 'bg-[#dfd9cb]/90',
    accent: '#92400e',
  },
  forest: {
    id: 'forest',
    name: 'Forest Calm',
    bg: 'bg-[#0a1410]',
    readerBg: 'bg-[#0d1a15]',
    text: 'text-[#d1fae5]',
    mutedText: 'text-[#6ee7b7]/70',
    cardBg: 'bg-[#14261f]',
    border: 'border-emerald-500/20',
    controlBg: 'bg-[#0d1a15]/95',
    accent: '#10b981',
  },
};

export const FONT_FAMILIES: Record<
  FontFamily,
  { name: string; cssFamily: string; description: string }
> = {
  merriweather: {
    name: 'Merriweather',
    cssFamily: "'Merriweather', serif",
    description: 'Designed for screen readability & literature',
  },
  lora: {
    name: 'Lora',
    cssFamily: "'Lora', serif",
    description: 'Contemporary serif with calligraphic roots',
  },
  sans: {
    name: 'Plus Jakarta',
    cssFamily: "'Plus Jakarta Sans', sans-serif",
    description: 'Clean modern geometric sans-serif',
  },
  playfair: {
    name: 'Playfair',
    cssFamily: "'Playfair Display', serif",
    description: 'Elegant editorial & classic novel flair',
  },
  mono: {
    name: 'JetBrains Mono',
    cssFamily: "'JetBrains Mono', monospace",
    description: 'Crisp technical and monospace structure',
  },
};

export function getHighlightClass(
  style: HighlightStyle,
  theme: ThemeMode,
  isActive: boolean
): string {
  if (!isActive)
    return 'hover:bg-amber-500/10 cursor-pointer transition-colors duration-150 rounded px-1 -mx-1';

  const isDark = theme === 'dark' || theme === 'midnight' || theme === 'forest';

  switch (style) {
    case 'soft-gold':
      return isDark
        ? 'bg-amber-500/20 text-slate-100 rounded-lg px-2 -mx-2 py-0.5 border-l-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] font-normal transition-all'
        : 'bg-amber-200/85 text-amber-950 rounded-lg px-2 -mx-2 py-0.5 border-l-4 border-amber-500 shadow-sm font-medium transition-all';
    case 'neon-glow':
      return isDark
        ? 'bg-cyan-500/25 text-cyan-50 rounded-lg px-2 -mx-2 py-0.5 border-l-4 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
        : 'bg-cyan-100 text-cyan-950 rounded-md px-1.5 -mx-1.5 py-0.5 shadow-sm ring-1 ring-cyan-400';
    case 'emerald':
      return isDark
        ? 'bg-emerald-500/25 text-emerald-50 rounded-lg px-2 -mx-2 py-0.5 border-l-4 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
        : 'bg-emerald-100 text-emerald-950 rounded-md px-1.5 -mx-1.5 py-0.5 ring-1 ring-emerald-400/50';
    case 'lilac':
      return isDark
        ? 'bg-purple-500/25 text-purple-100 rounded-lg px-2 -mx-2 py-0.5 border-l-4 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
        : 'bg-purple-100 text-purple-950 rounded-md px-1.5 -mx-1.5 py-0.5 ring-1 ring-purple-300';
    case 'underlined':
      return isDark
        ? 'underline decoration-amber-500 decoration-4 underline-offset-4 bg-white/5 rounded px-1.5 -mx-1.5 py-0.5 text-slate-100 font-normal shadow-[0_0_15px_rgba(245,158,11,0.1)]'
        : 'underline decoration-amber-500 decoration-4 underline-offset-4 bg-amber-50/50 rounded px-1 -mx-1 font-medium';
    case 'amber-box':
    default:
      return isDark
        ? 'bg-amber-500/20 text-slate-100 rounded-lg px-3 -mx-2 py-1 border-l-4 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
        : 'bg-orange-100/90 border-l-4 border-orange-500 pl-2 rounded-r pr-1 font-medium';
  }
}
