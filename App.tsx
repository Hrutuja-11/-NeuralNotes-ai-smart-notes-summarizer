
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PdfUploader } from './components/PdfUploader';
import { PdfViewer } from './components/PdfViewer';
import { SummaryPanel } from './components/SummaryPanel';
import { DoubtPanel } from './components/DoubtPanel';
import Quiz, { QuizQuestion } from './components/Quiz';
import Flashcard, { FlashcardData } from './components/Flashcard';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { extractTextFromPage, extractTextFromAllPages } from './services/pdfService';
import { summarizePageWithContext, createVectorStore } from './services/langchainService';
import { uploadPdf, summarize as summarizeApi, tts as ttsApi, doubt as doubtApi, summarizeYoutube, summarizeVideo as summarizeVideoApi, generateQuiz, generateFlashcards } from './services/backendClient';
import type { PDFDocumentProxy } from './types';

declare const pdfjsLib: any;

const App: React.FC = () => {
    // Input Mode
    const [inputType, setInputType] = useState<'pdf' | 'youtube' | 'video'>('pdf');
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('');

    // Processed Media State
    const [file, setFile] = useState(null as File | null);
    const [pdfDoc, setPdfDoc] = useState(null as PDFDocumentProxy | null);

    const [processedYoutubeUrl, setProcessedYoutubeUrl] = useState<string | null>(null);
    const [processedVideoFile, setProcessedVideoFile] = useState<File | null>(null);

    const [currentPage, setCurrentPage] = useState(1);

    // State for summaries and TTS
    const [summaries, setSummaries] = useState<any[]>([]);
    const [audioSrcs, setAudioSrcs] = useState([] as (string | null)[]);
    const [currentAudioSrc, setCurrentAudioSrc] = useState(null as string | null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Loading and error states
    const [isPreparing, setIsPreparing] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summarizationProgress, setSummarizationProgress] = useState(0);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [error, setError] = useState(null as string | null);

    // LangChain and Q&A state
    const [vectorStore, setVectorStore] = useState(null as any | null);

    // Quiz and Flashcard State
    const [activeFeatureTab, setActiveFeatureTab] = useState<'summary' | 'doubt' | 'quiz' | 'flashcards'>('summary');
    const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [flashcardData, setFlashcardData] = useState<FlashcardData[] | null>(null);
    const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

    // User preferences
    const [isEli5, setIsEli5] = useState(false);
    const [summaryFormat, setSummaryFormat] = useState<'paragraph' | 'bullets' | 'mindmap' | 'flashcards'>('paragraph');

    const audioRef = useRef(null as HTMLAudioElement | null);
    const viewerContainerRef = useRef(null as HTMLDivElement | null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAutoPlayMode, setIsAutoPlayMode] = useState(false);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        audioEl.addEventListener('play', handlePlay);
        audioEl.addEventListener('pause', handlePause);
        audioEl.addEventListener('ended', handleEnded);

        return () => {
            audioEl.removeEventListener('play', handlePlay);
            audioEl.removeEventListener('pause', handlePause);
            audioEl.removeEventListener('ended', handleEnded);
        };
    }, []);

    // Track fullscreen changes and stop autoplay when exiting
    useEffect(() => {
        const onFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            if (!fs) {
                setIsAutoPlayMode(false);
                audioRef.current?.pause();
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    useEffect(() => {
        if (file) {
            localStorage.setItem(`socraticstudy-page-${file.name}`, String(currentPage));
        }
    }, [currentPage, file]);

    useEffect(() => {
        // Load cached summary immediately when page changes
        if (!file || !pdfDoc) return;
        const cacheKey = `ssum:${file.name}:${currentPage}:${isEli5 ? 'eli5' : 'std'}:${summaryFormat}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const updated = [...summaries];
            try {
                updated[currentPage - 1] = summaryFormat === 'flashcards' ? JSON.parse(cached) : cached;
            } catch (e) {
                updated[currentPage - 1] = cached;
            }
            setSummaries(updated);
        } else {
            // Clear current page summary if no cache
            const updated = [...summaries];
            updated[currentPage - 1] = null;
            setSummaries(updated);
        }
    }, [currentPage, file, pdfDoc, isEli5, summaryFormat]);

    const resetState = () => {
        setFile(null);
        setPdfDoc(null);
        setProcessedYoutubeUrl(null);
        setProcessedVideoFile(null);
        setCurrentPage(1);
        setSummaries([]);
        setAudioSrcs([]);
        setCurrentAudioSrc(null);
        setError(null);
        setIsPreparing(false);
        setIsSummarizing(false);
        setSummarizationProgress(0);
        setError(null);
        setVectorStore(null);
        setActiveFeatureTab('summary');
        setQuizData(null);
        setFlashcardData(null);
    };

    const handleFileChange = useCallback(async (selectedFile: File | null) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsPreparing(true);
        setError(null);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);

            const savedPage = localStorage.getItem(`socraticstudy-page-${selectedFile.name}`);
            if (savedPage && parseInt(savedPage, 10) <= pdf.numPages) {
                setCurrentPage(parseInt(savedPage, 10));
            }

            // Use backend page texts for consistency (and future server-side extraction)
            try {
                const uploaded = await uploadPdf(selectedFile);
                const store = await createVectorStore(uploaded.pages);
                setVectorStore(store);
            } catch (e) {
                const allText = await extractTextFromAllPages(pdf);
                const store = await createVectorStore(allText);
                setVectorStore(store);
            }

        } catch (err) {
            setError('Failed to load and process PDF. The file might be corrupted or unsupported.');
            console.error(err);
        } finally {
            setIsPreparing(false);
        }
    }, []);

    const handleYoutubeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!youtubeUrlInput.trim()) return;

        resetState();
        setProcessedYoutubeUrl(youtubeUrlInput.trim());
        setIsSummarizing(true);
        setError(null);

        try {
            setSummarizationProgress(50);
            const { summary, transcript } = await summarizeYoutube(youtubeUrlInput.trim(), isEli5);
            setSummaries([summary]);
            const store = await createVectorStore([transcript]);
            setVectorStore(store);
            setSummarizationProgress(100);
        } catch (err: any) {
            setError(`Failed to process YouTube video: ${err.message || err}`);
            console.error(err);
            setProcessedYoutubeUrl(null); // Reset on hard failure so they can try again
        } finally {
            setIsSummarizing(false);
            setSummarizationProgress(0);
        }
    };

    const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        resetState();
        setProcessedVideoFile(selectedFile);
        setIsSummarizing(true);
        setError(null);

        try {
            setSummarizationProgress(50);
            const { summary, transcript } = await summarizeVideoApi(selectedFile, isEli5);
            setSummaries([summary]);
            const store = await createVectorStore([transcript]);
            setVectorStore(store);
            setSummarizationProgress(100);
        } catch (err: any) {
            setError(`Failed to process video file: ${err.message || err}`);
            console.error(err);
            setProcessedVideoFile(null);
        } finally {
            setIsSummarizing(false);
            setSummarizationProgress(0);
        }
    };

    const handleSummarizeDocument = useCallback(async () => {
        if (!pdfDoc && !vectorStore) return;

        setIsSummarizing(true);
        setError(null);

        if (pdfDoc) {
            setSummaries([]);
            setAudioSrcs([]);
            const newSummaries = new Array(pdfDoc.numPages).fill('');
            const newAudioSrcs = new Array(pdfDoc.numPages).fill(null);

            try {
                const allPagesText: string[] = [];
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const text = await extractTextFromPage(pdfDoc, i);
                    allPagesText.push(text);
                }

                const fullText = allPagesText.join('\n\n');
                setSummarizationProgress(50);

                const generatedSummary = await summarizeApi(fullText, 0, summaryFormat);

                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    newSummaries[i - 1] = generatedSummary;
                    const cacheKey = `ssum:${file?.name || 'unknown'}:${i}:${isEli5 ? 'eli5' : 'std'}:${summaryFormat}`;
                    localStorage.setItem(cacheKey, typeof generatedSummary === 'string' ? generatedSummary : JSON.stringify(generatedSummary));
                }

                setSummaries([...newSummaries]);
                setSummarizationProgress(100);
            } catch (err: any) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(`Failed to generate summaries: ${msg}`);
                console.error(err);
            }
        } else if (vectorStore) {
            try {
                setSummarizationProgress(50);
                const generatedSummary = await summarizeApi(vectorStore, 0, summaryFormat);
                setSummaries([generatedSummary]);
                setSummarizationProgress(100);
            } catch (err: any) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(`Failed to generate summary: ${msg}`);
                console.error(err);
            }
        }

        setIsSummarizing(false);
        setSummarizationProgress(0);
    }, [pdfDoc, isEli5, summaryFormat, vectorStore, file]);

    const handleListen = useCallback(async () => {
        const summary = summaries[currentPage - 1];
        if (!summary || typeof summary !== 'string') return;

        if (isPlaying && currentAudioSrc === audioSrcs[currentPage - 1]) {
            audioRef.current?.pause();
            return;
        }

        // Check cache first
        const audioKey = `saud:${file?.name || 'unknown'}:${currentPage}`;
        const cachedAudio = localStorage.getItem(audioKey);
        if (cachedAudio) {
            const [mime, base64] = cachedAudio.split(',', 2);
            const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mime || 'audio/wav' }));
            const newAudioSrcs = [...audioSrcs];
            newAudioSrcs[currentPage - 1] = url;
            setAudioSrcs(newAudioSrcs);
            setCurrentAudioSrc(url);
            return;
        }

        if (audioSrcs[currentPage - 1]) {
            setCurrentAudioSrc(audioSrcs[currentPage - 1]);
            return;
        }

        setIsLoadingAudio(true);
        setError(null);

        try {
            const audioUrl = await ttsApi(summary);
            const newAudioSrcs = [...audioSrcs];
            newAudioSrcs[currentPage - 1] = audioUrl;
            setAudioSrcs(newAudioSrcs);
            setCurrentAudioSrc(audioUrl);
        } catch (err) {
            setError('Failed to generate audio. Please try again.');
            console.error(err);
        } finally {
            setIsLoadingAudio(false);
        }
    }, [summaries, audioSrcs, currentPage, isPlaying, currentAudioSrc]);

    const handleAnswerDoubt = useCallback(async (question: string) => {
        if (!vectorStore) {
            throw new Error("Document not ready for Q&A.");
        }
        // vectorStore is now the full compiled context string
        return await doubtApi(question, vectorStore);
    }, [vectorStore]);

    const handleGenerateQuiz = useCallback(async () => {
        if (!vectorStore) return;
        setIsGeneratingQuiz(true);
        setError(null);
        try {
            const data = await generateQuiz(vectorStore);
            setQuizData(data.questions);
        } catch (err: any) {
            setError(`Failed to generate quiz: ${err.message || err}`);
            console.error(err);
        } finally {
            setIsGeneratingQuiz(false);
        }
    }, [vectorStore]);

    const handleGenerateFlashcards = useCallback(async () => {
        if (!vectorStore) return;
        setIsGeneratingFlashcards(true);
        setError(null);
        try {
            const data = await generateFlashcards(vectorStore);
            setFlashcardData(data.flashcards);
        } catch (err: any) {
            setError(`Failed to generate flashcards: ${err.message || err}`);
            console.error(err);
        } finally {
            setIsGeneratingFlashcards(false);
        }
    }, [vectorStore]);

    // Automatically trigger generation when switching to empty tabs
    useEffect(() => {
        if (activeFeatureTab === 'quiz' && !quizData && !isGeneratingQuiz) {
            handleGenerateQuiz();
        } else if (activeFeatureTab === 'flashcards' && !flashcardData && !isGeneratingFlashcards) {
            handleGenerateFlashcards();
        }
    }, [activeFeatureTab, quizData, flashcardData, isGeneratingQuiz, isGeneratingFlashcards, handleGenerateQuiz, handleGenerateFlashcards]);

    useEffect(() => {
        if (currentAudioSrc && audioRef.current) {
            audioRef.current.src = currentAudioSrc;
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        }
    }, [currentAudioSrc]);

    const exitFullscreen = async () => {
        if (document.exitFullscreen) await document.exitFullscreen();
    };

    const startFullscreenAutoplay = async () => {
        const container = viewerContainerRef.current as any;
        if (container?.requestFullscreen) {
            await container.requestFullscreen();
        }
        setIsAutoPlayMode(true);
        const audioEl = audioRef.current;
        if (!audioEl) return;
        const onEnded = async () => {
            if (!isAutoPlayMode || !pdfDoc) return;
            const next = currentPage + 1;
            if (next <= (pdfDoc?.numPages || 0)) {
                setCurrentPage(next);
                await handleListen();
            }
        };
        audioEl.onended = onEnded;
        await handleListen();
    };

    const stopAutoplay = () => {
        setIsAutoPlayMode(false);
        if (audioRef.current) {
            audioRef.current.onended = null;
            audioRef.current.pause();
        }
    };

    const goToNextInFullscreen = async () => {
        if (!pdfDoc) return;
        const next = currentPage + 1;
        if (next <= pdfDoc.numPages) {
            setCurrentPage(next);
            if (isFullscreen) {
                await handleListen();
            }
        }
    };

    const goToPrevInFullscreen = async () => {
        if (!pdfDoc) return;
        const prev = currentPage - 1;
        if (prev >= 1) {
            setCurrentPage(prev);
            if (isFullscreen) {
                await handleListen();
            }
        }
    };

    const togglePlayPause = async () => {
        const el = audioRef.current;
        if (!el) return;
        if (isPlaying) {
            el.pause();
        } else {
            await handleListen();
        }
    };

    // If user changes page during fullscreen autoplay, ensure audio follows
    useEffect(() => {
        if (isFullscreen && isAutoPlayMode) {
            handleListen();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, isFullscreen, isAutoPlayMode]);

    // Keyboard shortcuts in fullscreen: ←/→ for prev/next, Space for play/pause, Esc to exit
    useEffect(() => {
        if (!isFullscreen) return;
        const onKey = async (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                await goToPrevInFullscreen();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                await goToNextInFullscreen();
            } else if (e.key === ' ') {
                e.preventDefault();
                await togglePlayPause();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                await exitFullscreen();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isFullscreen, goToPrevInFullscreen, goToNextInFullscreen, togglePlayPause]);

    return (
        <div className="min-h-screen flex flex-col font-sans text-gray-800" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
            <header className="bg-white shadow-md w-full p-4 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-accent">
                        <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7z" />
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-700">NeuralNotes</h1>
                </div>
                <div>
                    <button
                        onClick={resetState}
                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                        aria-label="Upload new PDF"
                    >
                        New PDF
                    </button>
                </div>
            </header>
            <main className="flex-grow flex flex-col p-4 lg:p-6 gap-6">
                {!file && !processedYoutubeUrl && !processedVideoFile ? (
                    <div className="w-full flex-grow flex flex-col items-center justify-start relative overflow-hidden -mx-4 -my-4 lg:-mx-6 lg:-my-6 pt-20 pb-16 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                        {/* Animated Background */}
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-3xl mix-blend-multiply animate-blob"></div>
                            <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-3xl mix-blend-multiply animate-blob" style={{ animationDelay: '2s' }}></div>
                            <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-brand-secondary/10 blur-3xl mix-blend-multiply animate-blob" style={{ animationDelay: '4s' }}></div>
                        </div>

                        {/* Hero Content */}
                        <div className="z-10 flex flex-col items-center text-center px-4 max-w-4xl w-full animate-fade-in-up">
                            <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-accent mb-6 tracking-tight drop-shadow-sm">
                                Unlock Your Study Potential
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl leading-relaxed">
                                SocraticStudy is an AI-powered companion that turns textbooks and lectures into interactive summaries, audio, quizzes, and flashcards.
                            </p>
                        </div>

                        {/* Interactive Upload Section */}
                        <div className="z-10 w-full max-w-3xl flex flex-col items-center space-y-6 animate-fade-in-up px-4" style={{ animationDelay: '0.2s' }}>
                            {/* Tab Switcher */}
                            <div className="flex space-x-2 p-1.5 bg-white/60 backdrop-blur-md rounded-xl shadow-lg border border-white/50">
                                <button
                                    onClick={() => setInputType('pdf')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'pdf' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    PDF Document
                                </button>
                                <button
                                    onClick={() => setInputType('youtube')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'youtube' ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    YouTube Video
                                </button>
                                <button
                                    onClick={() => setInputType('video')}
                                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${inputType === 'video' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 shadow-md text-white scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                                >
                                    Local Media
                                </button>
                            </div>

                            {/* Input Areas */}
                            <div className="w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 transform transition-all duration-500 ease-in-out hover:shadow-[0_20px_50px_rgba(99,_102,_241,_0.1)]">
                                {inputType === 'pdf' && (
                                    <div className="animate-fade-in-up">
                                        <div className="text-center mb-6">
                                            <h2 className="text-2xl font-bold text-gray-800">Summarize Your Textbooks</h2>
                                            <p className="text-gray-500 mt-2">Upload a PDF to extract text, generate study guides, and chat with the document.</p>
                                        </div>
                                        <PdfUploader onFileChange={handleFileChange} />
                                    </div>
                                )}
                                {inputType === 'youtube' && (
                                    <form onSubmit={handleYoutubeSubmit} className="flex flex-col space-y-4 animate-fade-in-up">
                                        <div className="text-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">Learn from YouTube</h2>
                                            <p className="text-gray-500 mt-2">Paste a URL. We'll download the audio, transcribe it, and build a study guide.</p>
                                        </div>
                                        <input
                                            type="url"
                                            required
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={youtubeUrlInput}
                                            onChange={(e) => setYoutubeUrlInput(e.target.value)}
                                            className="w-full px-5 py-4 bg-white/50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder-gray-400 text-lg"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 text-lg"
                                        >
                                            Process Video
                                        </button>
                                    </form>
                                )}
                                {inputType === 'video' && (
                                    <div className="flex flex-col space-y-4 items-center animate-fade-in-up">
                                        <div className="text-center mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">Analyze Local Media</h2>
                                            <p className="text-gray-500 mt-2">Upload a local video or audio file (.mp4, .mp3, .wav) for transcription and summary.</p>
                                        </div>
                                        <label className="w-full flex flex-col items-center px-4 py-8 bg-blue-50/50 text-blue-600 rounded-xl tracking-wide uppercase border-2 border-blue-200 border-dashed cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group">
                                            <svg className="w-10 h-10 mb-3 text-blue-400 group-hover:text-blue-500 transition-colors" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                                            </svg>
                                            <span className="mt-2 text-lg font-semibold leading-normal">Select a media file</span>
                                            <span className="text-xs text-blue-400 mt-1 normal-case">Audio or Video format</span>
                                            <input type='file' className="hidden" accept="audio/*,video/*" onChange={handleVideoFileChange} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Information Section */}
                        <div className="z-10 mt-auto pt-24 pb-8 px-4 w-full max-w-6xl text-center">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                                <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/50 text-left hover:bg-white/60 transition-colors">
                                    <div className="w-14 h-14 bg-indigo-100/80 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Deep Document Analysis</h3>
                                    <p className="text-gray-600 leading-relaxed">Upload entire textbooks. Our AI uses massive context windows to understand every page, allowing for accurate Q&A without hallucination.</p>
                                </div>
                                <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/50 text-left hover:bg-white/60 transition-colors">
                                    <div className="w-14 h-14 bg-rose-100/80 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Media Transcription</h3>
                                    <p className="text-gray-600 leading-relaxed">Give us a YouTube URL or a lecture audio file. We'll transcribe it using advanced speech-to-text and generate a comprehensive study guide.</p>
                                </div>
                                <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/50 text-left hover:bg-white/60 transition-colors">
                                    <div className="w-14 h-14 bg-emerald-100/80 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Active Recall Tools</h3>
                                    <p className="text-gray-600 leading-relaxed">Don't just read passively. Turn your materials into dynamic Flashcards and multiple-choice Quizzes to test your knowledge.</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm tracking-wide">Powered by Gemini 2.0 Flash • Fast, Hallucination-free, Secure Media Processing</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 w-full">
                        {file && pdfDoc && (
                            <div ref={viewerContainerRef} className="relative flex-1 flex flex-col lg:w-1/2 bg-white rounded-xl shadow-lg p-4">
                                <PdfViewer
                                    pdfDoc={pdfDoc}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                />
                                {isFullscreen && (
                                    <>
                                        <div className="absolute top-2 right-2 flex space-x-2">
                                            <button
                                                onClick={exitFullscreen}
                                                className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-800 text-white hover:bg-black"
                                            >Exit Fullscreen</button>
                                            {isAutoPlayMode ? (
                                                <button onClick={stopAutoplay} className="px-3 py-1.5 text-sm font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700">Stop Autoplay</button>
                                            ) : (
                                                <button onClick={startFullscreenAutoplay} className="px-3 py-1.5 text-sm font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700">Start Autoplay</button>
                                            )}
                                        </div>
                                        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-3">
                                            <button onClick={goToPrevInFullscreen} className="px-3 py-2 text-sm font-semibold rounded bg-white/90 hover:bg-white shadow">Prev</button>
                                            <button onClick={togglePlayPause} className="px-3 py-2 text-sm font-semibold rounded bg-white/90 hover:bg-white shadow">{isPlaying ? 'Pause' : 'Play'}</button>
                                            <button onClick={goToNextInFullscreen} className="px-3 py-2 text-sm font-semibold rounded bg-white/90 hover:bg-white shadow">Next</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="flex-1 flex flex-col lg:w-1/2 bg-white rounded-xl shadow-lg p-6 overflow-hidden">
                            {/* Feature Tabs */}
                            <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg mb-6 shrink-0 overflow-x-auto">
                                <button
                                    onClick={() => setActiveFeatureTab('summary')}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'summary' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setActiveFeatureTab('doubt')}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'doubt' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Q&A Doubt Solver
                                </button>
                                <button
                                    onClick={() => setActiveFeatureTab('quiz')}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'quiz' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Quiz
                                </button>
                                <button
                                    onClick={() => setActiveFeatureTab('flashcards')}
                                    disabled={!vectorStore}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeFeatureTab === 'flashcards' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'} ${!vectorStore ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Flashcards
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0">
                                {activeFeatureTab === 'summary' && (
                                    <div className="space-y-6">
                                        <SummaryPanel
                                            summary={summaries[currentPage - 1] || ''}
                                            isSummarizing={isSummarizing}
                                            summarizationProgress={summarizationProgress}
                                            isLoadingAudio={isLoadingAudio}
                                            isPlaying={isPlaying}
                                            error={error}
                                            onSummarize={handleSummarizeDocument}
                                            onListen={handleListen}
                                            hasDocument={!!pdfDoc || !!processedYoutubeUrl || !!processedVideoFile}
                                            hasSummaries={summaries.length > 0}
                                            isEli5={isEli5}
                                            setIsEli5={setIsEli5}
                                            isPreparing={isPreparing}
                                            summaryFormat={summaryFormat}
                                            setSummaryFormat={setSummaryFormat as any}
                                        />
                                        <div className="flex justify-end pr-2">
                                            <button
                                                onClick={startFullscreenAutoplay}
                                                disabled={!pdfDoc}
                                                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gray-800 hover:bg-black disabled:bg-gray-300"
                                            >
                                                Fullscreen Auto-Play
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeFeatureTab === 'doubt' && (
                                    <DoubtPanel
                                        onAnswerDoubt={handleAnswerDoubt}
                                        isReady={!!vectorStore}
                                    />
                                )}

                                {activeFeatureTab === 'quiz' && (
                                    <div className="h-full">
                                        {isGeneratingQuiz ? (
                                            <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                                <p className="text-gray-500">AI is crafting your quiz...</p>
                                            </div>
                                        ) : quizData ? (
                                            <Quiz questions={quizData} />
                                        ) : (
                                            <div className="text-gray-500 text-center py-10">Preparing quiz...</div>
                                        )}
                                    </div>
                                )}

                                {activeFeatureTab === 'flashcards' && (
                                    <div className="h-full">
                                        {isGeneratingFlashcards ? (
                                            <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                                <p className="text-gray-500">AI is generating flashcards...</p>
                                            </div>
                                        ) : flashcardData ? (
                                            <Flashcard cards={flashcardData} />
                                        ) : (
                                            <div className="text-gray-500 text-center py-10">Preparing flashcards...</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <audio ref={audioRef} />
        </div>
    );
};

export default App;
