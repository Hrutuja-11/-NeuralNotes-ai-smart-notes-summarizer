
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { Spinner } from './Spinner';
import { ToggleSwitch } from './ToggleSwitch';
import Flashcard from './Flashcard';
import ReactMarkdown from 'react-markdown';

interface SummaryPanelProps {
    summary: string;
    isSummarizing: boolean;
    summarizationProgress: number;
    isLoadingAudio: boolean;
    isPlaying: boolean;
    error: string | null;
    onSummarize: () => void;
    onListen: () => void;
    hasDocument: boolean;
    hasSummaries: boolean;
    isEli5: boolean;
    setIsEli5: (value: boolean) => void;
    isPreparing: boolean;
    summaryFormat: string;
    setSummaryFormat: (format: 'paragraph' | 'bullets' | 'mindmap' | 'flashcards') => void;
}

const ShimmerEffect = () => (
    <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-4 bg-gray-200 rounded-full ${i === 3 ? 'w-2/3' : ''} animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:2000px_100%]`}></div>
        ))}
    </div>
);

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
    summary,
    isSummarizing,
    summarizationProgress,
    isLoadingAudio,
    isPlaying,
    error,
    onSummarize,
    onListen,
    hasDocument,
    hasSummaries,
    isEli5,
    setIsEli5,
    isPreparing,
    summaryFormat,
    setSummaryFormat,
}) => {
    return (
        <div className="flex flex-col">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onSummarize}
                    disabled={isSummarizing || isPreparing || !hasDocument}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                    {isPreparing ? <><Spinner /><span className="ml-2">Preparing...</span></> : 
                     isSummarizing ? <><Spinner /><span className="ml-2">Summarizing...</span></> : 
                     <><SparklesIcon className="h-5 w-5 mr-2" /><span>Summarize Document</span></>
                    }
                </button>
                <button
                    onClick={onListen}
                    disabled={!summary || isLoadingAudio}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 border border-gray-200 text-base font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow hover:shadow-md transition-all duration-300"
                >
                    {isLoadingAudio ? <Spinner /> : isPlaying ? <StopIcon className="h-5 w-5 mr-2 text-rose-500" /> : <PlayIcon className="h-5 w-5 mr-2 text-emerald-500" />}
                    {isPlaying ? 'Stop' : 'Listen'}
                </button>
            </div>

            {isSummarizing && (
                <div className="mt-6">
                    <div className="w-full bg-indigo-100/50 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-primary to-accent h-3 rounded-full relative" style={{ width: `${summarizationProgress}%`, transition: 'width 0.4s ease-out' }}>
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <p className="text-center text-sm font-medium text-gray-500 mt-2">{Math.round(summarizationProgress)}% Complete</p>
                </div>
            )}

            <div className="flex justify-between items-center mt-8 mb-4 border-b border-gray-100 pb-4">
                 <h3 className="text-xl font-bold text-gray-800 tracking-tight">AI Summary</h3>
                 <div className="flex items-center space-x-4 bg-gray-50/80 p-1.5 rounded-xl border border-gray-100 shadow-sm">
                     <select
                         value={summaryFormat}
                         onChange={(e) => setSummaryFormat(e.target.value as any)}
                         disabled={isSummarizing}
                         className="bg-white border-gray-200 rounded-lg text-sm font-medium focus:ring-brand-primary focus:border-brand-primary py-2 px-3 shadow-sm outline-none transition-colors"
                     >
                         <option value="paragraph">Paragraph</option>
                         <option value="bullets">Bullet Points</option>
                         <option value="mindmap">Mind Map</option>
                         <option value="flashcards">Flashcards</option>
                     </select>
                     <div className="px-2">
                        <ToggleSwitch label="Explain Like I'm 5" checked={isEli5} onChange={setIsEli5} disabled={isSummarizing}/>
                     </div>
                 </div>
            </div>
            
            <div className="flex-grow bg-white/60 backdrop-blur-xl p-6 rounded-2xl shadow-inner border border-white/50 overflow-y-auto min-h-[250px] transition-all duration-300">
                {error && <div className="text-red-700 bg-red-50/80 border border-red-200 p-4 rounded-xl mb-4 font-medium">{error}</div>}
                
                {isPreparing ? (
                     <div className="text-center text-gray-500 pt-8">
                        <Spinner />
                        <p className="mt-2">Preparing document for analysis...</p>
                    </div>
                ) : isSummarizing && !summary ? (
                     <div className="text-center text-gray-500 pt-8">
                        <Spinner />
                        <p className="mt-2">Generating summaries...</p>
                    </div>
                ): summary ? (
                    typeof summary === 'string' ? (
                        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                            <ReactMarkdown>
                                {summary.replace(/Here is a concise summary of the CURRENT PAGE text in 3-5 sentences:?\s*/i, '')}
                            </ReactMarkdown>
                        </div>
                    ) : summaryFormat === 'flashcards' && Array.isArray(summary) ? (
                        <Flashcard cards={summary} />
                    ) : null
                ) : !hasSummaries ? (
                    <div className="text-center text-gray-500 pt-8">
                        <SparklesIcon className="h-12 w-12 mx-auto text-gray-300" />
                        <p className="mt-2">Click "Summarize Document" to generate summaries for all pages.</p>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-8">
                        <p>Summary for this page will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
