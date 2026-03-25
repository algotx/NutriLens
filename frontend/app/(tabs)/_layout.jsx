import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../../constants/theme';

function TabIcon({ name, color, focused, label }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? name : `${name}-outline`} size={21} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="log" options={{
        title: 'Log',
        tabBarIcon: ({ color, focused }) => <TabIcon name="add-circle" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="camera" options={{
        title: 'Scan',
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.scanBtn, focused && styles.scanBtnActive]}>
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={22} color={focused ? '#fff' : colors.textMuted} />
          </View>
        ),
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.tabLabel, { color: focused ? colors.primaryLight : colors.textMuted }]}>Scan</Text>
        ),
      }} />
      <Tabs.Screen name="coach" options={{
        title: 'Coach',
        tabBarIcon: ({ color, focused }) => <TabIcon name="sparkles" color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, focused }) => <TabIcon name="person" color={color} focused={focused} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
    ...shadow.md,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  iconWrap: {
    width: 42, height: 34,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
    gap: 3,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryGlow,
  },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primaryLight,
    position: 'absolute', bottom: 2,
  },
  scanBtn: {
    width: 46, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  scanBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
    ...shadow.glow,
  },
});
