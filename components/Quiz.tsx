import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizProps {
  questions: QuizQuestion[];
}

const Quiz: React.FC<QuizProps> = ({ questions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(Array(questions?.length).fill(''));
  const [showResults, setShowResults] = useState(false);

  if (!questions || questions.length === 0) {
    return <div className="text-gray-500 text-center py-10">No quiz questions available.</div>;
  }

  const handleSelectOption = (option: string) => {
    if (showResults) return; // Prevent changing answer after submission
    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = option;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers(Array(questions.length).fill(''));
    setShowResults(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) correct++;
    });
    return correct;
  };

  if (showResults) {
    const score = calculateScore();
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-10">
        <h2 className="text-3xl font-bold text-gray-800">Quiz Complete!</h2>
        <div className="text-6xl font-extrabold text-indigo-600 border-4 border-indigo-100 p-8 rounded-full">
          {pct}%
        </div>
        <p className="text-lg text-gray-600">You got {score} out of {questions.length} correct.</p>
        <button 
          onClick={handleRestart}
          className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-5 h-5" /> Retake Quiz
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== '';

  return (
    <div className="w-full mx-auto pb-8 flex flex-col items-center animate-fade-in-up">
      <div className="flex justify-between items-center w-full mb-6 px-2">
        <div className="bg-indigo-50 text-brand-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm">
          QUESTION {currentIndex + 1} OF {questions.length}
        </div>
      </div>

      <div className="w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 sm:p-10 mb-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100">
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-10 leading-relaxed tracking-tight">
          {currentQ.question}
        </h3>
        
        <div className="space-y-4">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option;
            const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left px-6 py-5 border-2 rounded-2xl transition-all duration-300 flex items-center gap-5
                  ${isSelected ? 'border-brand-primary bg-indigo-50/80 ring-4 ring-brand-primary/20 shadow-md transform scale-[1.01]' : 'border-gray-200 hover:border-indigo-300 hover:bg-white hover:shadow-sm'}
                `}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm transition-colors duration-300
                  ${isSelected ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}
                `}>
                  {optionLetter}
                </div>
                <span className={`flex-1 text-lg leading-snug transition-colors duration-300 ${isSelected ? 'text-indigo-900 font-bold' : 'text-gray-700 font-medium'}`}>
                  {option}
                </span>
                {isSelected && <CheckCircle2 className="w-6 h-6 text-brand-primary shrink-0 animate-blob" />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!hasAnsweredCurrent}
        className={`w-full sm:w-auto min-w-[240px] px-8 py-4.5 rounded-2xl font-bold text-lg transition-all duration-300 transform
          ${hasAnsweredCurrent 
            ? 'bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-indigo-600 hover:to-indigo-700 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
        `}
      >
        {currentIndex === questions.length - 1 ? 'Finish & View Score' : 'Next Question'}
      </button>

    </div>
  );
};

export default Quiz;
