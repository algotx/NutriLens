import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../lib/api';
import { saveToken, saveUser } from '../../lib/auth';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET, MAX_WIDTH } from '../../lib/responsive';

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

        <View style={styles.inner}>
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
              icon={<Ionicons name="person-outline" size={rf(18)} color={colors.textMuted} />} />
            <Input label="Email" value={form.email} onChangeText={set('email')}
              keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com"
              icon={<Ionicons name="mail-outline" size={rf(18)} color={colors.textMuted} />} />
            <Input label="Password" value={form.password} onChangeText={set('password')}
              secureTextEntry placeholder="Min. 6 characters"
              icon={<Ionicons name="lock-closed-outline" size={rf(18)} color={colors.textMuted} />} />
            <Input label="Confirm Password" value={form.confirm} onChangeText={set('confirm')}
              secureTextEntry placeholder="••••••••"
              icon={<Ionicons name="shield-checkmark-outline" size={rf(18)} color={colors.textMuted} />} />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={rf(15)} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Button title="Create Account" onPress={submit} loading={loading} style={{ marginTop: sp.sm }} />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginBtn} activeOpacity={0.8}>
            <Text style={styles.loginBtnText}>Already have an account? Sign in</Text>
            <Ionicons name="arrow-forward" size={rf(16)} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingTop: TOP_INSET + rp(20),
    paddingBottom: rp(40),
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: sp.lg,
  },

  orb1: { position: 'absolute', top: -rs(60), right: -rs(80), width: rs(240), height: rs(240), borderRadius: rs(120), backgroundColor: colors.accentGlow },
  orb2: { position: 'absolute', bottom: rs(80), left: -rs(80), width: rs(200), height: rs(200), borderRadius: rs(100), backgroundColor: colors.primaryGlow },

  header: { alignItems: 'center', marginBottom: sp.xl },
  logoRing: {
    width: rs(90), height: rs(90), borderRadius: rs(45),
    borderWidth: 1.5, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: sp.md, backgroundColor: colors.cardElevated,
    ...shadow.glow,
  },
  logoInner: { width: rs(70), height: rs(70), borderRadius: rs(35), backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: rf(34) },
  appName: { color: colors.primaryLight, fontSize: rf(11), fontWeight: '800', letterSpacing: 5, textTransform: 'uppercase', marginBottom: sp.sm },
  title: { color: colors.text, fontSize: rf(32), fontWeight: '800', letterSpacing: -0.8 },
  sub: { color: colors.textMuted, fontSize: rf(15), marginTop: sp.xs },

  card: { backgroundColor: colors.cardGlass, borderRadius: rr.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.border, ...shadow.lg },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: rp(8), backgroundColor: colors.dangerGlow, borderRadius: rr.sm, padding: sp.sm, marginBottom: sp.sm, borderWidth: 1, borderColor: `${colors.danger}30` },
  errorText: { color: colors.dangerLight, fontSize: rf(13), flex: 1 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginVertical: sp.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: rf(13) },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rp(8), backgroundColor: colors.cardElevated, borderRadius: rr.lg, paddingVertical: rp(14), borderWidth: 1, borderColor: colors.borderGlow },
  loginBtnText: { color: colors.primaryLight, fontWeight: '700', fontSize: rf(15) },
});
