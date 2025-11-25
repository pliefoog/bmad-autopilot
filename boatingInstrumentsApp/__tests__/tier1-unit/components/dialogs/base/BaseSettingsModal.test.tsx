/**
 * Unit Tests for BaseSettingsModal Component
 * Story 13.2.1 - Phase 5: Testing & Documentation
 * 
 * Tests:
 * - AC1: Modal appearance and layout
 * - AC2: Keyboard navigation (Tab, Enter, Esc)
 * - AC3: Glove-friendly touch targets
 * - AC4: Dismissible modal behavior
 * - AC5: Theme integration
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { BaseSettingsModal } from '../../../../../src/components/dialogs/base/BaseSettingsModal';
import { useTheme } from '../../../../../src/store/themeStore';
import { useSettingsStore } from '../../../../../src/store/settingsStore';

// Mock timers for async effects
jest.useFakeTimers();

// Mock dependencies
jest.mock('../../../../../src/store/themeStore');
jest.mock('../../../../../src/store/settingsStore');
jest.mock('../../../../../src/components/atoms/UniversalIcon', () => ({
  UniversalIcon: 'UniversalIcon',
}));

// Mock theme colors
const mockTheme = {
  surface: '#FFFFFF',
  background: '#F8FAFC',
  text: '#0F172A',
  border: '#CBD5E1',
  interactive: '#0284C7',
  primary: '#0284C7',
  secondary: '#0891B2',
  textSecondary: '#475569',
  accent: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  success: '#059669',
  shadow: '#00000020',
};

describe('BaseSettingsModal', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock theme hook
    (useTheme as jest.Mock).mockReturnValue(mockTheme);
    
    // Mock settings store
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        themeSettings: {
          gloveMode: false,
        },
      };
      return selector ? selector(state) : state;
    });
  });

  describe('AC1: Modal Appearance and Layout', () => {
    it('should render modal when visible is true', () => {
      const { getByTestId } = render(
        <BaseSettingsModal
          visible={true}
          title="Test Settings"
          onClose={jest.fn()}
          testID="test-modal"
        >
          <></>
        </BaseSettingsModal>
      );
      
      act(() => {
        jest.runAllTimers();
      });

      expect(getByTestId('test-modal')).toBeTruthy();
    });

    it('should render header with title', () => {
      const { getByText } = render(
        <BaseSettingsModal
          visible={true}
          title="Test Settings"
          onClose={jest.fn()}
        >
          <></>
        </BaseSettingsModal>
      );
      
      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Test Settings')).toBeTruthy();
    });

    it('should render close button in header', () => {
      const { getByTestId } = render(
        <BaseSettingsModal
          visible={true}
          title="Test Settings"
          onClose={jest.fn()}
        >
          <></>
        </BaseSettingsModal>
      );
      
      act(() => {
        jest.runAllTimers();
      });

      expect(getByTestId('modal-close-button')).toBeTruthy();
    });

    it('should render footer with cancel and save buttons by default', () => {
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      expect(result.getByTestId('settings-modal-cancel-button')).toBeTruthy();
      expect(result.getByTestId('settings-modal-save-button')).toBeTruthy();
    });

    it('should not render footer when showFooter is false', () => {
      const { queryByTestId } = render(
        <BaseSettingsModal
          visible={true}
          title="Test Settings"
          onClose={jest.fn()}
          showFooter={false}
        >
          <></>
        </BaseSettingsModal>
      );
      
      act(() => {
        jest.runAllTimers();
      });

      expect(queryByTestId('modal-cancel-button')).toBeNull();
      expect(queryByTestId('modal-save-button')).toBeNull();
    });

    it('should render custom button text', () => {
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
            saveButtonText="Apply"
            cancelButtonText="Discard"
          >
            <></>
          </BaseSettingsModal>
        );
      });

      expect(result.getByText('Apply')).toBeTruthy();
      expect(result.getByText('Discard')).toBeTruthy();
    });

    it('should render children content', () => {
      const { getByText } = render(
        <BaseSettingsModal
          visible={true}
          title="Test Settings"
          onClose={jest.fn()}
        >
          <Text>Test Content</Text>
        </BaseSettingsModal>
      );
      
      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Test Content')).toBeTruthy();
    });
  });

  describe('AC2: Keyboard Navigation', () => {
    it('should call onClose when Escape key is pressed', () => {
      const onClose = jest.fn();
      Platform.OS = 'web';
      
      act(() => {
        render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={onClose}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      // Simulate Escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSave when Enter key is pressed', () => {
      const onSave = jest.fn();
      Platform.OS = 'web';
      
      act(() => {
        render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={onSave}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      // Simulate Enter key press
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should not trigger keyboard handlers when modal is not visible', () => {
      const onClose = jest.fn();
      const onSave = jest.fn();
      Platform.OS = 'web';
      
      act(() => {
        render(
          <BaseSettingsModal
            visible={false}
            title="Test Settings"
            onClose={onClose}
            onSave={onSave}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      // Try to trigger keyboard events
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onClose).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should not setup keyboard listeners on mobile platforms', () => {
      Platform.OS = 'ios';
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      act(() => {
        render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('AC3: Glove-Friendly Touch Targets', () => {
    it('should use 44pt touch targets when glove mode is disabled', () => {
      (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { themeSettings: { gloveMode: false } };
        return selector ? selector(state) : state;
      });

      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const closeButton = result.getByTestId('settings-modal-close-button');
      expect(closeButton.props.style).toMatchObject(
        expect.objectContaining({ width: 44, height: 44 })
      );
    });

    it('should use 64pt touch targets when glove mode is enabled', () => {
      (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { themeSettings: { gloveMode: true } };
        return selector ? selector(state) : state;
      });

      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const closeButton = result.getByTestId('settings-modal-close-button');
      expect(closeButton.props.style).toMatchObject(
        expect.objectContaining({ width: 64, height: 64 })
      );
    });

    it('should apply correct button heights based on glove mode', () => {
      (useSettingsStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { themeSettings: { gloveMode: true } };
        return selector ? selector(state) : state;
      });

      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const saveButton = result.getByTestId('settings-modal-save-button');
      expect(saveButton.props.style).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({ height: 64 })
        ])
      );
    });
  });

  describe('AC4: Dismissible Modal Behavior', () => {
    it('should call onClose when backdrop is pressed and dismissible is true', () => {
      const onClose = jest.fn();
      
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={onClose}
            dismissible={true}
            testID="test-modal"
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const backdrop = result.getByTestId('test-modal-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when backdrop is pressed and dismissible is false', () => {
      const onClose = jest.fn();
      
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={onClose}
            dismissible={false}
            testID="test-modal"
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const backdrop = result.getByTestId('test-modal-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when close button is pressed', () => {
      const onClose = jest.fn();
      
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={onClose}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const closeButton = result.getByTestId('settings-modal-close-button');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is pressed', () => {
      const onClose = jest.fn();
      
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={onClose}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const cancelButton = result.getByTestId('settings-modal-cancel-button');
      fireEvent.press(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSave when save button is pressed', () => {
      const onSave = jest.fn();
      
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={onSave}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const saveButton = result.getByTestId('settings-modal-save-button');
      fireEvent.press(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC5: Theme Integration', () => {
    it('should use theme colors for modal styling', () => {
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            testID="test-modal"
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const container = result.getByTestId('test-modal-container');
      const containerStyle = container.props.style;
      
      // Modal should use theme.surface for background
      expect(containerStyle).toMatchObject(
        expect.objectContaining({
          backgroundColor: mockTheme.surface,
        })
      );
    });

    it('should apply theme colors to buttons', () => {
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const saveButton = result.getByTestId('settings-modal-save-button');
      expect(saveButton.props.style).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: mockTheme.interactive,
          })
        ])
      );
    });

    it('should work with red-night theme', () => {
      const redNightTheme = {
        ...mockTheme,
        surface: '#1A0000',
        background: '#0F0000',
        text: '#FF6B6B',
        border: '#4A0000',
        interactive: '#DC2626',
      };
      
      (useTheme as jest.Mock).mockReturnValue(redNightTheme);

      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
            testID="test-modal"
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const container = result.getByTestId('test-modal-container');
      expect(container.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: redNightTheme.surface,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      let result: any;
      act(() => {
        result = render(
          <BaseSettingsModal
            visible={true}
            title="Test Settings"
            onClose={jest.fn()}
            onSave={jest.fn()}
          >
            <></>
          </BaseSettingsModal>
        );
      });

      const closeButton = result.getByTestId('settings-modal-close-button');
      expect(closeButton.props.accessibilityLabel).toBe('Close');
      expect(closeButton.props.accessibilityRole).toBe('button');

      const cancelButton = result.getByTestId('settings-modal-cancel-button');
      expect(cancelButton.props.accessibilityLabel).toBe('Cancel');
      expect(cancelButton.props.accessibilityRole).toBe('button');

      const saveButton = result.getByTestId('settings-modal-save-button');
      expect(saveButton.props.accessibilityLabel).toBe('Save');
      expect(saveButton.props.accessibilityRole).toBe('button');
    });
  });
});
