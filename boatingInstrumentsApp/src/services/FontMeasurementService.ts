/**
 * Font Measurement Service
 *
 * Platform-specific text measurement with aggressive caching for layout stability.
 * Provides pixel-accurate measurements for marine instrument displays.
 */

import { Platform } from 'react-native';
import { PresentationFormat } from '../presentation/presentations';

interface FontMetrics {
  width: number;
  height: number;
  baseline: number;
}

interface MeasurementKey {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
}

/**
 * LRU Cache for font measurements with performance tracking
 */
class LRUMeasurementCache {
  private cache = new Map<string, FontMetrics>();
  private accessOrder: string[] = [];
  private maxSize = 500;
  private hits = 0;
  private misses = 0;

  get(key: string): FontMetrics | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      this.updateAccessOrder(key);
      return value;
    }
    this.misses++;
    return undefined;
  }

  set(key: string, value: FontMetrics): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      memoryEstimate: this.cache.size * 100, // Rough estimate: ~100 bytes per entry
      keys: Array.from(this.cache.keys()), // For debugging/testing
    };
  }
}

/**
 * Font Measurement Service with platform-specific implementations and aggressive caching
 */
export class FontMeasurementService {
  private static measurementCache = new LRUMeasurementCache();
  private static canvas: HTMLCanvasElement | null = null;
  private static canvasContext: CanvasRenderingContext2D | null = null;

  /**
   * Generate cache key from measurement parameters
   */
  private static getCacheKey(key: MeasurementKey): string {
    return `${key.text}|${key.fontSize}|${key.fontFamily}|${key.fontWeight}`;
  }

  /**
   * Initialize canvas for web platform measurements
   */
  private static initializeCanvas(): CanvasRenderingContext2D {
    if (!this.canvasContext) {
      if (typeof document !== 'undefined') {
        this.canvas = document.createElement('canvas');
        this.canvasContext = this.canvas.getContext('2d');
      } else {
        throw new Error('Canvas API not available - web platform required');
      }
    }
    return this.canvasContext!;
  }

  /**
   * Measure text using Canvas API (Web platform)
   */
  private static measureTextWeb(key: MeasurementKey): FontMetrics {
    const ctx = this.initializeCanvas();

    // Set font properties
    ctx.font = `${key.fontWeight} ${key.fontSize}px ${key.fontFamily}`;

    // Measure text
    const metrics = ctx.measureText(key.text);

    return {
      width: metrics.width,
      height: key.fontSize * 1.2, // Approximate line height
      baseline: key.fontSize * 0.8, // Approximate baseline
    };
  }

  /**
   * Measure text using React Native platform APIs
   */
  private static measureTextNative(key: MeasurementKey): FontMetrics {
    // For React Native, we'll use estimated measurements based on font metrics
    // In a real implementation, you'd use platform-specific measurement APIs

    const charWidth = key.fontSize * 0.6; // Approximate character width
    const estimatedWidth = key.text.length * charWidth;

    return {
      width: estimatedWidth,
      height: key.fontSize * 1.2,
      baseline: key.fontSize * 0.8,
    };
  }

  /**
   * Measure text with caching - main public interface
   */
  static measureText(
    text: string,
    fontSize: number,
    fontFamily: string = 'system',
    fontWeight: string = 'normal',
  ): FontMetrics {
    const key: MeasurementKey = { text, fontSize, fontFamily, fontWeight };
    const cacheKey = this.getCacheKey(key);

    // Check cache first
    const cachedMetrics = this.measurementCache.get(cacheKey);
    if (cachedMetrics !== undefined) {
      return cachedMetrics;
    }

    // Measure based on platform
    let metrics: FontMetrics;

    if (Platform.OS === 'web') {
      metrics = this.measureTextWeb(key);
    } else {
      metrics = this.measureTextNative(key);
    }

    // Cache result
    this.measurementCache.set(cacheKey, metrics);

    return metrics;
  }

  /**
   * Calculate optimal width from presentation format test cases
   */
  static calculateOptimalWidth(
    format: PresentationFormat,
    fontSize: number,
    fontFamily: string = 'system',
    fontWeight: string = 'normal',
  ): number {
    const { layoutRanges } = format;

    // Generate test strings from layoutRanges
    const testStrings: string[] = [];

    // Format test values according to the presentation format
    if (format.pattern.includes('.')) {
      // Decimal format
      testStrings.push(
        layoutRanges.min.toFixed(format.decimals),
        layoutRanges.max.toFixed(format.decimals),
        layoutRanges.typical.toFixed(format.decimals),
      );
    } else if (format.pattern.includes('Bf (Description)')) {
      // Beaufort format - use longest description
      testStrings.push('0 Bf (Calm)', '12 Bf (Hurricane)', '6 Bf (Strong Breeze)');
    } else {
      // Integer format
      testStrings.push(
        Math.round(layoutRanges.min).toString(),
        Math.round(layoutRanges.max).toString(),
        Math.round(layoutRanges.typical).toString(),
      );
    }

    // Add pattern-based test strings for worst-case scenarios
    if (format.pattern === 'xxx.x') {
      testStrings.push('999.9', '000.0', '123.4', '-99.9');
    } else if (format.pattern === 'xxxx.x') {
      testStrings.push('9999.9', '0000.0', '1234.5');
    } else if (format.pattern === 'xxx') {
      testStrings.push('999', '000', '123', '-99');
    } else if (format.pattern.includes('°') && format.pattern.includes('′')) {
      // Coordinate patterns (DDM, DMS)
      testStrings.push('179° 59.999′ W', '89° 59.999′ S', '0° 0.000′ N');
    } else if (format.pattern.includes('°')) {
      // Angle patterns (degrees only)
      testStrings.push('359°', '0°', '180°');
    }

    // Measure all test strings and find maximum width
    let maxWidth = 0;

    testStrings.forEach((text) => {
      const metrics = this.measureText(text, fontSize, fontFamily, fontWeight);
      maxWidth = Math.max(maxWidth, metrics.width);
    });

    // Add padding for layout stability (10% margin)
    return Math.ceil(maxWidth * 1.1);
  }

  /**
   * Clear measurement cache (for testing or memory management)
   */
  static clearCache(): void {
    this.measurementCache.clear();
  }

  /**
   * Get cache statistics (for debugging and performance monitoring)
   */
  static getCacheStats() {
    return this.measurementCache.getStats();
  }

  /**
   * Preload measurements for common marine display values
   */
  static preloadMarineMeasurements(
    fontSize: number,
    fontFamily: string = 'system',
    fontWeight: string = 'normal',
  ): void {
    // Common marine values to preload
    const commonValues = [
      // Speed values
      '0.0',
      '5.2',
      '12.5',
      '25.8',
      '99.9',
      // Depth values
      '1.2',
      '15.5',
      '999.9',
      '50.0',
      // Wind values
      '0 Bf (Calm)',
      '4 Bf (Moderate Breeze)',
      '8 Bf (Gale)',
      // Temperature values
      '22.5',
      '-5.0',
      '35.2',
    ];

    commonValues.forEach((value) => {
      this.measureText(value, fontSize, fontFamily, fontWeight);
    });
  }
}
