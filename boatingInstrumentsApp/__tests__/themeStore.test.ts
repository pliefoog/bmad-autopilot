import { useThemeStore } from '../src/store/themeStore';

describe('ThemeStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useThemeStore.getState();
    store.setMode('day');
    store.setBrightness(1.0);
  });

  test('initial state should be day mode with full brightness', () => {
    const { mode, brightness, colors } = useThemeStore.getState();
    expect(mode).toBe('day');
    expect(brightness).toBe(1.0);
    expect(colors.background).toBe('#F8FAFC');
    expect(colors.text).toBe('#0F172A');
  });

  test('should switch to night mode with correct colors', () => {
    const store = useThemeStore.getState();
    store.setMode('night');
    
    const { mode, colors } = useThemeStore.getState();
    expect(mode).toBe('night');
    expect(colors.background).toBe('#0F172A');
    expect(colors.text).toBe('#F1F5F9');
  });

  test('should switch to red-night mode for night vision', () => {
    const store = useThemeStore.getState();
    store.setMode('red-night');
    
    const { mode, colors } = useThemeStore.getState();
    expect(mode).toBe('red-night');
    expect(colors.background).toBe('#000000');
    expect(colors.text).toBe('#FCA5A5');
    expect(colors.primary).toBe('#DC2626');
  });

  test('should handle brightness adjustment', () => {
    const store = useThemeStore.getState();
    
    store.setBrightness(0.5);
    expect(useThemeStore.getState().brightness).toBe(0.5);
    
    // Test brightness bounds
    store.setBrightness(2.0);
    expect(useThemeStore.getState().brightness).toBe(1.0);
    
    store.setBrightness(-0.5);
    expect(useThemeStore.getState().brightness).toBe(0.1);
  });

  test('auto mode should select appropriate theme based on time', () => {
    const store = useThemeStore.getState();
    store.setMode('auto');
    
    const { mode, colors } = useThemeStore.getState();
    expect(mode).toBe('auto');
    
    // Colors should be either day or night theme depending on current time
    const isDayTheme = colors.background === '#F8FAFC';
    const isNightTheme = colors.background === '#0F172A';
    expect(isDayTheme || isNightTheme).toBe(true);
  });

  test('should preserve critical marine colors in all themes', () => {
    const themes = ['day', 'night', 'red-night'] as const;
    
    themes.forEach(theme => {
      const store = useThemeStore.getState();
      store.setMode(theme);
      const { colors } = useThemeStore.getState();
      
      // All themes should have error/warning colors
      expect(colors.error).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.success).toBeDefined();
      
      // Red-night mode should use red variants only
      if (theme === 'red-night') {
        expect(colors.success).toContain('DC2626'); // Red success, not green
      }
    });
  });

  test('text readability should meet marine standards in all conditions', () => {
    const themes = ['day', 'night', 'red-night'] as const;
    
    themes.forEach(theme => {
      const store = useThemeStore.getState();
      store.setMode(theme);
      const { colors } = useThemeStore.getState();
      
      // Validate text visibility - basic contrast check
      const textIsDark = colors.text.includes('0F172A') || colors.text.includes('475569');
      const textIsLight = colors.text.includes('F1F5F9') || colors.text.includes('FCA5A5');
      const backgroundIsDark = colors.background.includes('0F172A') || colors.background === '#000000';
      const backgroundIsLight = colors.background.includes('F8FAFC') || colors.background.includes('FFFFFF');
      
      // Text should contrast with background
      if (backgroundIsDark) {
        expect(textIsLight).toBe(true);
      } else if (backgroundIsLight) {
        expect(textIsDark).toBe(true);
      }
      
      // Red-night mode specific validation for marine compliance
      if (theme === 'red-night') {
        expect(colors.background).toBe('#000000'); // Pure black for night vision
        expect(colors.text).toContain('FCA5A5'); // Light red for visibility
        expect(colors.primary).toContain('DC2626'); // Red primary color
      }
    });
  });

  test('theme switching performance should be smooth', () => {
    const store = useThemeStore.getState();
    const start = performance.now();
    
    // Rapidly switch themes to test performance
    store.setMode('night');
    store.setMode('red-night');
    store.setMode('day');
    store.setMode('auto');
    
    const end = performance.now();
    const switchTime = end - start;
    
    // Theme switching should be fast (under 10ms for 4 switches)
    expect(switchTime).toBeLessThan(10);
  });
});