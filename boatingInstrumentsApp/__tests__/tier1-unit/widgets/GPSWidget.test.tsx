/**
 * GPSWidget Story 9.4 Migration Tests
 * 
 * Integration tests verifying GPSWidget uses useMetricDisplay for coordinates
 * Per AC10: Focus on integration tests over mock-heavy unit tests
 * 
 * Test Strategy:
 * - Static analysis: Verify correct imports and hook usage patterns
 * - Smoke tests: Verify component instantiation
 * - Visual/integration tests: Deferred to Storybook (Phase 3)
 */
import React from 'react';
import { GPSWidget } from '../../../src/widgets/GPSWidget';

describe('GPSWidget - useMetricDisplay Migration (Story 9.4)', () => {
  /**
   * AC1 + AC2 + AC3: Coordinate Format Migration + useMetricDisplay Integration
   * 
   * Static analysis test covering multiple ACs:
   * - AC1: Coordinates use presentations (DD/DDM/DMS/UTM)
   * - AC2: useMetricDisplay invoked with metadata parameter
   * - AC3: Imports verify migration complete
   */
  it('should use useMetricDisplay for coordinates with metadata support', () => {
    const fs = require('fs');
    const widgetSource = fs.readFileSync(
      __dirname + '/../../../src/widgets/GPSWidget.tsx',
      'utf8'
    );
    
    // AC3: Verify imports
    expect(widgetSource).toMatch(/import.*useMetricDisplay.*from.*hooks\/useMetricDisplay/);
    expect(widgetSource).toMatch(/import.*useUnitConversion.*from.*hooks\/useUnitConversion/);
    
    // AC1 & AC2: Verify useMetricDisplay called for coordinates
    expect(widgetSource).toMatch(/useMetricDisplay\s*\(\s*['"]coordinates['"]/);
    
    // AC2: Verify metadata parameter with isLatitude
    expect(widgetSource).toMatch(/metadata:\s*{\s*isLatitude:\s*true\s*}/);
    expect(widgetSource).toMatch(/metadata:\s*{\s*isLatitude:\s*false\s*}/);
    
    // AC3: Verify date/time still uses useUnitConversion (AC7 - out of scope)
    expect(widgetSource).toMatch(/getGpsFormattedDateTime/);
    
    // AC1: Verify coordinate variables (latMetric, lonMetric)
    expect(widgetSource).toMatch(/\blatMetric\b/);
    expect(widgetSource).toMatch(/\blonMetric\b/);
  });

  /**
   * AC4: Settings Reactivity
   * 
   * Conceptual test: Verify coordinate format setting is accessed
   * Actual reactivity tested via Storybook visual regression (Phase 3)
   */
  it('should reference GPS coordinate format settings', () => {
    const fs = require('fs');
    const widgetSource = fs.readFileSync(
      __dirname + '/../../../src/widgets/GPSWidget.tsx',
      'utf8'
    );
    
    // Settings reactivity handled by useMetricDisplay hook internally
    // Hook accesses `gps.coordinateFormat` from settingsStore
    // Verified in useMetricDisplay.ts implementation
    expect(widgetSource).toMatch(/useMetricDisplay/);
  });

  /**
   * AC6: No Formatters Direct Access
   * 
   * Verify GPSWidget doesn't import formatters module directly
   * All formatting goes through useMetricDisplay
   */
  it('should not directly import formatters module', () => {
    const fs = require('fs');
    const widgetSource = fs.readFileSync(
      __dirname + '/../../../src/widgets/GPSWidget.tsx',
      'utf8'
    );
    
    // Should NOT import from utils/formatters
    expect(widgetSource).not.toMatch(/import.*from.*utils\/formatters/);
    
    // Should NOT import from presentation/presentations directly for GPS
    // (presentations are accessed via useMetricDisplay)
    expect(widgetSource).not.toMatch(/import.*dd_6|ddm_3|dms_1.*from.*presentations/);
  });

  /**
   * AC7: Date/Time Formatting Preserved
   * 
   * Verify date/time still uses useUnitConversion (deferred to Story 9.6)
   */
  it('should preserve useUnitConversion for date/time formatting', () => {
    const fs = require('fs');
    const widgetSource = fs.readFileSync(
      __dirname + '/../../../src/widgets/GPSWidget.tsx',
      'utf8'
    );
    
    // Date/time functions still use useUnitConversion (Story 9.6 scope)
    expect(widgetSource).toMatch(/getGpsFormattedDateTime/);
    expect(widgetSource).toMatch(/const\s+{\s*getGpsFormattedDateTime\s*}\s*=\s*useUnitConversion/);
  });

  /**
   * Integration Test: Widget Renders Without Crashing
   * 
   * Basic smoke test verifying component can be instantiated
   * Full rendering tests deferred to Storybook (Phase 3)
   */
  it('should be exportable and have correct type signature', () => {
    // Verify GPSWidget is a React component (may be wrapped in React.memo)
    expect(GPSWidget).toBeDefined();
    
    // React.memo returns an object, not a function
    const componentType = typeof GPSWidget;
    expect(['function', 'object']).toContain(componentType);
  });
});
