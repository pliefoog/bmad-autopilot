import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  widgetName: string;
}

interface State {
  hasError: boolean;
  errorCount: number;
}

export class ErrorBoundaryLogger extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const newCount = this.state.errorCount + 1;
    console.error(`[ErrorBoundary] ${this.props.widgetName} - Error #${newCount}:`, error.message);
    console.error('Error stack:', errorInfo.componentStack);
    this.setState({ errorCount: newCount });
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail silently for now
    }
    return this.props.children;
  }
}
