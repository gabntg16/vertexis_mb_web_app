import { describe, expect, it } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';

describe('Render error recovery', () => {
  it.each([
    'Unable to load workspace',
    'Extension context invalidated',
    'MetaMask failed while rendering',
  ])('shows recovery instead of retrying a failing render: %s', (message) => {
    const error = new Error(message);
    expect(ErrorBoundary.getDerivedStateFromError(error)).toEqual({
      hasError: true,
      error,
    });
  });
});
