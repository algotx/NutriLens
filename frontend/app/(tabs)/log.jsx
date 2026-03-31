import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, DeviceEventEmitter, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI, savedFoodsAPI } from '../../lib/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET } from '../../lib/responsive';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sunny',      color: colors.warning },
  { value: 'lunch',     label: 'Lunch',     icon: 'restaurant', color: colors.success },
  { value: 'dinner',    label: 'Dinner',    icon: 'moon',       color: colors.primary },
  { value: 'snack',     label: 'Snack',     icon: 'cafe',       color: colors.accent  },
];

const EMPTY_FORM = {
  meal_type: 'breakfast', food_name: '', serving_size: '',
  calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '',
};

function SavedFoodCard({ food, onLog, onDelete }) {
  return (
    <View style={styles.savedCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.savedName}>{food.food_name}</Text>
        <Text style={styles.savedMeta}>{food.serving_size ? `${food.serving_size} · ` : ''}{Math.round(food.calories)} kcal</Text>
        <View style={styles.savedMacroRow}>
          <Text style={styles.savedMacro}>P {Math.round(food.protein_g)}g</Text>
          <Text style={styles.savedMacro}>C {Math.round(food.carbs_g)}g</Text>
          <Text style={styles.savedMacro}>F {Math.round(food.fat_g)}g</Text>
        </View>
      </View>
      <View style={styles.savedActions}>
        <TouchableOpacity style={styles.savedLogBtn} onPress={() => onLog(food)} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={rf(18)} color={colors.primary} />
          <Text style={styles.savedLogText}>Log</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(food.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={rf(16)} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LogMeal() {
  const router = useRouter();
  const [tab, setTab] = useState('manual');
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedFoods, setSavedFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const loadSaved = useCallback(async () => {
    try { const { data } = await savedFoodsAPI.list(); setSavedFoods(data); } catch { /* silent */ }
  }, []);

  useFocusEffect(useCallback(() => { loadSaved(); }, []));

  const logMeal = async (payload) => {
    setLoading(true);
    try {
      await mealsAPI.log(payload);
      DeviceEventEmitter.emit('mealLogged');
      router.replace('/(tabs)');
      setTimeout(() => Alert.alert('✅ Logged!', `${payload.food_name} added to your diary.`), 300);
    } catch (e) {
      setError(e.response?.data?.error || `Failed to log meal (${e.response?.status || e.message})`);
      setLoading(false);
    }
  };

  const submitManual = async () => {
    setError('');
    if (!form.food_name || !form.calories) return setError('Food name and calories are required');
    await logMeal({
      ...form,
      calories:  parseFloat(form.calories)  || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g:   parseFloat(form.carbs_g)   || 0,
      fat_g:     parseFloat(form.fat_g)     || 0,
      fiber_g:   parseFloat(form.fiber_g)   || 0,
    });
  };

  const saveCurrentFood = async () => {
    if (!form.food_name || !form.calories) return setError('Fill in food name and calories first');
    setSaving(true);
    try {
      await savedFoodsAPI.save({
        food_name: form.food_name, serving_size: form.serving_size,
        calories: parseFloat(form.calories) || 0, protein_g: parseFloat(form.protein_g) || 0,
        carbs_g: parseFloat(form.carbs_g) || 0, fat_g: parseFloat(form.fat_g) || 0,
        fiber_g: parseFloat(form.fiber_g) || 0,
      });
      await loadSaved();
      Alert.alert('Saved!', `${form.food_name} added to your saved foods.`);
    } catch { Alert.alert('Error', 'Could not save food'); }
    finally { setSaving(false); }
  };

  const logSaved = async (food) => {
    await logMeal({
      meal_type: form.meal_type, food_name: food.food_name, serving_size: food.serving_size,
      calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g,
      fat_g: food.fat_g, fiber_g: food.fiber_g,
    });
  };

  const deleteSaved = (id) => {
    Alert.alert('Remove saved food?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await savedFoodsAPI.delete(id); loadSaved(); } },
    ]);
  };

  const filtered = savedFoods.filter(f => f.food_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.orb} />

        <View style={styles.header}>
          <Text style={styles.title}>Log a Meal</Text>
          <Text style={styles.sub}>Track what you eat</Text>
        </View>

        <View style={styles.typeGrid}>
          {MEAL_TYPES.map((t) => {
            const active = form.meal_type === t.value;
            return (
              <TouchableOpacity key={t.value}
                style={[styles.typeCard, active && { borderColor: t.color, backgroundColor: `${t.color}15` }]}
                onPress={() => set('meal_type')(t.value)} activeOpacity={0.8}
              >
                <View style={[styles.typeIconWrap, { backgroundColor: `${t.color}20` }]}>
                  <Ionicons name={t.icon} size={rf(20)} color={t.color} />
                </View>
                <Text style={[styles.typeLabel, active && { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'manual' && styles.tabBtnActive]} onPress={() => setTab('manual')} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={rf(15)} color={tab === 'manual' ? colors.primaryLight : colors.textMuted} />
            <Text style={[styles.tabBtnText, tab === 'manual' && styles.tabBtnTextActive]}>Manual Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'saved' && styles.tabBtnActive]} onPress={() => setTab('saved')} activeOpacity={0.8}>
            <Ionicons name="bookmark-outline" size={rf(15)} color={tab === 'saved' ? colors.primaryLight : colors.textMuted} />
            <Text style={[styles.tabBtnText, tab === 'saved' && styles.tabBtnTextActive]}>Saved Foods</Text>
            {savedFoods.length > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{savedFoods.length}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {tab === 'manual' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="fast-food-outline" size={rf(16)} color={colors.primaryLight} />
                <Text style={styles.cardTitle}>Food Details</Text>
              </View>
              <Input label="Food Name *" value={form.food_name} onChangeText={set('food_name')} placeholder="e.g. Grilled Chicken Breast" />
              <Input label="Serving Size" value={form.serving_size} onChangeText={set('serving_size')} placeholder="e.g. 200g, 1 cup" />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="nutrition-outline" size={rf(16)} color={colors.primaryLight} />
                <Text style={styles.cardTitle}>Nutrition Info</Text>
              </View>
              <Input label="Calories (kcal) *" value={form.calories} onChangeText={set('calories')} keyboardType="decimal-pad" placeholder="0" />
              <View style={styles.row}>
                <View style={styles.halfField}><Input label="Protein (g)" value={form.protein_g} onChangeText={set('protein_g')} keyboardType="decimal-pad" placeholder="0" /></View>
                <View style={styles.halfField}><Input label="Carbs (g)" value={form.carbs_g} onChangeText={set('carbs_g')} keyboardType="decimal-pad" placeholder="0" /></View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfField}><Input label="Fat (g)" value={form.fat_g} onChangeText={set('fat_g')} keyboardType="decimal-pad" placeholder="0" /></View>
                <View style={styles.halfField}><Input label="Fiber (g)" value={form.fiber_g} onChangeText={set('fiber_g')} keyboardType="decimal-pad" placeholder="0" /></View>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={rf(15)} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.saveForLaterBtn} onPress={saveCurrentFood} disabled={saving} activeOpacity={0.8}>
              <Ionicons name="bookmark-outline" size={rf(16)} color={colors.accent} />
              <Text style={styles.saveForLaterText}>{saving ? 'Saving...' : 'Save food for later'}</Text>
            </TouchableOpacity>

            <Button title="Add to Diary" onPress={submitManual} loading={loading}
              icon={<Ionicons name="checkmark-circle-outline" size={rf(18)} color="#fff" />} />
          </>
        )}

        {tab === 'saved' && (
          <>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={rf(16)} color={colors.textMuted} style={{ marginRight: rp(8) }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search saved foods..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔖</Text>
                <Text style={styles.emptyTitle}>{search ? 'No results' : 'No saved foods yet'}</Text>
                <Text style={styles.emptySub}>{search ? 'Try a different search' : 'Fill in the Manual Entry form and tap "Save food for later"'}</Text>
              </View>
            ) : (
              filtered.map((food) => (
                <SavedFoodCard key={food.id} food={food} onLog={logSaved} onDelete={deleteSaved} />
              ))
            )}
          </>
        )}

        <View style={{ height: rp(40) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: sp.lg, paddingTop: TOP_INSET + rp(10) },
  orb: { position: 'absolute', top: -rs(40), right: -rs(60), width: rs(200), height: rs(200), borderRadius: rs(100), backgroundColor: colors.primaryGlow },
  header: { marginBottom: sp.lg },
  title: { color: colors.text, fontSize: rf(28), fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: rf(14), marginTop: rp(4) },

  typeGrid: { flexDirection: 'row', gap: sp.sm, marginBottom: sp.lg },
  typeCard: { flex: 1, backgroundColor: colors.card, borderRadius: rr.md, borderWidth: 1.5, borderColor: colors.border, padding: sp.sm, alignItems: 'center', gap: rp(6) },
  typeIconWrap: { width: rs(36), height: rs(36), borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: colors.textMuted, fontSize: rf(11), fontWeight: '600' },

  tabRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: rr.md, padding: rp(4), marginBottom: sp.lg, borderWidth: 1, borderColor: colors.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rp(6), paddingVertical: rp(10), borderRadius: rr.sm },
  tabBtnActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: `${colors.primary}50` },
  tabBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: rf(13) },
  tabBtnTextActive: { color: colors.primaryLight },
  tabBadge: { backgroundColor: colors.primary, borderRadius: rp(10), paddingHorizontal: rp(6), paddingVertical: 1 },
  tabBadgeText: { color: '#fff', fontSize: rf(10), fontWeight: '700' },

  card: { backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, marginBottom: sp.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: rp(8), marginBottom: sp.md },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: rf(15) },
  row: { flexDirection: 'row', gap: sp.sm },
  halfField: { flex: 1 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: rp(6), backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: rr.sm, padding: sp.sm, marginBottom: sp.md },
  errorText: { color: colors.danger, fontSize: rf(13), flex: 1 },

  saveForLaterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rp(8), backgroundColor: `${colors.accent}15`, borderRadius: rr.md, paddingVertical: rp(12), marginBottom: sp.md, borderWidth: 1, borderColor: `${colors.accent}30` },
  saveForLaterText: { color: colors.accent, fontWeight: '600', fontSize: rf(14) },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: rr.md, paddingHorizontal: sp.md, paddingVertical: rp(10), marginBottom: sp.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: rf(14) },

  savedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: rr.md, padding: sp.md, marginBottom: sp.sm, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  savedName: { color: colors.text, fontWeight: '600', fontSize: rf(14) },
  savedMeta: { color: colors.textMuted, fontSize: rf(12), marginTop: 2 },
  savedMacroRow: { flexDirection: 'row', gap: sp.sm, marginTop: rp(4) },
  savedMacro: { color: colors.textMuted, fontSize: rf(11) },
  savedActions: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  savedLogBtn: { flexDirection: 'row', alignItems: 'center', gap: rp(4), backgroundColor: colors.primaryGlow, borderRadius: rr.full, paddingHorizontal: rp(10), paddingVertical: rp(6), borderWidth: 1, borderColor: `${colors.primary}40` },
  savedLogText: { color: colors.primaryLight, fontWeight: '700', fontSize: rf(12) },

  emptyState: { alignItems: 'center', paddingVertical: sp.xl * 2 },
  emptyEmoji: { fontSize: rf(44), marginBottom: sp.md },
  emptyTitle: { color: colors.text, fontSize: rf(16), fontWeight: '600', marginBottom: rp(4) },
  emptySub: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center', paddingHorizontal: sp.lg },
});
