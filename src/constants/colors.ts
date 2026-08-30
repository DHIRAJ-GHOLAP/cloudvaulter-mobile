// CloudVaulter Design System Colors
// Matches the web frontend's CSS variables (Material Design 3, orange primary)

export const Colors = {
  // Primary Brand — Orange (hsl 24, 100%, 50%)
  primary: '#FF6B00',
  primaryLight: '#FF8C33',
  primaryDark: '#CC5500',
  primary50: '#FFF4ED',
  primary100: '#FFE0C2',
  primary200: '#FFCC99',
  primary300: '#FFB366',
  primary400: '#FF9933',
  primary500: '#FF6B00',
  primary600: '#E65F00',
  primary700: '#CC5500',
  primary800: '#B34A00',
  primary900: '#993F00',

  // Light Theme
  light: {
    primary: '#FF6B00',
    primaryForeground: '#FFFFFF',
    background: '#F5F4F2',
    surface: '#F5F4F2',
    surfaceVariant: '#D0CECC',
    card: '#F7F6F4',
    cardForeground: '#1A1714',
    foreground: '#1A1714',
    muted: '#D0CECC',
    mutedForeground: '#6B6560',
    border: '#D0CECC',
    input: '#D0CECC',
    popover: '#E8E6E3',
    accent: '#FFFBF0',
    accentForeground: '#FF6B00',
    secondary: '#6B6560',
    secondaryForeground: '#F7F6F4',
    destructive: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
    info: '#2563EB',
    ring: '#FF6B00',
    shadow: 'rgba(0,0,0,0.12)',
  },

  // Dark Theme
  dark: {
    primary: '#FF6B00',
    primaryForeground: '#FFFFFF',
    background: '#1A1714',
    surface: '#1A1714',
    surfaceVariant: '#2A2520',
    card: '#252018',
    cardForeground: '#F7F6F4',
    foreground: '#F7F6F4',
    muted: '#6B6560',
    mutedForeground: '#99948E',
    border: '#3D3730',
    input: '#3D3730',
    popover: '#3D3730',
    accent: '#2D1A00',
    accentForeground: '#FFCC44',
    secondary: '#6B6560',
    secondaryForeground: '#F7F6F4',
    destructive: '#EF4444',
    success: '#22C55E',
    warning: '#FBBF24',
    info: '#60A5FA',
    ring: '#FF6B00',
    shadow: 'rgba(0,0,0,0.4)',
  },

  // Chart colors
  chart1: '#FF6B00',
  chart2: '#7C3AED',
  chart3: '#0EA5E9',
  chart4: '#16A34A',
  chart5: '#D97706',

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ThemeColors = Record<keyof typeof Colors.light, string>;
