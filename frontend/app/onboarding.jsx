import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { profileAPI } from '../lib/api';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors } from '../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET, MAX_WIDTH } from '../lib/responsive';

const STEPS = ['About You', 'Body Stats', 'Your Goal', 'Diet Preference'];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', desc: '1-3 days/week' },
  { value: 'moderately_active', label: 'Moderately Active', desc: '3-5 days/week' },
  { value: 'very_active', label: 'Very Active', desc: '6-7 days/week' },
  { value: 'extra_active', label: 'Extra Active', desc: 'Physical job or 2x/day' },
];

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: '🔥 Lose Weight', desc: 'Burn fat, reduce calories' },
  { value: 'maintain', label: '⚖️ Maintain Weight', desc: 'Stay at current weight' },
  { value: 'gain_muscle', label: '💪 Build Muscle', desc: 'Lean bulk with protein focus' },
  { value: 'gain_weight', label: '📈 Gain Weight', desc: 'Increase overall mass' },
];

const DIET_OPTIONS = [
  { value: 'none', label: '🍽️ No Preference' },
  { value: 'vegetarian', label: '🥗 Vegetarian' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'keto', label: '🥑 Keto' },
  { value: 'paleo', label: '🍖 Paleo' },
];

const WEEKLY_GOALS = [
  { value: '0.25', label: '0.5 lbs/week', desc: 'Slow & steady' },
  { value: '0.5', label: '1 lb/week', desc: 'Recommended' },
  { value: '1.0', label: '2 lbs/week', desc: 'Aggressive' },
];

function OptionCard({ label, desc, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.optCard, selected && styles.optCardSelected]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.optLabel, selected && styles.optLabelSelected]}>{label}</Text>
      {desc && <Text style={styles.optDesc}>{desc}</Text>}
    </TouchableOpacity>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    age: '', gender: 'male', height_in: '', weight_lbs: '',
    activity_level: 'moderately_active', goal: 'lose_weight',
    goal_weight_lbs: '', weekly_goal_kg: '0.5', dietary_preference: 'none',
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    setError('');
    if (step === 0 && (!form.age || !form.gender)) return setError('Please complete all fields');
    if (step === 1 && (!form.height_in || !form.weight_lbs)) return setError('Please enter height and weight');
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setLoading(true);
    try {
      const heightCm = parseFloat(form.height_in) * 2.54;
      const weightKg = parseFloat(form.weight_lbs) * 0.453592;
      const goalWeightKg = form.goal_weight_lbs
        ? parseFloat(form.goal_weight_lbs) * 0.453592
        : weightKg;
      await profileAPI.update({
        ...form,
        age: parseInt(form.age),
        height_cm: Math.round(heightCm * 10) / 10,
        weight_kg: Math.round(weightKg * 10) / 10,
        goal_weight_kg: Math.round(goalWeightKg * 10) / 10,
        weekly_goal_kg: parseFloat(form.weekly_goal_kg),
      });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
          <Text style={styles.title}>{STEPS[step]}</Text>

          {step === 0 && (
            <View>
              <Input label="Age" value={form.age} onChangeText={set('age')} keyboardType="numeric" placeholder="25" />
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.row}>
                {['male', 'female'].map((g) => (
                  <OptionCard key={g} label={g === 'male' ? '♂ Male' : '♀ Female'}
                    selected={form.gender === g} onPress={() => set('gender')(g)} />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Activity Level</Text>
              {ACTIVITY_OPTIONS.map((o) => (
                <OptionCard key={o.value} label={o.label} desc={o.desc}
                  selected={form.activity_level === o.value} onPress={() => set('activity_level')(o.value)} />
              ))}
            </View>
          )}

          {step === 1 && (
            <View>
              <Input label="Height (inches)" value={form.height_in} onChangeText={set('height_in')}
                keyboardType="decimal-pad" placeholder="70" />
              <Input label="Current Weight (lbs)" value={form.weight_lbs} onChangeText={set('weight_lbs')}
                keyboardType="decimal-pad" placeholder="165" />
              <Input label="Goal Weight (lbs) — optional" value={form.goal_weight_lbs} onChangeText={set('goal_weight_lbs')}
                keyboardType="decimal-pad" placeholder="155" />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.fieldLabel}>What's your goal?</Text>
              {GOAL_OPTIONS.map((o) => (
                <OptionCard key={o.value} label={o.label} desc={o.desc}
                  selected={form.goal === o.value} onPress={() => set('goal')(o.value)} />
              ))}
              {form.goal !== 'maintain' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: sp.md }]}>Weekly pace</Text>
                  {WEEKLY_GOALS.map((o) => (
                    <OptionCard key={o.value} label={o.label} desc={o.desc}
                      selected={form.weekly_goal_kg === o.value} onPress={() => set('weekly_goal_kg')(o.value)} />
                  ))}
                </>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.fieldLabel}>Dietary preference</Text>
              {DIET_OPTIONS.map((o) => (
                <OptionCard key={o.value} label={o.label}
                  selected={form.dietary_preference === o.value} onPress={() => set('dietary_preference')(o.value)} />
              ))}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.btnRow}>
            {step > 0 && (
              <Button title="Back" variant="outline" onPress={() => setStep(step - 1)}
                style={{ flex: 1, marginRight: sp.sm }} />
            )}
            <Button title={step === STEPS.length - 1 ? 'Calculate My Macros' : 'Next'}
              onPress={next} loading={loading} style={{ flex: 1 }} />
          </View>
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
    paddingTop: TOP_INSET + rp(10),
    paddingBottom: rp(40),
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: sp.lg,
  },
  progressRow: { flexDirection: 'row', gap: rp(8), marginBottom: sp.sm },
  progressDot: { flex: 1, height: rp(4), borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  stepLabel: { color: colors.textMuted, fontSize: rf(13), marginBottom: sp.xs },
  title: { color: colors.text, fontSize: rf(26), fontWeight: '700', marginBottom: sp.lg },
  fieldLabel: { color: colors.textMuted, fontSize: rf(13), marginBottom: sp.sm },
  row: { flexDirection: 'row', gap: sp.sm, marginBottom: sp.md },
  optCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: rr.md,
    borderWidth: 1.5, borderColor: colors.border, padding: sp.md, marginBottom: sp.sm,
  },
  optCardSelected: { borderColor: colors.primary, backgroundColor: '#1e1b4b' },
  optLabel: { color: colors.text, fontWeight: '600', fontSize: rf(14) },
  optLabelSelected: { color: colors.primaryLight },
  optDesc: { color: colors.textMuted, fontSize: rf(12), marginTop: 2 },
  error: { color: colors.danger, fontSize: rf(13), textAlign: 'center', marginVertical: sp.sm },
  btnRow: { flexDirection: 'row', marginTop: sp.lg },
});
