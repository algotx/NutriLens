import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Base design at 390px wide (iPhone 14)
const BASE_W = 390;
const BASE_H = 844;

export const SCREEN_W = W;
export const SCREEN_H = H;

// Is this a tablet?
export const isTablet = W >= 600;

// Scale factors — clamped so tablets don't go wild
export const scale = Math.min(W / BASE_W, isTablet ? 1.25 : 1.15);
export const vscale = Math.min(H / BASE_H, isTablet ? 1.2 : 1.15);

// Responsive font — rounds to nearest pixel
export const rf = (size) => Math.round(PixelRatio.roundToNearestPixel(size * scale));

// Responsive size (width-based)
export const rs = (size) => Math.round(size * scale);

// Responsive vertical size (height-based)
export const rv = (size) => Math.round(size * vscale);

// Responsive padding — slightly less aggressive
export const rp = (size) => Math.round(size * (scale * 0.9 + 0.1));

// Safe top padding
export const TOP_INSET = Platform.OS === 'ios' ? (H >= 812 ? 50 : 20) : 28;

// Max content width — centers content on tablets
export const MAX_WIDTH = isTablet ? Math.min(W, 680) : W;

// Responsive spacing
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

// Tab bar height — taller on large phones, shorter on small ones
export const TAB_BAR_HEIGHT = rv(Platform.OS === 'ios' ? 82 : 68);
