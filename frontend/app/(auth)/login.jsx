import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../lib/api';
import { saveToken, saveUser } from '../../lib/auth';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, spacing, radius, shadow } from '../../constants/theme';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Please fill in all fields');
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      await saveToken(data.token);
      await saveUser(data.user);
      router.replace('/');
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Background orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <View style={styles.orb3} />

        {/* Logo */}
        <View style={styles.header}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoEmoji}>🔬</Text>
            </View>
          </View>
          <Text style={styles.appName}>NUTRILENS</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Your AI nutrition companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Input
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            icon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
          />
          <Input
            label="Password"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            placeholder="••••••••"
            icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
          />
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Button title="Sign In" onPress={submit} loading={loading} style={{ marginTop: spacing.sm }} />
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerBtn} activeOpacity={0.8}>
          <Text style={styles.registerBtnText}>Create a new account</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primaryLight} />
        </TouchableOpacity>

        {/* Feature pills */}
        <View style={styles.featurePills}>
          {['AI Photo Scan', 'Barcode Lookup', 'AI Coach'].map((f) => (
            <View key={f} style={styles.featurePill}>
              <Ionicons name="sparkles" size={10} color={colors.primaryLight} />
              <Text style={styles.featurePillText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center', paddingTop: 80 },

  orb1: { position: 'absolute', top: -80, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: colors.primaryGlow },
  orb2: { position: 'absolute', top: 200, right: -100, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.accentGlow },
  orb3: { position: 'absolute', bottom: 100, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.pinkGlow },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1.5, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.cardElevated,
    ...shadow.glow,
  },
  logoInner: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 34 },
  appName: {
    color: colors.primaryLight, fontSize: 11, fontWeight: '800',
    letterSpacing: 5, textTransform: 'uppercase', marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  sub: { color: colors.textMuted, fontSize: 15, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.cardGlass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.lg,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerGlow,
    borderRadius: radius.sm, padding: spacing.sm,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: `${colors.danger}30`,
  },
  errorText: { color: colors.dangerLight, fontSize: 13, flex: 1 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },

  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.borderGlow,
  },
  registerBtnText: { color: colors.primaryLight, fontWeight: '700', fontSize: 15 },

  featurePills: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl, flexWrap: 'wrap' },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  featurePillText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});
