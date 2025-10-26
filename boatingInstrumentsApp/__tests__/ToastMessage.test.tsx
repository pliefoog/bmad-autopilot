import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ToastMessage, { ToastMessageData } from '../src/components/ToastMessage';
import { useTheme } from '../src/store/themeStore';

// Mock the theme store
jest.mock('../src/store/themeStore');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockTheme = {
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1F2937',
  textSecondary: '#6B7280',
  background: '#F9FAFB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#8B5CF6',
  shadow: '#00000020',
};

describe('ToastMessage Component', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // AC 10: Toast overlays center of header (replaces title temporarily)
  it('should render toast message when provided', () => {
    const toast: ToastMessageData = {
      message: 'Connection failed',
      type: 'error',
    };

    const { getByText, getByTestId } = render(
      <ToastMessage toast={toast} onDismiss={() => {}} />
    );

    expect(getByText('Connection failed')).toBeTruthy();
    expect(getByTestId('toast-error')).toBeTruthy();
  });

  it('should not render when toast is null', () => {
    const { queryByTestId } = render(
      <ToastMessage toast={null} onDismiss={() => {}} />
    );

    expect(queryByTestId('toast-error')).toBeNull();
    expect(queryByTestId('toast-warning')).toBeNull();
    expect(queryByTestId('toast-success')).toBeNull();
  });

  // AC 11: Error messages: Red background, white text, 5s auto-dismiss
  it('should display error toast with red background and white text', () => {
    const toast: ToastMessageData = {
      message: 'Connection error',
      type: 'error',
    };
    const mockOnDismiss = jest.fn();

    const { getByTestId, getByText } = render(
      <ToastMessage toast={toast} onDismiss={mockOnDismiss} />
    );

    const toastContainer = getByTestId('toast-error');
    const toastText = getByText('Connection error');

    // Check background color (error theme)
    expect(toastContainer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.error,
        }),
      ])
    );

    // Check text color (white)
    expect(toastText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#FFFFFF',
        }),
      ])
    );

    // Check auto-dismiss after 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  // AC 12: Warning messages: Orange background, dark text, 5s auto-dismiss
  it('should display warning toast with orange background and dark text', () => {
    const toast: ToastMessageData = {
      message: 'Low signal strength',
      type: 'warning',
    };
    const mockOnDismiss = jest.fn();

    const { getByTestId, getByText } = render(
      <ToastMessage toast={toast} onDismiss={mockOnDismiss} />
    );

    const toastContainer = getByTestId('toast-warning');
    const toastText = getByText('Low signal strength');

    // Check background color (warning theme)
    expect(toastContainer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.warning,
        }),
      ])
    );

    // Check text color (dark theme text)
    expect(toastText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: mockTheme.text,
        }),
      ])
    );

    // Check auto-dismiss after 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  // AC 13: Success messages: Green background, white text, 3s auto-dismiss
  it('should display success toast with green background and white text', () => {
    const toast: ToastMessageData = {
      message: 'Connected successfully',
      type: 'success',
    };
    const mockOnDismiss = jest.fn();

    const { getByTestId, getByText } = render(
      <ToastMessage toast={toast} onDismiss={mockOnDismiss} />
    );

    const toastContainer = getByTestId('toast-success');
    const toastText = getByText('Connected successfully');

    // Check background color (success theme)
    expect(toastContainer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.success,
        }),
      ])
    );

    // Check text color (white)
    expect(toastText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#FFFFFF',
        }),
      ])
    );

    // Check auto-dismiss after 3 seconds (shorter for success)
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  // AC 14: Tap to dismiss early
  it('should dismiss when tapped', () => {
    const toast: ToastMessageData = {
      message: 'Test message',
      type: 'error',
    };
    const mockOnDismiss = jest.fn();

    const { getByTestId } = render(
      <ToastMessage toast={toast} onDismiss={mockOnDismiss} />
    );

    const toastContainer = getByTestId('toast-error');
    fireEvent.press(toastContainer);

    // Should call onDismiss immediately (after animation)
    act(() => {
      jest.advanceTimersByTime(200); // Animation duration
    });

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  // Custom duration support
  it('should respect custom duration', () => {
    const toast: ToastMessageData = {
      message: 'Custom duration message',
      type: 'warning',
      duration: 2000, // 2 seconds
    };
    const mockOnDismiss = jest.fn();

    render(<ToastMessage toast={toast} onDismiss={mockOnDismiss} />);

    // Should not dismiss at normal warning time (5s)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Reset timer and check custom duration
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    render(<ToastMessage toast={toast} onDismiss={mockOnDismiss} />);
    
    act(() => {
      jest.advanceTimersByTime(2000); // Custom duration
    });
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  // Animation behavior
  it('should show entry and exit animations', async () => {
    const toast: ToastMessageData = {
      message: 'Animation test',
      type: 'success',
    };
    const mockOnDismiss = jest.fn();

    const { getByTestId, rerender } = render(
      <ToastMessage toast={toast} onDismiss={mockOnDismiss} />
    );

    const toastContainer = getByTestId('toast-success');
    
    // Should be present during animation
    expect(toastContainer).toBeTruthy();

    // Trigger dismissal
    rerender(<ToastMessage toast={null} onDismiss={mockOnDismiss} />);

    // Animation should complete and call onDismiss
    act(() => {
      jest.advanceTimersByTime(200); // Exit animation duration
    });
  });
});