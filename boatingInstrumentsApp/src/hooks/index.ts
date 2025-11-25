// Custom Hooks Index
// Barrel export for all custom React hooks

export { useNMEAData } from './useNMEAData';
export type { UseNMEADataOptions, UseNMEADataReturn } from './useNMEAData';

export { useConnection } from './useConnection';
export type { UseConnectionOptions, UseConnectionReturn } from './useConnection';

export { useWidgetConfig } from './useWidgetConfig';
export type { UseWidgetConfigOptions, UseWidgetConfigReturn } from './useWidgetConfig';

export { useWidgetExpanded } from './useWidgetExpanded';

export { useAlarmThreshold } from './useAlarmThreshold';
export type { 
  UseAlarmThresholdOptions, 
  UseAlarmThresholdReturn,
  AlarmThreshold 
} from './useAlarmThreshold';

export { useUnitConversion } from './useUnitConversion';
export type { 
  UseUnitConversionOptions, 
  UseUnitConversionReturn,
  UnitSystem,
  UnitDefinition,
  ConversionPreference 
} from './useUnitConversion';

// Story 13.2.2 - Platform Input Component Hooks
export { useInputFocus } from './useInputFocus';
export type { UseInputFocusReturn } from './useInputFocus';

export { useTouchTargetSize } from './useTouchTargetSize';

export { useInputValidation } from './useInputValidation';
export type { 
  ValidatorFunction,
  UseInputValidationReturn 
} from './useInputValidation';

export { useHapticFeedback } from './useHapticFeedback';
export type { UseHapticFeedbackReturn } from './useHapticFeedback';

// Import hooks for combined usage
import { useConnection } from './useConnection';
import { useNMEAData } from './useNMEAData';
import { useWidgetConfig } from './useWidgetConfig';
import { useUnitConversion } from './useUnitConversion';

// Re-export commonly used hook combinations
export const useDataWithConnection = () => {
  const connectionHook = useConnection();
  const dataHook = useNMEAData({
    enableRealTimeUpdates: connectionHook.isConnected,
  });
  
  return {
    ...connectionHook,
    ...dataHook,
    isDataReady: connectionHook.isConnected && dataHook.isValid,
  };
};

export const useWidgetWithUnits = (widgetId: string) => {
  const widgetHook = useWidgetConfig({ widgetId });
  const unitsHook = useUnitConversion();
  
  return {
    ...widgetHook,
    ...unitsHook,
    formatValue: (value: number, unit: string) => 
      unitsHook.formatWithPreferred(value, unit),
  };
};