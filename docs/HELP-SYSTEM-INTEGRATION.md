# Help System Integration Guide

## Overview

Story 4.6 has implemented a comprehensive help system with tutorials, contextual help, troubleshooting, and documentation. This guide shows how to integrate it into the main application.

## Architecture

### Core Services (Singletons)
- `TutorialManager` - Manages interactive tutorials and progress
- `HelpContentProvider` - Delivers help content with offline caching
- `DiagnosticCollector` - Collects system diagnostics for support

### React Components
- `InteractiveTutorial` - Step-by-step tutorial overlay
- `ContextualHelp` - Tooltips and help bubbles
- `HelpSearch` - Searchable help interface
- `QuickStartGuide` - First-run onboarding
- `TroubleshootingGuide` - Diagnostic troubleshooting flows

### React Hook
- `useHelpSystem()` - Easy access to help system throughout app

## Integration Steps

### 1. Initialize Help System in App.tsx

```typescript
import { useEffect } from 'react';
import TutorialManager from './src/systems/help/TutorialManager';
import HelpContentProvider from './src/systems/help/HelpContentProvider';
import DiagnosticCollector from './src/systems/help/DiagnosticCollector';
import defaultTutorials from './src/systems/help/defaultTutorials';
import defaultHelpContent from './src/systems/help/defaultHelpContent';

export default function App() {
  useEffect(() => {
    // Initialize help system on app startup
    const initializeHelpSystem = async () => {
      try {
        // Initialize tutorial manager
        await TutorialManager.initialize(defaultTutorials);
        
        // Initialize help content provider
        await HelpContentProvider.initialize(defaultHelpContent, 'en');
        
        // Initialize diagnostic collector
        await DiagnosticCollector.initialize();
        
        console.log('[App] Help system initialized');
      } catch (error) {
        console.error('[App] Failed to initialize help system:', error);
      }
    };

    initializeHelpSystem();
  }, []);

  // Rest of app component...
}
```

### 2. Add Help Menu Items to HamburgerMenu

```typescript
// In src/components/HamburgerMenu.tsx

const menuItems = [
  // ... existing menu items ...
  { 
    id: 'help', 
    label: 'Help & Tutorials', 
    icon: 'help-circle-outline',
    onPress: () => navigation.navigate('Help')
  },
  { 
    id: 'troubleshooting', 
    label: 'Troubleshooting', 
    icon: 'build-outline',
    onPress: () => navigation.navigate('Troubleshooting')
  },
];
```

### 3. Show Quick Start on First Launch

```typescript
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuickStartGuide from './src/components/help/QuickStartGuide';
import { QuickStartStep } from './src/systems/help/types';

const FIRST_LAUNCH_KEY = '@bmad:first_launch';

export default function App() {
  const [showQuickStart, setShowQuickStart] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!hasLaunched) {
      setShowQuickStart(true);
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    }
  };

  const quickStartSteps: QuickStartStep[] = [
    {
      id: 'connect',
      title: 'Connect to NMEA Network',
      description: 'Connect your device to your boat\'s WiFi bridge',
      icon: '📡',
      completed: false,
      tutorialId: 'nmea-connection-setup',
    },
    {
      id: 'widgets',
      title: 'Customize Your Dashboard',
      description: 'Add and arrange widgets to display your marine data',
      icon: '📊',
      completed: false,
      tutorialId: 'widget-configuration',
    },
    {
      id: 'alarms',
      title: 'Configure Safety Alarms',
      description: 'Set up depth, anchor, and speed alarms',
      icon: '🔔',
      completed: false,
      tutorialId: 'alarm-configuration',
    },
    {
      id: 'autopilot',
      title: 'Set Up Autopilot Control (Optional)',
      description: 'Enable remote autopilot control if equipped',
      icon: '⚓',
      completed: false,
      tutorialId: 'autopilot-control',
    },
  ];

  return (
    <>
      {/* Main app content */}
      
      {/* Quick start guide modal */}
      <QuickStartGuide
        visible={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onStepAction={(step) => {
          if (step.tutorialId) {
            // Start the associated tutorial
            TutorialManager.startTutorial(step.tutorialId);
          }
        }}
        steps={quickStartSteps}
      />
    </>
  );
}
```

### 4. Add Contextual Help to Widgets

```typescript
import { useState } from 'react';
import ContextualHelp from './src/components/help/ContextualHelp';

export function SpeedWidget() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <View>
        {/* Widget content */}
        <TouchableOpacity onPress={() => setShowHelp(true)}>
          <Text>ℹ️</Text>
        </TouchableOpacity>
      </View>

      <ContextualHelp
        visible={showHelp}
        onDismiss={() => setShowHelp(false)}
        content="Speed through water (SOW) vs Speed over ground (SOG). SOW shows your speed relative to the water, useful for sailing performance. SOG shows your speed relative to the ground, useful for navigation."
        position="bottom"
      />
    </>
  );
}
```

### 5. Log Diagnostic Events

```typescript
import DiagnosticCollector from './src/systems/help/DiagnosticCollector';

// In NmeaConnectionManager or similar
export class NmeaConnectionManager {
  async connect(ipAddress: string, port: number) {
    DiagnosticCollector.logConnection(
      'info',
      'NmeaConnection',
      `Attempting connection to ${ipAddress}:${port}`
    );

    try {
      // Connection logic...
      DiagnosticCollector.logConnection(
        'info',
        'NmeaConnection',
        'Connection established successfully'
      );
    } catch (error) {
      DiagnosticCollector.logConnection(
        'error',
        'NmeaConnection',
        'Connection failed',
        { error: error.message, ipAddress, port }
      );
      throw error;
    }
  }
}
```

### 6. Create Help Screen Navigator

```typescript
// src/navigation/HelpNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';
import HelpHomeScreen from '../screens/help/HelpHomeScreen';
import TutorialScreen from '../screens/help/TutorialScreen';
import TroubleshootingGuide from '../components/help/TroubleshootingGuide';

const Stack = createStackNavigator();

export function HelpNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HelpHome" component={HelpHomeScreen} />
      <Stack.Screen name="Tutorial" component={TutorialScreen} />
      <Stack.Screen name="Troubleshooting" component={TroubleshootingGuide} />
      {/* Add more help screens as needed */}
    </Stack.Navigator>
  );
}
```

### 7. Use the Hook in Components

```typescript
import useHelpSystem from './src/hooks/useHelpSystem';

export function DashboardScreen() {
  const {
    getRecommendedTutorial,
    startTutorial,
    completionStats,
  } = useHelpSystem();

  const handleShowNextTutorial = async () => {
    const nextTutorial = getRecommendedTutorial();
    if (nextTutorial) {
      await startTutorial(nextTutorial.id);
    }
  };

  return (
    <View>
      {/* Dashboard content */}
      
      {completionStats.completionRate < 100 && (
        <TouchableOpacity onPress={handleShowNextTutorial}>
          <Text>Continue Learning ({completionStats.completed}/{completionStats.total} tutorials)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

## Testing

### Manual Testing Checklist

1. **Tutorial System**
   - [ ] Launch app and verify Quick Start Guide appears on first launch
   - [ ] Complete a tutorial step-by-step
   - [ ] Verify progress is saved (close and reopen app)
   - [ ] Skip a tutorial and verify it's marked as skipped
   - [ ] Test tutorial prerequisites (try starting autopilot tutorial before connection tutorial)

2. **Help Content**
   - [ ] Search for help content and verify results
   - [ ] Open help articles and verify formatting
   - [ ] Test offline functionality (disable internet)
   - [ ] Verify help content caching works

3. **Contextual Help**
   - [ ] Show tooltips on widgets
   - [ ] Verify positioning (top, bottom, left, right)
   - [ ] Test auto-dismiss
   - [ ] Verify accessibility with screen reader

4. **Troubleshooting**
   - [ ] Open troubleshooting guide
   - [ ] Select an issue and follow steps
   - [ ] Run diagnostics
   - [ ] Generate support report
   - [ ] Verify diagnostic logs are collected

5. **Diagnostics**
   - [ ] Generate diagnostic report
   - [ ] Verify system info is accurate
   - [ ] Check connection logs are recorded
   - [ ] Export diagnostics and verify format

### Automated Testing

```typescript
// Example test
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TutorialManager from '../src/systems/help/TutorialManager';
import defaultTutorials from '../src/systems/help/defaultTutorials';

describe('TutorialManager', () => {
  beforeEach(async () => {
    await TutorialManager.clearAllData();
    await TutorialManager.initialize(defaultTutorials);
  });

  it('should start a tutorial', async () => {
    const success = await TutorialManager.startTutorial('nmea-connection-setup');
    expect(success).toBe(true);
    
    const progress = TutorialManager.getTutorialProgress('nmea-connection-setup');
    expect(progress).toBeDefined();
    expect(progress?.currentStep).toBe(0);
    expect(progress?.completed).toBe(false);
  });

  it('should enforce prerequisites', async () => {
    const success = await TutorialManager.startTutorial('autopilot-control');
    expect(success).toBe(false); // Should fail without completing prerequisites
  });
});
```

## Future Enhancements

### Tasks 5 & 6 (Support & Multilingual)

These require additional decisions and infrastructure:

**Task 5: Support System Integration**
- Choose support platform (Zendesk, Intercom, custom)
- Set up support email/ticketing system
- Integrate community forum (Discourse, etc.)
- Implement feedback API endpoint
- Add analytics for help usage

**Task 6: Multilingual Support**
- Install i18n library (react-i18next recommended)
- Extract all UI strings to translation files
- Set up translation management (Lokalise, Crowdin, etc.)
- Create translations for key markets (ES, FR, DE, IT)
- Adapt help content for cultural differences
- Add language selector in settings

## Troubleshooting Integration Issues

### Help System Not Initializing
- Verify initialization code is in App.tsx useEffect
- Check console for initialization errors
- Ensure defaultTutorials and defaultHelpContent are imported correctly

### Tutorials Not Saving Progress
- Verify AsyncStorage permissions
- Check for AsyncStorage errors in console
- Test with small tutorial first

### Diagnostic Logs Not Appearing
- Ensure DiagnosticCollector.initialize() is called
- Use DiagnosticCollector.logConnection() to add logs
- Check AsyncStorage size limits

### Performance Issues
- Limit number of active help overlays
- Use memo/useMemo for expensive help content rendering
- Debounce search input properly

## Support

For questions about help system integration, contact the development team or refer to:
- Story Context: `docs/stories/story-context-4.6.xml`
- Story File: `docs/stories/story-4.6-help-system.md`
- Implementation notes in story Dev Agent Record section
