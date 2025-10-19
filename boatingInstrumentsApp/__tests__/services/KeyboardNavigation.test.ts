/**
 * Tests for Keyboard Navigation System (Story 4.4 AC14)
 * Tests KeyboardNavigationService, focus management, and shortcuts
 */

import { keyboardNavigationService, NavigableElement } from '../../src/services/navigation/KeyboardNavigationService';

describe('KeyboardNavigationService', () => {
  beforeEach(() => {
    // Clear all registered elements
    const allElements = Array.from((keyboardNavigationService as any).elements.keys()) as string[];
    allElements.forEach(id => keyboardNavigationService.unregisterElement(id));
    
    // Clear all shortcuts
    const allShortcuts = Array.from((keyboardNavigationService as any).shortcuts.keys()) as string[];
    allShortcuts.forEach(key => keyboardNavigationService.unregisterShortcut(key));
  });

  describe('Platform Support', () => {
    it('should return isSupported status', () => {
      const isSupported = keyboardNavigationService.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('Element Registration', () => {
    it('should register a navigable element', () => {
      const element: NavigableElement = {
        id: 'test-widget-1',
        type: 'widget',
        priority: 1,
      };

      keyboardNavigationService.registerElement(element);
      
      // Element should be registered (we can verify by trying to focus it)
      const focused = keyboardNavigationService.focusElement('test-widget-1');
      expect(focused).toBe(true);
    });

    it('should unregister a navigable element', () => {
      const element: NavigableElement = {
        id: 'test-widget-2',
        type: 'widget',
      };

      keyboardNavigationService.registerElement(element);
      keyboardNavigationService.unregisterElement('test-widget-2');
      
      const focused = keyboardNavigationService.focusElement('test-widget-2');
      expect(focused).toBe(false);
    });

    it('should register elements with different types', () => {
      const types: NavigableElement['type'][] = ['widget', 'button', 'input', 'modal', 'menu'];
      
      types.forEach((type, index) => {
        const element: NavigableElement = {
          id: `test-${type}-${index}`,
          type,
        };
        keyboardNavigationService.registerElement(element);
      });

      // All should be focusable
      types.forEach((type, index) => {
        const focused = keyboardNavigationService.focusElement(`test-${type}-${index}`);
        expect(focused).toBe(true);
      });
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      // Register test elements
      for (let i = 1; i <= 5; i++) {
        keyboardNavigationService.registerElement({
          id: `widget-${i}`,
          type: 'widget',
          priority: i,
        });
      }
    });

    it('should focus an element by ID', () => {
      const focused = keyboardNavigationService.focusElement('widget-1');
      expect(focused).toBe(true);
      expect(keyboardNavigationService.getCurrentFocus()).toBe('widget-1');
    });

    it('should return false when focusing non-existent element', () => {
      const focused = keyboardNavigationService.focusElement('non-existent');
      expect(focused).toBe(false);
    });

    it('should get current focus', () => {
      keyboardNavigationService.focusElement('widget-2');
      expect(keyboardNavigationService.getCurrentFocus()).toBe('widget-2');
    });

    it('should clear focus when unregistering current element', () => {
      keyboardNavigationService.focusElement('widget-3');
      keyboardNavigationService.unregisterElement('widget-3');
      expect(keyboardNavigationService.getCurrentFocus()).toBeNull();
    });

    it('should call onFocus callback when focusing', () => {
      const onFocus = jest.fn();
      keyboardNavigationService.registerElement({
        id: 'callback-test',
        type: 'button',
        onFocus,
      });

      keyboardNavigationService.focusElement('callback-test');
      expect(onFocus).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      // Register elements with different priorities
      keyboardNavigationService.registerElement({
        id: 'first',
        type: 'button',
        priority: 1,
      });
      keyboardNavigationService.registerElement({
        id: 'second',
        type: 'button',
        priority: 2,
      });
      keyboardNavigationService.registerElement({
        id: 'third',
        type: 'button',
        priority: 3,
      });
    });

    it('should focus next element', () => {
      keyboardNavigationService.focusElement('first');
      keyboardNavigationService.focusNext();
      expect(keyboardNavigationService.getCurrentFocus()).toBe('second');
    });

    it('should wrap to first element from last', () => {
      keyboardNavigationService.focusElement('third');
      keyboardNavigationService.focusNext();
      expect(keyboardNavigationService.getCurrentFocus()).toBe('first');
    });

    it('should focus previous element', () => {
      keyboardNavigationService.focusElement('second');
      keyboardNavigationService.focusPrevious();
      expect(keyboardNavigationService.getCurrentFocus()).toBe('first');
    });

    it('should wrap to last element from first', () => {
      keyboardNavigationService.focusElement('first');
      keyboardNavigationService.focusPrevious();
      expect(keyboardNavigationService.getCurrentFocus()).toBe('third');
    });

    it('should focus first element when no focus', () => {
      const focused = keyboardNavigationService.focusFirst();
      expect(focused).toBe(true);
      expect(keyboardNavigationService.getCurrentFocus()).toBe('first');
    });
  });

  describe('Activation', () => {
    it('should call onActivate callback', () => {
      const onActivate = jest.fn();
      keyboardNavigationService.registerElement({
        id: 'activatable',
        type: 'button',
        onActivate,
      });

      keyboardNavigationService.focusElement('activatable');
      keyboardNavigationService.activateCurrent();

      expect(onActivate).toHaveBeenCalled();
    });

    it('should return false when no element is focused', () => {
      const activated = keyboardNavigationService.activateCurrent();
      expect(activated).toBe(false);
    });

    it('should return false when element has no onActivate', () => {
      keyboardNavigationService.registerElement({
        id: 'no-activate',
        type: 'widget',
      });

      keyboardNavigationService.focusElement('no-activate');
      const activated = keyboardNavigationService.activateCurrent();
      expect(activated).toBe(false);
    });
  });

  describe('Focus Lock', () => {
    beforeEach(() => {
      keyboardNavigationService.registerElement({ id: 'modal-1', type: 'modal' });
      keyboardNavigationService.registerElement({ id: 'modal-2', type: 'modal' });
      keyboardNavigationService.registerElement({ id: 'background-1', type: 'button' });
      keyboardNavigationService.registerElement({ id: 'background-2', type: 'button' });
    });

    it('should lock focus to specific elements', () => {
      keyboardNavigationService.lockFocus(['modal-1', 'modal-2']);

      // Should be able to focus modal elements
      expect(keyboardNavigationService.focusElement('modal-1')).toBe(true);
      expect(keyboardNavigationService.focusElement('modal-2')).toBe(true);

      // Should not be able to focus background elements
      expect(keyboardNavigationService.focusElement('background-1')).toBe(false);
    });

    it('should unlock focus', () => {
      keyboardNavigationService.lockFocus(['modal-1']);
      keyboardNavigationService.unlockFocus();

      // Should now be able to focus any element
      expect(keyboardNavigationService.focusElement('background-1')).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should register a shortcut', () => {
      const action = jest.fn();
      keyboardNavigationService.registerShortcut({
        key: 't',
        action,
        description: 'Test shortcut',
      });

      const shortcuts = keyboardNavigationService.getShortcuts();
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.some(s => s.key === 't')).toBe(true);
    });

    it('should register shortcut with modifiers', () => {
      const action = jest.fn();
      keyboardNavigationService.registerShortcut({
        key: 's',
        ctrlKey: true,
        action,
        description: 'Ctrl+S shortcut',
      });

      const shortcuts = keyboardNavigationService.getShortcuts();
      expect(shortcuts.some(s => s.key === 's' && s.ctrlKey === true)).toBe(true);
    });

    it('should unregister a shortcut', () => {
      keyboardNavigationService.registerShortcut({
        key: 'x',
        action: jest.fn(),
        description: 'Test',
      });

      keyboardNavigationService.unregisterShortcut('x');
      const shortcuts = keyboardNavigationService.getShortcuts();
      expect(shortcuts.some(s => s.key === 'x')).toBe(false);
    });

    it('should get all shortcuts', () => {
      keyboardNavigationService.registerShortcut({
        key: 'a',
        action: jest.fn(),
        description: 'Action A',
      });
      keyboardNavigationService.registerShortcut({
        key: 'b',
        action: jest.fn(),
        description: 'Action B',
      });

      const shortcuts = keyboardNavigationService.getShortcuts();
      expect(shortcuts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty element list', () => {
      expect(keyboardNavigationService.focusFirst()).toBe(false);
      expect(keyboardNavigationService.focusNext()).toBe(false);
      expect(keyboardNavigationService.focusPrevious()).toBe(false);
    });

    it('should handle single element', () => {
      keyboardNavigationService.registerElement({
        id: 'only-one',
        type: 'button',
      });

      keyboardNavigationService.focusElement('only-one');
      keyboardNavigationService.focusNext();
      expect(keyboardNavigationService.getCurrentFocus()).toBe('only-one');

      keyboardNavigationService.focusPrevious();
      expect(keyboardNavigationService.getCurrentFocus()).toBe('only-one');
    });

    it('should handle re-registration of same element', () => {
      const element: NavigableElement = {
        id: 'duplicate',
        type: 'button',
      };

      keyboardNavigationService.registerElement(element);
      keyboardNavigationService.registerElement(element); // Re-register

      expect(keyboardNavigationService.focusElement('duplicate')).toBe(true);
    });
  });
});
