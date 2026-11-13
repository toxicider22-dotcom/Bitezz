import { ThemeColor } from '../types';
export type { ThemeColor };

export interface ThemePalette {
  id: ThemeColor;
  name: string;
  previewBg: string;
  isBrand?: boolean;
  shades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export const THEME_PALETTES: Record<ThemeColor, ThemePalette> = {
  bitezz: {
    id: 'bitezz',
    name: 'Bitezz Gold (Brand)',
    previewBg: '#f59e0b',
    isBrand: true,
    shades: {
      50: '#fffdf0',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03'
    }
  },
  yellow: {
    id: 'yellow',
    name: 'Bitezz Sunshine Yellow',
    previewBg: '#eab308',
    isBrand: true,
    shades: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
      950: '#422006'
    }
  },
  gold: {
    id: 'gold',
    name: 'Bitezz Crown Gold',
    previewBg: '#e5a100',
    isBrand: true,
    shades: {
      50: '#fffef2',
      100: '#fef8c8',
      200: '#fdec8d',
      300: '#fcde53',
      400: '#f9cb24',
      500: '#e5a100',
      600: '#c68200',
      700: '#9e6300',
      800: '#7f4e04',
      900: '#683f07',
      950: '#3b2002'
    }
  },
  charcoal: {
    id: 'charcoal',
    name: 'Bitezz Charcoal & Gold',
    previewBg: '#18181b',
    isBrand: true,
    shades: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#334155',
      700: '#1e293b',
      800: '#0f172a',
      900: '#020617',
      950: '#000000'
    }
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    previewBg: '#7e22ce',
    shades: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    }
  },
  red: {
    id: 'red',
    name: 'Crimson Red',
    previewBg: '#dc2626',
    shades: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    }
  },
  blue: {
    id: 'blue',
    name: 'Ocean Blue',
    previewBg: '#2563eb',
    shades: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    }
  },
  emerald: {
    id: 'emerald',
    name: 'Fresh Emerald',
    previewBg: '#059669',
    shades: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22'
    }
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    previewBg: '#d97706',
    shades: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03'
    }
  },
  indigo: {
    id: 'indigo',
    name: 'Midnight Indigo',
    previewBg: '#4f46e5',
    shades: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b'
    }
  }
};

export function applyTheme(color: ThemeColor = 'purple') {
  if (typeof document === 'undefined') return;
  const palette = THEME_PALETTES[color] || THEME_PALETTES.purple;
  const root = document.documentElement;
  Object.entries(palette.shades).forEach(([shade, hex]) => {
    root.style.setProperty(`--theme-${shade}`, hex);
  });
}

// Auto-apply saved theme from localStorage on script initialization
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('biteflow_settings_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.themeColor) {
        applyTheme(parsed.themeColor);
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
}
