
import React, { useRef } from 'react';

interface PdfUploaderProps {
    onFileChange: (file: File | null) => void;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onFileChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileChange(file);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div 
            className="flex flex-col items-center justify-center w-full max-w-lg p-10 border-2 border-dashed border-indigo-300/50 rounded-3xl bg-white/40 backdrop-blur-sm text-center cursor-pointer hover:bg-white/60 hover:border-indigo-400 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group"
            onClick={handleClick}
        >
            <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6 group-hover:-translate-y-1 group-hover:shadow-md transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload your PDF</h2>
            <p className="text-gray-500 font-medium">Click to browse or drag and drop a file</p>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );
};
