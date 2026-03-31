import { TextInput, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { rf, rp, rr } from '../lib/responsive';

export default function Input({ label, error, icon, ...props }) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, error && styles.inputWrapError]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: rp(16) },
  label: {
    color: colors.textMuted,
    fontSize: rf(12),
    fontWeight: '600',
    marginBottom: rp(6),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: rr.md,
    overflow: 'hidden',
  },
  inputWrapError: { borderColor: colors.danger },
  iconWrap: { paddingLeft: rp(16) },
  input: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: rp(16),
    paddingVertical: rp(14),
    fontSize: rf(15),
  },
  inputWithIcon: { paddingLeft: rp(8) },
  error: { color: colors.danger, fontSize: rf(12), marginTop: rp(4) },
});
