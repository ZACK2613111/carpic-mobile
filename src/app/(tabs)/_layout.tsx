import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { isSupabaseConfigured } from '@/lib/env';
import { fontFamily } from '@/lib/fonts';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const t = useT();

  if (isSupabaseConfigured && loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamily.semibold },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.projects'), tabBarIcon: ({ color }) => <Icon name="image" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: ({ color }) => <Icon name="sliders" size={22} color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
