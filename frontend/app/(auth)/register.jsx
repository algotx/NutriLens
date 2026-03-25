import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../lib/api';
import { saveToken, saveUser } from '../../lib/auth';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, spacing, radius, shadow } from '../../constants/theme';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) return setError('Please fill in all fields');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name: form.name, email: form.email, password: form.password });
      await saveToken(data.token);
      await saveUser(data.user);
      router.replace('/onboarding');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <View style={styles.header}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoEmoji}>🔬</Text>
            </View>
          </View>
          <Text style={styles.appName}>NUTRILENS</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.sub}>Start your nutrition journey</Text>
        </View>

        <View style={styles.card}>
          <Input label="Full Name" value={form.name} onChangeText={set('name')} placeholder="John Doe"
            icon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />} />
          <Input label="Email" value={form.email} onChangeText={set('email')}
            keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com"
            icon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />} />
          <Input label="Password" value={form.password} onChangeText={set('password')}
            secureTextEntry placeholder="Min. 6 characters"
            icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />} />
          <Input label="Confirm Password" value={form.confirm} onChangeText={set('confirm')}
            secureTextEntry placeholder="••••••••"
            icon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />} />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Button title="Create Account" onPress={submit} loading={loading} style={{ marginTop: spacing.sm }} />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginBtn} activeOpacity={0.8}>
          <Text style={styles.loginBtnText}>Already have an account? Sign in</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primaryLight} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center', paddingTop: 60 },
  orb1: { position: 'absolute', top: -60, right: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: colors.accentGlow },
  orb2: { position: 'absolute', bottom: 80, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primaryGlow },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1.5, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, backgroundColor: colors.cardElevated,
    ...shadow.glow,
  },
  logoInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 34 },
  appName: { color: colors.primaryLight, fontSize: 11, fontWeight: '800', letterSpacing: 5, textTransform: 'uppercase', marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  sub: { color: colors.textMuted, fontSize: 15, marginTop: spacing.xs },

  card: { backgroundColor: colors.cardGlass, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.lg },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerGlow, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: `${colors.danger}30` },
  errorText: { color: colors.dangerLight, fontSize: 13, flex: 1 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cardElevated, borderRadius: radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: colors.borderGlow },
  loginBtnText: { color: colors.primaryLight, fontWeight: '700', fontSize: 15 },
});
