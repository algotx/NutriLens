import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI, savedFoodsAPI } from '../../lib/api';
import Button from '../../components/Button';
import { colors, spacing, radius, shadow } from '../../constants/theme';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sunny', color: colors.warning },
  { value: 'lunch', label: 'Lunch', icon: 'restaurant', color: colors.success },
  { value: 'dinner', label: 'Dinner', icon: 'moon', color: colors.primary },
  { value: 'snack', label: 'Snack', icon: 'cafe', color: colors.accent },
];

function MacroChip({ label, value, unit, color }) {
  return (
    <View style={[styles.macroChip, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
      <Text style={[styles.macroChipVal, { color }]}>{Math.round(value)}</Text>
      <Text style={styles.macroChipUnit}>{unit}</Text>
      <Text style={styles.macroChipLabel}>{label}</Text>
    </View>
  );
}

export default function CameraScreen() {
  const router = useRouter();
  const [mode, setMode] = useState('photo'); // 'photo' | 'barcode'
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanLock = useRef(false); // prevents duplicate rapid-fire scans

  const pickImage = async (fromCamera) => {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access in your device settings.');
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.4, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.4, mediaTypes: ['images'], base64: false });
    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null);
      analyzeImage(res.assets[0]);
    }
  };

  const analyzeImage = async (img) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: img.uri, type: img.mimeType || 'image/jpeg', name: 'food.jpg' });
      console.log('Sending image to backend, uri:', img.uri, 'size:', img.fileSize);
      const { data } = await mealsAPI.analyzePhoto(formData);
      console.log('Analyze response:', JSON.stringify(data).substring(0, 200));
      setResult(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (e) {
      console.log('Analyze error:', e.message, e.response?.status, JSON.stringify(e.response?.data));
      Alert.alert('Analysis failed', e.response?.data?.error || e.message || 'Could not analyze image. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBarcodeScan = async (scanResult) => {
    if (scanned || scanLock.current) return;
    const barcode = scanResult.data;
    if (!barcode) return;
    scanLock.current = true; // hard lock — prevents any further calls
    setScanned(true);
    setAnalyzing(true);
    console.log('Barcode scanned:', barcode);
    try {
      const { data } = await mealsAPI.lookupBarcode(barcode);
      console.log('Barcode result:', JSON.stringify(data).substring(0, 100));
      setResult(data);
      setMode('photo');
    } catch (e) {
      console.log('Barcode error:', e.message, e.response?.status, JSON.stringify(e.response?.data));
      const msg = e.response?.data?.error || 'Could not find product. Try again.';
      Alert.alert('Not found', msg);
    } finally {
      setAnalyzing(false);
      setScanned(false);
      scanLock.current = false;
    }
  };

  const logMeal = async () => {
    if (!result) return;
    setLogging(true);
    try {
      await mealsAPI.log({
        meal_type: mealType,
        food_name: result.food_name,
        serving_size: result.serving_size,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        fiber_g: result.fiber_g || 0,
      });
      DeviceEventEmitter.emit('mealLogged');
      router.replace('/(tabs)');
      setTimeout(() => Alert.alert('✅ Logged!', `${result.food_name} added to your diary.`), 300);
    } catch {
      Alert.alert('Error', 'Failed to log meal');
    } finally {
      setLogging(false);
    }
  };

  const saveFood = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await savedFoodsAPI.save({
        food_name: result.food_name,
        serving_size: result.serving_size,
        calories: result.calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        fiber_g: result.fiber_g || 0,
      });
      Alert.alert('Saved!', `${result.food_name} added to your saved foods.`);
    } catch {
      Alert.alert('Error', 'Could not save food');
    } finally {
      setSaving(false);
    }
  };

  // Barcode scanner view
  if (mode === 'barcode') {
    if (!cameraPermission?.granted) {
      return (
        <View style={styles.permissionScreen}>
          <Ionicons name="barcode-outline" size={64} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>Required to scan barcodes</Text>
          <Button title="Grant Permission" onPress={requestCameraPermission} style={{ marginTop: spacing.lg, paddingHorizontal: spacing.xl }} />
          <TouchableOpacity onPress={() => setMode('photo')} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        />

        {/* Overlay */}
        <View style={styles.scanOverlay}>
          <View style={styles.scanTopBar}>
            <TouchableOpacity style={styles.scanBackBtn} onPress={() => { setMode('photo'); setScanned(false); }}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scanTitle}>Scan Barcode</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
            {analyzing && (
              <View style={styles.scanLoading}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.scanLoadingText}>Looking up product...</Text>
              </View>
            )}
          </View>

          <Text style={styles.scanHint}>Point camera at a product barcode</Text>

          {scanned && !analyzing && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Photo mode
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.orb} />

      <View style={styles.header}>
        <Text style={styles.title}>Scan Food</Text>
        <Text style={styles.sub}>AI photo analysis or barcode lookup</Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'photo' && styles.modeBtnActive]}
          onPress={() => setMode('photo')} activeOpacity={0.8}
        >
          <Ionicons name="camera" size={16} color={mode === 'photo' ? colors.primaryLight : colors.textMuted} />
          <Text style={[styles.modeBtnText, mode === 'photo' && styles.modeBtnTextActive]}>AI Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'barcode' && styles.modeBtnActive]}
          onPress={() => { setMode('barcode'); setScanned(false); setResult(null); }} activeOpacity={0.8}
        >
          <Ionicons name="barcode-outline" size={16} color={mode === 'barcode' ? colors.primaryLight : colors.textMuted} />
          <Text style={[styles.modeBtnText, mode === 'barcode' && styles.modeBtnTextActive]}>Barcode</Text>
        </TouchableOpacity>
      </View>

      {/* Image area */}
      {image ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: image.uri }} style={styles.image} resizeMode="cover" />
          {analyzing && (
            <View style={styles.overlay}>
              <View style={styles.overlayCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.overlayTitle}>Analyzing with AI</Text>
                <Text style={styles.overlaySub}>Detecting food & calculating macros...</Text>
              </View>
            </View>
          )}
          {!analyzing && (
            <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImage(null); setResult(null); }}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.placeholderInner}>
            <Ionicons name="camera-outline" size={52} color={colors.textMuted} />
            <Text style={styles.placeholderTitle}>No photo yet</Text>
            <Text style={styles.placeholderSub}>Take or upload a photo of your food</Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)} activeOpacity={0.8}>
          <View style={styles.actionBtnIcon}>
            <Ionicons name="camera" size={22} color={colors.primary} />
          </View>
          <Text style={styles.actionBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(false)} activeOpacity={0.8}>
          <View style={styles.actionBtnIcon}>
            <Ionicons name="images" size={22} color={colors.accent} />
          </View>
          <Text style={styles.actionBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {result && !analyzing && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleWrap}>
              <Text style={styles.resultTitle}>{result.food_name}</Text>
              <Text style={styles.resultServing}>{result.serving_size}</Text>
            </View>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={11} color={colors.primaryLight} />
              <Text style={styles.aiTagText}>AI</Text>
            </View>
          </View>

          <View style={styles.macroGrid}>
            <MacroChip label="Calories" value={result.calories} unit="kcal" color={colors.primary} />
            <MacroChip label="Protein" value={result.protein_g} unit="g" color={colors.protein} />
            <MacroChip label="Carbs" value={result.carbs_g} unit="g" color={colors.carbs} />
            <MacroChip label="Fat" value={result.fat_g} unit="g" color={colors.fat} />
          </View>

          {result.items?.length > 0 && (
            <View style={styles.itemsWrap}>
              <Text style={styles.itemsTitle}>Detected items</Text>
              {result.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCal}>{Math.round(item.calories)} kcal</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.mealTypeLabel}>Log as</Text>
          <View style={styles.typeRow}>
            {MEAL_TYPES.map((t) => {
              const active = mealType === t.value;
              return (
                <TouchableOpacity key={t.value}
                  style={[styles.typeChip, active && { borderColor: t.color, backgroundColor: `${t.color}15` }]}
                  onPress={() => setMealType(t.value)} activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={13} color={active ? t.color : colors.textMuted} />
                  <Text style={[styles.typeChipText, active && { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveFood} disabled={saving} activeOpacity={0.8}>
              <Ionicons name="bookmark-outline" size={15} color={colors.accent} />
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save food for later'}</Text>
            </TouchableOpacity>

          <Button title="Add to Diary" onPress={logMeal} loading={logging}
            icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />} />
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 60 },
  orb: { position: 'absolute', top: -40, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accentGlow },

  header: { marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 4 },

  modeToggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.sm },
  modeBtnActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: `${colors.primary}50` },
  modeBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  modeBtnTextActive: { color: colors.primaryLight },

  imageWrap: { borderRadius: radius.lg, overflow: 'hidden', height: 260, marginBottom: spacing.md, ...shadow.md },
  image: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,11,20,0.85)', justifyContent: 'center', alignItems: 'center' },
  overlayCard: { alignItems: 'center', gap: spacing.sm },
  overlayTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  overlaySub: { color: colors.textMuted, fontSize: 13 },
  retakeBtn: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  retakeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  placeholder: { height: 220, backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  placeholderInner: { alignItems: 'center', gap: spacing.sm },
  placeholderTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  placeholderSub: { color: colors.textMuted, fontSize: 13 },

  btnRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  actionBtn: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  actionBtnIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },

  resultCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.md },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  resultTitleWrap: { flex: 1 },
  resultTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  resultServing: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryGlow, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.primary}40` },
  aiTagText: { color: colors.primaryLight, fontSize: 11, fontWeight: '700' },

  macroGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  macroChip: { flex: 1, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm },
  macroChipVal: { fontSize: 18, fontWeight: '800' },
  macroChipUnit: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  macroChipLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },

  itemsWrap: { marginBottom: spacing.md },
  itemsTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  itemName: { color: colors.text, fontSize: 13, flex: 1 },
  itemCal: { color: colors.primaryLight, fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  mealTypeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border },
  typeChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: `${colors.accent}15`, borderRadius: radius.md, paddingVertical: 12, marginBottom: spacing.sm, borderWidth: 1, borderColor: `${colors.accent}30` },
  saveBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },

  // Barcode scanner styles
  permissionScreen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permissionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md },
  permissionSub: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },

  scanOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 60 },
  scanTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: spacing.lg },
  scanBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  scanTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scanFrame: { width: 260, height: 160, justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: 24, height: 24, borderColor: colors.primaryLight, borderWidth: 3 },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLoading: { alignItems: 'center', gap: spacing.sm },
  scanLoadingText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  scanHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rescanText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
