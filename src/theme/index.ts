export const colors = {
  background: '#0C0D10',
  backgroundSoft: '#121419',
  surface: 'rgba(22, 24, 29, 0.92)',
  surfaceStrong: '#1B1E24',
  surfaceMuted: '#14161B',
  border: 'rgba(161, 161, 170, 0.16)',
  borderStrong: 'rgba(59, 130, 246, 0.36)',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  textSubtle: '#71717A',
  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  secondary: '#14B8A6',
  accent: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
};

export const gradients = {
  screen: ['#0C0D10', '#0C0D10', '#121419'] as const,
  card: ['rgba(59, 130, 246, 0.12)', 'rgba(20, 184, 166, 0.06)'] as const,
  primary: ['#2563EB', '#2563EB'] as const,
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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
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
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
};
