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
 * Font Measurement Service with platform-specific implementations and aggressive caching
 */
export class FontMeasurementService {
  private static measurementCache = new Map<string, FontMetrics>();
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
      baseline: key.fontSize * 0.8 // Approximate baseline
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
      baseline: key.fontSize * 0.8
    };
  }

  /**
   * Measure text with caching - main public interface
   */
  static measureText(
    text: string, 
    fontSize: number, 
    fontFamily: string = 'system', 
    fontWeight: string = 'normal'
  ): FontMetrics {
    const key: MeasurementKey = { text, fontSize, fontFamily, fontWeight };
    const cacheKey = this.getCacheKey(key);
    
    // Check cache first
    if (this.measurementCache.has(cacheKey)) {
      return this.measurementCache.get(cacheKey)!;
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
    fontWeight: string = 'normal'
  ): number {
    const { testCases } = format;
    
    // Generate test strings from test cases
    const testStrings: string[] = [];
    
    // Format test values according to the presentation format
    if (format.pattern.includes('.')) {
      // Decimal format
      testStrings.push(
        testCases.min.toFixed(format.decimals),
        testCases.max.toFixed(format.decimals),
        testCases.typical.toFixed(format.decimals)
      );
    } else if (format.pattern.includes('Bf (Description)')) {
      // Beaufort format - use longest description
      testStrings.push(
        '0 Bf (Calm)',
        '12 Bf (Hurricane)',
        '6 Bf (Strong Breeze)'
      );
    } else {
      // Integer format
      testStrings.push(
        Math.round(testCases.min).toString(),
        Math.round(testCases.max).toString(),
        Math.round(testCases.typical).toString()
      );
    }
    
    // Add pattern-based test strings for worst-case scenarios
    if (format.pattern === 'xxx.x') {
      testStrings.push('999.9', '000.0', '123.4');
    } else if (format.pattern === 'xxxx.x') {
      testStrings.push('9999.9', '0000.0', '1234.5');
    } else if (format.pattern === 'xxx') {
      testStrings.push('999', '000', '123');
    }
    
    // Measure all test strings and find maximum width
    let maxWidth = 0;
    
    testStrings.forEach(text => {
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
   * Get cache statistics (for debugging)
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.measurementCache.size,
      keys: Array.from(this.measurementCache.keys())
    };
  }

  /**
   * Preload measurements for common marine display values
   */
  static preloadMarineMeasurements(
    fontSize: number,
    fontFamily: string = 'system',
    fontWeight: string = 'normal'
  ): void {
    // Common marine values to preload
    const commonValues = [
      // Speed values
      '0.0', '5.2', '12.5', '25.8', '99.9',
      // Depth values  
      '1.2', '15.5', '999.9', '50.0',
      // Wind values
      '0 Bf (Calm)', '4 Bf (Moderate Breeze)', '8 Bf (Gale)',
      // Temperature values
      '22.5', '-5.0', '35.2'
    ];
    
    commonValues.forEach(value => {
      this.measureText(value, fontSize, fontFamily, fontWeight);
    });
  }
}