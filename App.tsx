
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CaseDetail from './components/CaseDetail';
import Jukebox from './components/Jukebox';
import NewsTicker from './components/NewsTicker';
import { parseContentWithGemini } from './services/geminiService';
import { ExtractedData, ParsingStatus, MultiFileInput, Case } from './types';
import { groupFilesIntoCases } from './utils/fileGrouping';

// Concurrency limit to protect API rate limits (Free/Tier 1 usually ~15 RPM, Paid ~60 RPM)
// Setting to 5 simultaneous requests ensures we drain the queue fast but stay safe.
const CONCURRENCY_LIMIT = 5; 

const App: React.FC = () => {
  // Global Case State
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  
  // Queue System
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [activeProcessingCount, setActiveProcessingCount] = useState(0);
  
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null); // New state for stopping timer
  const [isJukeboxOpen, setIsJukeboxOpen] = useState(false);

  // --- 1. File Upload & Grouping ---
  const handleBulkUpload = (files: File[]) => {
    // Reset session timer if we are starting a fresh batch from zero
    if (cases.length === 0) {
        setSessionStartTime(Date.now());
        setSessionEndTime(null);
    } else if (!sessionStartTime) {
        setSessionStartTime(Date.now());
    }
    
    const newCases = groupFilesIntoCases(files);
    
    // Efficiently merge new cases avoiding duplicates by ID
    setCases(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const filteredNew = newCases.filter(c => !existingIds.has(c.id));
        return [...prev, ...filteredNew];
    });
  };

  // --- 2. Processing Logic (Worker) ---
  
  const extractPdfText = async (file: File): Promise<string> => {
    if (!(window as any).pdfjsLib) return '';
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (!(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc) {
             (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const loadingTask = (window as any).pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages for speed
        for (let i = 1; i <= maxPages; i++) {
             const page = await pdf.getPage(i);
             const textContent = await page.getTextContent();
             const pageText = textContent.items.map((item: any) => item.str).join(' ');
             fullText += `--- Page ${i} ---\n${pageText}\n`;
        }
        return fullText;
    } catch (e) {
        console.warn("Text extraction failed", e);
        return '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // The Atomic Process Function
  const processCase = useCallback(async (caseId: string, manualId?: string) => {
    // 1. Mark as Processing & Set Start Time
    const startTime = Date.now();
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: ParsingStatus.PROCESSING, error: undefined, startTime } : c));

    const currentCase = cases.find(c => c.id === caseId);
    if (!currentCase || !currentCase.files.pdf) {
         setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: ParsingStatus.ERROR, error: "No PDF file found.", endTime: Date.now() } : c));
         return;
    }

    try {
        const { pdf } = currentCase.files;
        
        // 1. Text Extraction
        let pdfText = '';
        try { pdfText = await extractPdfText(pdf); } catch(e) {}
        
        // 2. Base64 Fallback
        let pdfBase64: string | undefined = undefined;
        if (!pdfText || pdfText.length < 500) {
            pdfBase64 = await readFileAsBase64(pdf);
        }

        // 3. Read Support Files
        const [apiContent, htmlContent, scrapeContent] = await Promise.all([
            currentCase.files.api ? readFileAsText(currentCase.files.api) : undefined,
            currentCase.files.html ? readFileAsText(currentCase.files.html) : undefined,
            currentCase.files.scrape ? readFileAsText(currentCase.files.scrape) : undefined
        ]);

        // 4. Gemini Call
        const input: MultiFileInput = {
            pdfBase64,
            pdfText,
            apiContent,
            htmlContent,
            scrapeContent,
            manualId: manualId || currentCase.manualId
        };

        const result = await parseContentWithGemini(input);

        if (pdfText && (!result.documentText || result.documentText.length < 100)) {
            result.documentText = pdfText;
        }

        // 5. Success
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        setCases(prev => prev.map(c => c.id === caseId ? { 
            ...c, 
            status: ParsingStatus.SUCCESS, 
            extractedData: result,
            processingTime: duration,
            endTime
        } : c));

    } catch (error: any) {
        console.error(`Error processing case ${caseId}`, error);
        setCases(prev => prev.map(c => c.id === caseId ? { 
            ...c, 
            status: ParsingStatus.ERROR, 
            error: error.message || "Extraction Failed",
            endTime: Date.now()
        } : c));
    }
  }, [cases]);

  // --- 3. Queue Processor Effect ---
  // This essentially acts as a thread pool manager
  useEffect(() => {
    // If we have items in queue AND we haven't hit concurrency limit
    if (processingQueue.length > 0 && activeProcessingCount < CONCURRENCY_LIMIT) {
        const nextId = processingQueue[0];
        
        // Remove from queue immediately
        setProcessingQueue(prev => prev.slice(1));
        
        // Increment active count
        setActiveProcessingCount(prev => prev + 1);

        // Process logic
        processCase(nextId).finally(() => {
            // Decrement active count when done (success or fail)
            setActiveProcessingCount(prev => prev - 1);
        });
    }
  }, [processingQueue, activeProcessingCount, processCase]);

  // --- 4. Global Timer Stop Logic ---
  useEffect(() => {
      // Check if all work is done
      const hasStarted = sessionStartTime !== null;
      const queueEmpty = processingQueue.length === 0;
      const noActiveWorkers = activeProcessingCount === 0;
      // Also ensure at least one case has finished or there are cases loaded
      const hasCases = cases.length > 0;
      const allProcessed = cases.every(c => c.status === ParsingStatus.SUCCESS || c.status === ParsingStatus.ERROR || c.status === ParsingStatus.IDLE);
      // Wait until we have actually processed something if we started
      const someProcessed = cases.some(c => c.status === ParsingStatus.SUCCESS || c.status === ParsingStatus.ERROR);

      if (hasStarted && queueEmpty && noActiveWorkers && someProcessed && !sessionEndTime) {
          // If queue is empty and workers are 0, we are done.
          setSessionEndTime(Date.now());
      } else if (hasStarted && (!queueEmpty || activeProcessingCount > 0) && sessionEndTime) {
          // Resumed processing
          setSessionEndTime(null);
      }
  }, [processingQueue.length, activeProcessingCount, cases, sessionStartTime, sessionEndTime]);


  // Public handlers
  const handleProcessAll = () => {
      // Find all cases that are IDLE or ERROR
      const pendingCases = cases.filter(c => c.status === ParsingStatus.IDLE || c.status === ParsingStatus.ERROR);
      // Add their IDs to the queue
      setProcessingQueue(prev => [...prev, ...pendingCases.map(c => c.id)]);
      // Reset end time if restarting
      setSessionEndTime(null);
      if (!sessionStartTime) setSessionStartTime(Date.now());
  };

  const handleProcessSingle = (caseId: string, manualId?: string) => {
      // Add single ID to queue
      setProcessingQueue(prev => [...prev, caseId]);
      setSessionEndTime(null);
      if (!sessionStartTime) setSessionStartTime(Date.now());
  };

  const handleDataUpdate = (caseId: string, newData: ExtractedData) => {
      setCases(prev => prev.map(c => c.id === caseId ? { 
          ...c, 
          extractedData: newData,
          isEdited: true // Mark as edited
      } : c));
  };
  
  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset? This will clear all uploaded cases.")) {
        setCases([]);
        setProcessingQueue([]);
        setActiveCaseId(null);
        setSessionStartTime(null);
        setSessionEndTime(null);
        setActiveProcessingCount(0);
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-slate-900 relative font-inter flex flex-col overflow-hidden">
      <Header 
        startTime={sessionStartTime} 
        endTime={sessionEndTime}
        onToggleJukebox={() => setIsJukeboxOpen(!isJukeboxOpen)} 
      />
      
      <main className="flex-grow overflow-hidden relative z-10 flex flex-col pb-8"> 
        {/* pb-8 added to make room for NewsTicker */}
        
        {activeCaseId ? (
            // Individual Case View
            (() => {
                const activeCase = cases.find(c => c.id === activeCaseId);
                if (!activeCase) return <div>Case Not Found</div>;
                
                return (
                    <CaseDetail 
                        activeCase={activeCase}
                        onBack={() => setActiveCaseId(null)}
                        onAnalyze={handleProcessSingle}
                        onUpdateCaseData={handleDataUpdate}
                    />
                );
            })()
        ) : (
            // Dashboard View
            <Dashboard 
                cases={cases}
                onUpload={handleBulkUpload}
                onSelectCase={setActiveCaseId}
                onProcessAll={handleProcessAll}
                onReset={handleReset}
                processingQueueSize={processingQueue.length}
                activeProcessingCount={activeProcessingCount}
            />
        )}
      </main>

      {/* Persistent UI Elements */}
      <NewsTicker />
      <Jukebox isOpen={isJukeboxOpen} onClose={() => setIsJukeboxOpen(false)} />
    </div>
  );
};

export default App;
