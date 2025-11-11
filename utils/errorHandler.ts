// utils/errorHandler.ts
export const parseApiError = (error: unknown): string => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Check for specific error messages from the Gemini API or network stack
        if (message.includes('api key not valid') || message.includes('permission denied')) {
            return 'Invalid API Key. Please check your key and try again. You can reset it from the main dashboard.';
        }
        if (message.includes('quota')) {
            return 'You have exceeded your API quota. Please check your <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" class="underline text-teal-300">Google AI Studio account and billing details</a>.';
        }
        if (message.includes('failed to fetch') || message.includes('network error')) {
            return 'Network connection failed. Please check your internet connection and try again.';
        }
        if (message.includes('500') || message.includes('503') || message.includes('service') || message.includes('unavailable')) {
            return 'The AI service is temporarily unavailable or overloaded. Please try again in a few moments.';
        }
        if (message.includes('400') || message.includes('bad request')) {
            return 'The request sent to the AI was invalid. This might be due to a malformed input or an issue with the prompt.';
        }

        // Return a generic but more user-friendly message if no specific pattern is matched
        return `An unexpected error occurred: ${error.message}`;
    }
    
    // Fallback for non-Error objects
    return 'An unknown error occurred. Please check the console for more details and try again.';
};