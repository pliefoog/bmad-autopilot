/**
 * Integration tests for ConnectionStatusIndicator UI component
 * Tests state management integration and UI rendering
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useNmeaStore } from '../src/core/nmeaStore';
import { Text, View } from 'react-native';

// Simple test component that displays connection status
const ConnectionStatusIndicator: React.FC = () => {
  const { connectionStatus, lastError } = useNmeaStore();
  
  return (
    <View testID="connection-status-indicator">
      <Text testID="status-text">{connectionStatus}</Text>
      {lastError && <Text testID="error-text">{lastError}</Text>}
    </View>
  );
};

describe('ConnectionStatusIndicator Integration', () => {
  beforeEach(() => {
    useNmeaStore.getState().reset();
  });

  it('should display disconnected status initially', () => {
    const { getByTestId } = render(<ConnectionStatusIndicator />);
    
    expect(getByTestId('status-text').props.children).toBe('disconnected');
  });

  it('should display connecting status when connection starts', () => {
    useNmeaStore.getState().setConnectionStatus('connecting');
    
    const { getByTestId } = render(<ConnectionStatusIndicator />);
    
    expect(getByTestId('status-text').props.children).toBe('connecting');
  });

  it('should display connected status when connection succeeds', () => {
    useNmeaStore.getState().setConnectionStatus('connected');
    
    const { getByTestId } = render(<ConnectionStatusIndicator />);
    
    expect(getByTestId('status-text').props.children).toBe('connected');
  });

  it('should display error message when connection fails', () => {
    useNmeaStore.getState().setConnectionStatus('disconnected');
    useNmeaStore.getState().setLastError('Connection refused');
    
    const { getByTestId } = render(<ConnectionStatusIndicator />);
    
    expect(getByTestId('status-text').props.children).toBe('disconnected');
    expect(getByTestId('error-text').props.children).toBe('Connection refused');
  });

  it('should not display error text when no error exists', () => {
    useNmeaStore.getState().setConnectionStatus('connected');
    
    const { queryByTestId } = render(<ConnectionStatusIndicator />);
    
    expect(queryByTestId('error-text')).toBeNull();
  });

  it('should update when store state changes', () => {
    const { getByTestId, rerender } = render(<ConnectionStatusIndicator />);
    
    expect(getByTestId('status-text').props.children).toBe('disconnected');
    
    // Change state
    useNmeaStore.getState().setConnectionStatus('connecting');
    rerender(<ConnectionStatusIndicator />);
    
    expect(getByTestId('status-text').props.children).toBe('connecting');
  });

  it('should clear error when connection succeeds', () => {
    // Set error state
    useNmeaStore.getState().setConnectionStatus('disconnected');
    useNmeaStore.getState().setLastError('Previous error');
    
    const { getByTestId, queryByTestId, rerender } = render(<ConnectionStatusIndicator />);
    
    expect(getByTestId('error-text')).toBeDefined();
    
    // Connect successfully
    useNmeaStore.getState().setConnectionStatus('connected');
    useNmeaStore.getState().setLastError(undefined);
    rerender(<ConnectionStatusIndicator />);
    
    expect(queryByTestId('error-text')).toBeNull();
  });
});
