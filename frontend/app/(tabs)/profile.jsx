import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileAPI } from '../../lib/api';
import { getUser, removeToken, removeUser } from '../../lib/auth';
import { colors, spacing, radius, shadow } from '../../constants/theme';

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
        <Ionicons name={icon} size={16} color={color} />
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
  const activityLabels = {
    sedentary: 'Sedentary', lightly_active: 'Lightly Active',
    moderately_active: 'Moderately Active', very_active: 'Very Active', extra_active: 'Extra Active',
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const goalColor = goalColors[profile?.goal] || colors.primary;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      {/* Header bg orbs */}
      <View style={styles.headerBg}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        {/* Avatar */}
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
            <Ionicons name={goalIcons[profile.goal] || 'flag'} size={13} color={goalColor} />
            <Text style={[styles.goalBadgeText, { color: goalColor }]}>{goalLabels[profile.goal]}</Text>
          </View>
        )}
      </View>

      {/* Daily targets */}
      {profile && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={15} color={colors.warning} />
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

      {/* Stats grid */}
      {profile && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="body" size={15} color={colors.accent} />
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

      {/* Diet preference */}
      {profile?.dietary_preference && profile.dietary_preference !== 'none' && (
        <View style={styles.section}>
          <View style={[styles.dietBadge]}>
            <Ionicons name="leaf" size={16} color={colors.success} />
            <Text style={styles.dietText}>{profile.dietary_preference.charAt(0).toUpperCase() + profile.dietary_preference.slice(1)} diet</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/onboarding')} activeOpacity={0.8}>
          <View style={[styles.actionBtnIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionBtnTitle}>Update Goals & Stats</Text>
            <Text style={styles.actionBtnSub}>Recalculate your macros</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={logout} activeOpacity={0.8}>
          <View style={[styles.actionBtnIcon, { backgroundColor: `${colors.danger}15` }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionBtnTitle, { color: colors.danger }]}>Log Out</Text>
            <Text style={styles.actionBtnSub}>See you next time</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text style={styles.version}>NutriLens v1.0 · Powered by Gemini AI</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  headerBg: {
    alignItems: 'center', paddingTop: 70, paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg, overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  orb1: { position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primaryGlow },
  orb2: { position: 'absolute', top: 20, right: -80, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.accentGlow },

  avatarSection: { position: 'relative', marginBottom: spacing.md },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: colors.primaryLight,
    padding: 3, ...shadow.glow,
  },
  avatar: {
    flex: 1, borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 2.5, borderColor: colors.bg,
  },

  name: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  email: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  goalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  goalBadgeText: { fontSize: 13, fontWeight: '700' },

  section: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },

  macroTargetRow: { flexDirection: 'row', gap: spacing.sm },
  macroTarget: {
    flex: 1, alignItems: 'center', borderRadius: radius.md,
    borderWidth: 1, paddingVertical: 12, paddingHorizontal: 4,
  },
  macroTargetVal: { fontSize: 18, fontWeight: '800' },
  macroTargetUnit: { color: colors.textMuted, fontSize: 9, marginTop: 1 },
  macroTargetLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '31%', backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.sm,
    alignItems: 'center', gap: 5,
    borderWidth: 1, ...shadow.sm,
  },
  statCardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statCardLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  statCardValue: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  dietBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successGlow, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: `${colors.success}30` },
  dietText: { color: colors.successLight, fontWeight: '600', fontSize: 14 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  actionBtnDanger: { borderColor: `${colors.danger}20` },
  actionBtnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actionBtnSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },

  version: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
