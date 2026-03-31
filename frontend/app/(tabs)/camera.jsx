import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI, savedFoodsAPI } from '../../lib/api';
import Button from '../../components/Button';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET, rv } from '../../lib/responsive';

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
  const [mode, setMode] = useState('photo'); // 'photo' | 'barcode' | 'recipe' | 'voice'
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanLock = useRef(false);

  // Voice recording state
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);
  const [voiceAnalyzing, setVoiceAnalyzing] = useState(false);

  // Recipe state
  const [recipeResult, setRecipeResult] = useState(null);
  const [recipeImage, setRecipeImage] = useState(null);

  const pickImage = async (fromCamera) => {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access in your device settings.'); return; }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.4, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.4, mediaTypes: ['images'], base64: false });
    if (!res.canceled) { setImage(res.assets[0]); setResult(null); analyzeImage(res.assets[0]); }
  };

  const analyzeImage = async (img) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: img.uri, type: img.mimeType || 'image/jpeg', name: 'food.jpg' });
      const { data } = await mealsAPI.analyzePhoto(formData);
      setResult(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (e) {
      Alert.alert('Analysis failed', e.response?.data?.error || e.message || 'Could not analyze image. Try again.');
    } finally { setAnalyzing(false); }
  };

  const handleBarcodeScan = async (scanResult) => {
    if (scanned || scanLock.current) return;
    const barcode = scanResult.data;
    if (!barcode) return;
    scanLock.current = true;
    setScanned(true);
    setAnalyzing(true);
    try {
      const { data } = await mealsAPI.lookupBarcode(barcode);
      setResult(data);
      setMode('photo');
    } catch (e) {
      Alert.alert('Not found', e.response?.data?.error || 'Could not find product. Try again.');
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
      await mealsAPI.log({ meal_type: mealType, food_name: result.food_name, serving_size: result.serving_size, calories: result.calories, protein_g: result.protein_g, carbs_g: result.carbs_g, fat_g: result.fat_g, fiber_g: result.fiber_g || 0 });
      DeviceEventEmitter.emit('mealLogged');
      router.replace('/(tabs)');
      setTimeout(() => Alert.alert('✅ Logged!', `${result.food_name} added to your diary.`), 300);
    } catch { Alert.alert('Error', 'Failed to log meal'); }
    finally { setLogging(false); }
  };

  const saveFood = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await savedFoodsAPI.save({ food_name: result.food_name, serving_size: result.serving_size, calories: result.calories, protein_g: result.protein_g, carbs_g: result.carbs_g, fat_g: result.fat_g, fiber_g: result.fiber_g || 0 });
      Alert.alert('Saved!', `${result.food_name} added to your saved foods.`);
    } catch { Alert.alert('Error', 'Could not save food'); }
    finally { setSaving(false); }
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Microphone access is required for voice logging.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch (e) { Alert.alert('Error', 'Could not start recording: ' + e.message); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setVoiceAnalyzing(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      // Read audio as base64 and send to backend
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          const { data } = await mealsAPI.voiceLog('', base64);
          const items = typeof data === 'string' ? JSON.parse(data) : data;
          setVoiceResult(items);
        } catch (e) {
          Alert.alert('Error', e.response?.data?.error || 'Could not analyze voice recording');
        } finally { setVoiceAnalyzing(false); }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setVoiceAnalyzing(false);
      Alert.alert('Error', 'Could not process recording');
    }
  };

  const logVoiceItem = async (item) => {
    try {
      await mealsAPI.log({
        meal_type: item.meal_type || 'snack', food_name: item.food_name,
        serving_size: item.serving_size, calories: item.calories,
        protein_g: item.protein_g, carbs_g: item.carbs_g,
        fat_g: item.fat_g, fiber_g: item.fiber_g || 0,
      });
      DeviceEventEmitter.emit('mealLogged');
      setVoiceResult(prev => prev.filter(i => i !== item));
      Alert.alert('✅ Logged!', `${item.food_name} added to your diary.`);
    } catch { Alert.alert('Error', 'Could not log meal'); }
  };

  // ── Recipe scanner ────────────────────────────────────────────────────────
  const pickRecipeImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access required.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ['images'] });
    if (!res.canceled) {
      setRecipeImage(res.assets[0]);
      setRecipeResult(null);
      setAnalyzing(true);
      try {
        const formData = new FormData();
        formData.append('image', { uri: res.assets[0].uri, type: res.assets[0].mimeType || 'image/jpeg', name: 'recipe.jpg' });
        const { data } = await mealsAPI.scanRecipe(formData);
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setRecipeResult(parsed);
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Could not scan recipe');
      } finally { setAnalyzing(false); }
    }
  };

  const logRecipeServing = async () => {
    if (!recipeResult) return;
    setLogging(true);
    try {
      await mealsAPI.log({
        meal_type: mealType, food_name: recipeResult.recipe_name + ' (1 serving)',
        serving_size: `1/${recipeResult.servings} of recipe`,
        calories: recipeResult.per_serving.calories, protein_g: recipeResult.per_serving.protein_g,
        carbs_g: recipeResult.per_serving.carbs_g, fat_g: recipeResult.per_serving.fat_g,
        fiber_g: recipeResult.per_serving.fiber_g || 0,
      });
      DeviceEventEmitter.emit('mealLogged');
      router.replace('/(tabs)');
      setTimeout(() => Alert.alert('✅ Logged!', `${recipeResult.recipe_name} added to your diary.`), 300);
    } catch { Alert.alert('Error', 'Could not log meal'); }
    finally { setLogging(false); }
  };

  // ── Voice mode ────────────────────────────────────────────────────────────
  if (mode === 'voice') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.orb} />
        <View style={styles.header}>
          <Text style={styles.title}>Voice Log</Text>
          <Text style={styles.sub}>Describe what you ate — AI does the rest</Text>
        </View>

        <View style={styles.modeToggle}>
          {[{id:'photo',icon:'camera',label:'AI Photo'},{id:'barcode',icon:'barcode-outline',label:'Barcode'},{id:'recipe',icon:'book-outline',label:'Recipe'},{id:'voice',icon:'mic',label:'Voice'}].map(m => (
            <TouchableOpacity key={m.id} style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]} onPress={() => { setMode(m.id); setVoiceResult(null); }} activeOpacity={0.8}>
              <Ionicons name={m.icon} size={rf(14)} color={mode === m.id ? colors.primaryLight : colors.textMuted} />
              <Text style={[styles.modeBtnText, mode === m.id && styles.modeBtnTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.voiceArea}>
          {voiceAnalyzing ? (
            <View style={styles.voiceAnalyzing}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.voiceAnalyzingText}>Analyzing with AI...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={rf(48)} color={isRecording ? colors.danger : colors.primaryLight} />
              <Text style={[styles.voiceBtnText, isRecording && { color: colors.danger }]}>
                {isRecording ? 'Tap to stop' : 'Tap to record'}
              </Text>
              {isRecording && <View style={styles.recordingDot} />}
            </TouchableOpacity>
          )}
          <Text style={styles.voiceHint}>
            {isRecording ? '🎙 Recording... speak clearly' : 'Say something like "I had a chicken sandwich and a banana"'}
          </Text>
        </View>

        {voiceResult && voiceResult.length > 0 && (
          <View style={styles.voiceResults}>
            <Text style={styles.voiceResultsTitle}>Detected Foods</Text>
            {voiceResult.map((item, i) => (
              <View key={i} style={styles.voiceResultCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.voiceResultName}>{item.food_name}</Text>
                  <Text style={styles.voiceResultServing}>{item.serving_size}</Text>
                  <View style={styles.voiceResultMacros}>
                    <Text style={styles.voiceResultCal}>{Math.round(item.calories)} kcal</Text>
                    <Text style={styles.voiceResultMacro}>P {Math.round(item.protein_g)}g</Text>
                    <Text style={styles.voiceResultMacro}>C {Math.round(item.carbs_g)}g</Text>
                    <Text style={styles.voiceResultMacro}>F {Math.round(item.fat_g)}g</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.logBtn} onPress={() => logVoiceItem(item)} activeOpacity={0.8}>
                  <Ionicons name="checkmark" size={rf(18)} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: rp(40) }} />
      </ScrollView>
    );
  }

  // ── Recipe mode ───────────────────────────────────────────────────────────
  if (mode === 'recipe') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.orb} />
        <View style={styles.header}>
          <Text style={styles.title}>Recipe Scanner</Text>
          <Text style={styles.sub}>Scan any recipe — AI calculates macros</Text>
        </View>

        <View style={styles.modeToggle}>
          {[{id:'photo',icon:'camera',label:'AI Photo'},{id:'barcode',icon:'barcode-outline',label:'Barcode'},{id:'recipe',icon:'book-outline',label:'Recipe'},{id:'voice',icon:'mic',label:'Voice'}].map(m => (
            <TouchableOpacity key={m.id} style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]} onPress={() => { setMode(m.id); setRecipeResult(null); setRecipeImage(null); }} activeOpacity={0.8}>
              <Ionicons name={m.icon} size={rf(14)} color={mode === m.id ? colors.primaryLight : colors.textMuted} />
              <Text style={[styles.modeBtnText, mode === m.id && styles.modeBtnTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {recipeImage ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: recipeImage.uri }} style={styles.image} resizeMode="cover" />
            {analyzing && (
              <View style={styles.overlay}>
                <View style={styles.overlayCard}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.overlayTitle}>Scanning Recipe</Text>
                  <Text style={styles.overlaySub}>Extracting ingredients & calculating macros...</Text>
                </View>
              </View>
            )}
            {!analyzing && (
              <TouchableOpacity style={styles.retakeBtn} onPress={() => { setRecipeImage(null); setRecipeResult(null); }}>
                <Ionicons name="refresh" size={rf(16)} color="#fff" />
                <Text style={styles.retakeBtnText}>Rescan</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.recipePlaceholder} onPress={pickRecipeImage} activeOpacity={0.8}>
            <Ionicons name="book-outline" size={rf(52)} color={colors.textMuted} />
            <Text style={styles.placeholderTitle}>Tap to scan a recipe</Text>
            <Text style={styles.placeholderSub}>Photo of a recipe card, cookbook page, or screenshot</Text>
          </TouchableOpacity>
        )}

        {recipeResult && !analyzing && (
          <View style={styles.recipeCard}>
            <Text style={styles.recipeName}>{recipeResult.recipe_name}</Text>
            <Text style={styles.recipeServings}>{recipeResult.servings} servings</Text>

            {recipeResult.ingredients?.length > 0 && (
              <View style={styles.ingredientsList}>
                <Text style={styles.ingredientsTitle}>Ingredients</Text>
                {recipeResult.ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <View style={styles.ingredientDot} />
                    <Text style={styles.ingredientName}>{ing.name}</Text>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.recipeMacroSection}>
              <Text style={styles.recipeMacroTitle}>Per Serving</Text>
              <View style={styles.macroGrid}>
                <MacroChip label="Calories" value={recipeResult.per_serving?.calories || 0} unit="kcal" color={colors.primary} />
                <MacroChip label="Protein" value={recipeResult.per_serving?.protein_g || 0} unit="g" color={colors.protein} />
                <MacroChip label="Carbs" value={recipeResult.per_serving?.carbs_g || 0} unit="g" color={colors.carbs} />
                <MacroChip label="Fat" value={recipeResult.per_serving?.fat_g || 0} unit="g" color={colors.fat} />
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.mealTypeLabel}>Log as</Text>
            <View style={styles.typeRow}>
              {MEAL_TYPES.map((t) => {
                const active = mealType === t.value;
                return (
                  <TouchableOpacity key={t.value} style={[styles.typeChip, active && { borderColor: t.color, backgroundColor: `${t.color}15` }]} onPress={() => setMealType(t.value)} activeOpacity={0.8}>
                    <Ionicons name={t.icon} size={rf(13)} color={active ? t.color : colors.textMuted} />
                    <Text style={[styles.typeChipText, active && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button title="Log 1 Serving" onPress={logRecipeServing} loading={logging}
              icon={<Ionicons name="checkmark-circle-outline" size={rf(18)} color="#fff" />} />
          </View>
        )}
        <View style={{ height: rp(40) }} />
      </ScrollView>
    );
  }

  if (mode === 'barcode') {
    if (!cameraPermission?.granted) {
      return (
        <View style={styles.permissionScreen}>
          <Ionicons name="barcode-outline" size={rf(64)} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>Required to scan barcodes</Text>
          <Button title="Grant Permission" onPress={requestCameraPermission} style={{ marginTop: sp.lg, paddingHorizontal: sp.xl }} />
          <TouchableOpacity onPress={() => setMode('photo')} style={{ marginTop: sp.md }}>
            <Text style={{ color: colors.textMuted, fontSize: rf(14) }}>Cancel</Text>
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
        <View style={styles.scanOverlay}>
          <View style={styles.scanTopBar}>
            <TouchableOpacity style={styles.scanBackBtn} onPress={() => { setMode('photo'); setScanned(false); }}>
              <Ionicons name="arrow-back" size={rf(22)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scanTitle}>Scan Barcode</Text>
            <View style={{ width: rp(40) }} />
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
              <Ionicons name="refresh" size={rf(16)} color="#fff" />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.orb} />

      <View style={styles.header}>
        <Text style={styles.title}>Scan Food</Text>
        <Text style={styles.sub}>AI photo analysis or barcode lookup</Text>
      </View>

      <View style={styles.modeToggle}>
        {[{id:'photo',icon:'camera',label:'AI Photo'},{id:'barcode',icon:'barcode-outline',label:'Barcode'},{id:'recipe',icon:'book-outline',label:'Recipe'},{id:'voice',icon:'mic',label:'Voice'}].map(m => (
          <TouchableOpacity key={m.id} style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]} onPress={() => { setMode(m.id); if (m.id === 'barcode') { setScanned(false); setResult(null); } }} activeOpacity={0.8}>
            <Ionicons name={m.icon} size={rf(13)} color={mode === m.id ? colors.primaryLight : colors.textMuted} />
            <Text style={[styles.modeBtnText, mode === m.id && styles.modeBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
              <Ionicons name="refresh" size={rf(16)} color="#fff" />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.placeholderInner}>
            <Ionicons name="camera-outline" size={rf(52)} color={colors.textMuted} />
            <Text style={styles.placeholderTitle}>No photo yet</Text>
            <Text style={styles.placeholderSub}>Take or upload a photo of your food</Text>
          </View>
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)} activeOpacity={0.8}>
          <View style={styles.actionBtnIcon}><Ionicons name="camera" size={rf(22)} color={colors.primary} /></View>
          <Text style={styles.actionBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(false)} activeOpacity={0.8}>
          <View style={styles.actionBtnIcon}><Ionicons name="images" size={rf(22)} color={colors.accent} /></View>
          <Text style={styles.actionBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {result && !analyzing && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleWrap}>
              <Text style={styles.resultTitle}>{result.food_name}</Text>
              <Text style={styles.resultServing}>{result.serving_size}</Text>
            </View>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={rf(11)} color={colors.primaryLight} />
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
                  <Ionicons name={t.icon} size={rf(13)} color={active ? t.color : colors.textMuted} />
                  <Text style={[styles.typeChipText, active && { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveFood} disabled={saving} activeOpacity={0.8}>
            <Ionicons name="bookmark-outline" size={rf(15)} color={colors.accent} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save food for later'}</Text>
          </TouchableOpacity>

          <Button title="Add to Diary" onPress={logMeal} loading={logging}
            icon={<Ionicons name="checkmark-circle-outline" size={rf(18)} color="#fff" />} />
        </View>
      )}
      <View style={{ height: rp(40) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: sp.lg, paddingTop: TOP_INSET + rp(10) },
  orb: { position: 'absolute', top: -rs(40), left: -rs(60), width: rs(200), height: rs(200), borderRadius: rs(100), backgroundColor: colors.accentGlow },

  header: { marginBottom: sp.md },
  title: { color: colors.text, fontSize: rf(28), fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: rf(14), marginTop: rp(4) },

  modeToggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: rr.md, padding: rp(4), marginBottom: sp.lg, borderWidth: 1, borderColor: colors.border },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rp(6), paddingVertical: rp(10), borderRadius: rr.sm },
  modeBtnActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: `${colors.primary}50` },
  modeBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: rf(13) },
  modeBtnTextActive: { color: colors.primaryLight },

  imageWrap: { borderRadius: rr.lg, overflow: 'hidden', height: rv(260), marginBottom: sp.md, ...shadow.md },
  image: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,11,20,0.85)', justifyContent: 'center', alignItems: 'center' },
  overlayCard: { alignItems: 'center', gap: sp.sm },
  overlayTitle: { color: colors.text, fontSize: rf(16), fontWeight: '700', marginTop: sp.sm },
  overlaySub: { color: colors.textMuted, fontSize: rf(13) },
  retakeBtn: { position: 'absolute', top: rp(12), right: rp(12), flexDirection: 'row', alignItems: 'center', gap: rp(5), backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: rr.full, paddingHorizontal: rp(12), paddingVertical: rp(6) },
  retakeBtnText: { color: '#fff', fontSize: rf(12), fontWeight: '600' },

  placeholder: { height: rv(220), backgroundColor: colors.card, borderRadius: rr.lg, marginBottom: sp.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  placeholderInner: { alignItems: 'center', gap: sp.sm },
  placeholderTitle: { color: colors.textSecondary, fontSize: rf(16), fontWeight: '600' },
  placeholderSub: { color: colors.textMuted, fontSize: rf(13) },

  btnRow: { flexDirection: 'row', gap: sp.md, marginBottom: sp.lg },
  actionBtn: { flex: 1, backgroundColor: colors.card, borderRadius: rr.md, padding: sp.md, alignItems: 'center', gap: sp.sm, borderWidth: 1, borderColor: colors.border },
  actionBtnIcon: { width: rs(48), height: rs(48), borderRadius: rs(14), backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: colors.text, fontWeight: '600', fontSize: rf(13) },

  resultCard: { backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.border, ...shadow.md },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sp.md },
  resultTitleWrap: { flex: 1 },
  resultTitle: { color: colors.text, fontSize: rf(18), fontWeight: '800' },
  resultServing: { color: colors.textMuted, fontSize: rf(13), marginTop: 2 },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: rp(4), backgroundColor: colors.primaryGlow, borderRadius: rr.full, paddingHorizontal: rp(8), paddingVertical: rp(4), borderWidth: 1, borderColor: `${colors.primary}40` },
  aiTagText: { color: colors.primaryLight, fontSize: rf(11), fontWeight: '700' },

  macroGrid: { flexDirection: 'row', gap: sp.sm, marginBottom: sp.md },
  macroChip: { flex: 1, alignItems: 'center', borderRadius: rr.md, borderWidth: 1, paddingVertical: sp.sm },
  macroChipVal: { fontSize: rf(18), fontWeight: '800' },
  macroChipUnit: { color: colors.textMuted, fontSize: rf(10), marginTop: 1 },
  macroChipLabel: { color: colors.textMuted, fontSize: rf(10), marginTop: 2 },

  itemsWrap: { marginBottom: sp.md },
  itemsTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: sp.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: rp(4) },
  itemDot: { width: rp(6), height: rp(6), borderRadius: 3, backgroundColor: colors.primary },
  itemName: { color: colors.text, fontSize: rf(13), flex: 1 },
  itemCal: { color: colors.primaryLight, fontSize: rf(12), fontWeight: '600' },

  divider: { height: 1, backgroundColor: colors.border, marginBottom: sp.md },
  mealTypeLabel: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: sp.sm },
  typeRow: { flexDirection: 'row', gap: sp.sm, marginBottom: sp.md, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: rp(5), paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: rr.full, borderWidth: 1.5, borderColor: colors.border },
  typeChipText: { color: colors.textMuted, fontWeight: '600', fontSize: rf(12) },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rp(8), backgroundColor: `${colors.accent}15`, borderRadius: rr.md, paddingVertical: rp(12), marginBottom: sp.sm, borderWidth: 1, borderColor: `${colors.accent}30` },
  saveBtnText: { color: colors.accent, fontWeight: '600', fontSize: rf(14) },

  permissionScreen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: sp.xl },
  permissionTitle: { color: colors.text, fontSize: rf(20), fontWeight: '700', marginTop: sp.md },
  permissionSub: { color: colors.textMuted, fontSize: rf(14), marginTop: sp.xs },

  scanOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: TOP_INSET + rp(10), paddingBottom: rp(60) },
  scanTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: sp.lg },
  scanBackBtn: { width: rp(40), height: rp(40), borderRadius: rp(20), backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  scanTitle: { color: '#fff', fontSize: rf(18), fontWeight: '700' },

  scanFrame: { width: rs(260), height: rs(160), justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: rp(24), height: rp(24), borderColor: colors.primaryLight, borderWidth: 3 },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLoading: { alignItems: 'center', gap: sp.sm },
  scanLoadingText: { color: '#fff', fontSize: rf(13), fontWeight: '600' },

  scanHint: { color: 'rgba(255,255,255,0.7)', fontSize: rf(14), textAlign: 'center' },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: rp(6), backgroundColor: colors.primary, borderRadius: rr.full, paddingHorizontal: sp.lg, paddingVertical: sp.sm },
  rescanText: { color: '#fff', fontWeight: '600', fontSize: rf(14) },

  // Voice styles
  voiceArea: { alignItems: 'center', paddingVertical: sp.xl, gap: sp.lg },
  voiceBtn: { width: rs(140), height: rs(140), borderRadius: rs(70), backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.borderGlow, gap: rp(8), ...shadow.glow },
  voiceBtnRecording: { borderColor: colors.danger, backgroundColor: `${colors.danger}15` },
  voiceBtnText: { color: colors.primaryLight, fontWeight: '700', fontSize: rf(13) },
  recordingDot: { position: 'absolute', top: rp(12), right: rp(12), width: rp(12), height: rp(12), borderRadius: rp(6), backgroundColor: colors.danger },
  voiceAnalyzing: { alignItems: 'center', gap: sp.md, paddingVertical: sp.xl },
  voiceAnalyzingText: { color: colors.text, fontSize: rf(15), fontWeight: '600' },
  voiceHint: { color: colors.textMuted, fontSize: rf(13), textAlign: 'center', paddingHorizontal: sp.lg },
  voiceResults: { gap: sp.sm },
  voiceResultsTitle: { color: colors.text, fontSize: rf(16), fontWeight: '700', marginBottom: sp.sm },
  voiceResultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.md, borderWidth: 1, borderColor: colors.border, gap: sp.md, ...shadow.sm },
  voiceResultName: { color: colors.text, fontWeight: '700', fontSize: rf(14) },
  voiceResultServing: { color: colors.textMuted, fontSize: rf(12), marginTop: 2 },
  voiceResultMacros: { flexDirection: 'row', gap: rp(8), marginTop: rp(4), alignItems: 'center' },
  voiceResultCal: { color: colors.primaryLight, fontSize: rf(12), fontWeight: '700' },
  voiceResultMacro: { color: colors.textMuted, fontSize: rf(11) },
  logBtn: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.glow },

  // Recipe styles
  recipePlaceholder: { height: rv(200), backgroundColor: colors.card, borderRadius: rr.lg, marginBottom: sp.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: sp.sm },
  recipeCard: { backgroundColor: colors.card, borderRadius: rr.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.border, ...shadow.md },
  recipeName: { color: colors.text, fontSize: rf(20), fontWeight: '800', marginBottom: rp(4) },
  recipeServings: { color: colors.textMuted, fontSize: rf(13), marginBottom: sp.md },
  ingredientsList: { marginBottom: sp.md },
  ingredientsTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: sp.sm },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: rp(8), paddingVertical: rp(3) },
  ingredientDot: { width: rp(5), height: rp(5), borderRadius: rp(3), backgroundColor: colors.primary },
  ingredientName: { color: colors.text, fontSize: rf(13), flex: 1 },
  ingredientAmount: { color: colors.textMuted, fontSize: rf(12) },
  recipeMacroSection: { marginBottom: sp.md },
  recipeMacroTitle: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: sp.sm },
});
