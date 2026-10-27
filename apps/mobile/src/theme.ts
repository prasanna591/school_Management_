/**
 * The SmartSchool mobile design tokens — Premium glass-morphism edition.
 *
 * Dark canvas with deep violet/cyan accents, frosted-glass surfaces, hairline
 * borders, soft glow, and considered spacing. Built for a premium, considered
 * feel across Admin, Teacher, Parent and Student portals.
 */

export const colors = {
  /** Deep navy canvas behind everything. */
  background: '#0a1029',
  backgroundDeep: '#050b1a',
  /** Base surface tinted just enough to separate from canvas. */
  surface: '#111a36',
  /** Slightly lighter surface for chips / inert surfaces. */
  surfaceMuted: '#162347',
  /** Frosted glass surface: semi-transparent white over the canvas. */
  glassSurface: 'rgba(255, 255, 255, 0.09)',
  glassSurfaceStrong: 'rgba(255, 255, 255, 0.13)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.24)',

  primary: '#8b5cf6',
  primaryDark: '#6d28d9',
  primaryLight: '#f3f0ff',
  primarySoft: 'rgba(139, 92, 246, 0.12)',
  primaryGlow: 'rgba(139, 92, 246, 0.35)',

  accent: '#22d3ee',
  accentSoft: 'rgba(34, 211, 238, 0.12)',
  accentGlow: 'rgba(34, 211, 238, 0.25)',

  text: '#f8fafc',
  textMuted: '#94a3b8',
  textFaint: '#64748b',

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  info: '#8b5cf6',
  infoSoft: 'rgba(139, 92, 246, 0.12)',

  /** Deep navy used by the Teacher portal hero. */
  navy: '#0a1029',
  navyDeep: '#050b1a',
  navySurface: '#101a36',
  navyBorder: '#1a2647',
  onNavy: '#f8fafc',
  onNavyMuted: '#c7d2fe',

  white: '#ffffff',
} as const;

export const teacherGradient = ['#8b5cf6', '#1e3a8a'] as const;

export const parentColors = {
  accent: '#22d3ee',
  accentStrong: '#0891b2',
  accentSoft: 'rgba(34, 211, 238, 0.12)',
  accentBorder: 'rgba(34, 211, 238, 0.3)',
  sky: '#0ea5e9',
} as const;

export const parentGradient = ['#0b1c46', '#16357a', '#0891b2'] as const;

export const parentShadow = {
  shadowColor: '#0891b2',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.14,
  shadowRadius: 10,
  elevation: 2,
} as const;

export const parentShadowStrong = {
  shadowColor: '#0b1c46',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 14,
  elevation: 4,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  '2xl': 34,
  '3xl': 44,
} as const;

export const radius = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

/** Soft ambient shadow for cards floating on the dark canvas. */
export const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 14,
  elevation: 3,
} as const;

/** Stronger shadow for floating / hero elements. */
export const shadowStrong = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.22,
  shadowRadius: 16,
  elevation: 4,
} as const;

/** Glow behind primary accents for premium depth. */
export const glow = {
  primary: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  accent: {
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 3,
  },
} as const;

/** Gradient definitions for hero / banner surfaces. */
export const gradients = {
  primary: ['#8b5cf6', '#6d28d9'] as const,
  teacher: ['#8b5cf6', '#1e3a8a'] as const,
  parent: ['#0b1c46', '#16357a', '#0891b2'] as const,
  canvas: ['#0a1029', '#050b1a'] as const,
} as const;
