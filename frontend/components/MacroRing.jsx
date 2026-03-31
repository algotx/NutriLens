import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';
import { rf, rs } from '../lib/responsive';

export default function MacroRing({ consumed, goal, size = 160, color = colors.primary, label }) {
  const scaledSize = rs(size);
  const stroke = rs(13);
  const r = (scaledSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dash = pct * circ;
  const gradId = `grad_${label}_${scaledSize}`;
  const gradId2 = `grad2_${label}_${scaledSize}`;

  const r2 = r - stroke - rs(6);
  const circ2 = 2 * Math.PI * r2;
  const dash2 = pct * circ2;

  return (
    <View style={styles.container}>
      <Svg width={scaledSize} height={scaledSize}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="50%" stopColor={colors.accentLight} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id={gradId2} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        <Circle cx={scaledSize / 2} cy={scaledSize / 2} r={r}
          stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle cx={scaledSize / 2} cy={scaledSize / 2} r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          rotation="-90" origin={`${scaledSize / 2}, ${scaledSize / 2}`}
        />
        <Circle cx={scaledSize / 2} cy={scaledSize / 2} r={r2}
          stroke={colors.border} strokeWidth={4} fill="none" strokeOpacity={0.4} />
        <Circle cx={scaledSize / 2} cy={scaledSize / 2} r={r2}
          stroke={`url(#${gradId2})`}
          strokeWidth={4} fill="none"
          strokeDasharray={`${dash2} ${circ2}`}
          strokeLinecap="round"
          rotation="-90" origin={`${scaledSize / 2}, ${scaledSize / 2}`}
        />
      </Svg>

      <View style={[styles.center, { width: scaledSize, height: scaledSize }]}>
        <Text style={[styles.pct, { color }]}>{Math.round(pct * 100)}%</Text>
        <Text style={[styles.value, { color }]}>{Math.round(consumed)}</Text>
        <Text style={styles.goal}>/ {goal}</Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center' },
  center: { position: 'absolute', top: 0, left: 0, justifyContent: 'center', alignItems: 'center' },
  pct: { fontSize: rf(11), fontWeight: '700', letterSpacing: 0.5, opacity: 0.7, marginBottom: 2 },
  value: { fontSize: rf(26), fontWeight: '800', letterSpacing: -0.5 },
  goal: { color: colors.textMuted, fontSize: rf(11), marginTop: 1 },
  label: { color: colors.textMuted, fontSize: rf(10), marginTop: 3, letterSpacing: 0.8, textTransform: 'uppercase' },
});
