import React, { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props {
  children: ReactNode;
  widgetName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch and identify which widget is causing text node errors
 */
export class TextNodeCatcher extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`❌ TEXT NODE ERROR in ${this.props.widgetName}:`, error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 10, backgroundColor: '#ff0000', margin: 5 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            Error in {this.props.widgetName}
          </Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>
            {this.state.error?.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
