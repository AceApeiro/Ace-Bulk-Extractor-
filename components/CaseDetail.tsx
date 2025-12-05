
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PdfViewer from './PdfViewer';
import ResultsView from './ResultsView';
import VerificationPanel from './VerificationPanel';
import QCChecklist from './QCChecklist';
import InputArea from './InputArea';
import { Case, ParsingStatus, ExtractedData } from '../types';
import { ChevronLeft, AlertCircle, RotateCw, CheckSquare, FileText, SplitSquareHorizontal } from 'lucide-react';

interface CaseDetailProps {
  activeCase: Case;
  onBack: () => void;
  onAnalyze: (caseId: string, manualId?: string) => void;
  onUpdateCaseData: (caseId: string, data: ExtractedData) => void;
  onFileUpdate?: (caseId: string, files: any) => void;
}

const CaseDetail: React.FC<CaseDetailProps> = ({ activeCase, onBack, onAnalyze, onUpdateCaseData, onFileUpdate }) => {
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'qc'>('editor');
  const [fileContents, setFileContents] = useState<{api: string|null, html: string|null, scrape: string|null}>({api:null, html:null, scrape:null});

  const currentPdfFileRef = useRef<File | null>(null);

  // Read text file helper
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Initialize view when activeCase changes
  useEffect(() => {
    const initView = async () => {
        // 1. Setup PDF URL
        if (activeCase.files.pdf && activeCase.files.pdf !== currentPdfFileRef.current) {
            currentPdfFileRef.current = activeCase.files.pdf;
            const blob = activeCase.files.pdf.slice(0, activeCase.files.pdf.size, 'application/pdf');
            const url = URL.createObjectURL(blob);
            setPdfUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        }

        // 2. Read aux files
        const [apiText, htmlText, scrapeText] = await Promise.all([
            activeCase.files.api ? readFileAsText(activeCase.files.api) : Promise.resolve(null),
            activeCase.files.html ? readFileAsText(activeCase.files.html) : Promise.resolve(null),
            activeCase.files.scrape ? readFileAsText(activeCase.files.scrape) : Promise.resolve(null),
        ]);

        setFileContents({ api: apiText, html: htmlText, scrape: scrapeText });
    };

    initView();
  }, [activeCase]);

  // Handle re-processing request
  const handleReprocess = () => {
    onAnalyze(activeCase.id, activeCase.manualId);
  };
  
  // Handle data updates from editor
  const handleDataUpdate = (newData: ExtractedData) => {
      onUpdateCaseData(activeCase.id, newData);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
        {/* Navigation Bar */}
        <div className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onBack}
                    className="flex items-center text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide"
                >
                    <ChevronLeft className="w-4 h-4 mr-1"/> Back
                </button>
                <div className="h-4 w-[1px] bg-slate-700"></div>
                
                {/* View Switcher */}
                <div className="flex bg-slate-800 rounded p-0.5">
                    <button 
                        onClick={() => setViewMode('editor')}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${viewMode === 'editor' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <FileText className="w-3 h-3" /> Editor
                    </button>
                    <button 
                        onClick={() => setViewMode('qc')}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${viewMode === 'qc' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <CheckSquare className="w-3 h-3" /> QC Checklist
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-slate-500 text-xs font-mono hidden md:inline">{activeCase.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded border ${
                    activeCase.status === ParsingStatus.SUCCESS ? 'bg-green-900/20 text-green-400 border-green-800' :
                    activeCase.status === ParsingStatus.ERROR ? 'bg-red-900/20 text-red-400 border-red-800' :
                    activeCase.status === ParsingStatus.PROCESSING ? 'bg-blue-900/20 text-blue-400 border-blue-800 animate-pulse' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                    {ParsingStatus[activeCase.status]}
                </span>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow p-4 overflow-hidden relative z-10 flex flex-col min-h-0">
             {activeCase.error && (
                <div className="mb-2 bg-red-50/90 border border-red-200 rounded p-2 flex items-center text-red-700 text-xs shadow-lg backdrop-blur shrink-0">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <p className="font-medium truncate">{activeCase.error}</p>
                </div>
             )}

             <div className="grid grid-cols-12 gap-4 h-full min-h-0 transition-all duration-300">
                {/* PDF Viewer Pane */}
                <div className="h-full min-h-0 flex flex-col transition-all duration-300 col-span-12 lg:col-span-6">
                    <PdfViewer 
                        pdfUrl={pdfUrl}
                        apiContent={fileContents.api}
                        htmlContent={fileContents.html}
                        scrapeContent={fileContents.scrape}
                        highlightText={highlightedText}
                        extractedText={activeCase.extractedData?.documentText}
                    />
                </div>

                {/* Results / Processing Pane */}
                <div className="h-full flex flex-col min-h-0 transition-all duration-300 col-span-12 lg:col-span-6">
                    {activeCase.extractedData ? (
                        <div className="h-full flex flex-col bg-white/95 backdrop-blur rounded-xl shadow-[0_0_20px_rgba(0,217,255,0.2)] border border-[#00d9ff]/30 overflow-hidden">
                            <div className="p-0 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                                <VerificationPanel result={activeCase.extractedData.verification} />
                            </div>
                            
                            <div className="flex-grow overflow-hidden relative">
                                {viewMode === 'editor' ? (
                                    <ResultsView 
                                        data={activeCase.extractedData} 
                                        onDataUpdate={handleDataUpdate} 
                                        onHighlight={setHighlightedText}
                                    />
                                ) : (
                                    <QCChecklist onComplete={() => setViewMode('editor')} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-white/5 backdrop-blur rounded-xl border border-slate-700 shadow-inner text-center p-8">
                             {activeCase.status === ParsingStatus.PROCESSING ? (
                                 <div className="flex flex-col items-center">
                                     <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                     <h3 className="text-xl font-orbitron text-white animate-pulse">Processing Case...</h3>
                                     <p className="text-slate-400 mt-2 text-sm">Extracting metadata via Gemini 1.5 Flash</p>
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center">
                                     <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                                         <AlertCircle className="w-8 h-8 text-slate-500" />
                                     </div>
                                     <h3 className="text-lg font-medium text-slate-200 mb-2 font-orbitron">Ready to Process</h3>
                                     <p className="text-sm text-slate-500 max-w-xs mb-6">Review the source files on the left, then start extraction.</p>
                                     <button 
                                        onClick={handleReprocess}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                                    >
                                        <RotateCw className="w-4 h-4" /> Run Extraction
                                    </button>
                                 </div>
                             )}
                        </div>
                    )}
                </div>
             </div>
        </div>
    </div>
  );
};

export default CaseDetail;
