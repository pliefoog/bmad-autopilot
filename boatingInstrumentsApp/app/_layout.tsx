import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme';
import { LoadingProvider } from '../src/services/loading/LoadingContext';
import LoadingOverlay from '../src/components/molecules/LoadingOverlay';
import { useEffect } from 'react';
import { AccessibilityService } from '../src/services/accessibility/AccessibilityService';

export default function RootLayout() {
  // Initialize accessibility service on app mount
  useEffect(() => {
    AccessibilityService.initialize();
    
    return () => {
      AccessibilityService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LoadingProvider>
          <Stack screenOptions={{ 
            headerShown: true, // Enable native iOS headers for HIG compliance
            animation: 'slide_from_right',
            gestureEnabled: true, // Enable iOS swipe-back gesture
            gestureDirection: 'horizontal',
            headerBackTitle: '', // Show back chevron without title (iOS standard)
            presentation: 'card', // Standard push navigation
          }}>
            <Stack.Screen 
              name="index" 
              options={{
                headerShown: false, // Dashboard uses custom header
              }}
            />
            <Stack.Screen 
              name="settings" 
              options={{ 
                presentation: 'card', // Settings is part of navigation hierarchy (not modal)
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Settings',
                headerBackTitle: 'Dashboard',
                gestureEnabled: true,
              }} 
            />
            <Stack.Screen
              name="widget-selector"
              options={{ 
                presentation: 'modal', // Widget selector IS a modal (temporary task)
                animation: 'slide_from_bottom',
                headerShown: true,
                title: 'Add Widget',
                gestureEnabled: true,
                gestureDirection: 'vertical', // iOS modal dismisses with vertical swipe
              }}
            />
            <Stack.Screen
              name="+not-found"
              options={{
                title: 'Page Not Found',
              }}
            />
          </Stack>
          <LoadingOverlay />
        </LoadingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}