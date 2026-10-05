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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isDynamicImportError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Importing a module script failed');

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-6 text-neutral-900 dark:text-neutral-100">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl p-8 shadow-xl border border-neutral-200 dark:border-neutral-700 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">
              {isDynamicImportError ? 'Updating Application View' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
              {isDynamicImportError
                ? 'A new version or component update was detected. Please reload to display the updated view.'
                : (this.state.error?.message || 'An unexpected error occurred while loading this view.')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#80C7F2] text-neutral-950 font-bold hover:bg-[#6bbbe8] transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              {isDynamicImportError && (
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  <span>Retry View</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
