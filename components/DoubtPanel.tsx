
import React, { useState } from 'react';
import { QuestionMarkIcon } from './icons/QuestionMarkIcon';
import { Spinner } from './Spinner';

interface DoubtPanelProps {
    onAnswerDoubt: (question: string) => Promise<string>;
    isReady: boolean;
}

export const DoubtPanel: React.FC<DoubtPanelProps> = ({ onAnswerDoubt, isReady }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || !isReady) return;

        setIsLoading(true);
        setAnswer('');
        setError(null);

        try {
            const result = await onAnswerDoubt(question);
            setAnswer(result);
        } catch (err) {
            setError('Sorry, I could not find an answer to your question. Please try rephrasing it.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4 tracking-tight">AI Chat Assistant</h3>
            <form onSubmit={handleSubmit} className="flex items-center space-x-3 mb-6">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={isReady ? "Ask a question about the document..." : "Document is being processed..."}
                    disabled={!isReady || isLoading}
                    className="flex-grow py-3.5 px-5 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all shadow-sm placeholder-gray-400 font-medium"
                    aria-label="Ask a question"
                />
                <button
                    type="submit"
                    disabled={!isReady || isLoading || !question.trim()}
                    className="p-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    aria-label="Submit question"
                >
                   {isLoading ? <Spinner /> : <QuestionMarkIcon className="h-6 w-6" />}
                </button>
            </form>
            <div className="flex-grow bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-inner border border-white/50 overflow-y-auto min-h-[150px] transition-all duration-300">
                {error && <div className="text-red-700 bg-red-50/80 border border-red-200 p-4 rounded-xl mb-4 font-medium">{error}</div>}
                {isLoading ? (
                    <div className="text-center text-gray-500 py-8 animate-pulse">
                        <Spinner />
                        <p className="mt-3 font-medium">Analyzing document context...</p>
                    </div>
                ) : answer ? (
                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed bg-white/50 p-5 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
                        <p className="whitespace-pre-wrap">{answer}</p>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-10 px-4">
                        <div className="w-16 h-16 bg-indigo-50 text-brand-primary/50 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <QuestionMarkIcon className="h-8 w-8 text-brand-primary/60" />
                        </div>
                        <p className="font-medium text-lg text-gray-600 mb-2">How can I help you study?</p>
                        <p className="text-sm text-gray-400">Ask any question and I'll find the exact answer from your document.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
