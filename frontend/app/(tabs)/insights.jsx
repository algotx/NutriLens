import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { insightsAPI, mealsAPI } from '../../lib/api';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET } from '../../lib/responsive';

const TABS = ['Suggestions', 'Meal Plan', 'Weekly Report'];

// ── Smart Suggestions ─────────────────────────────────────────────────────────
function SuggestionsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await insightsAPI.suggestions();
      let suggestions = d.suggestions;
      if (typeof suggestions === 'string') {
        try { suggestions = JSON.parse(suggestions); } catch { suggestions = []; }
      }
      if (!Array.isArray(suggestions)) suggestions = [];
      setData({ ...d, suggestions });
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Could not load suggestions';
      Alert.alert('Could not load suggestions', msg);
    } finally { setLoading(false); }
  };

  // Don't auto-load on focus — user taps to avoid burning rate limit quota

  const logSuggestion = async (item) => {
    setLogging(item.name);
    try {
      await mealsAPI.log({
        meal_type: 'snack', food_name: item.name, serving_size: item.serving,
        calories: item.calories, protein_g: item.protein_g,
        carbs_g: item.carbs_g, fat_g: item.fat_g, fiber_g: 0,
      });
      DeviceEventEmitter.emit('mealLogged');
      Alert.alert('✅ Logged!', `${item.name} added to your diary.`);
      load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not log meal');
    }
    finally { setLogging(null); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Analyzing your day...</Text></View>;

  if (!data) return (
    <View style={styles.center}>
      <Ionicons name="bulb-outline" size={rf(48)} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>Smart Suggestions</Text>
      <Text style={styles.emptySub}>AI will suggest foods that fit your remaining macros for today</Text>
      <TouchableOpacity style={styles.refreshBtn} onPress={load}><Text style={styles.refreshBtnText}>Load Suggestions</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.remainingCard}>
        <Text style={styles.remainingTitle}>Remaining Today</Text>
        <Text style={styles.remainingCal}>{data.remaining_calories} <Text style={styles.remainingUnit}>kcal</Text></Text>
        <View style={styles.remainingMacros}>
          <View style={styles.remainingMacro}><Text style={[styles.remainingMacroVal, { color: colors.protein }]}>{data.remaining_protein_g}g</Text><Text style={styles.remainingMacroLabel}>Protein</Text></View>
          <View style={styles.remainingMacro}><Text style={[styles.remainingMacroVal, { color: colors.carbs }]}>{data.remaining_carbs_g}g</Text><Text style={styles.remainingMacroLabel}>Carbs</Text></View>
          <View style={styles.remainingMacro}><Text style={[styles.remainingMacroVal, { color: colors.fat }]}>{data.remaining_fat_g}g</Text><Text style={styles.remainingMacroLabel}>Fat</Text></View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={rf(15)} color={colors.primaryLight} />
        <Text style={styles.sectionTitle}>AI Suggestions</Text>
        <TouchableOpacity onPress={load} style={styles.reloadBtn}><Ionicons name="refresh" size={rf(14)} color={colors.textMuted} /></TouchableOpacity>
      </View>

      {data.suggestions?.map((item, i) => (
        <View key={i} style={styles.suggestionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.suggestionName}>{item.name}</Text>
            <Text style={styles.suggestionServing}>{item.serving}</Text>
            <Text style={styles.suggestionWhy}>{item.why}</Text>
            <View style={styles.suggestionMacros}>
              <Text style={styles.suggestionCal}>{Math.round(item.calories)} kcal</Text>
              <Text style={styles.suggestionMacro}>P {Math.round(item.protein_g)}g</Text>
              <Text style={styles.suggestionMacro}>C {Math.round(item.carbs_g)}g</Text>
              <Text style={styles.suggestionMacro}>F {Math.round(item.fat_g)}g</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.logBtn, logging === item.name && styles.logBtnDisabled]}
            onPress={() => logSuggestion(item)}
            disabled={logging === item.name}
            activeOpacity={0.8}
          >
            {logging === item.name
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="add" size={rf(20)} color="#fff" />}
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Meal Plan ─────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_COLORS = { breakfast: colors.warning, lunch: colors.success, dinner: colors.primary, snack: colors.accent };

function MealPlanTab() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await insightsAPI.mealPlan();
      // data is already parsed by axios — could be array or string depending on Content-Type
      let parsed = data;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = null; }
      }
      // Handle case where it's wrapped in an object
      if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
        const keys = Object.keys(parsed);
        if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
          parsed = parsed[keys[0]];
        }
      }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Could not parse meal plan — try again');
      }
      setPlan(parsed);
      setActiveDay(0);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message || 'Could not generate meal plan');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Generating your personalized meal plan...</Text>
      <Text style={styles.loadingSubText}>This takes about 10 seconds</Text>
    </View>
  );

  if (!plan) return (
    <View style={styles.center}>
      <Ionicons name="calendar-outline" size={rf(56)} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No meal plan yet</Text>
      <Text style={styles.emptySub}>AI will build a full week of meals tailored to your macros and goals</Text>
      <TouchableOpacity style={styles.generateBtn} onPress={generate} activeOpacity={0.8}>
        <Ionicons name="sparkles" size={rf(16)} color="#fff" />
        <Text style={styles.generateBtnText}>Generate My Meal Plan</Text>
      </TouchableOpacity>
    </View>
  );

  const dayData = plan[activeDay];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
        {plan.map((d, i) => (
          <TouchableOpacity key={i} style={[styles.dayChip, i === activeDay && styles.dayChipActive]} onPress={() => setActiveDay(i)} activeOpacity={0.8}>
            <Text style={[styles.dayChipText, i === activeDay && styles.dayChipTextActive]}>{d.day?.substring(0, 3)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{dayData?.day}</Text>
        <TouchableOpacity style={styles.regenBtn} onPress={generate} activeOpacity={0.8}>
          <Ionicons name="refresh" size={rf(13)} color={colors.textMuted} />
          <Text style={styles.regenBtnText}>Regenerate</Text>
        </TouchableOpacity>
      </View>

      {dayData?.meals?.map((meal, i) => {
        const c = MEAL_COLORS[meal.type] || colors.primary;
        return (
          <View key={i} style={styles.mealPlanCard}>
            <View style={[styles.mealPlanType, { backgroundColor: `${c}20` }]}>
              <Text style={[styles.mealPlanTypeText, { color: c }]}>{meal.type}</Text>
            </View>
            <Text style={styles.mealPlanName}>{meal.name}</Text>
            {meal.description && <Text style={styles.mealPlanDesc}>{meal.description}</Text>}
            <View style={styles.mealPlanMacros}>
              <Text style={styles.mealPlanCal}>{Math.round(meal.calories)} kcal</Text>
              <Text style={styles.mealPlanMacro}>P {Math.round(meal.protein_g)}g</Text>
              <Text style={styles.mealPlanMacro}>C {Math.round(meal.carbs_g)}g</Text>
              <Text style={styles.mealPlanMacro}>F {Math.round(meal.fat_g)}g</Text>
            </View>
          </View>
        );
      })}

      {/* Day totals */}
      {dayData?.meals && (
        <View style={styles.dayTotals}>
          <Text style={styles.dayTotalsTitle}>Day Total</Text>
          <View style={styles.dayTotalsMacros}>
            {[
              { label: 'Calories', val: Math.round(dayData.meals.reduce((s, m) => s + (m.calories || 0), 0)), color: colors.primary },
              { label: 'Protein', val: Math.round(dayData.meals.reduce((s, m) => s + (m.protein_g || 0), 0)) + 'g', color: colors.protein },
              { label: 'Carbs', val: Math.round(dayData.meals.reduce((s, m) => s + (m.carbs_g || 0), 0)) + 'g', color: colors.carbs },
              { label: 'Fat', val: Math.round(dayData.meals.reduce((s, m) => s + (m.fat_g || 0), 0)) + 'g', color: colors.fat },
            ].map((t) => (
              <View key={t.label} style={styles.dayTotal}>
                <Text style={[styles.dayTotalVal, { color: t.color }]}>{t.val}</Text>
                <Text style={styles.dayTotalLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Weekly Report ─────────────────────────────────────────────────────────────
function WeeklyReportTab() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await insightsAPI.weeklyReport();
      setReport(data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not load report');
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Analyzing your week...</Text></View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Ionicons name="analytics" size={rf(20)} color={colors.primaryLight} />
          <Text style={styles.reportTitle}>Weekly Analysis</Text>
          <TouchableOpacity onPress={load} style={styles.reloadBtn}><Ionicons name="refresh" size={rf(14)} color={colors.textMuted} /></TouchableOpacity>
        </View>
        {report?.days_logged !== undefined && (
          <View style={styles.daysLoggedRow}>
            <Text style={styles.daysLoggedNum}>{report.days_logged}</Text>
            <Text style={styles.daysLoggedLabel}>/7 days logged this week</Text>
          </View>
        )}
        <Text style={styles.reportText}>{report?.report || 'Log at least 2 days of meals to get your weekly report.'}</Text>
      </View>
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.orb} />
        <Text style={styles.title}>AI Insights</Text>
        <Text style={styles.sub}>Powered by Gemini</Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={i} style={[styles.tab, i === activeTab && styles.tabActive]} onPress={() => setActiveTab(i)} activeOpacity={0.8}>
            <Text style={[styles.tabText, i === activeTab && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 0 && <SuggestionsTab />}
        {activeTab === 1 && <MealPlanTab />}
        {activeTab === 2 && <WeeklyReportTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: TOP_INSET + rp(10), paddingBottom: sp.sm, paddingHorizontal: sp.lg, overflow: 'hidden' },
  orb: { position: 'absolute', top: -rs(40), right: -rs(40), width: rs(160), height: rs(160), borderRadius: rs(80), backgroundColor: colors.primaryGlow },
  title: { color: colors.text, fontSize: rf(26), fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: rf(13), marginTop: rp(2) },

  tabBar: { flexDirection: 'row', marginHorizontal: sp.lg, marginBottom: sp.sm, backgroundColor: colors.card, borderRadius: rr.md, padding: rp(4), borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: rp(9), alignItems: 'center', borderRadius: rr.sm },
  tabActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: `${colors.primary}50` },
  tabText: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600' },
  tabTextActive: { color: colors.primaryLight },

  tabContent: { padding: sp.lg, paddingBottom: rp(40) },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: sp.xl, gap: sp.md },
  loadingText: { color: colors.text, fontSize: rf(15), fontWeight: '600', textAlign: 'center' },
  loadingSubText: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center' },
  emptyTitle: { color: colors.text, fontSize: rf(18), fontWeight: '700', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center', lineHeight: rf(20) },

  refreshBtn: { backgroundColor: colors.primaryGlow, borderRadius: rr.lg, paddingHorizontal: sp.lg, paddingVertical: rp(12), borderWidth: 1, borderColor: `${colors.primary}40` },
  refreshBtnText: { color: colors.primaryLight, fontWeight: '700', fontSize: rf(14) },

  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: rp(8), backgroundColor: colors.primary, borderRadius: rr.lg, paddingHorizontal: sp.xl, paddingVertical: rp(14), ...shadow.glow },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(15) },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: rp(8), marginBottom: sp.md },
  sectionTitle: { color: colors.text, fontSize: rf(15), fontWeight: '700', flex: 1 },
  reloadBtn: { padding: rp(6) },

  remainingCard: { backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, marginBottom: sp.lg, borderWidth: 1, borderColor: colors.borderGlow, alignItems: 'center', ...shadow.lg },
  remainingTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: rp(4) },
  remainingCal: { color: colors.primaryLight, fontSize: rf(42), fontWeight: '800', letterSpacing: -1 },
  remainingUnit: { fontSize: rf(18), fontWeight: '500' },
  remainingMacros: { flexDirection: 'row', gap: sp.xl, marginTop: sp.sm },
  remainingMacro: { alignItems: 'center' },
  remainingMacroVal: { fontSize: rf(18), fontWeight: '700' },
  remainingMacroLabel: { color: colors.textMuted, fontSize: rf(11), marginTop: 2 },

  suggestionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border, gap: sp.md, ...shadow.sm },
  suggestionName: { color: colors.text, fontWeight: '700', fontSize: rf(14) },
  suggestionServing: { color: colors.textMuted, fontSize: rf(12), marginTop: 2 },
  suggestionWhy: { color: colors.primaryLight, fontSize: rf(11), marginTop: rp(4), fontStyle: 'italic' },
  suggestionMacros: { flexDirection: 'row', gap: rp(8), marginTop: rp(6), alignItems: 'center' },
  suggestionCal: { color: colors.primaryLight, fontSize: rf(12), fontWeight: '700' },
  suggestionMacro: { color: colors.textMuted, fontSize: rf(11) },
  logBtn: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.glow },
  logBtnDisabled: { backgroundColor: colors.cardElevated },

  dayScroll: { marginBottom: sp.md },
  dayScrollContent: { gap: rp(8), paddingRight: sp.sm },
  dayChip: { paddingHorizontal: rp(16), paddingVertical: rp(8), borderRadius: rr.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.primaryGlow, borderColor: `${colors.primary}60` },
  dayChipText: { color: colors.textMuted, fontWeight: '600', fontSize: rf(13) },
  dayChipTextActive: { color: colors.primaryLight },

  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.md },
  dayTitle: { color: colors.text, fontSize: rf(20), fontWeight: '800' },
  regenBtn: { flexDirection: 'row', alignItems: 'center', gap: rp(4) },
  regenBtnText: { color: colors.textMuted, fontSize: rf(12) },

  mealPlanCard: { backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border },
  mealPlanType: { alignSelf: 'flex-start', borderRadius: rr.full, paddingHorizontal: rp(10), paddingVertical: rp(3), marginBottom: rp(6) },
  mealPlanTypeText: { fontSize: rf(11), fontWeight: '700', textTransform: 'capitalize' },
  mealPlanName: { color: colors.text, fontWeight: '700', fontSize: rf(15), marginBottom: rp(4) },
  mealPlanDesc: { color: colors.textMuted, fontSize: rf(12), marginBottom: rp(6) },
  mealPlanMacros: { flexDirection: 'row', gap: rp(10), alignItems: 'center' },
  mealPlanCal: { color: colors.primaryLight, fontSize: rf(13), fontWeight: '700' },
  mealPlanMacro: { color: colors.textMuted, fontSize: rf(12) },

  dayTotals: { backgroundColor: colors.cardElevated, borderRadius: rr.lg, padding: sp.md, marginTop: sp.sm, borderWidth: 1, borderColor: colors.borderGlow },
  dayTotalsTitle: { color: colors.textMuted, fontSize: rf(11), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: sp.sm },
  dayTotalsMacros: { flexDirection: 'row', justifyContent: 'space-around' },
  dayTotal: { alignItems: 'center' },
  dayTotalVal: { fontSize: rf(18), fontWeight: '800' },
  dayTotalLabel: { color: colors.textMuted, fontSize: rf(10), marginTop: 2 },

  reportCard: { backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: rp(8), marginBottom: sp.md },
  reportTitle: { color: colors.text, fontSize: rf(16), fontWeight: '700', flex: 1 },
  daysLoggedRow: { flexDirection: 'row', alignItems: 'baseline', gap: rp(6), marginBottom: sp.md },
  daysLoggedNum: { color: colors.primaryLight, fontSize: rf(36), fontWeight: '800' },
  daysLoggedLabel: { color: colors.textMuted, fontSize: rf(14) },
  reportText: { color: colors.textSecondary, fontSize: rf(14), lineHeight: rf(14) * 1.6 },
});
