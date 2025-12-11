/**
 * Global error handling utilities for the application
 * Handles 409 conflicts and other common errors gracefully
 */

export interface ErrorResponse {
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  statusCode?: number;
}

/**
 * Check if an error is a 409 conflict error
 */
export function isConflictError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = error.toString?.().toLowerCase() || '';
  
  return (
    errorMessage.includes('409') ||
    errorMessage.includes('conflict') ||
    errorMessage.includes('already exists') ||
    errorMessage.includes('duplicate') ||
    errorString.includes('409') ||
    errorString.includes('conflict')
  );
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    error.name === 'NetworkError'
  );
}

/**
 * Handle database create operations with conflict detection
 */
export async function handleDatabaseCreate<T>(
  createFn: () => Promise<T>,
  conflictMessage?: string
): Promise<{ success: boolean; data?: T; error?: ErrorResponse }> {
  try {
    const data = await createFn();
    return { success: true, data };
  } catch (error: any) {
    if (isConflictError(error)) {
      return {
        success: false,
        error: {
          message: error.message || 'Conflict detected',
          userMessage: conflictMessage || 'This record already exists. No action needed.',
          shouldRetry: false,
          statusCode: 409
        }
      };
    }
    
    if (isNetworkError(error)) {
      return {
        success: false,
        error: {
          message: error.message || 'Network error',
          userMessage: 'Network connection issue. Please check your connection and try again.',
          shouldRetry: true
        }
      };
    }
    
    return {
      success: false,
      error: {
        message: error.message || 'Unknown error',
        userMessage: 'Something went wrong. Please try again.',
        shouldRetry: true
      }
    };
  }
}

/**
 * Parse error messages for user-friendly display
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  if (isConflictError(error)) {
    return 'This item already exists in the system';
  }
  
  if (isNetworkError(error)) {
    return 'Network connection error. Please check your connection';
  }
  
  // Check for specific error types
  const errorMessage = error.message?.toLowerCase() || '';
  
  if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return 'You need to sign in to perform this action';
  }
  
  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return 'You don\'t have permission to perform this action';
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'The requested resource was not found';
  }
  
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return 'Please check your input and try again';
  }
  
  // Return the original error message if it's user-friendly
  if (error.message && error.message.length < 100) {
    return error.message;
  }
  
  return 'Something went wrong. Please try again';
}

/**
 * Log errors with context for debugging
 */
export function logError(context: string, error: any, additionalInfo?: Record<string, any>) {
  console.error(`[${context}]`, {
    error: error.message || error,
    stack: error.stack,
    ...additionalInfo
  });
}
