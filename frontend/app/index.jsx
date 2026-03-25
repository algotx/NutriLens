import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { getToken, getUser } from '../lib/auth';
import { profileAPI } from '../lib/api';
import { colors } from '../constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return router.replace('/(auth)/login');
      try {
        const { data } = await profileAPI.get();
        if (!data) return router.replace('/onboarding');
        router.replace('/(tabs)');
      } catch {
        router.replace('/(auth)/login');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
