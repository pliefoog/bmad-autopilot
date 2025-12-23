/**
 * Theme Compliance Validation System
 * Ensures marine-safe color schemes, especially for red-night vision preservation
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ColorCompliance {
  isRedNightSafe: boolean;
  hasBlueGreenLight: boolean;
  wavelengthRange: string;
  marineSafetyLevel: 'safe' | 'warning' | 'unsafe';
  recommendation?: string;
}

/**
 * Convert hex color to RGB values
 */
export const hexToRgb = (hex: string): RGBColor | null => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return null;

  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);

  return { r, g, b };
};

/**
 * Analyze RGB color for red-night compliance
 * Red-night mode must emit ZERO blue/green light (wavelengths below 620nm)
 */
export const analyzeColorCompliance = (hexColor: string): ColorCompliance => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return {
      isRedNightSafe: false,
      hasBlueGreenLight: true,
      wavelengthRange: 'invalid',
      marineSafetyLevel: 'unsafe',
      recommendation: 'Invalid hex color format',
    };
  }

  const { r, g, b } = rgb;

  // Red-night safety: No blue or green light emission
  const hasBlueGreenLight = g > 0 || b > 0;
  const isRedNightSafe = !hasBlueGreenLight; // Allow black (r=0,g=0,b=0) and red spectrum (r>0,g=0,b=0)

  // Marine safety levels based on wavelength analysis
  let marineSafetyLevel: 'safe' | 'warning' | 'unsafe' = 'safe';
  let recommendation: string | undefined;

  if (hasBlueGreenLight) {
    if (g > 50 || b > 50) {
      marineSafetyLevel = 'unsafe';
      recommendation = `High blue/green content (G:${g}, B:${b}) will destroy night vision. Use red-only colors.`;
    } else if (g > 0 || b > 0) {
      marineSafetyLevel = 'warning';
      recommendation = `Low blue/green content (G:${g}, B:${b}) may affect night vision. Consider pure red colors.`;
    }
  }

  // Determine wavelength range
  let wavelengthRange = 'unknown';
  if (r > 0 && g === 0 && b === 0) {
    wavelengthRange = '620-750nm (red spectrum)';
  } else if (hasBlueGreenLight) {
    if (b > g && b > r) {
      wavelengthRange = '450-495nm (blue spectrum)';
    } else if (g > b && g > r) {
      wavelengthRange = '495-570nm (green spectrum)';
    } else {
      wavelengthRange = 'mixed spectrum';
    }
  }

  return {
    isRedNightSafe,
    hasBlueGreenLight,
    wavelengthRange,
    marineSafetyLevel,
    recommendation,
  };
};

/**
 * Validate an entire theme color palette for marine compliance
 */
export const validateThemePalette = (
  colors: Record<string, string>,
): Record<string, ColorCompliance> => {
  const results: Record<string, ColorCompliance> = {};

  for (const [colorName, hexValue] of Object.entries(colors)) {
    results[colorName] = analyzeColorCompliance(hexValue);
  }

  return results;
};

/**
 * Development-time validation warnings
 * Only runs in development mode to avoid production performance impact
 * ONLY validates red-night themes for night vision compliance - day/night themes are allowed to have colors
 */
export const validateThemeColorsInDev = (
  themeName: string,
  colors: Record<string, string> | any,
): void => {
  // Disable runtime validation - only used during theme development
  // Red-night compliance should be validated once during development, not at runtime
  if (__DEV__ && process.env.NODE_ENV === 'development' && process.env.VALIDATE_THEMES === 'true') {
    const results = validateThemePalette(colors);
    const violations: string[] = [];

    // ONLY validate red-night themes for night vision compliance
    // Day and night themes are EXPECTED to have blue/green colors
    if (themeName === 'red-night') {
      for (const [colorName, compliance] of Object.entries(results)) {
        if (!compliance.isRedNightSafe) {
          violations.push(`${colorName}: ${compliance.recommendation || 'Not red-night safe'}`);
        }
      }

      if (violations.length > 0) {
        console.warn(`🚨 Red-Night Theme Compliance Violations:`);
        violations.forEach((violation) => console.warn(`  • ${violation}`));
        console.warn(
          '⚠️  Red-night theme violations can destroy night vision and pose marine safety risks!',
        );
        console.warn(
          '📖 Marine Standard: Red-night mode must emit ZERO blue/green light (620-750nm only)',
        );
      } else {
      }
    }
    // Day and night themes don't need validation - they're supposed to have colors
  }
};

/**
 * Automated tests for theme compliance
 */
export const getThemeComplianceTests = () => {
  return {
    redNightPurity: (colors: Record<string, string>) => {
      const results = validateThemePalette(colors);
      const violations = Object.entries(results)
        .filter(([_, compliance]) => !compliance.isRedNightSafe)
        .map(([colorName]) => colorName);

      return {
        passed: violations.length === 0,
        violations,
        message:
          violations.length > 0
            ? `Red-night theme has non-red colors: ${violations.join(', ')}`
            : 'All colors are red-night compliant',
      };
    },

    marineStandards: (colors: Record<string, string>) => {
      const results = validateThemePalette(colors);
      const unsafeColors = Object.entries(results)
        .filter(([_, compliance]) => compliance.marineSafetyLevel === 'unsafe')
        .map(([colorName, compliance]) => `${colorName}: ${compliance.recommendation}`);

      return {
        passed: unsafeColors.length === 0,
        violations: unsafeColors,
        message:
          unsafeColors.length > 0
            ? `Marine safety violations found`
            : 'All colors meet marine safety standards',
      };
    },
  };
};
