import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI, profileAPI, insightsAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import MacroRing from '../../components/MacroRing';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET } from '../../lib/responsive';

function toDateStr(d) { return d.toISOString().split('T')[0]; }
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function formatDateLabel(dateStr) {
  const today = toDateStr(new Date());
  const yesterday = addDays(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function DateNav({ date, onPrev, onNext, onToday }) {
  const today = toDateStr(new Date());
  const isToday = date === today;
  return (
    <View style={styles.dateNav}>
      <TouchableOpacity style={styles.dateNavArrow} onPress={onPrev} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.dateNavCenter} onPress={isToday ? undefined : onToday} activeOpacity={isToday ? 1 : 0.7}>
        <Ionicons name="calendar-outline" size={rf(14)} color={colors.primaryLight} />
        <Text style={styles.dateNavLabel}>{formatDateLabel(date)}</Text>
        {!isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Back to today</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.dateNavArrow, isToday && styles.dateNavArrowDisabled]}
        onPress={isToday ? undefined : onNext}
        activeOpacity={isToday ? 1 : 0.7}
      >
        <Ionicons name="chevron-forward" size={rf(20)} color={isToday ? colors.textMuted : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function WeeklyChart({ data, goal }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.calories), goal, 1);
  return (
    <View style={styles.chartWrap}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Weekly Calories</Text>
        <Text style={styles.cardSub}>Last 7 days</Text>
      </View>
      <View style={styles.chartBars}>
        {data.map((d, i) => {
          const pct = d.calories / max;
          const isToday = i === data.length - 1;
          const goalPct = goal / max;
          return (
            <View key={i} style={styles.chartBarCol}>
              <Text style={styles.chartCalLabel}>{d.calories > 0 ? Math.round(d.calories / 100) * 100 : ''}</Text>
              <View style={styles.chartBarBg}>
                <View style={[styles.chartGoalLine, { bottom: `${goalPct * 100}%` }]} />
                <View style={[
                  styles.chartBar,
                  { height: `${Math.max(pct * 100, d.calories > 0 ? 4 : 0)}%` },
                  isToday && styles.chartBarToday,
                  !d.logged && styles.chartBarEmpty,
                ]} />
              </View>
              <Text style={[styles.chartDayLabel, isToday && styles.chartDayLabelToday]}>{d.day}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.chartLegendText}>Calories</Text>
        </View>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: `${colors.warning}80`, width: rp(16), height: 2, borderRadius: 1 }]} />
          <Text style={styles.chartLegendText}>Goal</Text>
        </View>
      </View>
    </View>
  );
}

const WATER_GOAL = 8;
function WaterTracker({ glasses, onAdd, onRemove }) {
  const pct = Math.min(glasses / WATER_GOAL, 1);
  return (
    <View style={styles.waterCard}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rp(8) }}>
          <Ionicons name="water" size={rf(16)} color={colors.accent} />
          <Text style={styles.cardTitle}>Water Intake</Text>
        </View>
        <Text style={styles.cardSub}>{glasses}/{WATER_GOAL} glasses</Text>
      </View>
      <View style={styles.waterGlasses}>
        {Array.from({ length: WATER_GOAL }).map((_, i) => (
          <TouchableOpacity key={i} onPress={() => i < glasses ? onRemove() : onAdd()} activeOpacity={0.7}>
            <Ionicons name={i < glasses ? 'water' : 'water-outline'} size={rf(28)} color={i < glasses ? colors.accent : colors.border} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: colors.accent }]}>
          <View style={[styles.barShine, { backgroundColor: colors.accentLight }]} />
        </View>
      </View>
      <Text style={styles.waterLabel}>
        {glasses === 0 ? 'Stay hydrated! 💧' : glasses >= WATER_GOAL ? '🎉 Goal reached!' : `${WATER_GOAL - glasses} more to go`}
      </Text>
    </View>
  );
}

function MacroBar({ label, consumed, goal, color, colorLight }) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  return (
    <View style={styles.macroBarWrap}>
      <View style={styles.macroBarHeader}>
        <View style={styles.macroBarLabelRow}>
          <View style={[styles.macroDot, { backgroundColor: color }]} />
          <Text style={styles.macroBarLabel}>{label}</Text>
        </View>
        <Text style={[styles.macroBarVal, { color }]}>
          {Math.round(consumed)}g <Text style={styles.macroBarGoal}>/ {goal}g</Text>
        </Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]}>
          <View style={[styles.barShine, { backgroundColor: colorLight }]} />
        </View>
      </View>
    </View>
  );
}

function MealCard({ meal, onDelete, isPast }) {
  const typeColors = { breakfast: colors.warning, lunch: colors.success, dinner: colors.primary, snack: colors.accent };
  const typeIcons = { breakfast: 'sunny', lunch: 'restaurant', dinner: 'moon', snack: 'cafe' };
  const c = typeColors[meal.meal_type] || colors.primary;
  const icon = typeIcons[meal.meal_type] || 'nutrition';
  return (
    <View style={styles.mealCard}>
      <View style={[styles.mealIconWrap, { backgroundColor: `${c}20` }]}>
        <Ionicons name={icon} size={rf(18)} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.mealName}>{meal.food_name}</Text>
        <Text style={styles.mealMeta}>{meal.serving_size ? `${meal.serving_size} · ` : ''}{meal.meal_type}</Text>
        <View style={styles.mealMacroRow}>
          <Text style={styles.mealCal}>{Math.round(meal.calories)} kcal</Text>
          <Text style={styles.mealMacroChip}>P {Math.round(meal.protein_g)}g</Text>
          <Text style={styles.mealMacroChip}>C {Math.round(meal.carbs_g)}g</Text>
          <Text style={styles.mealMacroChip}>F {Math.round(meal.fat_g)}g</Text>
        </View>
      </View>
      {!isPast && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={rf(16)} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <View style={[styles.statPill, { borderColor: `${color}40` }]}>
      <Ionicons name={icon} size={rf(14)} color={color} />
      <Text style={[styles.statPillVal, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

export default function Dashboard() {
  const todayStr = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 });
  const [meals, setMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState({ streak: 0, logged_today: false });
  const [weeklyData, setWeeklyData] = useState([]);
  const [water, setWater] = useState(0);
  const loadRef = useRef(null);
  const isToday = selectedDate === todayStr;

  const load = useCallback(async (date) => {
    try {
      const d = date || selectedDate;
      const [u, { data: p }, { data: s }, { data: m }] = await Promise.all([
        getUser(), profileAPI.get(), mealsAPI.getSummary(d), mealsAPI.getByDate(d),
      ]);
      setUser(u); setProfile(p); setSummary(s); setMeals(m);
      if (d === todayStr) {
        insightsAPI.streak().then(({ data }) => setStreak(data)).catch(() => {});
        insightsAPI.weekly().then(({ data }) => setWeeklyData(data)).catch(() => {});
      }
    } catch (e) { console.log('Dashboard load error:', e.message); }
  }, [selectedDate]);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(selectedDate); }, [selectedDate]);
  useFocusEffect(useCallback(() => { loadRef.current?.(); }, []));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('mealLogged', () => {
      setSelectedDate(todayStr);
      loadRef.current?.(todayStr);
    });
    return () => sub.remove();
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(selectedDate); setRefreshing(false); };
  const deleteMeal = (id) => {
    Alert.alert('Delete meal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await mealsAPI.delete(id); load(selectedDate); } },
    ]);
  };

  const goal = profile?.daily_calories || 2000;
  const remaining = Math.max(0, goal - summary.total_calories);
  const burned = Math.round(summary.total_calories);
  const pctDone = goal > 0 ? Math.min(summary.total_calories / goal, 1) : 0;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{isToday ? `${greeting} 👋` : '📅 Viewing past day'}</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'there'}</Text>
        </View>
        {isToday && streak.streak > 0 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakNum}>{streak.streak}</Text>
            <Text style={styles.streakLabel}>{streak.streak === 1 ? 'day' : 'days'}</Text>
          </View>
        )}
      </View>

      <DateNav
        date={selectedDate}
        onPrev={() => setSelectedDate(d => addDays(d, -1))}
        onNext={() => setSelectedDate(d => addDays(d, 1))}
        onToday={() => setSelectedDate(todayStr)}
      />

      {!isToday && (
        <View style={styles.pastBanner}>
          <Ionicons name="time-outline" size={rf(14)} color={colors.warning} />
          <Text style={styles.pastBannerText}>Viewing {formatDateLabel(selectedDate)} — read only</Text>
        </View>
      )}

      <View style={styles.calorieCard}>
        <View style={styles.calorieCardInner}>
          <MacroRing consumed={summary.total_calories} goal={goal} size={170} color={colors.primary} label="kcal" />
          <View style={styles.calorieStats}>
            <View style={styles.calorieStat}>
              <Text style={styles.calorieStatVal} numberOfLines={1} adjustsFontSizeToFit>{goal}</Text>
              <Text style={styles.calorieStatLabel}>Goal</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatVal, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>{burned}</Text>
              <Text style={styles.calorieStatLabel}>Eaten</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieStatVal, { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>{remaining}</Text>
              <Text style={styles.calorieStatLabel}>Left</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressBarWrap}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pctDone * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(pctDone * 100)}% of daily goal</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <StatPill icon="barbell-outline" label="Protein" value={`${Math.round(summary.total_protein)}g`} color={colors.protein} />
        <StatPill icon="leaf-outline" label="Carbs" value={`${Math.round(summary.total_carbs)}g`} color={colors.carbs} />
        <StatPill icon="water-outline" label="Fat" value={`${Math.round(summary.total_fat)}g`} color={colors.fat} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Macros</Text>
          <Text style={styles.cardSub}>Daily breakdown</Text>
        </View>
        <MacroBar label="Protein" consumed={summary.total_protein} goal={profile?.daily_protein_g || 0} color={colors.protein} colorLight={colors.proteinLight} />
        <MacroBar label="Carbs" consumed={summary.total_carbs} goal={profile?.daily_carbs_g || 0} color={colors.carbs} colorLight={colors.carbsLight} />
        <MacroBar label="Fat" consumed={summary.total_fat} goal={profile?.daily_fat_g || 0} color={colors.fat} colorLight={colors.fatLight} />
      </View>

      {isToday && weeklyData.length > 0 && (
        <View style={styles.card}>
          <WeeklyChart data={weeklyData} goal={profile?.daily_calories || 2000} />
        </View>
      )}

      {isToday && (
        <View style={styles.card}>
          <WaterTracker
            glasses={water}
            onAdd={() => setWater(w => Math.min(w + 1, WATER_GOAL))}
            onRemove={() => setWater(w => Math.max(w - 1, 0))}
          />
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{isToday ? "Today's Meals" : `${formatDateLabel(selectedDate)}'s Meals`}</Text>
          <Text style={styles.cardSub}>{meals.length} logged</Text>
        </View>
        {meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{isToday ? '🍽️' : '📭'}</Text>
            <Text style={styles.emptyTitle}>{isToday ? 'Nothing logged yet' : 'No meals logged'}</Text>
            <Text style={styles.emptySub}>{isToday ? 'Tap "Log Meal" or "Scan Food" to get started' : 'Nothing was logged on this day'}</Text>
          </View>
        ) : (
          meals.map((m) => <MealCard key={m.id} meal={m} isPast={!isToday} onDelete={() => deleteMeal(m.id)} />)
        )}
      </View>

      <View style={{ height: rp(32) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: rp(20) },
  orb1: { position: 'absolute', top: -rs(80), left: -rs(80), width: rs(260), height: rs(260), borderRadius: rs(130), backgroundColor: colors.primaryGlow },
  orb2: { position: 'absolute', top: rs(180), right: -rs(100), width: rs(220), height: rs(220), borderRadius: rs(110), backgroundColor: colors.accentGlow },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: sp.lg, paddingTop: TOP_INSET + rp(10), paddingBottom: sp.sm },
  greeting: { color: colors.textMuted, fontSize: rf(14), fontWeight: '500' },
  userName: { color: colors.text, fontSize: rf(26), fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },

  dateNav: { flexDirection: 'row', alignItems: 'center', marginHorizontal: sp.lg, marginBottom: sp.sm, backgroundColor: colors.card, borderRadius: rr.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  dateNavArrow: { padding: sp.md, paddingHorizontal: sp.lg },
  dateNavArrowDisabled: { opacity: 0.3 },
  dateNavCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rp(6), paddingVertical: sp.md },
  dateNavLabel: { color: colors.text, fontWeight: '700', fontSize: rf(15) },
  todayBadge: { backgroundColor: colors.primaryGlow, borderRadius: rr.full, paddingHorizontal: rp(8), paddingVertical: 2, borderWidth: 1, borderColor: `${colors.primary}40` },
  todayBadgeText: { color: colors.primaryLight, fontSize: rf(10), fontWeight: '600' },

  pastBanner: { flexDirection: 'row', alignItems: 'center', gap: rp(6), marginHorizontal: sp.lg, marginBottom: sp.sm, backgroundColor: `${colors.warning}15`, borderRadius: rr.md, paddingHorizontal: sp.md, paddingVertical: rp(8), borderWidth: 1, borderColor: `${colors.warning}30` },
  pastBannerText: { color: colors.warning, fontSize: rf(12), fontWeight: '500' },

  calorieCard: { marginHorizontal: sp.lg, marginBottom: sp.md, backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.borderGlow, ...shadow.lg },
  calorieCardInner: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginBottom: sp.md },
  calorieStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  calorieStat: { alignItems: 'center', flex: 1 },
  calorieStatVal: { color: colors.text, fontSize: rf(17), fontWeight: '800', letterSpacing: -0.3 },
  calorieStatLabel: { color: colors.textMuted, fontSize: rf(10), marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  calorieDivider: { width: 1, height: rp(32), backgroundColor: colors.border },

  progressBarWrap: { gap: rp(6) },
  progressBarBg: { height: rp(6), backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressLabel: { color: colors.textMuted, fontSize: rf(11), textAlign: 'right' },

  pillRow: { flexDirection: 'row', gap: sp.sm, marginHorizontal: sp.lg, marginBottom: sp.md },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: rp(5), backgroundColor: colors.card, borderRadius: rr.full, paddingHorizontal: rp(10), paddingVertical: rp(8), borderWidth: 1, justifyContent: 'center' },
  statPillVal: { fontSize: rf(13), fontWeight: '700' },
  statPillLabel: { color: colors.textMuted, fontSize: rf(11) },

  card: { marginHorizontal: sp.lg, marginBottom: sp.md, backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.md },
  cardTitle: { color: colors.text, fontSize: rf(16), fontWeight: '700' },
  cardSub: { color: colors.textMuted, fontSize: rf(12) },

  macroBarWrap: { marginBottom: sp.md },
  macroBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rp(8) },
  macroBarLabelRow: { flexDirection: 'row', alignItems: 'center', gap: rp(7) },
  macroDot: { width: rp(8), height: rp(8), borderRadius: 4 },
  macroBarLabel: { color: colors.textSecondary, fontSize: rf(13), fontWeight: '500' },
  macroBarVal: { fontSize: rf(13), fontWeight: '700' },
  macroBarGoal: { color: colors.textMuted, fontWeight: '400' },
  barBg: { height: rp(8), backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  barShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', opacity: 0.3, borderRadius: 4 },

  mealCard: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: rp(12), borderBottomWidth: 1, borderBottomColor: colors.border },
  mealIconWrap: { width: rs(42), height: rs(42), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  mealName: { color: colors.text, fontWeight: '700', fontSize: rf(14) },
  mealMeta: { color: colors.textMuted, fontSize: rf(11), marginTop: 1, textTransform: 'capitalize' },
  mealMacroRow: { flexDirection: 'row', alignItems: 'center', gap: rp(6), marginTop: rp(4) },
  mealCal: { color: colors.primaryLight, fontSize: rf(12), fontWeight: '700' },
  mealMacroChip: { color: colors.textMuted, fontSize: rf(11) },
  deleteBtn: { padding: rp(6) },

  emptyState: { alignItems: 'center', paddingVertical: sp.xl },
  emptyEmoji: { fontSize: rf(40), marginBottom: sp.sm },
  emptyTitle: { color: colors.text, fontSize: rf(16), fontWeight: '600', marginBottom: 4 },
  emptySub: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center' },

  streakChip: { flexDirection: 'row', alignItems: 'center', gap: rp(4), backgroundColor: colors.cardElevated, borderRadius: rr.full, paddingHorizontal: rp(12), paddingVertical: rp(6), borderWidth: 1, borderColor: `${colors.warning}40` },
  streakFire: { fontSize: rf(16) },
  streakNum: { color: colors.warning, fontWeight: '800', fontSize: rf(18) },
  streakLabel: { color: colors.textMuted, fontSize: rf(11) },

  chartWrap: { gap: 0 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: rs(120), gap: rp(6), marginBottom: sp.sm },
  chartBarCol: { flex: 1, alignItems: 'center', gap: rp(4) },
  chartCalLabel: { color: colors.textMuted, fontSize: rf(8), height: rp(12) },
  chartBarBg: { flex: 1, width: '100%', backgroundColor: colors.cardElevated, borderRadius: rp(6), overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  chartGoalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: `${colors.warning}60` },
  chartBar: { width: '100%', backgroundColor: `${colors.primary}80`, borderRadius: rp(6) },
  chartBarToday: { backgroundColor: colors.primary },
  chartBarEmpty: { backgroundColor: colors.border },
  chartDayLabel: { color: colors.textMuted, fontSize: rf(10), fontWeight: '500' },
  chartDayLabelToday: { color: colors.primaryLight, fontWeight: '700' },
  chartLegend: { flexDirection: 'row', gap: sp.md },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: rp(5) },
  chartLegendDot: { width: rp(8), height: rp(8), borderRadius: 4 },
  chartLegendText: { color: colors.textMuted, fontSize: rf(11) },

  waterCard: { gap: sp.sm },
  waterGlasses: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: sp.sm },
  waterLabel: { color: colors.textMuted, fontSize: rf(12), textAlign: 'center' },
});
