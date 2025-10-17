import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ 
          headerShown: false, // Custom header in each screen
          animation: 'slide_from_right',
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen 
            name="settings" 
            options={{ 
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: true,
              title: 'Settings',
            }} 
          />
          <Stack.Screen
            name="widget-selector"
            options={{ 
              presentation: 'modal',
              headerShown: true,
              title: 'Add Widget',
            }}
          />
        <Stack.Screen
          name="+not-found"
          options={{
            title: 'Page Not Found',
          }}
        />
      </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}