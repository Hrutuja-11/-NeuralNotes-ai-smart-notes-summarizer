import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

export interface FlashcardData {
  term: string;
  definition: string;
}

interface FlashcardProps {
  cards: FlashcardData[];
}

const Flashcard: React.FC<FlashcardProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards || cards.length === 0) {
    return <div className="text-gray-500 text-center py-10">No flashcards available.</div>;
  }

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="flex flex-col items-center w-full mx-auto pb-8 animate-fade-in-up">
      <div className="flex justify-between items-center w-full mb-8 px-2">
        <div className="bg-indigo-50 text-brand-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm">
          CARD {currentIndex + 1} OF {cards.length}
        </div>
        <button 
          onClick={() => { setIsFlipped(false); setCurrentIndex(0); }}
          className="text-sm font-semibold text-gray-500 hover:text-brand-primary flex items-center gap-1.5 transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100"
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
      </div>

      {/* 3D Flip Container */}
      <div 
        className="w-full aspect-[4/2.5] md:aspect-[3/2] perspective-1000 cursor-pointer mb-10 group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative w-full h-full duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute w-full h-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white flex flex-col items-center justify-center p-10 backface-hidden group-hover:shadow-2xl transition-all duration-500">
            <h3 className="text-3xl md:text-5xl font-extrabold text-gray-800 text-center tracking-tight leading-tight">{currentCard.term}</h3>
            <div className="absolute bottom-6 flex flex-col items-center animate-pulse">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Click to reveal</span>
            </div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl shadow-xl border border-indigo-100 flex items-center justify-center p-10 backface-hidden rotate-y-180 sm:overflow-y-auto">
            <p className="text-xl md:text-2xl font-medium text-indigo-950 text-center leading-relaxed max-w-2xl">{currentCard.definition}</p>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-6">
        <button 
          onClick={handlePrev}
          className="p-4 rounded-2xl bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-300 text-gray-700 disabled:opacity-50 disabled:shadow-none hover:-translate-x-1"
          disabled={cards.length <= 1}
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        <button 
          onClick={handleNext}
          className="p-4 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 text-white disabled:opacity-50 disabled:shadow-none hover:translate-x-1"
          disabled={cards.length <= 1}
        >
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default Flashcard;
