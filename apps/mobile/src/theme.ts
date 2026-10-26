/**
 * The SmartSchool mobile design tokens.
 *
 * Refined premium palette: soft neutral canvas with deep violet accent,
 * crisp surfaces, tighter shadows. Designed to feel more considered and
 * less template-like.
 */

export const colors = {
  /** App canvas behind the cards. */
  background: '#f7f6fa',
  /** Card / sheet surface. */
  surface: '#ffffff',
  /** Slightly tinted surface for chips, inputs and inert buttons. */
  surfaceMuted: '#f8f7fc',

  primary: '#5b21b6',
  primaryDark: '#4c1d95',
  primaryLight: '#f3f0ff',
  primarySoft: '#f7f5ff',

  /** Refined gradient for hero/banner surfaces. */
  gradient: ['#6d28d9', '#312e81'] as const,

  text: '#0f172a',
  textMuted: '#475569',
  textFaint: '#94a3b8',

  border: '#e7e5f3',
  borderStrong: '#d7d3ee',

  success: '#166534',
  successSoft: '#f0fdf4',
  warning: '#92400e',
  warningSoft: '#fffbeb',
  danger: '#991b1b',
  dangerSoft: '#fef2f2',
  info: '#5b21b6',
  infoSoft: '#f7f5ff',

  /**
   * Deep navy used by the Teacher portal.
   */
  navy: '#0a1029',
  navyDeep: '#050b1a',
  navySurface: '#101a36',
  navyBorder: '#1a2647',
  /** Text colours that sit on the navy hero. */
  onNavy: '#f8fafc',
  onNavyMuted: '#c7d2fe',

  white: '#ffffff',
} as const;

/**
 * The Teacher hero gradient: purple into navy, matching the sidebar gradient
 * the web Teacher Portal uses.
 */
export const teacherGradient = ['#5b21b6', '#1e3a8a'] as const;

/**
 * The Parent palette: navy blue + white with soft blue accents, mirroring the
 * `:root[data-theme='parent']` tokens the web Parent portal applies. Parent
 * screens use these accents instead of the app-wide purple so the portal reads
 * as its own calm, blue space without disturbing the other roles.
 */
export const parentColors = {
  accent: '#1d4ed8',
  accentStrong: '#1a44bf',
  accentSoft: '#e5edfe',
  accentBorder: '#c7d7fb',
  sky: '#0ea5e9',
} as const;

/** The Parent hero gradient: deep navy into royal blue, with a sky bloom. */
export const parentGradient = ['#0b1c46', '#16357a', '#1d4ed8'] as const;

/** A soft blue card shadow for parent surfaces (iOS shadow* + elevation). */
export const parentShadow = {
  shadowColor: '#16357a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;

/** A slightly stronger blue shadow for hero/floating parent elements. */
export const parentShadowStrong = {
  shadowColor: '#0b1c46',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 6,
} as const;


export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Soft card shadow (iOS shadow* + Android elevation). */
export const shadow = {
  shadowColor: '#1e1b4b',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 2,
} as const;

/** A slightly stronger shadow for floating/hero elements. */
export const shadowStrong = {
  shadowColor: '#1e1b4b',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.1,
  shadowRadius: 24,
  elevation: 4,
} as const;
