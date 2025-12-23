/**
 * ConversionRegistry - Centralized Conversion Utility
 *
 * **Purpose:**
 * Single source of truth for all SI ↔ display unit conversions.
 * Replaces scattered conversion logic and eliminates duplication.
 *
 * **Architecture:**
 * - Lazy initialization (safe import order, no circular dependencies)
 * - Presentation caching (load once, invalidate on preference changes)
 * - Version tracking (invalidates cache when presentations update)
 * - Fail-fast validation (no silent fallbacks)
 *
 * **Usage:**
 * ```typescript
 * // Convert SI to display
 * const displayValue = ConversionRegistry.convertToDisplay(2.5, 'depth');
 *
 * // Convert display to SI
 * const siValue = ConversionRegistry.convertToSI(8.2, 'depth');
 *
 * // Format value
 * const formatted = ConversionRegistry.format(8.2, 'depth', true); // "8.2 ft"
 *
 * // Get unit symbol
 * const unit = ConversionRegistry.getUnit('depth'); // "ft"
 * ```
 *
 * **Benefits:**
 * - ✅ Single location for all conversions
 * - ✅ Automatic cache invalidation on preference changes
 * - ✅ Lazy initialization (no module-load side effects)
 * - ✅ Type-safe with DataCategory enum
 * - ✅ Comprehensive logging for debugging
 */

import { DataCategory } from '../presentation/categories';
import { usePresentationStore } from '../presentation/presentationStore';
import { log } from './logging/logger';

/**
 * Cached presentation data with version tracking
 */
interface CachedPresentation {
  category: DataCategory;
  presentation: any; // Presentation object from store
  version: number; // For cache invalidation
}

/**
 * Conversion Registry Service
 * Singleton providing centralized unit conversion and formatting
 */
class ConversionRegistryService {
  private cache: Map<DataCategory, CachedPresentation> = new Map();
  private initialized = false;
  private currentVersion = 0;
  private unsubscribe?: () => void;

  /**
   * Lazy initialization - called on first use
   * Safe import order: doesn't require stores at module load time
   * Subscribes to presentation store changes for cache invalidation
   */
  private initialize(): void {
    if (this.initialized) return;

    // Subscribe to presentation changes for cache invalidation
    this.unsubscribe = usePresentationStore.subscribe((state, prevState) => {
      if (state.selectedPresentations !== prevState.selectedPresentations) {
        this.currentVersion++;
        this.cache.clear();

        log.app('Presentation cache invalidated', () => ({
          version: this.currentVersion,
          reason: 'User preference changed',
        }));
      }
    });

    this.initialized = true;

    log.app('ConversionRegistry initialized', () => ({
      version: this.currentVersion,
    }));
  }

  /**
   * Get cached presentation for category
   * Loads from store on cache miss and caches for subsequent calls
   *
   * @throws Error if presentation not found for category
   */
  private getPresentation(category: DataCategory): any {
    this.initialize();

    // Check cache
    const cached = this.cache.get(category);
    if (cached && cached.version === this.currentVersion) {
      return cached.presentation;
    }

    // Cache miss - load from store
    const presentation = usePresentationStore.getState().getPresentationForCategory(category);

    if (!presentation) {
      const error = new Error(
        `No presentation config found for category: ${category}. ` +
          `Check SensorConfigRegistry and ensure category is registered.`,
      );
      log.app('Presentation lookup failed', () => ({
        category,
        availableCategories: Object.keys(usePresentationStore.getState().selectedPresentations),
      }));
      throw error;
    }

    // Cache for future use
    this.cache.set(category, {
      category,
      presentation,
      version: this.currentVersion,
    });

    log.app('Presentation cached', () => ({
      category,
      version: this.currentVersion,
    }));

    return presentation;
  }

  /**
   * Convert SI value to display value
   *
   * @param siValue - Value in SI units
   * @param category - Data category (e.g., 'depth', 'temperature', 'voltage')
   * @returns Value converted to user's preferred display units
   *
   * @example
   * ConversionRegistry.convertToDisplay(2.5, 'depth') // 8.202 (if user prefers feet)
   */
  convertToDisplay(siValue: number, category: DataCategory): number {
    if (!Number.isFinite(siValue)) {
      throw new Error(`Invalid SI value: ${siValue} for category ${category}`);
    }

    const presentation = this.getPresentation(category);
    const displayValue = presentation.convert(siValue);

    log.app('Converted SI → display', () => ({
      category,
      siValue,
      displayValue,
      unit: presentation.symbol,
    }));

    return displayValue;
  }

  /**
   * Convert display value to SI value
   *
   * @param displayValue - Value in user's display units
   * @param category - Data category
   * @returns Value converted to SI units
   *
   * @example
   * ConversionRegistry.convertToSI(8.2, 'depth') // 2.499 (meters)
   */
  convertToSI(displayValue: number, category: DataCategory): number {
    if (!Number.isFinite(displayValue)) {
      throw new Error(`Invalid display value: ${displayValue} for category ${category}`);
    }

    const presentation = this.getPresentation(category);
    const siValue = presentation.convertBack(displayValue);

    log.app('Converted display → SI', () => ({
      category,
      displayValue,
      siValue,
      unit: presentation.symbol,
    }));

    return siValue;
  }

  /**
   * Format value with user's preferred pattern and unit
   *
   * @param value - Value in display units (not SI)
   * @param category - Data category
   * @param includeUnit - Whether to append unit symbol
   * @returns Formatted string
   *
   * @example
   * ConversionRegistry.format(8.2, 'depth', true)  // "8.2 ft"
   * ConversionRegistry.format(8.2, 'depth', false) // "8.2"
   */
  format(value: number, category: DataCategory, includeUnit: boolean = true): string {
    if (!Number.isFinite(value)) {
      return '---';
    }

    const presentation = this.getPresentation(category);
    const formatted = presentation.format(value); // Uses user's format pattern

    if (includeUnit) {
      return `${formatted} ${presentation.symbol}`;
    }

    return formatted;
  }

  /**
   * Get unit symbol for category
   *
   * @param category - Data category
   * @returns Unit symbol (e.g., "ft", "°C", "V")
   *
   * @example
   * ConversionRegistry.getUnit('depth') // "ft" or "m" depending on user preference
   */
  getUnit(category: DataCategory): string {
    const presentation = this.getPresentation(category);
    return presentation.symbol;
  }

  /**
   * Clear cache and reset (used in testing)
   */
  reset(): void {
    this.cache.clear();
    this.currentVersion = 0;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.initialized = false;

    log.app('ConversionRegistry reset');
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats(): { size: number; version: number; initialized: boolean } {
    return {
      size: this.cache.size,
      version: this.currentVersion,
      initialized: this.initialized,
    };
  }
}

/**
 * Singleton instance
 * Use this for all conversion operations
 */
export const ConversionRegistry = new ConversionRegistryService();
