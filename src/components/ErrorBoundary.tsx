import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isExtension = /MetaMask|ethereum|inpage|chrome-extension|moz-extension|safari-extension|Extension context/i.test(
      error?.message || ''
    );
    if (isExtension) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-6 text-neutral-900 dark:text-neutral-100">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-xl border border-neutral-200 dark:border-neutral-700 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
              {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#80C7F2] text-neutral-950 font-bold hover:bg-[#6bbbe8] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
