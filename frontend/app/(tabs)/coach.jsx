import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { insightsAPI } from '../../lib/api';
import { colors, shadow } from '../../constants/theme';
import { rf, rp, rr, rs, sp, TOP_INSET } from '../../lib/responsive';

const SUGGESTIONS = [
  "Am I eating enough protein?",
  "How can I improve my diet?",
  "What should I eat for more energy?",
  "Am I on track with my goals?",
  "How do my macros look this week?",
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && (
        <View style={styles.avatarWrap}>
          <Ionicons name="sparkles" size={rf(14)} color={colors.primaryLight} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {msg.loading ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.primaryLight} />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.text}</Text>
        )}
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const [messages, setMessages] = useState([
    { id: 0, role: 'ai', text: "Hey! I'm your NutriLens AI Coach 🧠\n\nI can see your logged meals and give you personalized advice. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(null);
  const scrollRef = useRef(null);

  useFocusEffect(useCallback(() => {
    insightsAPI.streak().then(({ data }) => setStreak(data)).catch(() => {});
  }, []));

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    const userMsg = { id: Date.now(), role: 'user', text: q };
    const loadingMsg = { id: Date.now() + 1, role: 'ai', loading: true, text: '' };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const { data } = await insightsAPI.coach(q);
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, loading: false, text: data.answer } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, loading: false, text: "Sorry, I couldn't get a response. Try again." } : m));
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={rp(90)}>
      <View style={styles.header}>
        <View style={styles.orb} />
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={styles.coachAvatar}>
              <Ionicons name="sparkles" size={rf(22)} color={colors.primaryLight} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Coach</Text>
              <Text style={styles.headerSub}>Powered by Gemini</Text>
            </View>
          </View>
          {streak !== null && (
            <View style={styles.streakChip}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakNum}>{streak.streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}

        {messages.length === 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>Try asking</Text>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => send(s)} activeOpacity={0.8}>
                <Ionicons name="chatbubble-outline" size={rf(13)} color={colors.primaryLight} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach anything..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={300}
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={rf(18)} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: TOP_INSET + rp(10), paddingBottom: sp.md, paddingHorizontal: sp.lg, overflow: 'hidden' },
  orb: { position: 'absolute', top: -rs(40), right: -rs(40), width: rs(160), height: rs(160), borderRadius: rs(80), backgroundColor: colors.primaryGlow },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  coachAvatar: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: `${colors.primary}60` },
  headerTitle: { color: colors.text, fontSize: rf(20), fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: rf(12) },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: rp(4), backgroundColor: colors.cardElevated, borderRadius: rr.full, paddingHorizontal: rp(12), paddingVertical: rp(6), borderWidth: 1, borderColor: `${colors.warning}40` },
  streakFire: { fontSize: rf(14) },
  streakNum: { color: colors.warning, fontWeight: '800', fontSize: rf(15) },
  streakLabel: { color: colors.textMuted, fontSize: rf(11) },

  messages: { flex: 1 },
  messagesContent: { padding: sp.lg, gap: sp.md, paddingBottom: sp.xl },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: sp.sm },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatarWrap: { width: rs(28), height: rs(28), borderRadius: rs(14), backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.primary}40` },
  bubble: { maxWidth: '80%', borderRadius: rr.lg, padding: sp.md },
  bubbleAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: rp(4) },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: rp(4) },
  bubbleText: { color: colors.text, fontSize: rf(14), lineHeight: rf(14) * 1.5 },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  typingText: { color: colors.textMuted, fontSize: rf(13) },

  suggestions: { marginTop: sp.md, gap: sp.sm },
  suggestionsLabel: { color: colors.textMuted, fontSize: rf(12), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: rp(4) },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: rp(8), backgroundColor: colors.card, borderRadius: rr.md, padding: sp.sm, paddingHorizontal: sp.md, borderWidth: 1, borderColor: colors.border },
  suggestionText: { color: colors.textSecondary, fontSize: rf(13), flex: 1 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: sp.sm, padding: sp.md, paddingBottom: sp.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: rr.lg, paddingHorizontal: sp.md, paddingVertical: rp(12), color: colors.text, fontSize: rf(14), borderWidth: 1, borderColor: colors.border, maxHeight: rp(100) },
  sendBtn: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.glow },
  sendBtnDisabled: { backgroundColor: colors.cardElevated, shadowOpacity: 0 },
});
