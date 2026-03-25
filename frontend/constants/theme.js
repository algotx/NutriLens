export const colors = {
  // Backgrounds — deeper, richer
  bg: '#05080F',
  bgSecondary: '#090D18',
  card: '#0E1420',
  cardElevated: '#141C2E',
  cardGlass: 'rgba(14,20,32,0.85)',
  border: '#1A2540',
  borderLight: '#1F2E4A',
  borderGlow: 'rgba(124,58,237,0.35)',

  // Brand — more vivid purple
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  primaryGlow: 'rgba(124,58,237,0.22)',
  primaryGlowStrong: 'rgba(124,58,237,0.45)',

  // Accent — electric cyan
  accent: '#06B6D4',
  accentLight: '#67E8F9',
  accentGlow: 'rgba(6,182,212,0.18)',
  accentGlowStrong: 'rgba(6,182,212,0.4)',

  // Second accent — hot pink
  pink: '#EC4899',
  pinkLight: '#F9A8D4',
  pinkGlow: 'rgba(236,72,153,0.2)',

  // Status
  success: '#10B981',
  successLight: '#6EE7B7',
  successGlow: 'rgba(16,185,129,0.2)',
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  warningGlow: 'rgba(245,158,11,0.2)',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  dangerGlow: 'rgba(239,68,68,0.2)',

  // Text
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textFaint: '#334155',

  // Macros — distinct vivid colors
  protein: '#8B5CF6',
  proteinLight: '#C4B5FD',
  carbs: '#F59E0B',
  carbsLight: '#FDE68A',
  fat: '#F43F5E',
  fatLight: '#FDA4AF',
  fiber: '#10B981',
  fiberLight: '#6EE7B7',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, full: 999 };

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  glow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  glowCyan: {
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  glowPink: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
};
