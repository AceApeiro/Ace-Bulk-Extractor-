
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CaseDetail from './components/CaseDetail';
import Jukebox from './components/Jukebox';
import NewsTicker from './components/NewsTicker';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { parseContentWithGemini } from './services/geminiService';
import { ExtractedData, ParsingStatus, MultiFileInput, Case, User, HistoricalSession } from './types';
import { groupFilesIntoCases } from './utils/fileGrouping';

const CONCURRENCY_LIMIT = 2; 

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // Global Case State
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  
  // Queue System
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [activeProcessingCount, setActiveProcessingCount] = useState(0);
  
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);
  const [isJukeboxOpen, setIsJukeboxOpen] = useState(false);

  // --- Login Handler ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  // --- 1. File Upload & Grouping ---
  const handleBulkUpload = async (files: File[]) => {
    if (cases.length === 0) {
        setSessionStartTime(Date.now());
        setSessionEndTime(null);
    } else if (!sessionStartTime) {
        setSessionStartTime(Date.now());
    }
    
    const processedFiles: File[] = [];
    // Identify Zips based on extension and MIME type
    const zipFiles = files.filter(f => 
        f.name.toLowerCase().endsWith('.zip') || 
        f.type.includes('zip') || 
        f.type.includes('compressed')
    );
    const normalFiles = files.filter(f => !zipFiles.includes(f));

    // Add normal files immediately
    processedFiles.push(...normalFiles);

    // Process Zip Files
    if (zipFiles.length > 0) {
        const JSZip = (window as any).JSZip;
        
        if (JSZip) {
            await Promise.all(zipFiles.map(async (zipFile) => {
                try {
                    const zip = new JSZip();
                    const content = await zip.loadAsync(zipFile);
                    
                    const entries = Object.keys(content.files).map(key => content.files[key]);
                    
                    const extractedFiles = await Promise.all(entries.map(async (entry: any) => {
                        // Skip directories and Mac OS metadata
                        if (entry.dir || entry.name.includes('__MACOSX') || entry.name.split('/').pop()?.startsWith('.')) {
                            return null;
                        }
                        
                        try {
                            const blob = await entry.async('blob');
                            const fileName = entry.name.split('/').pop() || entry.name;
                            
                            // Basic Type Inference if blob.type is empty (common in zips)
                            let type = blob.type;
                            if (!type || type === '') {
                                const ext = fileName.split('.').pop()?.toLowerCase();
                                if (ext === 'pdf') type = 'application/pdf';
                                else if (ext === 'json') type = 'application/json';
                                else if (ext === 'html' || ext === 'htm') type = 'text/html';
                                else if (ext === 'txt') type = 'text/plain';
                                else type = 'application/octet-stream';
                            }

                            return new File([blob], fileName, { type });
                        } catch (err) {
                            console.warn(`Failed to extract entry ${entry.name}`, err);
                            return null;
                        }
                    }));
                    
                    // Filter out nulls
                    const validFiles = extractedFiles.filter((f): f is File => f !== null);
                    processedFiles.push(...validFiles);
                    
                } catch (e) {
                    console.error(`Error processing zip file: ${zipFile.name}`, e);
                    // If ZIP fails, we might want to alert, but for bulk operations, logging is safer
                }
            }));
        } else {
            console.error("JSZip library not available. Skipping zip extraction.");
            alert("System Error: ZIP processing engine (JSZip) is not loaded. Please refresh the page.");
        }
    }

    const newCases = groupFilesIntoCases(processedFiles);
    
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
        const maxPages = Math.min(pdf.numPages, 50); 
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

  const processCase = useCallback(async (caseId: string, manualId?: string) => {
    const startTime = Date.now();
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: ParsingStatus.PROCESSING, error: undefined, startTime } : c));

    const currentCase = cases.find(c => c.id === caseId);
    if (!currentCase || !currentCase.files.pdf) {
         setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: ParsingStatus.ERROR, error: "No PDF file found.", endTime: Date.now() } : c));
         return;
    }

    try {
        const { pdf } = currentCase.files;
        
        let pdfText = '';
        try { pdfText = await extractPdfText(pdf); } catch(e) {}
        
        let pdfBase64: string | undefined = undefined;
        if (!pdfText || pdfText.length < 500) {
            pdfBase64 = await readFileAsBase64(pdf);
        }

        const [apiContent, htmlContent, scrapeContent] = await Promise.all([
            currentCase.files.api ? readFileAsText(currentCase.files.api) : undefined,
            currentCase.files.html ? readFileAsText(currentCase.files.html) : undefined,
            currentCase.files.scrape ? readFileAsText(currentCase.files.scrape) : undefined
        ]);

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

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        setCases(prev => prev.map(c => c.id === caseId ? { 
            ...c, 
            status: ParsingStatus.SUCCESS, 
            extractedData: result,
            processingTime: duration,
            endTime,
            qcStartTime: endTime // Start QC timer immediately upon success
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

  useEffect(() => {
    if (processingQueue.length > 0 && activeProcessingCount < CONCURRENCY_LIMIT) {
        const nextId = processingQueue[0];
        setProcessingQueue(prev => prev.slice(1));
        setActiveProcessingCount(prev => prev + 1);
        processCase(nextId).finally(() => {
            setActiveProcessingCount(prev => prev - 1);
        });
    }
  }, [processingQueue, activeProcessingCount, processCase]);

  useEffect(() => {
      const hasStarted = sessionStartTime !== null;
      const queueEmpty = processingQueue.length === 0;
      const noActiveWorkers = activeProcessingCount === 0;
      const someProcessed = cases.some(c => c.status === ParsingStatus.SUCCESS || c.status === ParsingStatus.ERROR);

      if (hasStarted && queueEmpty && noActiveWorkers && someProcessed && !sessionEndTime) {
          setSessionEndTime(Date.now());
      } else if (hasStarted && (!queueEmpty || activeProcessingCount > 0) && sessionEndTime) {
          setSessionEndTime(null);
      }
  }, [processingQueue.length, activeProcessingCount, cases, sessionStartTime, sessionEndTime]);

  const handleProcessAll = () => {
      const pendingCases = cases.filter(c => c.status === ParsingStatus.IDLE || c.status === ParsingStatus.ERROR);
      setProcessingQueue(prev => [...prev, ...pendingCases.map(c => c.id)]);
      setSessionEndTime(null);
      if (!sessionStartTime) setSessionStartTime(Date.now());
  };

  const handleProcessSingle = (caseId: string, manualId?: string) => {
      setProcessingQueue(prev => [...prev, caseId]);
      setSessionEndTime(null);
      if (!sessionStartTime) setSessionStartTime(Date.now());
  };

  const handleDataUpdate = (caseId: string, newData: ExtractedData) => {
      setCases(prev => prev.map(c => {
          if (c.id === caseId) {
             return { 
                ...c, 
                extractedData: newData,
                isEdited: true
             };
          }
          return c;
      }));
  };

  const handleFinalizeQC = (caseId: string) => {
      const now = Date.now();
      setCases(prev => prev.map(c => {
          if (c.id === caseId && c.qcStartTime) {
              return {
                  ...c,
                  qcEndTime: now,
                  qcDuration: now - c.qcStartTime
              };
          }
          return c;
      }));
  };
  
  const handleReset = useCallback(() => {
    // Removed window.confirm to ensure buttons are responsive.
    // User can reset immediately.
    
    try {
        // 1. Prepare History Item
        if (cases.length > 0) {
            const historyItem: HistoricalSession = {
                sessionId: new Date().getTime().toString(36).toUpperCase(),
                date: new Date().toISOString(),
                cases: [...cases], // Create copy
                stats: {
                    total: cases.length,
                    completed: cases.filter(c => c.status === ParsingStatus.SUCCESS).length,
                    avgDuration: cases.reduce((acc, c) => acc + (c.processingTime || 0), 0) / (cases.filter(c => c.processingTime).length || 1)
                }
            };
            
            // 2. Read Existing
            const existingHistoryStr = localStorage.getItem('ace_history');
            let history: HistoricalSession[] = [];
            if (existingHistoryStr) {
                try {
                    history = JSON.parse(existingHistoryStr);
                } catch (e) {
                    console.error("Corrupt history data", e);
                    history = [];
                }
            }

            // 3. Append and Save
            history.push(historyItem);
            localStorage.setItem('ace_history', JSON.stringify(history));
            console.log("Session saved to history.");
        }
    } catch (e) {
        console.error("Failed to save history", e);
    }

    // 4. Hard Reset State
    setActiveCaseId(null);
    setProcessingQueue([]);
    setCases([]);
    setSessionStartTime(null);
    setSessionEndTime(null);
    setActiveProcessingCount(0);
  }, [cases]);

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen bg-[#050505] text-slate-900 relative font-inter flex flex-col overflow-hidden">
      <Header 
        startTime={sessionStartTime} 
        endTime={sessionEndTime}
        onToggleJukebox={() => setIsJukeboxOpen(!isJukeboxOpen)} 
        currentUser={currentUser}
        onOpenAdmin={() => { setShowAdmin(true); setActiveCaseId(null); }}
      />
      
      <main className="flex-grow overflow-hidden relative z-10 flex flex-col pb-8"> 
        {showAdmin ? (
            <AdminPanel onBack={() => setShowAdmin(false)} currentUser={currentUser} />
        ) : activeCaseId ? (
            (() => {
                const activeCase = cases.find(c => c.id === activeCaseId);
                if (!activeCase) return <div>Case Not Found</div>;
                
                return (
                    <CaseDetail 
                        activeCase={activeCase}
                        onBack={() => setActiveCaseId(null)}
                        onAnalyze={handleProcessSingle}
                        onUpdateCaseData={handleDataUpdate}
                        onFinalizeQC={handleFinalizeQC}
                    />
                );
            })()
        ) : (
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

      <NewsTicker />
      <Jukebox isOpen={isJukeboxOpen} onClose={() => setIsJukeboxOpen(false)} />
    </div>
  );
};

export default App;
