import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { rf, rp, rr } from '../lib/responsive';

export default function Button({ title, onPress, loading, variant = 'primary', style, icon }) {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        isOutline ? styles.outline : isDanger ? styles.dangerBtn : styles.filled,
        style,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : '#fff'} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, isOutline && styles.textOutline, isDanger && styles.textDanger]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: rr.md,
    paddingVertical: rp(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: colors.primary,
    ...shadow.glow,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  dangerBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: rp(8) },
  iconWrap: { marginRight: 2 },
  text: { color: '#fff', fontWeight: '700', fontSize: rf(16), letterSpacing: 0.3 },
  textOutline: { color: colors.primaryLight },
  textDanger: { color: colors.danger },
});
