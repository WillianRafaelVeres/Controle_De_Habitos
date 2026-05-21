export const colors = {
  background: '#060817',
  backgroundSoft: '#0B1026',
  surface: 'rgba(17, 24, 52, 0.82)',
  surfaceStrong: '#141B3D',
  surfaceMuted: '#0E1530',
  border: 'rgba(148, 163, 184, 0.18)',
  borderStrong: 'rgba(125, 92, 255, 0.44)',
  text: '#F8FAFC',
  textMuted: '#AAB4D4',
  textSubtle: '#7782A8',
  primary: '#7C5CFF',
  primaryDark: '#4B35B6',
  secondary: '#26D9FF',
  accent: '#D946EF',
  success: '#31D08A',
  warning: '#F5B84B',
  danger: '#FF5D73',
  white: '#FFFFFF',
  black: '#000000',
};

export const gradients = {
  screen: ['#050714', '#0A1030', '#1B1042'] as const,
  card: ['rgba(124, 92, 255, 0.22)', 'rgba(38, 217, 255, 0.08)'] as const,
  primary: ['#7C5CFF', '#26D9FF'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
};

export const typography = {
  title: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadows = {
  card: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
};
