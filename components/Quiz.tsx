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
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center">
      <div className="flex justify-between items-center w-full mb-6">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
          {currentQ.question}
        </h3>
        
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option;
            const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left px-5 py-4 border-2 rounded-xl transition-all flex items-center gap-4
                  ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}
                `}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}
                `}>
                  {optionLetter}
                </div>
                <span className={`flex-1 text-lg ${isSelected ? 'text-indigo-900 font-semibold' : 'text-gray-700'}`}>
                  {option}
                </span>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!hasAnsweredCurrent}
        className={`w-full sm:w-auto min-w-[200px] px-8 py-4 rounded-xl font-bold text-lg shadow-md transition-all
          ${hasAnsweredCurrent 
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:-translate-y-0.5' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
        `}
      >
        {currentIndex === questions.length - 1 ? 'Finish & Check Score' : 'Next Question'}
      </button>

    </div>
  );
};

export default Quiz;
