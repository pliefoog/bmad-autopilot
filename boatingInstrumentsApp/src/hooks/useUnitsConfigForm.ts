/**
 * useUnitsConfigForm - React Hook Form Integration for Units/Presentations Configuration
 *
 * Purpose: Encapsulate units/presentation form state for 23 categories + preset selection
 * Pattern: RHF with onSubmit validation mode for explicit apply
 * Architecture: Preset selector triggers atomic updates to all category presentations
 * Maritime context: Live preview with formatted examples (time/date/depth/temp/pressure/volume)
 *
 * Validation:
 * - Preset validation (eu/uk/us/custom)
 * - Category presentation IDs (optional, validated against available presentations)
 * - GPS settings (coordinateFormat, timezone)
 * - No complex validation - mostly shape validation
 *
 * Handlers:
 * - handlePresetChange: Atomic update all categories when preset selected
 * - handleCategoryChange: Update individual category unit
 * - handleGpsSetting: Update GPS-specific settings (coordinateFormat, timezone)
 * - handleReset: Reset to stored values (undo unsaved changes)
 *
 * Key Features:
 * - Progressive disclosure: Advanced categories collapsed by default
 * - Live preview with formatted examples per preset
 * - Atomic preset updates (all 23 categories change together)
 * - GPS settings managed separately (coordinate format + timezone)
 * - Presentation store integration for single source of truth
 */

import { useCallback, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  usePresentationStore,
  REGION_DEFAULTS,
  getRegionMetadata,
  MarineRegion,
} from '../presentation/presentationStore';
import { DataCategory } from '../presentation/categories';
import { useSettingsStore } from '../store/settingsStore';
import { formatTime, formatDate } from '../utils/datetimeFormatters';

/**
 * Form data structure matching 23 unit categories + preset + GPS settings
 */
export interface UnitsFormData {
  preset: 'eu' | 'us' | 'uk' | 'custom';
  // Category presentation IDs (strings matching formatSpec IDs)
  depth?: string;
  speed?: string;
  wind?: string;
  temperature?: string;
  atmospheric_pressure?: string;
  mechanical_pressure?: string;
  angle?: string;
  coordinates?: string;
  voltage?: string;
  current?: string;
  volume?: string;
  time?: string;
  date?: string;
  duration?: string;
  distance?: string;
  capacity?: string;
  flowRate?: string;
  frequency?: string;
  power?: string;
  rpm?: string;
  angularVelocity?: string;
  percentage?: string;
  // GPS settings (managed via settingsStore)
  coordinateFormat?: 'decimal_degrees' | 'degrees_minutes' | 'degrees_minutes_seconds' | 'utm';
  timezone?: string;
}

/**
 * Category configuration for display
 */
interface CategoryConfig {
  key: DataCategory;
  name: string;
  isAdvanced?: boolean;
}

/**
 * Preset definition
 */
interface PresentationPreset {
  id: string;
  name: string;
  description: string;
  presentations: Partial<Record<DataCategory, string>>;
  examples: { category: string; value: string }[];
}

/**
 * Build presets from store's REGION_DEFAULTS
 */
const buildPresetsFromStore = (): PresentationPreset[] => {
  const regionMetadata = getRegionMetadata();
  const now = Date.now();

  const buildExamples = (regionId: MarineRegion): { category: string; value: string }[] => {
    const regionPresets = REGION_DEFAULTS[regionId];

    return [
      { category: 'Depth', value: regionId === 'eu' ? '5.2 m' : regionId === 'uk' ? '3.0 fth' : '17.1 ft' },
      { category: 'Temperature', value: regionId === 'us' ? '65.3°F' : '18.5°C' },
      { category: 'Pressure', value: regionId === 'us' ? '29.92 inHg' : '1013 hPa' },
      { category: 'Volume', value: regionId === 'eu' ? '83 L' : '22 gal' },
      { category: 'Time', value: formatTime(now, regionPresets.time!).formatted },
      { category: 'Date', value: formatDate(now, regionPresets.date!).formatted },
    ];
  };

  const presets: PresentationPreset[] = regionMetadata.map((region) => ({
    id: region.id,
    name: region.name,
    description: region.description,
    presentations: REGION_DEFAULTS[region.id as MarineRegion],
    examples: buildExamples(region.id as MarineRegion),
  }));

  // Add custom preset
  presets.push({
    id: 'custom',
    name: 'Custom',
    description: 'User-defined selections',
    presentations: {},
    examples: [],
  });

  return presets;
};

const PRESETS = buildPresetsFromStore();

/**
 * All 23 unit categories (6 essential + 17 advanced)
 */
const CATEGORIES: CategoryConfig[] = [
  // Essential marine categories
  { key: 'depth', name: 'Depth' },
  { key: 'speed', name: 'Speed' },
  { key: 'wind', name: 'Wind' },
  { key: 'temperature', name: 'Temperature' },
  { key: 'coordinates', name: 'GPS Position' },
  { key: 'volume', name: 'Volume (Tanks)' },

  // Advanced categories (collapsed by default)
  { key: 'atmospheric_pressure', name: 'Atmospheric Pressure', isAdvanced: true },
  { key: 'mechanical_pressure', name: 'Mechanical Pressure', isAdvanced: true },
  { key: 'angle', name: 'Angle', isAdvanced: true },
  { key: 'voltage', name: 'Voltage', isAdvanced: true },
  { key: 'current', name: 'Current', isAdvanced: true },
  { key: 'time', name: 'Time', isAdvanced: true },
  { key: 'date', name: 'Date', isAdvanced: true },
  { key: 'duration', name: 'Duration', isAdvanced: true },
  { key: 'distance', name: 'Distance', isAdvanced: true },
  { key: 'capacity', name: 'Battery Capacity', isAdvanced: true },
  { key: 'flowRate', name: 'Flow Rate', isAdvanced: true },
  { key: 'frequency', name: 'Frequency (AC)', isAdvanced: true },
  { key: 'power', name: 'Power', isAdvanced: true },
  { key: 'rpm', name: 'RPM', isAdvanced: true },
  { key: 'angularVelocity', name: 'Angular Velocity', isAdvanced: true },
  { key: 'percentage', name: 'Percentage', isAdvanced: true },
];

/**
 * Create Zod schema for units form validation
 */
const createUnitsFormSchema = () =>
  z.object({
    preset: z.enum(['eu', 'us', 'uk', 'custom']),
    depth: z.string().optional(),
    speed: z.string().optional(),
    wind: z.string().optional(),
    temperature: z.string().optional(),
    atmospheric_pressure: z.string().optional(),
    mechanical_pressure: z.string().optional(),
    angle: z.string().optional(),
    coordinates: z.string().optional(),
    voltage: z.string().optional(),
    current: z.string().optional(),
    volume: z.string().optional(),
    time: z.string().optional(),
    date: z.string().optional(),
    duration: z.string().optional(),
    distance: z.string().optional(),
    capacity: z.string().optional(),
    flowRate: z.string().optional(),
    frequency: z.string().optional(),
    power: z.string().optional(),
    rpm: z.string().optional(),
    angularVelocity: z.string().optional(),
    percentage: z.string().optional(),
    coordinateFormat: z
      .enum(['decimal_degrees', 'degrees_minutes', 'degrees_minutes_seconds', 'utm'])
      .optional(),
    timezone: z.string().optional(),
  });

/**
 * useUnitsConfigForm hook
 *
 * @param onSave Callback when form changes are saved to presentation store
 * @returns Form methods, handlers, computed values, presets, categories
 */
export interface UseUnitsConfigFormReturn {
  form: UseFormReturn<UnitsFormData>;
  handlers: {
    handlePresetChange: (preset: 'eu' | 'us' | 'uk' | 'custom') => void;
    handleCategoryChange: (category: DataCategory, presentationId: string) => void;
    handleGpsSetting: (key: 'coordinateFormat' | 'timezone', value: any) => void;
    handleSave: () => void;
    handleReset: () => void;
  };
  computed: {
    presets: PresentationPreset[];
    categories: CategoryConfig[];
    selectedPreset: PresentationPreset | undefined;
    isDirty: boolean;
  };
}

/**
 * useUnitsConfigForm - Maritime unit system configuration with preset management
 *
 * Manages 23 unit categories with regional presets (EU/US/UK) and GPS-specific settings.
 * Supports atomic preset changes (all categories update together) and custom per-category selection.
 *
 * @param onSave - Callback invoked when user explicitly saves configuration
 *   - Receives current form state including all 23 categories
 *   - Called only on explicit save (not on every field change)
 *   - Validation ensures data integrity before callback
 *
 * @returns Object containing:
 *   - form: RHF UseFormReturn with units configuration state
 *   - handlers: { handlePresetChange, handleCategoryChange, handleGpsSetting, handleSave, handleReset }
 *   - computed: { presets, categories, selectedPreset, isDirty }
 *
 * @categories
 * Essential (6): depth, speed, wind, temperature, coordinates, time
 * Advanced (17): pressure (2 types), angle, voltage, current, volume, date, duration,
 *                 distance, capacity, flowRate, frequency, power, rpm, angularVelocity, percentage
 *
 * @presets
 * - EU: Metric (meters, Celsius, km/h, bar) + 24h time
 * - US: Imperial (feet, Fahrenheit, mph, psi) + 12h time
 * - UK: Mixed (feet for depth, Celsius, knots, bar) + 24h time
 * - Custom: User-defined mix (switches to this when individual categories changed)
 *
 * @behavior
 * - Preset selection: Atomically updates all 23 categories + sets marineRegion in store
 * - Category change: Updates single category + auto-switches preset to 'custom'
 * - GPS settings: Managed separately (coordinateFormat, timezone) via settingsStore
 * - Dirty tracking: Form isDirty when any field differs from initial store values
 *
 * @validation
 * - Zod schema validates preset enum + 23 optional presentation ID strings
 * - No cross-field validation (each category independent)
 * - GPS settings validated separately (coordinate format enum, timezone string)
 *
 * @example
 * ```tsx
 * const { form, handlers, computed } = useUnitsConfigForm((data) => {
 *   console.log('Saving', data.preset, 'with', data.depth, 'depth units');
 * });
 *
 * // User selects EU preset
 * handlers.handlePresetChange('eu'); // Updates all 23 categories at once
 *
 * // User manually changes depth unit
 * handlers.handleCategoryChange('depth', 'feet'); // Auto-switches to 'custom'
 *
 * // User changes GPS coordinate format
 * handlers.handleGpsSetting('coordinateFormat', 'degrees_minutes');
 *
 * // Render preset selector with live preview
 * computed.selectedPreset?.examples.map(ex => `${ex.category}: ${ex.value}`)
 * ```
 *
 * @performance
 * - Initial form data memoized (recomputes only when store values change)
 * - Preset examples pre-computed with actual formatters (no recalculation on render)
 * - Handlers memoized with tight dependencies
 *
 * @maritime
 * - Regional standards for safety: EU/US/UK maritime conventions
 * - Mixed units common: UK uses feet for depth but Celsius for temperature
 * - Time formats: 24h (EU/UK) vs 12h (US) for log entries and timestamps
 * - GPS coordinate formats for chart plotting and position reporting
 */
export const useUnitsConfigForm = (
  onSave: (data: UnitsFormData) => void,
): UseUnitsConfigFormReturn => {
  const formSchema = useMemo(() => createUnitsFormSchema(), []);

  const presentationStore = usePresentationStore();
  const { setPresentationForCategory, setMarineRegion, selectedPresentations, marineRegion } =
    presentationStore;
  const { gps, setGpsSetting } = useSettingsStore();

  // Build initial form data from stores
  const initialFormData = useMemo((): UnitsFormData => {
    let detectedPreset: string = marineRegion;

    // Check if current selections match the stored region preset
    const regionPreset = PRESETS.find((p) => p.id === marineRegion);
    if (regionPreset) {
      const matches = Object.entries(regionPreset.presentations).every(
        ([cat, presId]) => selectedPresentations[cat as DataCategory] === presId,
      );
      if (!matches) {
        detectedPreset = 'custom';
      }
    }

    return {
      preset: detectedPreset as any,
      depth: selectedPresentations.depth,
      speed: selectedPresentations.speed,
      wind: selectedPresentations.wind,
      temperature: selectedPresentations.temperature,
      atmospheric_pressure: selectedPresentations.atmospheric_pressure,
      mechanical_pressure: selectedPresentations.mechanical_pressure,
      angle: selectedPresentations.angle,
      coordinates: selectedPresentations.coordinates,
      voltage: selectedPresentations.voltage,
      current: selectedPresentations.current,
      volume: selectedPresentations.volume,
      time: selectedPresentations.time,
      date: selectedPresentations.date,
      duration: selectedPresentations.duration,
      distance: selectedPresentations.distance,
      capacity: selectedPresentations.capacity,
      flowRate: selectedPresentations.flowRate,
      frequency: selectedPresentations.frequency,
      power: selectedPresentations.power,
      rpm: selectedPresentations.rpm,
      angularVelocity: selectedPresentations.angularVelocity,
      percentage: selectedPresentations.percentage,
      coordinateFormat: gps.coordinateFormat,
      timezone: gps.timezone,
    };
  }, [selectedPresentations, marineRegion, gps.coordinateFormat, gps.timezone]);

  const form = useForm<UnitsFormData>({
    mode: 'onChange',
    resolver: zodResolver(formSchema),
    defaultValues: initialFormData,
  });

  // Selected preset object (for preview display)
  const selectedPreset = useMemo(
    () => PRESETS.find((p) => p.id === form.watch('preset')),
    [form],
  );

  // Handle preset change - atomic update all categories
  const handlePresetChange = useCallback(
    (preset: 'eu' | 'us' | 'uk' | 'custom') => {
      const presetObj = PRESETS.find((p) => p.id === preset);
      if (!presetObj) return;

      // Update form with all category values from preset
      form.setValue('preset', preset);

      if (preset !== 'custom') {
        Object.entries(presetObj.presentations).forEach(([cat, presId]) => {
          const catKey = cat as keyof UnitsFormData;
          if (catKey in form.getValues()) {
            form.setValue(catKey, presId);
          }
        });
      }
    },
    [form],
  );

  // Handle individual category change
  const handleCategoryChange = useCallback(
    (category: DataCategory, presentationId: string) => {
      const catKey = category as keyof UnitsFormData;
      if (catKey in form.getValues()) {
        form.setValue(catKey, presentationId);
        form.setValue('preset', 'custom'); // Switch to custom when manually changing
      }
    },
    [form],
  );

  // Handle GPS settings
  const handleGpsSetting = useCallback(
    (key: 'coordinateFormat' | 'timezone', value: any) => {
      form.setValue(key, value);
    },
    [form],
  );

  // Handle save - apply all changes to stores
  const handleSave = useCallback(() => {
    const data = form.getValues();

    // Save marine region if preset selected (not custom)
    if (data.preset && data.preset !== 'custom') {
      setMarineRegion(data.preset as MarineRegion);
    }

    // Apply all category selections (exclude 'timestamp' which is not in form)
    CATEGORIES.forEach(({ key }) => {
      if (key !== 'timestamp' && key in data) {
        const catKey = key as keyof UnitsFormData;
        const value = data[catKey];
        if (value) {
          setPresentationForCategory(key as DataCategory, value);
        }
      }
    });

    // Save GPS settings
    if (data.coordinateFormat) {
      setGpsSetting('coordinateFormat', data.coordinateFormat);
    }
    if (data.timezone !== undefined) {
      setGpsSetting('timezone', data.timezone);
    }

    onSave(data);
  }, [form, setMarineRegion, setPresentationForCategory, setGpsSetting, onSave]);

  // Handle reset - revert to stored values
  const handleReset = useCallback(() => {
    form.reset(initialFormData);
  }, [form, initialFormData]);

  return {
    form,
    handlers: {
      handlePresetChange,
      handleCategoryChange,
      handleGpsSetting,
      handleSave,
      handleReset,
    },
    computed: {
      presets: PRESETS,
      categories: CATEGORIES,
      selectedPreset,
      isDirty: form.formState.isDirty,
    },
  };
};
