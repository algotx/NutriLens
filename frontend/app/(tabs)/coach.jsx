import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { insightsAPI } from '../../lib/api';
import { colors, spacing, radius, shadow } from '../../constants/theme';

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
          <Ionicons name="sparkles" size={14} color={colors.primaryLight} />
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
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, loading: false, text: data.answer }
        : m
      ));
    } catch {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id
        ? { ...m, loading: false, text: "Sorry, I couldn't get a response. Try again." }
        : m
      ));
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.orb} />
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={styles.coachAvatar}>
              <Ionicons name="sparkles" size={22} color={colors.primaryLight} />
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

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}

        {/* Suggestions — only show when no conversation yet */}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>Try asking</Text>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => send(s)} activeOpacity={0.8}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.primaryLight} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input */}
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
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  orb: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primaryGlow },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coachAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: `${colors.primary}60` },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 12 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cardElevated, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: `${colors.warning}40` },
  streakFire: { fontSize: 14 },
  streakNum: { color: colors.warning, fontWeight: '800', fontSize: 15 },
  streakLabel: { color: colors.textMuted, fontSize: 11 },

  messages: { flex: 1 },
  messagesContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatarWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.primary}40` },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.md },
  bubbleAI: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typingText: { color: colors.textMuted, fontSize: 13 },

  suggestions: { marginTop: spacing.md, gap: spacing.sm },
  suggestionsLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  suggestionText: { color: colors.textSecondary, fontSize: 13, flex: 1 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.glow },
  sendBtnDisabled: { backgroundColor: colors.cardElevated, shadowOpacity: 0 },
});
