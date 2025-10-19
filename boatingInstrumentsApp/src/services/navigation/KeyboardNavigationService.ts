/**
 * Keyboard Navigation Service
 * Story 4.4 AC14: Desktop keyboard navigation and shortcuts
 * 
 * Provides:
 * - Focus management for widgets and UI elements
 * - Tab order and arrow key navigation
 * - Global keyboard shortcuts (T, H, S, Esc)
 * - Desktop platform detection
 */

import { Platform } from 'react-native';

export type NavigableElement = {
  id: string;
  type: 'widget' | 'button' | 'input' | 'modal' | 'menu';
  focusRef?: any;
  onFocus?: () => void;
  onActivate?: () => void;
  priority?: number; // For tab order (lower = higher priority)
};

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

export type GlobalShortcut = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
};

class KeyboardNavigationService {
  private static instance: KeyboardNavigationService;
  
  // Registered navigable elements
  private elements: Map<string, NavigableElement> = new Map();
  
  // Current focus state
  private currentFocusId: string | null = null;
  
  // Global shortcuts
  private shortcuts: Map<string, GlobalShortcut> = new Map();
  
  // Keyboard listener
  private keyboardListener: ((event: KeyboardEvent) => void) | null = null;
  
  // Enable/disable state
  private enabled: boolean = false;
  
  // Focus lock (for modals)
  private focusLock: string[] = [];

  private constructor() {
    this.initializeDefaultShortcuts();
  }

  public static getInstance(): KeyboardNavigationService {
    if (!KeyboardNavigationService.instance) {
      KeyboardNavigationService.instance = new KeyboardNavigationService();
    }
    return KeyboardNavigationService.instance;
  }

  /**
   * Check if keyboard navigation is supported on this platform
   */
  public isSupported(): boolean {
    return Platform.OS === 'web';
  }

  /**
   * Initialize keyboard navigation
   */
  public initialize(): void {
    if (!this.isSupported()) {
      console.log('[KeyboardNav] Not supported on platform:', Platform.OS);
      return;
    }

    if (this.enabled) {
      console.log('[KeyboardNav] Already initialized');
      return;
    }

    this.keyboardListener = this.handleKeyPress.bind(this);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.keyboardListener);
      this.enabled = true;
      console.log('[KeyboardNav] Initialized successfully');
    }
  }

  /**
   * Cleanup keyboard navigation
   */
  public cleanup(): void {
    if (this.keyboardListener && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyboardListener);
      this.enabled = false;
      this.keyboardListener = null;
      console.log('[KeyboardNav] Cleaned up');
    }
  }

  /**
   * Register a navigable element
   */
  public registerElement(element: NavigableElement): void {
    this.elements.set(element.id, element);
    console.log(`[KeyboardNav] Registered element: ${element.id} (type: ${element.type})`);
  }

  /**
   * Unregister a navigable element
   */
  public unregisterElement(elementId: string): void {
    this.elements.delete(elementId);
    if (this.currentFocusId === elementId) {
      this.currentFocusId = null;
    }
    console.log(`[KeyboardNav] Unregistered element: ${elementId}`);
  }

  /**
   * Register a global keyboard shortcut
   */
  public registerShortcut(shortcut: GlobalShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
    console.log(`[KeyboardNav] Registered shortcut: ${key} - ${shortcut.description}`);
  }

  /**
   * Unregister a global keyboard shortcut
   */
  public unregisterShortcut(key: string): void {
    this.shortcuts.delete(key);
    console.log(`[KeyboardNav] Unregistered shortcut: ${key}`);
  }

  /**
   * Set focus to a specific element
   */
  public focusElement(elementId: string): boolean {
    const element = this.elements.get(elementId);
    if (!element) {
      console.warn(`[KeyboardNav] Element not found: ${elementId}`);
      return false;
    }

    // Check focus lock
    if (this.focusLock.length > 0 && !this.focusLock.includes(elementId)) {
      console.log(`[KeyboardNav] Focus locked, cannot focus: ${elementId}`);
      return false;
    }

    this.currentFocusId = elementId;
    
    if (element.focusRef?.current) {
      element.focusRef.current.focus();
    }
    
    if (element.onFocus) {
      element.onFocus();
    }

    console.log(`[KeyboardNav] Focused element: ${elementId}`);
    return true;
  }

  /**
   * Get currently focused element
   */
  public getCurrentFocus(): string | null {
    return this.currentFocusId;
  }

  /**
   * Move focus in a direction (arrow keys)
   */
  public moveFocus(direction: NavigationDirection): boolean {
    if (!this.currentFocusId) {
      // No current focus, focus first element
      return this.focusFirst();
    }

    const currentElement = this.elements.get(this.currentFocusId);
    if (!currentElement) {
      return false;
    }

    // Get navigable elements in focus lock (if any) or all elements
    const availableElements = Array.from(this.elements.values()).filter(el => {
      if (this.focusLock.length > 0) {
        return this.focusLock.includes(el.id);
      }
      return true;
    });

    // For widgets, use grid-based navigation
    if (currentElement.type === 'widget') {
      return this.moveWidgetFocus(direction, availableElements);
    }

    // For other elements, use linear navigation
    return this.moveLinearFocus(direction, availableElements);
  }

  /**
   * Focus next element (Tab key)
   */
  public focusNext(): boolean {
    const sortedElements = this.getSortedElements();
    
    if (sortedElements.length === 0) {
      return false;
    }

    if (!this.currentFocusId) {
      return this.focusElement(sortedElements[0].id);
    }

    const currentIndex = sortedElements.findIndex(el => el.id === this.currentFocusId);
    const nextIndex = (currentIndex + 1) % sortedElements.length;
    
    return this.focusElement(sortedElements[nextIndex].id);
  }

  /**
   * Focus previous element (Shift+Tab)
   */
  public focusPrevious(): boolean {
    const sortedElements = this.getSortedElements();
    
    if (sortedElements.length === 0) {
      return false;
    }

    if (!this.currentFocusId) {
      return this.focusElement(sortedElements[sortedElements.length - 1].id);
    }

    const currentIndex = sortedElements.findIndex(el => el.id === this.currentFocusId);
    const prevIndex = currentIndex === 0 ? sortedElements.length - 1 : currentIndex - 1;
    
    return this.focusElement(sortedElements[prevIndex].id);
  }

  /**
   * Focus first element
   */
  public focusFirst(): boolean {
    const sortedElements = this.getSortedElements();
    if (sortedElements.length > 0) {
      return this.focusElement(sortedElements[0].id);
    }
    return false;
  }

  /**
   * Activate current element (Enter/Space)
   */
  public activateCurrent(): boolean {
    if (!this.currentFocusId) {
      return false;
    }

    const element = this.elements.get(this.currentFocusId);
    if (element?.onActivate) {
      element.onActivate();
      console.log(`[KeyboardNav] Activated element: ${this.currentFocusId}`);
      return true;
    }

    return false;
  }

  /**
   * Lock focus to specific elements (for modals)
   */
  public lockFocus(elementIds: string[]): void {
    this.focusLock = elementIds;
    console.log(`[KeyboardNav] Focus locked to: ${elementIds.join(', ')}`);
  }

  /**
   * Unlock focus
   */
  public unlockFocus(): void {
    this.focusLock = [];
    console.log('[KeyboardNav] Focus unlocked');
  }

  /**
   * Get all registered shortcuts
   */
  public getShortcuts(): GlobalShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // Private methods

  private initializeDefaultShortcuts(): void {
    // Default shortcuts will be registered by components
    // This method can be used for app-wide shortcuts
  }

  private handleKeyPress(event: KeyboardEvent): void {
    // Check for global shortcuts first
    const shortcutKey = this.getShortcutKeyFromEvent(event);
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      console.log(`[KeyboardNav] Executed shortcut: ${shortcutKey}`);
      return;
    }

    // Handle navigation keys
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          this.focusPrevious();
        } else {
          this.focusNext();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus('up');
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus('down');
        break;

      case 'ArrowLeft':
        event.preventDefault();
        this.moveFocus('left');
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.moveFocus('right');
        break;

      case 'Enter':
      case ' ':
        if (this.currentFocusId) {
          event.preventDefault();
          this.activateCurrent();
        }
        break;

      case 'Escape':
        // Let components handle Escape via shortcuts
        break;
    }
  }

  private getShortcutKey(shortcut: GlobalShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.metaKey) parts.push('Meta');
    parts.push(shortcut.key);
    return parts.join('+');
  }

  private getShortcutKeyFromEvent(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }

  private getSortedElements(): NavigableElement[] {
    const elements = Array.from(this.elements.values());
    
    // Filter by focus lock if active
    const filteredElements = this.focusLock.length > 0
      ? elements.filter(el => this.focusLock.includes(el.id))
      : elements;

    // Sort by priority (lower = higher priority)
    return filteredElements.sort((a, b) => {
      const aPriority = a.priority ?? 100;
      const bPriority = b.priority ?? 100;
      return aPriority - bPriority;
    });
  }

  private moveWidgetFocus(direction: NavigationDirection, availableElements: NavigableElement[]): boolean {
    // Simple grid navigation - can be enhanced with actual widget positions
    const widgets = availableElements.filter(el => el.type === 'widget');
    const currentIndex = widgets.findIndex(el => el.id === this.currentFocusId);
    
    if (currentIndex === -1) {
      return false;
    }

    let targetIndex = currentIndex;
    const columns = 2; // Assume 2-column grid for now

    switch (direction) {
      case 'up':
        targetIndex = currentIndex - columns;
        break;
      case 'down':
        targetIndex = currentIndex + columns;
        break;
      case 'left':
        targetIndex = currentIndex - 1;
        break;
      case 'right':
        targetIndex = currentIndex + 1;
        break;
    }

    if (targetIndex >= 0 && targetIndex < widgets.length) {
      return this.focusElement(widgets[targetIndex].id);
    }

    return false;
  }

  private moveLinearFocus(direction: NavigationDirection, availableElements: NavigableElement[]): boolean {
    // For non-widget elements, treat up/left as previous, down/right as next
    if (direction === 'up' || direction === 'left') {
      return this.focusPrevious();
    } else {
      return this.focusNext();
    }
  }
}

export const keyboardNavigationService = KeyboardNavigationService.getInstance();
