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
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center w-full mb-6">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Card {currentIndex + 1} of {cards.length}
        </span>
        <button 
          onClick={() => { setIsFlipped(false); setCurrentIndex(0); }}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
      </div>

      {/* 3D Flip Container */}
      <div 
        className="w-full aspect-[3/2] perspective-1000 cursor-pointer mb-8"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute w-full h-full bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center p-8 backface-hidden">
            <h3 className="text-3xl font-bold text-gray-800 text-center">{currentCard.term}</h3>
            <p className="absolute bottom-4 text-xs text-gray-400">Click to flip</p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full bg-indigo-50 rounded-2xl shadow-xl border border-indigo-100 flex items-center justify-center p-8 backface-hidden rotate-y-180">
            <p className="text-xl text-indigo-900 text-center leading-relaxed">{currentCard.definition}</p>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4">
        <button 
          onClick={handlePrev}
          className="p-3 rounded-full bg-white shadow hover:bg-gray-50 transition-colors"
          disabled={cards.length <= 1}
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <button 
          onClick={handleNext}
          className="p-3 rounded-full bg-indigo-600 shadow hover:bg-indigo-700 transition-colors text-white"
          disabled={cards.length <= 1}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Flashcard;
