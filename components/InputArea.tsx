
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Trash2, Upload, FileText, FileCode, FileJson, AlertTriangle, CheckCircle, PackageOpen, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface InputAreaProps {
  onAnalyze: (files: {
    pdfFile: File | null;
    apiFile: File | null;
    htmlFile: File | null;
    scrapeFile: File | null;
    manualId: string;
  }) => void;
  isProcessing: boolean;
  onSelectionChange?: (files: {
    pdf: File | null;
    api: File | null;
    html: File | null;
    scrape: File | null;
  }) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({ onAnalyze, isProcessing, onSelectionChange, isCollapsed = false, onToggleCollapse }) => {
  // Folder Context State
  const [folderInventory, setFolderInventory] = useState<File[]>([]);
  
  // Selected Files
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [apiFile, setApiFile] = useState<File | null>(null);
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [scrapeFile, setScrapeFile] = useState<File | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [manualId, setManualId] = useState('');
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  // Refs
  const folderInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Auto-Matcher Logic (Synchronous) ---
  const findMatches = useCallback((pdf: File, inventory: File[]) => {
    const pdfName = pdf.name;
    
    // 1. Extract ArXiv ID (e.g. 2405.12345)
    const arxivMatch = pdfName.match(/(\d{4}\.\d{4,5})/); 
    const bareId = arxivMatch ? arxivMatch[0] : null;

    // 2. Fallback Base Name (strip extension and version suffix like v1, _v2)
    // Remove .pdf
    let baseName = pdfName.substring(0, pdfName.lastIndexOf('.')) || pdfName;
    // Remove version suffix (v1, v2, _v1, etc)
    baseName = baseName.replace(/[_\.]?v\d+$/i, ''); 
    const baseNameLower = baseName.toLowerCase();

    // Helper: Normalize name for check
    const norm = (s: string) => s.toLowerCase();

    const candidates = inventory.filter(f => f !== pdf);

    // Scrape File Matcher
    const scrape = candidates.find(f => {
        const n = norm(f.name);
        // Robust check for 'scrapping' or 'scraping'
        const isScrapeType = n.includes('scrapping') || n.includes('scraping');
        if (!isScrapeType) return false;

        // Strict ID match if available
        if (bareId && n.includes(bareId)) return true;
        // Fallback: match base name
        if (n.includes(baseNameLower)) return true;
        return false;
    });

    // API File Matcher
    const api = candidates.find(f => {
        const n = norm(f.name);
        // Avoid confusing with scraping file
        if (n.includes('scrapping') || n.includes('scraping')) return false;

        const isApiType = n.includes('api') || n.endsWith('.json');
        if (!isApiType) return false;

        if (bareId && n.includes(bareId)) return true;
        if (n.includes(baseNameLower)) return true;
        return false;
    });

    // HTML File Matcher
    const html = candidates.find(f => {
        const n = norm(f.name);
        
        const isHtmlType = n.endsWith('.html') || n.endsWith('.htm');
        if (!isHtmlType) return false;
        
        if (bareId && n.includes(bareId)) return true;
        // HTML often named simply by ID or title, stricter check
        if (n.includes(baseNameLower)) return true;
        return false;
    });

    return { api: api || null, html: html || null, scrape: scrape || null };
  }, []);

  // --- Core Selection Updater ---
  const updateSelection = useCallback((newPdf: File | null, inventory: File[]) => {
    if (!newPdf) {
        setSelectedPdf(null);
        setApiFile(null);
        setHtmlFile(null);
        setScrapeFile(null);
        return;
    }

    const matches = findMatches(newPdf, inventory);
    
    // Batch updates
    setSelectedPdf(newPdf);
    setApiFile(matches.api);
    setHtmlFile(matches.html);
    setScrapeFile(matches.scrape);

  }, [findMatches]);


  // --- 1. Folder Handling & Inventory ---
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files).filter((f: any) => !f.name.startsWith('.')) as File[];
        setFolderInventory(files);
        
        // Isolate PDFs
        const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        
        // Auto-select first PDF if available using batch updater
        if (pdfs.length > 0) {
            updateSelection(pdfs[0], files);
        } else {
            updateSelection(null, files);
        }
    }
    // Reset value so same folder can be re-selected
    if (folderInputRef.current) folderInputRef.current.value = '';
  };
  
  // Specific handler for switching the main PDF from the dropdown
  const handlePdfSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const fileName = e.target.value;
      const file = folderInventory.find(f => f.name === fileName);
      if (file) {
          updateSelection(file, folderInventory);
      }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f: any) => !f.name.startsWith('.')) as File[];
    if (files.length === 0) return;
    
    setFolderInventory(files);
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfs.length > 0) {
        updateSelection(pdfs[0], files);
    } else {
        updateSelection(null, files);
    }
  };

  // --- 2. Live Notification to Parent ---
  useEffect(() => {
    if (onSelectionChange) {
        onSelectionChange({
            pdf: selectedPdf,
            api: apiFile,
            html: htmlFile,
            scrape: scrapeFile
        });
    }
  }, [selectedPdf, apiFile, htmlFile, scrapeFile, onSelectionChange]);

  // --- 3. Cross-Check Validation ---
  useEffect(() => {
    const files = [selectedPdf, apiFile, htmlFile, scrapeFile].filter(Boolean);
    if (files.length < 2) { setValidationMsg(null); return; }

    const extractId = (name: string) => {
      const match = name.match(/(\d{4}\.\d{4,5})/);
      return match ? match[0] : null;
    };

    const ids = files.map(f => f ? extractId(f.name) : null).filter(Boolean);
    if (ids.length > 1) {
      const uniqueIds = Array.from(new Set(ids));
      setValidationMsg(uniqueIds.length > 1 ? "Warning: Filenames indicate potential ArXiv ID mismatch." : null);
    }
  }, [selectedPdf, apiFile, htmlFile, scrapeFile]);


  const handleClear = () => {
    setFolderInventory([]);
    updateSelection(null, []);
    setManualId('');
    setValidationMsg(null);
  };

  const processSubmission = () => {
    if (!selectedPdf) { alert("Please select a PDF to extract."); return; }
    onAnalyze({
      pdfFile: selectedPdf,
      apiFile,
      htmlFile,
      scrapeFile,
      manualId
    });
  };

  // Helper for rendering file slots
  const AutoSlot = ({ label, file, icon: Icon, colorClass, isPdfSelector }: { label: string, file: File | null, icon: any, colorClass: string, isPdfSelector?: boolean }) => {
    // Get all PDFs for dropdown
    const availablePdfs = folderInventory.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const hasMultiplePdfs = isPdfSelector && availablePdfs.length > 1;

    return (
        <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            </div>
            <div 
                className={`border rounded-lg p-2 flex items-center h-9 transition-all relative
                ${file 
                    ? `bg-${colorClass}-50 border-${colorClass}-200` 
                    : 'bg-slate-50 border-slate-200 border-dashed'
                }`}
            >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${file ? `bg-${colorClass}-100 text-${colorClass}-600` : 'bg-slate-200 text-slate-400'}`}>
                    <Icon className="w-3 h-3" />
                </div>
                
                <div className="flex-1 min-w-0 relative">
                    {hasMultiplePdfs ? (
                        // Dropdown for switching PDFs
                        <select 
                            className={`w-full text-xs font-semibold text-${colorClass}-900 bg-transparent border-none outline-none appearance-none truncate pr-4 cursor-pointer`}
                            value={file ? file.name : ''}
                            onChange={handlePdfSwitch}
                        >
                            {availablePdfs.map(p => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    ) : (
                        // Standard display
                        file ? (
                            <p className={`text-xs font-semibold text-${colorClass}-900 truncate`}>{file.name}</p>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic">Not found...</p>
                        )
                    )}
                </div>

                {/* Validation Icon or Dropdown Arrow */}
                <div className="ml-2 flex-shrink-0">
                    {hasMultiplePdfs ? (
                         <ChevronLeft className={`w-3 h-3 text-${colorClass}-500 -rotate-90`} />
                    ) : (
                         file && <CheckCircle className={`w-4 h-4 text-${colorClass}-500`} />
                    )}
                </div>
            </div>
        </div>
    );
  };

  // --- Collapsed View ---
  if (isCollapsed) {
      return (
          <div className="h-full flex flex-col items-center bg-white border-r border-slate-200 pt-4">
              <button onClick={onToggleCollapse} className="mb-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                  <ChevronRight className="w-5 h-5"/>
              </button>
              
              <div className="flex flex-col gap-4 items-center">
                  <div title="Case Folder" className={`p-2 rounded-lg ${folderInventory.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                      <PackageOpen className="w-5 h-5" />
                  </div>
                  {selectedPdf && (
                      <div title="PDF Selected" className="p-2 rounded-lg bg-green-50 text-green-600">
                          <FileText className="w-5 h-5" />
                      </div>
                  )}
                  {isProcessing && (
                      <div className="animate-spin p-2">
                          <Sparkles className="w-5 h-5 text-purple-500" />
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- Expanded View ---
  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
           <PackageOpen className="w-4 h-4 text-blue-500"/> Case Manager
        </h2>
        <div className="flex items-center gap-2">
            <button onClick={handleClear} className="text-xs text-slate-500 hover:text-red-600 flex items-center">
                <Trash2 className="w-3 h-3 mr-1" /> Reset
            </button>
            {onToggleCollapse && (
                <button onClick={onToggleCollapse} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                    <ChevronLeft className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      <div 
        className={`flex-grow overflow-y-auto p-3 custom-scrollbar transition-all duration-300 ${isDragging ? 'bg-blue-50/50 ring-4 ring-inset ring-blue-100' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
           <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none">
              <div className="text-center text-blue-600 animate-bounce">
                 <Upload className="w-10 h-10 mx-auto mb-2"/>
                 <p className="font-bold text-lg">Drop Case Folder</p>
              </div>
           </div>
        )}

        {/* 1. Folder Input (Collapsible/Main) */}
        <div className="mb-4">
            <input 
                type="file" 
                ref={folderInputRef}
                onChange={handleFolderSelect}
                className="hidden"
                {...({ webkitdirectory: "", directory: "" } as any)}
                multiple
            />
            
            <button 
                onClick={() => folderInputRef.current?.click()}
                className="w-full py-4 border border-dashed border-blue-300 bg-blue-50/50 rounded-lg text-blue-600 flex flex-col items-center justify-center hover:bg-blue-100 hover:border-blue-400 transition-all group"
            >
                <FolderOpen className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform"/>
                <span className="text-xs font-bold uppercase tracking-wide">Select Case Folder</span>
                <span className="text-[9px] text-blue-400 mt-1 font-medium">(Or Drop Folder Here)</span>
            </button>
        </div>

        {/* 2. Auto-Matched Support Files including PDF Selector */}
        <div className="space-y-1">
             <AutoSlot 
                label="Selected Paper (PDF)" 
                file={selectedPdf} 
                icon={FileText} 
                colorClass="blue" 
                isPdfSelector={true}
             />
             <div className="h-2"></div>
             <AutoSlot label="Matched API Data" file={apiFile} icon={FileCode} colorClass="purple" />
             <AutoSlot label="Matched HTML Summary" file={htmlFile} icon={FileCode} colorClass="orange" />
             <AutoSlot label="Matched Scrape Data" file={scrapeFile} icon={FileJson} colorClass="green" />
        </div>

        {/* Validation Warning */}
        {validationMsg && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 flex items-start">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] font-medium leading-tight">{validationMsg}</p>
          </div>
        )}

        {/* Manual ID */}
        <div className="mt-4">
           <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Manual ArXiv ID (Optional)</label>
           <input 
             value={manualId} 
             onChange={(e) => setManualId(e.target.value)} 
             placeholder="2501.12345"
             className="w-full text-xs p-2 border border-slate-200 rounded focus:border-blue-400 outline-none text-slate-700 font-mono"
           />
        </div>

        {/* Verify Button - Immediately below ID */}
        <div className="mt-2 mb-4 pt-2">
             <button
              onClick={processSubmission}
              disabled={isProcessing || !selectedPdf}
              className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all
                ${isProcessing || !selectedPdf
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-[0.99]'
                }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Verify & Extract
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
