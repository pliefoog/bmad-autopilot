import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetLayout {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
  order?: number; // For preserving widget order
  expanded?: boolean; // AC 1: Track expanded state for two-state widget system
}

export interface DashboardLayout {
  widgets: WidgetLayout[];
  gridSize?: { columns: number; rows: number };
  lastModified: string;
  version: string;
}

export interface LayoutProfile {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  isDefault?: boolean;
  created: string;
  lastUsed?: string;
}

export class LayoutService {
  private static STORAGE_KEY = '@bmad/widget_layout';
  private static PROFILES_KEY = '@bmad/layout_profiles';
  private static ACTIVE_PROFILE_KEY = '@bmad/active_profile';
  private static CURRENT_VERSION = '1.0';
  
  /**
   * Save dashboard layout to persistent storage
   */
  static async saveLayout(layout: WidgetLayout[]): Promise<void> {
    try {
      const dashboardLayout: DashboardLayout = {
        widgets: layout,
        lastModified: new Date().toISOString(),
        version: this.CURRENT_VERSION,
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(dashboardLayout));
    } catch (error) {
      console.error('Failed to save layout:', error);
      throw error;
    }
  }
  
  /**
   * Load dashboard layout from persistent storage
   */
  static async loadLayout(): Promise<WidgetLayout[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.getDefaultLayout();
      }
      
      const dashboardLayout: DashboardLayout = JSON.parse(stored);
      
      // Version migration if needed
      if (dashboardLayout.version !== this.CURRENT_VERSION) {
        return this.migrateLayout(dashboardLayout);
      }
      
      return dashboardLayout.widgets || [];
    } catch (error) {
      console.error('Failed to load layout:', error);
      return this.getDefaultLayout();
    }
  }
  
  /**
   * Reset layout to default configuration
   */
  static async resetLayout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset layout:', error);
      throw error;
    }
  }
  
  /**
   * Get default widget layout
   */
  static getDefaultLayout(): WidgetLayout[] {
    return [
      { id: 'depth', position: { x: 0, y: 0 }, size: { width: 160, height: 160 }, visible: true, order: 0, expanded: false },
      { id: 'speed', position: { x: 170, y: 0 }, size: { width: 160, height: 160 }, visible: true, order: 1, expanded: false },
      { id: 'wind', position: { x: 0, y: 170 }, size: { width: 160, height: 160 }, visible: true, order: 2, expanded: false },
      { id: 'gps', position: { x: 170, y: 170 }, size: { width: 160, height: 160 }, visible: true, order: 3, expanded: false },
      { id: 'compass', position: { x: 0, y: 340 }, size: { width: 160, height: 160 }, visible: true, order: 4, expanded: false },
      { id: 'theme', position: { x: 170, y: 340 }, size: { width: 160, height: 160 }, visible: true, order: 5, expanded: false },
    ];
  }

  /**
   * AC 3: Update widget expanded state and persist
   */
  static async updateWidgetExpanded(widgetId: string, expanded: boolean): Promise<void> {
    try {
      const layout = await this.loadLayout();
      const widgetIndex = layout.findIndex(widget => widget.id === widgetId);
      
      if (widgetIndex !== -1) {
        layout[widgetIndex].expanded = expanded;
        await this.saveLayout(layout);
      }
    } catch (error) {
      console.error('Failed to update widget expanded state:', error);
      throw error;
    }
  }

  /**
   * Get specific widget's expanded state
   */
  static async getWidgetExpanded(widgetId: string): Promise<boolean> {
    try {
      const layout = await this.loadLayout();
      const widget = layout.find(widget => widget.id === widgetId);
      return widget?.expanded || false;
    } catch (error) {
      console.error('Failed to get widget expanded state:', error);
      return false;
    }
  }
  
  /**
   * Update widget position in layout
   */
  static async updateWidgetPosition(widgetId: string, position: { x: number; y: number }): Promise<void> {
    try {
      const layout = await this.loadLayout();
      const widgetIndex = layout.findIndex(w => w.id === widgetId);
      
      if (widgetIndex >= 0) {
        layout[widgetIndex].position = position;
        await this.saveLayout(layout);
      }
    } catch (error) {
      console.error('Failed to update widget position:', error);
      throw error;
    }
  }
  
  /**
   * Update widget size in layout
   */
  static async updateWidgetSize(widgetId: string, size: { width: number; height: number }): Promise<void> {
    try {
      const layout = await this.loadLayout();
      const widgetIndex = layout.findIndex(w => w.id === widgetId);
      
      if (widgetIndex >= 0) {
        layout[widgetIndex].size = size;
        await this.saveLayout(layout);
      }
    } catch (error) {
      console.error('Failed to update widget size:', error);
      throw error;
    }
  }
  
  /**
   * Toggle widget visibility
   */
  static async toggleWidgetVisibility(widgetId: string): Promise<void> {
    try {
      const layout = await this.loadLayout();
      const widgetIndex = layout.findIndex(w => w.id === widgetId);
      
      if (widgetIndex >= 0) {
        layout[widgetIndex].visible = !layout[widgetIndex].visible;
        await this.saveLayout(layout);
      }
    } catch (error) {
      console.error('Failed to toggle widget visibility:', error);
      throw error;
    }
  }
  
  /**
   * Add widget to layout
   */
  static async addWidget(widgetId: string, position?: { x: number; y: number }): Promise<void> {
    try {
      const layout = await this.loadLayout();
      
      // Check if widget already exists
      if (layout.find(w => w.id === widgetId)) {
        return; // Widget already in layout
      }
      
      const newWidget: WidgetLayout = {
        id: widgetId,
        position: position || { x: 0, y: 0 },
        size: { width: 160, height: 160 }, // Default size
        visible: true,
        order: layout.length,
      };
      
      layout.push(newWidget);
      await this.saveLayout(layout);
    } catch (error) {
      console.error('Failed to add widget:', error);
      throw error;
    }
  }
  
  /**
   * Remove widget from layout
   */
  static async removeWidget(widgetId: string): Promise<void> {
    try {
      const layout = await this.loadLayout();
      const filteredLayout = layout.filter(w => w.id !== widgetId);
      await this.saveLayout(filteredLayout);
    } catch (error) {
      console.error('Failed to remove widget:', error);
      throw error;
    }
  }
  
  /**
   * Migrate layout to new version
   */
  private static migrateLayout(oldLayout: DashboardLayout): WidgetLayout[] {
    // For now, just return default layout
    // In future, implement proper migration logic
    console.warn(`Migrating layout from version ${oldLayout.version} to ${this.CURRENT_VERSION}`);
    return this.getDefaultLayout();
  }

  // === MULTIPLE LAYOUT PROFILES ===

  /**
   * Get all layout profiles
   */
  static async getLayoutProfiles(): Promise<LayoutProfile[]> {
    try {
      const stored = await AsyncStorage.getItem(this.PROFILES_KEY);
      if (!stored) {
        return this.getDefaultProfiles();
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to get layout profiles:', error);
      return this.getDefaultProfiles();
    }
  }

  /**
   * Save layout profile
   */
  static async saveLayoutProfile(profile: Omit<LayoutProfile, 'id' | 'created'>): Promise<string> {
    try {
      const profiles = await this.getLayoutProfiles();
      const newProfile: LayoutProfile = {
        ...profile,
        id: `profile_${Date.now()}`,
        created: new Date().toISOString(),
      };
      
      profiles.push(newProfile);
      await AsyncStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
      
      return newProfile.id;
    } catch (error) {
      console.error('Failed to save layout profile:', error);
      throw error;
    }
  }

  /**
   * Switch to layout profile
   */
  static async switchToProfile(profileId: string): Promise<WidgetLayout[]> {
    try {
      const profiles = await this.getLayoutProfiles();
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      // Update last used timestamp
      profile.lastUsed = new Date().toISOString();
      await AsyncStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
      
      // Set as active profile
      await AsyncStorage.setItem(this.ACTIVE_PROFILE_KEY, profileId);
      
      // Save the layout
      await this.saveLayout(profile.layout.widgets);
      
      return profile.layout.widgets;
    } catch (error) {
      console.error('Failed to switch to profile:', error);
      throw error;
    }
  }

  /**
   * Get active profile ID
   */
  static async getActiveProfileId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.ACTIVE_PROFILE_KEY);
    } catch (error) {
      console.error('Failed to get active profile:', error);
      return null;
    }
  }

  /**
   * Delete layout profile
   */
  static async deleteLayoutProfile(profileId: string): Promise<void> {
    try {
      const profiles = await this.getLayoutProfiles();
      const filteredProfiles = profiles.filter(p => p.id !== profileId);
      await AsyncStorage.setItem(this.PROFILES_KEY, JSON.stringify(filteredProfiles));
      
      // If this was the active profile, clear it
      const activeId = await this.getActiveProfileId();
      if (activeId === profileId) {
        await AsyncStorage.removeItem(this.ACTIVE_PROFILE_KEY);
      }
    } catch (error) {
      console.error('Failed to delete layout profile:', error);
      throw error;
    }
  }

  /**
   * Export layout profiles
   */
  static async exportLayouts(): Promise<string> {
    try {
      const profiles = await this.getLayoutProfiles();
      return JSON.stringify({
        profiles,
        exportedAt: new Date().toISOString(),
        version: this.CURRENT_VERSION,
      }, null, 2);
    } catch (error) {
      console.error('Failed to export layouts:', error);
      throw error;
    }
  }

  /**
   * Import layout profiles
   */
  static async importLayouts(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.profiles || !Array.isArray(data.profiles)) {
        throw new Error('Invalid layout export format');
      }

      const existingProfiles = await this.getLayoutProfiles();
      
      // Add imported profiles with new IDs to avoid conflicts
      const importedProfiles = data.profiles.map((profile: any) => ({
        ...profile,
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created: new Date().toISOString(),
        lastUsed: undefined,
      }));

      const allProfiles = [...existingProfiles, ...importedProfiles];
      await AsyncStorage.setItem(this.PROFILES_KEY, JSON.stringify(allProfiles));
    } catch (error) {
      console.error('Failed to import layouts:', error);
      throw error;
    }
  }

  /**
   * Get default layout profiles
   */
  private static getDefaultProfiles(): LayoutProfile[] {
    const defaultLayout = this.getDefaultLayout();
    
    return [
      {
        id: 'sailing',
        name: 'Sailing',
        description: 'Optimized for sailing with wind and navigation widgets',
        isDefault: true,
        created: new Date().toISOString(),
        layout: {
          widgets: [
            ...defaultLayout,
            // Add sailing-specific widgets
            { id: 'wind', position: { x: 0, y: 0 }, size: { width: 160, height: 160 }, visible: true },
            { id: 'compass', position: { x: 170, y: 0 }, size: { width: 160, height: 160 }, visible: true },
          ],
          lastModified: new Date().toISOString(),
          version: this.CURRENT_VERSION,
        },
      },
      {
        id: 'motoring',
        name: 'Motoring', 
        description: 'Optimized for power boating with engine and speed widgets',
        created: new Date().toISOString(),
        layout: {
          widgets: [
            { id: 'speed', position: { x: 0, y: 0 }, size: { width: 160, height: 160 }, visible: true },
            { id: 'engine', position: { x: 170, y: 0 }, size: { width: 160, height: 160 }, visible: true },
            { id: 'depth', position: { x: 340, y: 0 }, size: { width: 160, height: 160 }, visible: true },
          ],
          lastModified: new Date().toISOString(),
          version: this.CURRENT_VERSION,
        },
      },
      {
        id: 'anchored',
        name: 'Anchored',
        description: 'Simplified layout for anchored boats',
        created: new Date().toISOString(),
        layout: {
          widgets: [
            { id: 'depth', position: { x: 0, y: 0 }, size: { width: 160, height: 160 }, visible: true },
            { id: 'battery', position: { x: 170, y: 0 }, size: { width: 160, height: 160 }, visible: true },
          ],
          lastModified: new Date().toISOString(),
          version: this.CURRENT_VERSION,
        },
      },
    ];
  }
}