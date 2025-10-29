import React from 'react';
import { render, act } from '@testing-library/react-native';
import { vibratePattern, hapticPatterns, useHaptics } from '../../../src/services/haptics/Haptics';
import { Vibration, Text } from 'react-native';
import { useSettingsStore } from '../../../src/store/settingsStore';

describe('Haptics utilities', () => {
  test('vibratePattern maps named patterns to Vibration payloads', () => {
    const vibSpy = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    vibratePattern('light');
    expect(vibSpy).toHaveBeenCalledWith(hapticPatterns.light as any);
    vibratePattern('success');
    expect(vibSpy).toHaveBeenCalledWith(hapticPatterns.success as any);
    vibSpy.mockRestore();
  });

  test('useHaptics respects theme setting for hapticFeedback', () => {
    const consumerCalls: any = {};

    const Consumer: React.FC = () => {
      const { vibrate } = useHaptics();
      React.useEffect(() => {
        consumerCalls.vibrate = vibrate;
      }, [vibrate]);
      return <Text>haptics</Text>;
    };

    // Disable haptics in settings
    useSettingsStore.getState().updateThemeSettings({ hapticFeedback: false });
    const { rerender } = render(<Consumer />);
    const vibSpy = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    act(() => {
      consumerCalls.vibrate('light');
    });
    expect(vibSpy).not.toHaveBeenCalled();

    // Enable haptics
    useSettingsStore.getState().updateThemeSettings({ hapticFeedback: true });
    rerender(<Consumer />);
    act(() => {
      consumerCalls.vibrate('light');
    });
    expect(vibSpy).toHaveBeenCalled();
    vibSpy.mockRestore();
  });
});
