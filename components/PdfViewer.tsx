
import React, { useRef, useEffect, useCallback } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import type { PDFDocumentProxy } from '../types';

interface PdfViewerProps {
    pdfDoc: PDFDocumentProxy | null;
    currentPage: number;
    setCurrentPage: (page: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfDoc, currentPage, setCurrentPage }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdfDoc || !canvasRef.current) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              const renderContext = {
                  canvasContext: context,
                  viewport: viewport,
              };
              await page.render(renderContext).promise;
            }
        } catch (error) {
            console.error('Failed to render PDF page:', error);
        }
    }, [pdfDoc]);

    useEffect(() => {
        renderPage(currentPage);
    }, [currentPage, renderPage]);

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (pdfDoc && currentPage < pdfDoc.numPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 px-4 bg-white/40 backdrop-blur-sm p-3 rounded-2xl border border-white/50 shadow-sm">
                <button
                    onClick={goToPreviousPage}
                    disabled={currentPage <= 1}
                    className="p-2.5 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all text-gray-700 hover:-translate-x-0.5"
                    aria-label="Previous Page"
                >
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <span className="text-gray-800 font-bold tracking-wide">
                    Page <span className="text-brand-primary">{currentPage}</span> of {pdfDoc?.numPages || '...'}
                </span>
                <button
                    onClick={goToNextPage}
                    disabled={!pdfDoc || currentPage >= pdfDoc.numPages}
                    className="p-2.5 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all text-gray-700 hover:translate-x-0.5"
                    aria-label="Next Page"
                >
                    <ChevronRightIcon className="h-6 w-6" />
                </button>
            </div>
            <div className="flex-grow overflow-auto bg-gray-50/50 backdrop-blur-md rounded-2xl shadow-inner border border-gray-100 flex justify-center items-start p-6">
                <canvas ref={canvasRef} className="max-w-full h-auto shadow-[0_20px_50px_rgba(0,_0,_0,_0.1)] rounded-xl border border-gray-200"></canvas>
            </div>
        </div>
    );
};
