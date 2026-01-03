/**
 * HelpContentProvider - Manages help content delivery, search, and caching
 *
 * Features:
 * - Remote content updates without app updates
 * - Offline-first with local caching
 * - Full-text search across help content
 * - Multilingual content support
 * - Content versioning
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HelpContent, HelpSearchResult, HelpContentType } from './types';

// Simple network check helper (can be replaced with @react-native-community/netinfo)
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
}

const CONTENT_CACHE_KEY = '@bmad:help_content';
const CONTENT_VERSION_KEY = '@bmad:help_content_version';
const DEFAULT_LANGUAGE = 'en';

// Remote content URL (configurable)
const REMOTE_CONTENT_URL = 'https://help.bmadautopilot.com/content.json';

export class HelpContentProvider {
  private static instance: HelpContentProvider;
  private content: Map<string, HelpContent> = new Map();
  private currentLanguage: string = DEFAULT_LANGUAGE;
  private contentVersion: string = '1.0.0';
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): HelpContentProvider {
    if (!HelpContentProvider.instance) {
      HelpContentProvider.instance = new HelpContentProvider();
    }
    return HelpContentProvider.instance;
  }

  /**
   * Initialize with default content and load cache
   */
  public async initialize(
    defaultContent: HelpContent[],
    language: string = DEFAULT_LANGUAGE,
  ): Promise<void> {
    this.currentLanguage = language;

    // Load cached content first
    await this.loadCachedContent();

    // Add default content if cache is empty
    if (this.content.size === 0) {
      defaultContent.forEach((content) => {
        this.content.set(content.id, content);
      });
      await this.cacheHelpContent(defaultContent);
    }

    // Try to update from remote in background
    this.updateHelpContent().catch((err) => {
      console.warn('[HelpContentProvider] Background update failed:', err);
    });

    this.isInitialized = true;
  }

  /**
   * Get help content by ID
   */
  public async getHelpContent(contentId: string, language?: string): Promise<HelpContent | null> {
    const lang = language || this.currentLanguage;

    // Try exact match first
    let content = this.content.get(contentId);

    // Try with language suffix
    if (!content && lang !== DEFAULT_LANGUAGE) {
      content = this.content.get(`${contentId}_${lang}`);
    }

    // Fallback to default language
    if (!content) {
      content = this.content.get(contentId);
    }

    if (!content) {
      console.warn(`[HelpContentProvider] Content not found: ${contentId}`);
      return null;
    }

    return content;
  }

  /**
   * Get content by type
   */
  public getContentByType(type: HelpContentType): HelpContent[] {
    return Array.from(this.content.values()).filter((c) => c.type === type);
  }

  /**
   * Get content by category
   */
  public getContentByCategory(category: string): HelpContent[] {
    return Array.from(this.content.values()).filter((c) => c.category === category);
  }

  /**
   * Search help content
   */
  public async searchHelpContent(query: string, limit: number = 10): Promise<HelpSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    const results: (HelpSearchResult & { score: number })[] = [];

    this.content.forEach((content) => {
      let score = 0;

      // Search in title (highest weight)
      const titleLower = content.title.toLowerCase();
      searchTerms.forEach((term) => {
        if (titleLower.includes(term)) {
          score += 10;
        }
      });

      // Search in description
      const descLower = content.description.toLowerCase();
      searchTerms.forEach((term) => {
        if (descLower.includes(term)) {
          score += 5;
        }
      });

      // Search in tags
      content.tags.forEach((tag) => {
        const tagLower = tag.toLowerCase();
        searchTerms.forEach((term) => {
          if (tagLower.includes(term)) {
            score += 3;
          }
        });
      });

      // Search in content (lowest weight)
      const contentLower = content.content.toLowerCase();
      searchTerms.forEach((term) => {
        if (contentLower.includes(term)) {
          score += 1;
        }
      });

      if (score > 0) {
        // Extract snippet around first match
        const firstTerm = searchTerms[0];
        const contentIndex = contentLower.indexOf(firstTerm);
        const snippetStart = Math.max(0, contentIndex - 50);
        const snippetEnd = Math.min(content.content.length, contentIndex + 150);
        const snippet =
          (snippetStart > 0 ? '...' : '') +
          content.content.substring(snippetStart, snippetEnd) +
          (snippetEnd < content.content.length ? '...' : '');

        results.push({
          contentId: content.id,
          title: content.title,
          snippet: snippet || content.description,
          type: content.type,
          relevanceScore: score,
          category: content.category,
          score,
        });
      }
    });

    // Sort by relevance and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(({ score, ...result }) => result);
  }

  /**
   * Update help content from remote source
   */
  public async updateHelpContent(): Promise<boolean> {
    try {
      // Check network connectivity
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        return false;
      }

      const response = await fetch(REMOTE_CONTENT_URL, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': this.currentLanguage,
        },
        cache: 'no-cache',
      });

      if (!response.ok) {
        console.warn(`[HelpContentProvider] Remote fetch failed: ${response.status}`);
        return false;
      }

      const data = await response.json();
      const { version, content } = data;

      // Check if update is needed
      if (version === this.contentVersion) {
        return false;
      }

      // Update content
      const newContent = content as HelpContent[];
      newContent.forEach((item) => {
        // Convert date strings to Date objects
        item.lastUpdated = new Date(item.lastUpdated);
        this.content.set(item.id, item);
      });

      this.contentVersion = version;

      // Cache updated content
      await this.cacheHelpContent(newContent);
      await AsyncStorage.setItem(CONTENT_VERSION_KEY, version);

      return true;
    } catch (error) {
      console.error('[HelpContentProvider] Update failed:', error);
      return false;
    }
  }

  /**
   * Cache help content locally
   */
  public async cacheHelpContent(content: HelpContent[]): Promise<void> {
    try {
      const cacheData = content.map((item) => ({
        ...item,
        lastUpdated: item.lastUpdated.toISOString(),
      }));

      await AsyncStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[HelpContentProvider] Cache save failed:', error);
    }
  }

  /**
   * Load cached content from storage
   */
  private async loadCachedContent(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CONTENT_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as HelpContent[];
        data.forEach((item) => {
          // Convert date strings back to Date objects
          item.lastUpdated = new Date(item.lastUpdated);
          this.content.set(item.id, item);
        });

        const version = await AsyncStorage.getItem(CONTENT_VERSION_KEY);
        if (version) {
          this.contentVersion = version;
        }
      }
    } catch (error) {
      console.error('[HelpContentProvider] Cache load failed:', error);
    }
  }

  /**
   * Set current language
   */
  public setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * Get current language
   */
  public getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get content version
   */
  public getVersion(): string {
    return this.contentVersion;
  }

  /**
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get all content IDs
   */
  public getContentIds(): string[] {
    return Array.from(this.content.keys());
  }

  /**
   * Get content count
   */
  public getContentCount(): number {
    return this.content.size;
  }

  /**
   * Clear all cached content (for testing/reset)
   */
  public async clearCache(): Promise<void> {
    this.content.clear();
    this.contentVersion = '1.0.0';
    await AsyncStorage.multiRemove([CONTENT_CACHE_KEY, CONTENT_VERSION_KEY]);
  }

  /**
   * Add or update single content item
   */
  public addContent(content: HelpContent): void {
    this.content.set(content.id, content);
  }

  /**
   * Remove content item
   */
  public removeContent(contentId: string): boolean {
    return this.content.delete(contentId);
  }

  /**
   * Get related content
   */
  public async getRelatedContent(contentId: string, limit: number = 5): Promise<HelpContent[]> {
    const content = await this.getHelpContent(contentId);
    if (!content || !content.relatedContent) {
      return [];
    }

    const related: HelpContent[] = [];
    for (const relatedId of content.relatedContent) {
      const relatedContent = await this.getHelpContent(relatedId);
      if (relatedContent) {
        related.push(relatedContent);
        if (related.length >= limit) {
          break;
        }
      }
    }

    return related;
  }
}

// Export singleton instance
export default HelpContentProvider.getInstance();
