import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileAPI } from '../../lib/api';
import { getUser, removeToken, removeUser } from '../../lib/auth';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET } from '../../lib/responsive';

function MacroTarget({ label, value, unit, color }) {
  return (
    <View style={[styles.macroTarget, { borderColor: `${color}25`, backgroundColor: `${color}08` }]}>
      <Text style={[styles.macroTargetVal, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.macroTargetUnit}>{unit}</Text>
      <Text style={styles.macroTargetLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}20` }]}>
      <View style={[styles.statCardIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={rf(16)} color={color} />
      </View>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={[styles.statCardValue, { color }]}>{value ?? '—'}</Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
      try { const { data } = await profileAPI.get(); setProfile(data); } catch {}
    })();
  }, []));

  const logout = () => {
    Alert.alert('Log out?', 'You will need to log in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        await removeToken(); await removeUser();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  const goalLabels = { lose_weight: 'Lose Weight', maintain: 'Maintain', gain_muscle: 'Build Muscle', gain_weight: 'Gain Weight' };
  const goalColors = { lose_weight: colors.danger, maintain: colors.accent, gain_muscle: colors.protein, gain_weight: colors.success };
  const goalIcons = { lose_weight: 'flame', maintain: 'scale', gain_muscle: 'barbell', gain_weight: 'trending-up' };
  const activityLabels = { sedentary: 'Sedentary', lightly_active: 'Lightly Active', moderately_active: 'Moderately Active', very_active: 'Very Active', extra_active: 'Extra Active' };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const goalColor = goalColors[profile?.goal] || colors.primary;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBg}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <View style={styles.onlineDot} />
        </View>

        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {profile?.goal && (
          <View style={[styles.goalBadge, { backgroundColor: `${goalColor}15`, borderColor: `${goalColor}35` }]}>
            <Ionicons name={goalIcons[profile.goal] || 'flag'} size={rf(13)} color={goalColor} />
            <Text style={[styles.goalBadgeText, { color: goalColor }]}>{goalLabels[profile.goal]}</Text>
          </View>
        )}
      </View>

      {profile && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={rf(15)} color={colors.warning} />
            <Text style={styles.sectionTitle}>Daily Targets</Text>
          </View>
          <View style={styles.macroTargetRow}>
            <MacroTarget label="Calories" value={profile.daily_calories} unit="kcal" color={colors.primary} />
            <MacroTarget label="Protein" value={profile.daily_protein_g} unit="g" color={colors.protein} />
            <MacroTarget label="Carbs" value={profile.daily_carbs_g} unit="g" color={colors.carbs} />
            <MacroTarget label="Fat" value={profile.daily_fat_g} unit="g" color={colors.fat} />
          </View>
        </View>
      )}

      {profile && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="body" size={rf(15)} color={colors.accent} />
            <Text style={styles.sectionTitle}>Body Stats</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard icon="calendar-outline" label="Age" value={profile.age ? `${profile.age} yrs` : null} color={colors.accent} />
            <StatCard icon="male-female-outline" label="Gender" value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null} color={colors.primaryLight} />
            <StatCard icon="resize-outline" label="Height" value={profile.height_cm ? `${Math.round(profile.height_cm / 2.54)}"` : null} color={colors.success} />
            <StatCard icon="scale-outline" label="Weight" value={profile.weight_kg ? `${Math.round(profile.weight_kg * 2.20462)} lbs` : null} color={colors.warning} />
            <StatCard icon="flag-outline" label="Goal Wt" value={profile.goal_weight_kg ? `${Math.round(profile.goal_weight_kg * 2.20462)} lbs` : null} color={colors.danger} />
            <StatCard icon="walk-outline" label="Activity" value={activityLabels[profile.activity_level]?.split(' ')[0]} color={colors.fiber} />
          </View>
        </View>
      )}

      {profile?.dietary_preference && profile.dietary_preference !== 'none' && (
        <View style={styles.section}>
          <View style={styles.dietBadge}>
            <Ionicons name="leaf" size={rf(16)} color={colors.success} />
            <Text style={styles.dietText}>{profile.dietary_preference.charAt(0).toUpperCase() + profile.dietary_preference.slice(1)} diet</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/onboarding')} activeOpacity={0.8}>
          <View style={[styles.actionBtnIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="create-outline" size={rf(18)} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionBtnTitle}>Update Goals & Stats</Text>
            <Text style={styles.actionBtnSub}>Recalculate your macros</Text>
          </View>
          <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={logout} activeOpacity={0.8}>
          <View style={[styles.actionBtnIcon, { backgroundColor: `${colors.danger}15` }]}>
            <Ionicons name="log-out-outline" size={rf(18)} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionBtnTitle, { color: colors.danger }]}>Log Out</Text>
            <Text style={styles.actionBtnSub}>See you next time</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>NutriLens v1.0 · Powered by Gemini AI</Text>
      <View style={{ height: rp(40) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  headerBg: {
    alignItems: 'center',
    paddingTop: TOP_INSET + rp(10),
    paddingBottom: sp.xl,
    paddingHorizontal: sp.lg,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: sp.md,
  },
  orb1: { position: 'absolute', top: -rs(60), left: -rs(60), width: rs(200), height: rs(200), borderRadius: rs(100), backgroundColor: colors.primaryGlow },
  orb2: { position: 'absolute', top: rs(20), right: -rs(80), width: rs(180), height: rs(180), borderRadius: rs(90), backgroundColor: colors.accentGlow },

  avatarSection: { position: 'relative', marginBottom: sp.md },
  avatarRing: { width: rs(96), height: rs(96), borderRadius: rs(48), borderWidth: 2, borderColor: colors.primaryLight, padding: 3, ...shadow.glow },
  avatar: { flex: 1, borderRadius: rs(44), backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: rf(34), fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: rp(4), right: rp(4), width: rp(16), height: rp(16), borderRadius: rp(8), backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.bg },

  name: { color: colors.text, fontSize: rf(24), fontWeight: '800', letterSpacing: -0.3, marginBottom: rp(4) },
  email: { color: colors.textMuted, fontSize: rf(13), marginBottom: sp.sm },
  goalBadge: { flexDirection: 'row', alignItems: 'center', gap: rp(6), borderRadius: rr.full, paddingHorizontal: rp(14), paddingVertical: rp(6), borderWidth: 1 },
  goalBadgeText: { fontSize: rf(13), fontWeight: '700' },

  section: { marginHorizontal: sp.lg, marginBottom: sp.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: rp(8), marginBottom: sp.sm },
  sectionTitle: { color: colors.text, fontSize: rf(15), fontWeight: '700' },

  macroTargetRow: { flexDirection: 'row', gap: sp.sm },
  macroTarget: { flex: 1, alignItems: 'center', borderRadius: rr.md, borderWidth: 1, paddingVertical: rp(12), paddingHorizontal: rp(4) },
  macroTargetVal: { fontSize: rf(18), fontWeight: '800' },
  macroTargetUnit: { color: colors.textMuted, fontSize: rf(9), marginTop: 1 },
  macroTargetLabel: { color: colors.textMuted, fontSize: rf(9), marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  statCard: { width: '31%', backgroundColor: colors.card, borderRadius: rr.md, padding: sp.sm, alignItems: 'center', gap: rp(5), borderWidth: 1, ...shadow.sm },
  statCardIcon: { width: rs(32), height: rs(32), borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  statCardLabel: { color: colors.textMuted, fontSize: rf(10), textTransform: 'uppercase', letterSpacing: 0.3 },
  statCardValue: { fontSize: rf(13), fontWeight: '700', textAlign: 'center' },

  dietBadge: { flexDirection: 'row', alignItems: 'center', gap: rp(8), backgroundColor: colors.successGlow, borderRadius: rr.md, padding: sp.md, borderWidth: 1, borderColor: `${colors.success}30` },
  dietText: { color: colors.successLight, fontWeight: '600', fontSize: rf(14) },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: sp.md, backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  actionBtnDanger: { borderColor: `${colors.danger}20` },
  actionBtnIcon: { width: rs(40), height: rs(40), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center' },
  actionBtnTitle: { color: colors.text, fontSize: rf(15), fontWeight: '600' },
  actionBtnSub: { color: colors.textMuted, fontSize: rf(12), marginTop: 1 },

  version: { color: colors.textFaint, fontSize: rf(11), textAlign: 'center', marginTop: sp.sm },
});
