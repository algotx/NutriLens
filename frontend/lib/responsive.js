import { Dimensions, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Base design was done at 390px wide (iPhone 14)
const BASE_W = 390;
const BASE_H = 844;

// Scale factor — clamp so it doesn't go crazy on tablets
export const scale = Math.min(W / BASE_W, 1.4);
export const vscale = Math.min(H / BASE_H, 1.4);

// Responsive font size
export const rf = (size) => Math.round(size * scale);

// Responsive size (width-based)
export const rs = (size) => Math.round(size * scale);

// Responsive vertical size (height-based)
export const rv = (size) => Math.round(size * vscale);

// Responsive padding/margin — slightly less aggressive than full scale
export const rp = (size) => Math.round(size * (scale * 0.85 + 0.15));

// Screen dimensions
export const SCREEN_W = W;
export const SCREEN_H = H;

// Is this a tablet? (width > 600)
export const isTablet = W >= 600;

// Safe top padding (status bar area)
export const TOP_INSET = Platform.OS === 'ios' ? (H >= 812 ? 50 : 20) : 24;

// Responsive spacing object — replaces the static one from theme
export const sp = {
  xs: rp(4),
  sm: rp(8),
  md: rp(16),
  lg: rp(24),
  xl: rp(32),
  xxl: rp(48),
};

// Responsive radius
export const rr = {
  xs: rs(6),
  sm: rs(10),
  md: rs(16),
  lg: rs(22),
  xl: rs(30),
  full: 999,
};
