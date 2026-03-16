// This module now only provides prompt formatting helpers and context compilation.
// Actual AI calls are handled by the backend.

export const createVectorStore = async (pages: string[]) => {
    // We'll just return the full text for simplicity since Gemini can handle it.
    return pages.join("\n\n---\n\n");
};

export const summarizePageWithContext = async (
    currentPageText: string,
    prevPageText: string,
    nextPageText: string,
    globalContext: string,
    isEli5: boolean
): Promise<string> => {
    // This function is still used to prepare text for the backend if needed,
    // but the backend handles prompt engineering now.
    return currentPageText;
};

export const answerDoubt = async (question: string, context: string): Promise<string> => {
    // Note: This logic moved to App.tsx to call the actual backend API
    return "This function is deprecated. Call services/backendClient.ts instead.";
};