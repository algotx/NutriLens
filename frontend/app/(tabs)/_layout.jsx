import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../../constants/theme';
import { rf, rp, rr, TAB_BAR_HEIGHT } from '../../lib/responsive';

function TabIcon({ name, color, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? name : `${name}-outline`} size={rf(21)} color={color} />
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
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={rf(22)} color={focused ? '#fff' : colors.textMuted} />
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
      <Tabs.Screen name="insights" options={{
        title: 'Insights',
        tabBarIcon: ({ color, focused }) => <TabIcon name="analytics" color={color} focused={focused} />,
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
    height: TAB_BAR_HEIGHT,
    paddingBottom: rp(10),
    paddingTop: rp(8),
    ...shadow.md,
  },
  tabLabel: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  iconWrap: {
    width: rp(42),
    height: rp(34),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rr.sm,
    gap: 3,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryGlow,
  },
  activeDot: {
    width: rp(4),
    height: rp(4),
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    position: 'absolute',
    bottom: 2,
  },
  scanBtn: {
    width: rp(46),
    height: rp(36),
    borderRadius: rr.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
    ...shadow.glow,
  },
});
