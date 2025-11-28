import React from 'react';
import { BaseWidget, WidgetMeta, WidgetComponent, WidgetProps } from './WidgetBase';

export interface RegisteredWidget {
  meta: WidgetMeta;
  component: React.ComponentType<any>; // More flexible type for existing widgets
  instance?: BaseWidget;
}

export class WidgetRegistry {
  private static widgets = new Map<string, RegisteredWidget>();
  
  /**
   * Register a widget component with metadata
   */
  static register(
    meta: WidgetMeta, 
    component: React.ComponentType<any>,
    instance?: BaseWidget
  ): void {
    this.widgets.set(meta.id, {
      meta,
      component,
      instance,
    });
  }
  
  /**
   * Get a registered widget by ID
   */
  static getWidget(id: string): RegisteredWidget | undefined {
    return this.widgets.get(id);
  }
  
  /**
   * Get all widget metadata
   */
  static getAllWidgets(): WidgetMeta[] {
    return Array.from(this.widgets.values()).map(w => w.meta);
  }
  
  /**
   * Get widgets by category
   */
  static getWidgetsByCategory(category: string): WidgetMeta[] {
    return this.getAllWidgets().filter(w => w.category === category);
  }
  
  /**
   * Get available categories
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    this.widgets.forEach(widget => categories.add(widget.meta.category));
    return Array.from(categories);
  }
  
  /**
   * Check if widget is registered
   */
  static isRegistered(id: string): boolean {
    return this.widgets.has(id);
  }
  
  /**
   * Unregister a widget
   */
  static unregister(id: string): boolean {
    return this.widgets.delete(id);
  }
  
  /**
   * Clear all registered widgets
   */
  static clear(): void {
    this.widgets.clear();
  }
  
  /**
   * Get widget count
   */
  static getCount(): number {
    return this.widgets.size;
  }
  
  /**
   * Get all permanent widgets (always present regardless of data)
   */
  static getPermanentWidgets(): RegisteredWidget[] {
    return Array.from(this.widgets.values())
      .filter(w => w.meta.isPermanent === true);
  }
  
  /**
   * Get all data-driven widgets (created when NMEA data available)
   */
  static getDataDrivenWidgets(): RegisteredWidget[] {
    return Array.from(this.widgets.values())
      .filter(w => w.meta.requiresNmeaData === true);
  }
  
  /**
   * Check if widget is permanent
   */
  static isPermanent(id: string): boolean {
    const widget = this.widgets.get(id);
    return widget?.meta.isPermanent === true;
  }
}