import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { WidgetWrapper } from "../../../src/widgets/WidgetWrapper";
import { useWidgetStore } from "../../../src/store/widgetStore";

// Mock the widget store
jest.mock('../../../src/store/widgetStore');
const mockUseWidgetStore = useWidgetStore as jest.MockedFunction<typeof useWidgetStore>;

// Mock Ionicons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('WidgetWrapper Component (Story 2.15)', () => {
  const mockToggleWidgetExpanded = jest.fn();
  const mockToggleWidgetPin = jest.fn();
  const mockIsWidgetPinned = jest.fn();
  const mockUpdateWidgetInteraction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockUseWidgetStore.mockReturnValue({
      widgetExpanded: {},
      toggleWidgetExpanded: mockToggleWidgetExpanded,
      toggleWidgetPin: mockToggleWidgetPin,
      isWidgetPinned: mockIsWidgetPinned,
      updateWidgetInteraction: mockUpdateWidgetInteraction,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Pin Functionality UI', () => {
    it('should display pin icon when widget is pinned', () => {
      mockIsWidgetPinned.mockReturnValue(true);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': true },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { getByTestId } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Should show pin icon instead of chevron
      expect(getByTestId('test-widget-caret')).toBeTruthy();
    });

    it('should display chevron when widget is not pinned', () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': false },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { getByTestId } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Should show chevron
      expect(getByTestId('test-widget-chevron')).toBeTruthy();
    });
  });

  describe('Gesture Handling', () => {
    it('should toggle expansion on tap', () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': false },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { getByTestId } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Tap the caret
      fireEvent.press(getByTestId('test-widget-caret'));

      expect(mockToggleWidgetExpanded).toHaveBeenCalledWith('test-widget');
      expect(mockUpdateWidgetInteraction).toHaveBeenCalledWith('test-widget');
    });

    it('should toggle pin state on long press', () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': false },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { getByTestId } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Long press the caret
      fireEvent(getByTestId('test-widget-caret'), 'longPress');

      expect(mockToggleWidgetPin).toHaveBeenCalledWith('test-widget');
      expect(mockUpdateWidgetInteraction).toHaveBeenCalledWith('test-widget');
    });
  });

  describe('Auto-collapse Functionality (AC 4)', () => {
    it('should auto-collapse unpinned expanded widgets after 30 seconds', async () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': true }, // Expanded but not pinned
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockToggleWidgetExpanded).toHaveBeenCalledWith('test-widget');
    });

    it('should NOT auto-collapse pinned widgets', async () => {
      mockIsWidgetPinned.mockReturnValue(true);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': true }, // Expanded and pinned
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      // Should NOT have been called for auto-collapse
      expect(mockToggleWidgetExpanded).not.toHaveBeenCalled();
    });

    it('should NOT auto-collapse collapsed widgets', async () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': false }, // Collapsed
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockToggleWidgetExpanded).not.toHaveBeenCalled();
    });
  });

  describe('Content Rendering', () => {
    it('should show children when expanded', () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': true },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { getByTestId } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        >
          <View testID="widget-child-content">
            <Text>Widget Content</Text>
          </View>
        </WidgetWrapper>
      );

      expect(getByTestId('widget-child-content')).toBeTruthy();
    });

    it('should hide children when collapsed', () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': false },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { queryByTestId } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        >
          <View testID="widget-child-content">
            <Text>Widget Content</Text>
          </View>
        </WidgetWrapper>
      );

      expect(queryByTestId('widget-child-content')).toBeNull();
    });
  });

  describe('Timer Cleanup', () => {
    it('should clean up auto-collapse timer when component unmounts', () => {
      mockIsWidgetPinned.mockReturnValue(false);
      mockUseWidgetStore.mockReturnValue({
        widgetExpanded: { 'test-widget': true },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      } as any);

      const { unmount } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Unmount component
      unmount();

      // Fast-forward past the timer
      jest.advanceTimersByTime(35000);

      // Should not have been called after unmount
      expect(mockToggleWidgetExpanded).not.toHaveBeenCalled();
    });

    it('should reset timer when pin state changes', () => {
      let isPinned = false;
      mockIsWidgetPinned.mockImplementation(() => isPinned);
      
      const mockStore = {
        widgetExpanded: { 'test-widget': true },
        toggleWidgetExpanded: mockToggleWidgetExpanded,
        toggleWidgetPin: mockToggleWidgetPin,
        isWidgetPinned: mockIsWidgetPinned,
        updateWidgetInteraction: mockUpdateWidgetInteraction,
      };

      mockUseWidgetStore.mockReturnValue(mockStore as any);

      const { rerender } = render(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Fast-forward partway
      jest.advanceTimersByTime(15000);

      // Change pin state
      isPinned = true;
      rerender(
        <WidgetWrapper
          widgetId="test-widget"
          title="Test Widget"
          icon="compass"
          testID="test-widget"
        />
      );

      // Fast-forward past original timer
      jest.advanceTimersByTime(20000);

      // Should not have auto-collapsed because it's now pinned
      expect(mockToggleWidgetExpanded).not.toHaveBeenCalled();
    });
  });
});