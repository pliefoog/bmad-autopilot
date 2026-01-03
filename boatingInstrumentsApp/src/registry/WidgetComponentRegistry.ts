/**
 * ============================================================================
 * WIDGET COMPONENT REGISTRY - Dynamic Component Mapping
 * ============================================================================
 *
 * **PURPOSE:**
 * Maps component names (strings) to actual React components for dynamic
 * rendering in CustomWidget definitions. This enables declarative component
 * usage without importing components in definition files.
 *
 * **HUMAN:**
 * When you add a custom graphical component to a widget definition
 * (like TrendLine or RudderIndicator), the component name must be
 * registered here so CustomWidget.tsx can render it.
 *
 * **AI AGENT:**
 * This registry is the bridge between ComponentCellDef.component (string)
 * and actual React component instances. CustomWidget.tsx looks up components
 * by name at runtime to generate children for TemplatedWidget.
 *
 * **DATA FLOW:**
 * Definition.grid.cells[i].component → REGISTRY[componentName] → React.createElement
 *
 * **USAGE PATTERN:**
 * ```typescript
 * // In definition:
 * {
 *   component: 'TrendLine',
 *   metricKey: 'pressure',
 *   props: { timeWindowMs: 300000 }
 * }
 *
 * // In CustomWidget.tsx:
 * const Component = WIDGET_COMPONENT_REGISTRY['TrendLine'];
 * return <Component metricKey="pressure" timeWindowMs={300000} />;
 * ```
 */

import React from 'react';
import { TrendLine } from '../components/TrendLine';

/**
 * Component Registry Type
 *
 * Maps component names to their implementations. All registered components
 * must accept these standard props:
 * - metricKey?: string - Which metric to visualize
 * - sensorInstance?: SensorInstance - Auto-injected by context
 * - theme?: Theme - Auto-injected via useTheme
 * - Any custom props specified in definition.props
 */
export type WidgetComponentRegistry = {
  [componentName: string]: React.ComponentType<any>;
};

/**
 * Available Widget Components
 *
 * **HUMAN:** Add new components here to make them available in widget definitions
 * **AI AGENT:** Import and register components, ensure they follow prop conventions
 *
 * **STANDARD COMPONENTS:**
 * - TrendLine: Historical metric visualization (line chart)
 * - RudderIndicator: Graphical rudder angle display (future)
 * - GaugeDisplay: Circular gauge visualization (future)
 * - CompassRose: Heading visualization (future)
 *
 * **TO ADD NEW COMPONENT:**
 * 1. Import component: `import { MyComponent } from '../MyComponent';`
 * 2. Register: `'MyComponent': MyComponent,`
 * 3. Document in comment above
 * 4. Use in definition: `{ component: 'MyComponent', props: {...} }`
 */
export const WIDGET_COMPONENT_REGISTRY: WidgetComponentRegistry = {
  TrendLine: TrendLine,
  // TODO: Add more components as they're created
  // 'RudderIndicator': RudderIndicator,
  // 'GaugeDisplay': GaugeDisplay,
  // 'CompassRose': CompassRose,
};

/**
 * Get component by name with type safety
 *
 * **HUMAN:** Retrieves component for rendering
 * **AI AGENT:** Provides runtime component lookup with fallback
 *
 * @param componentName The name registered in WIDGET_COMPONENT_REGISTRY
 * @returns React component or undefined if not found
 */
export function getWidgetComponent(componentName: string): React.ComponentType<any> | undefined {
  return WIDGET_COMPONENT_REGISTRY[componentName];
}

/**
 * Check if component is registered
 *
 * **HUMAN:** Validate component name before using in definition
 * **AI AGENT:** Use for definition validation during registration
 *
 * @param componentName The name to check
 * @returns true if component is registered
 */
export function isComponentRegistered(componentName: string): boolean {
  return componentName in WIDGET_COMPONENT_REGISTRY;
}

/**
 * Get all registered component names
 *
 * **HUMAN:** See what components are available for widget definitions
 * **AI AGENT:** Use for documentation, validation, or UI component pickers
 *
 * @returns Array of registered component names
 */
export function getRegisteredComponentNames(): string[] {
  return Object.keys(WIDGET_COMPONENT_REGISTRY);
}
