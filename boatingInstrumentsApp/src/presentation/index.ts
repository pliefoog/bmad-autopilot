/**
 * Data Presentation System - Main Exports
 * 
 * Clean semantic alternative to complex unit conversion system.
 * 
 * Usage:
 * import { useDepthPresentation } from '../presentation';
 * const depth = useDepthPresentation();
 * const display = depth.formatWithSymbol(5.2); // "5.2 m" or "17.1 ft" etc.
 */

// Core types and data
export { DATA_CATEGORIES } from './categories';
export type { DataCategory } from './categories';

export { PRESENTATIONS } from './presentations';
export type { Presentation, CategoryPresentations } from './presentations';
export { 
  getPresentationsForCategory,
  getDefaultPresentation, 
  findPresentation,
  getPresentationsForRegion
} from './presentations';

// Settings store
export { usePresentationStore } from './presentationStore';
export type { PresentationSettings } from './presentationStore';
export {
  useCurrentPresentation,
  usePresentationSetter,
  useMarineRegion,
  useMarineRegionSetter,
  useAllPresentationSelections,
  usePresentationReset
} from './presentationStore';

// Main presentation hook
export { useDataPresentation } from './useDataPresentation';
export type { DataPresentationResult } from './useDataPresentation';
export {
  useDepthPresentation,
  useSpeedPresentation,
  useWindPresentation,
  useTemperaturePresentation,
  useMultiValuePresentation,
  useBatchPresentation,
  hasPresentations
} from './useDataPresentation';
