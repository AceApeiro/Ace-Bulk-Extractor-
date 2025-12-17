

import React, { useState, useEffect, useRef } from 'react';
import PdfViewer from './PdfViewer';
import ResultsView, { generateXML } from './ResultsView';
import QCChecklist from './QCChecklist';
import AIAgent from './AIAgent';
import { Case, ParsingStatus, ExtractedData } from '../types';
import { ChevronLeft, FileText, Target, Bot, Code, GripVertical, PanelLeftClose, PanelLeftOpen, LayoutTemplate, X, Clock, ZoomIn, ZoomOut } from 'lucide-react';

interface CaseDetailProps {
  activeCase: Case;
  onBack: () => void;
  onAnalyze: (caseId: string, manualId?: string) => void;
  onUpdateCaseData: (caseId: string, data: ExtractedData) => void;
  onFinalizeQC?: (caseId: string) => void;
}

const CaseTimer = ({ startTime, qcStartTime }: { startTime?: number, qcStartTime?: number }) => {
    const [elapsed, setElapsed] = useState(0);
    const [qcElapsed, setQcElapsed] = useState(0);

    useEffect(() => {
        if(!startTime && !qcStartTime) return;
        const update = () => {
             const now = Date.now();
             if(startTime) setElapsed(now - startTime);
             if(qcStartTime) setQcElapsed(now - qcStartTime);
        };
        update(); 
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime, qcStartTime]);
    
    const format = (ms: number) => {
        const s = Math.floor(ms / 1000) % 60;
        const m = Math.floor(ms / 60000);
        const h = Math.floor(ms / 3600000);
        return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    };
    
    return (
        <div className="flex items-center gap-3 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 ml-4">
             {startTime && (
                <div className="flex items-center gap-2 border-r border-slate-600 pr-3">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="font-mono text-xs text-slate-300 font-bold">Total: {format(elapsed)}</span>
                </div>
             )}
             {qcStartTime && (
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-mono text-xs text-green-400 font-bold">QC: {format(qcElapsed)}</span>
                 </div>
             )}
        </div>
    );
};

const CaseDetail: React.FC<CaseDetailProps> = ({ activeCase, onBack, onAnalyze, onUpdateCaseData, onFinalizeQC }) => {
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'precision'>('editor');
  const [fileContents, setFileContents] = useState<{api: string|null, html: string|null, scrape: string|null}>({api:null, html:null, scrape:null});
  
  // Resizable Columns State (Percentages) - Expanded default width for Editor
  const [leftColWidth, setLeftColWidth] = useState(35);
  const [middleColWidth, setMiddleColWidth] = useState(25);
  
  // Column Visibility State
  const [showLeftCol, setShowLeftCol] = useState(true);
  const [showMiddleCol, setShowMiddleCol] = useState(true);
  
  // XML View State
  const [xmlFontSize, setXmlFontSize] = useState(11);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingLeft = useRef(false);
  const isDraggingMiddle = useRef(false);
  
  // XML Preview State
  const [generatedXml, setGeneratedXml] = useState('');
  const xmlTextAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  // Store object URL to cleanup later
  const objectUrlRef = useRef<string | null>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  useEffect(() => {
    const initView = async () => {
        // Handle PDF Blob URL
        if (activeCase.files.pdf) {
            // Revoke old if exists
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            
            const blob = new Blob([activeCase.files.pdf], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            setPdfUrl(url);
        } else {
            setPdfUrl(null);
        }

        const [apiText, htmlText, scrapeText] = await Promise.all([
            activeCase.files.api ? readFileAsText(activeCase.files.api) : Promise.resolve(null),
            activeCase.files.html ? readFileAsText(activeCase.files.html) : Promise.resolve(null),
            activeCase.files.scrape ? readFileAsText(activeCase.files.scrape) : Promise.resolve(null),
        ]);

        setFileContents({ api: apiText, html: htmlText, scrape: scrapeText });
    };

    initView();

    // Cleanup function
    return () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [activeCase]);

  useEffect(() => {
    if (activeCase.extractedData) {
        setGeneratedXml(generateXML(activeCase.extractedData));
    }
  }, [activeCase.extractedData]);

  const handleDataUpdate = (newData: ExtractedData) => {
      onUpdateCaseData(activeCase.id, newData);
  };

  const handleEditorFocus = (field: string) => {
      if (!xmlTextAreaRef.current || !generatedXml) return;
      
      let searchRegex: RegExp | null = null;
      let startTagLength = 0;

      // Map fields to specific XML tags
      switch(field) {
          case 'title': 
            searchRegex = /<titletext[^>]*>(.*?)<\/titletext>/s; 
            break;
          case 'abstract': 
            searchRegex = /<abstract[^>]*>[\s\S]*?<ce:para>(.*?)<\/ce:para>[\s\S]*?<\/abstract>/s;
            break;
          case 'authors': 
          case 'affiliations':
            searchRegex = /<author-group[^>]*>/s;
            startTagLength = 14; 
            break;
          case 'keyword':
             searchRegex = /<author-keywords>/s;
             startTagLength = 17;
             break;
          case 'references':
             searchRegex = /<bibliography[^>]*>/s;
             startTagLength = 14;
             break;
          default: 
            return;
      }

      if (searchRegex) {
          const match = generatedXml.match(searchRegex);
          if (match && match.index !== undefined) {
              const textarea = xmlTextAreaRef.current;
              textarea.focus();
              
              const startPos = match.index;
              const endPos = startPos + match[0].length;
              
              textarea.setSelectionRange(startPos, endPos);
              
              // Scroll to selection
              const fullText = textarea.value;
              const linesBefore = fullText.substring(0, startPos).split('\n').length;
              const lineHeight = 16 * (xmlFontSize/11); // Approximate line height based on font size
              textarea.scrollTop = (linesBefore - 3) * lineHeight; 
          }
      }
  };
  
  const handleMouseDownLeft = () => { isDraggingLeft.current = true; };
  const handleMouseDownMiddle = () => { isDraggingMiddle.current = true; };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const currentMousePerc = (e.clientX / containerWidth) * 100;
      
      if (isDraggingLeft.current && showLeftCol) {
          // Left column resize
          const newWidth = currentMousePerc;
          if (newWidth > 15 && newWidth < 80) setLeftColWidth(newWidth);
      }
      
      if (isDraggingMiddle.current && showMiddleCol) {
          // Middle column resize
          // If left column is hidden, the mouse position corresponds directly to middle column width
          // If left column is shown, we subtract left column width
          let newMiddleWidth = currentMousePerc;
          if (showLeftCol) {
              newMiddleWidth = currentMousePerc - leftColWidth;
          }
          
          // Constrain total width
          const totalUsed = (showLeftCol ? leftColWidth : 0) + newMiddleWidth;
          
          if (newMiddleWidth > 10 && totalUsed < 95) {
              setMiddleColWidth(newMiddleWidth);
          }
      }
  };

  const handleMouseUp = () => {
      isDraggingLeft.current = false;
      isDraggingMiddle.current = false;
  };


  if (viewMode === 'precision') {
      return (
        <div className="h-full flex flex-col bg-[#050505]">
             {/* Precision Header */}
             <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('editor')} className="flex items-center text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700">
                        <ChevronLeft className="w-4 h-4 mr-1"/> Back to Editor
                    </button>
                    <CaseTimer startTime={activeCase.startTime} qcStartTime={activeCase.qcStartTime} />
                    <div className="text-white font-orbitron font-bold tracking-wider text-sm bg-purple-900/20 px-4 py-1.5 rounded-full border border-purple-500/30 text-purple-300 flex items-center gap-2 ml-4">
                        <Target className="w-4 h-4"/> PRECISION & QC PROTOCOLS
                    </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-hidden">
                 <QCChecklist 
                    data={activeCase.extractedData!} 
                    files={activeCase.files}
                    onComplete={() => {
                        setViewMode('editor');
                        if (onFinalizeQC) onFinalizeQC(activeCase.id);
                    }}
                    onToggleAgent={() => setIsAgentOpen(!isAgentOpen)}
                    isAgentOpen={isAgentOpen}
                 />
             </div>
             <AIAgent 
                isOpen={isAgentOpen} 
                onClose={() => setIsAgentOpen(false)} 
                extractedData={activeCase.extractedData}
             />
        </div>
      );
  }

  return (
    <div 
        className="h-full flex flex-col bg-[#050505] overflow-hidden" 
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
        {/* Navigation Bar */}
        <div className="h-10 border-b border-slate-800 bg-slate-900/80 flex items-center px-4 justify-between shrink-0 backdrop-blur-md z-30 select-none">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide hover:bg-slate-800 px-3 py-1 rounded-lg">
                    <ChevronLeft className="w-4 h-4 mr-1"/> Dashboard
                </button>
                <div className="h-4 w-[1px] bg-slate-700/50"></div>
                
                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700/50">
                    <button 
                        onClick={() => setViewMode('editor')}
                        className="px-3 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-2 transition-all bg-cyan-600 text-white shadow-lg shadow-cyan-900/20"
                    >
                        <FileText className="w-3 h-3" /> Editor
                    </button>
                    <button 
                        onClick={() => setViewMode('precision')}
                        disabled={!activeCase.extractedData}
                        className="px-3 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-2 transition-all text-slate-400 hover:text-purple-300 disabled:opacity-50"
                    >
                        <Target className="w-3 h-3" /> Precision
                    </button>
                </div>

                <CaseTimer startTime={activeCase.startTime} qcStartTime={activeCase.qcStartTime} />

                {/* Column Toggles */}
                <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-3">
                    <button 
                        onClick={() => setShowLeftCol(!showLeftCol)}
                        className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${!showLeftCol ? 'text-slate-500' : 'text-cyan-400 bg-cyan-950/30'}`}
                        title={showLeftCol ? "Hide Editor Panel" : "Show Editor Panel"}
                    >
                        {showLeftCol ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={() => setShowMiddleCol(!showMiddleCol)}
                        className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${!showMiddleCol ? 'text-slate-500' : 'text-purple-400 bg-purple-950/30'}`}
                        title={showMiddleCol ? "Hide XML Panel" : "Show XML Panel"}
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <LayoutTemplate className="w-3 h-3"/> Layout
                    </span>
                </div>
            </div>
        </div>

        {/* 3-Column Resizable Layout */}
        <div className="flex-grow flex overflow-hidden relative z-10" ref={containerRef}>
             
             {/* COL 1: Extraction Editor */}
             {showLeftCol && (
                 <>
                    <div 
                        style={{ width: `${leftColWidth}%` }}
                        className="min-w-[300px] bg-[#050505] flex flex-col overflow-hidden relative shadow-xl z-10"
                    >
                        {activeCase.extractedData ? (
                            <ResultsView 
                                data={activeCase.extractedData} 
                                onDataUpdate={handleDataUpdate} 
                                onHighlight={setHighlightedText}
                                onFocusField={handleEditorFocus}
                                onClose={() => setShowLeftCol(false)}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center animate-pulse">
                                    <Bot className="w-8 h-8 text-slate-700" />
                                </div>
                                <p className="font-mono text-sm">{activeCase.status === ParsingStatus.PROCESSING ? 'ACE AI Extraction In Progress...' : 'Awaiting Extraction Command...'}</p>
                            </div>
                        )}
                    </div>

                    {/* Resizer 1 - VISUAL SPACER */}
                    <div 
                        onMouseDown={handleMouseDownLeft}
                        className="w-4 -ml-2 cursor-col-resize z-20 flex items-center justify-center group h-full transition-all relative"
                    >
                        <div className="w-[1px] h-full bg-slate-800 group-hover:bg-cyan-500 group-hover:w-[2px] transition-all"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-slate-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-slate-600 shadow-xl">
                            <GripVertical className="w-4 h-4 text-cyan-400" />
                        </div>
                    </div>
                 </>
             )}

             {/* COL 2: Generated XML */}
             {showMiddleCol && (
                 <>
                    <div 
                        style={{ width: `${middleColWidth}%` }}
                        className="min-w-[200px] bg-[#0a0a0a] flex flex-col"
                    >
                        <div className="p-2 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Code className="w-3 h-3"/> Generated XML
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-slate-800 rounded px-1 border border-slate-700 mr-1">
                                    <button 
                                        onClick={() => setXmlFontSize(prev => Math.max(8, prev - 1))}
                                        className="p-1 hover:text-white text-slate-400 transition-colors"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="w-3 h-3"/>
                                    </button>
                                    <span className="text-[9px] font-mono w-4 text-center text-slate-500">{xmlFontSize}</span>
                                    <button 
                                        onClick={() => setXmlFontSize(prev => Math.min(24, prev + 1))}
                                        className="p-1 hover:text-white text-slate-400 transition-colors"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="w-3 h-3"/>
                                    </button>
                                </div>
                                <button 
                                    onClick={() => {
                                        const blob = new Blob([generatedXml], { type: 'text/xml' });
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `ACE_${activeCase.name}.xml`;
                                        link.click();
                                    }}
                                    className="text-[9px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-700 text-slate-300"
                                >
                                    Save
                                </button>
                                <button 
                                    onClick={() => setShowMiddleCol(false)}
                                    className="p-1 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 relative group">
                            <textarea 
                                ref={xmlTextAreaRef}
                                value={generatedXml}
                                onChange={(e) => setGeneratedXml(e.target.value)}
                                className="w-full h-full bg-[#0d1117] text-[#e6edf3] font-mono p-3 resize-none focus:outline-none custom-scrollbar leading-relaxed selection:bg-blue-900"
                                style={{ fontSize: `${xmlFontSize}px` }}
                                spellCheck={false}
                            />
                            <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 px-2 py-1 rounded text-[9px] text-slate-400 pointer-events-none">
                                EDITABLE
                            </div>
                        </div>
                    </div>

                    {/* Resizer 2 - VISUAL SPACER */}
                    <div 
                        onMouseDown={handleMouseDownMiddle}
                        className="w-4 -ml-2 cursor-col-resize z-20 flex items-center justify-center group h-full transition-all relative"
                    >
                        <div className="w-[1px] h-full bg-slate-800 group-hover:bg-cyan-500 group-hover:w-[2px] transition-all"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-slate-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-slate-600 shadow-xl">
                            <GripVertical className="w-4 h-4 text-cyan-400" />
                        </div>
                    </div>
                 </>
             )}

             {/* COL 3: PDF Viewer (Rest) */}
             <div className="flex-1 min-w-[300px] bg-[#02040a] flex flex-col overflow-hidden relative">
                 <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                     <div className="h-full relative">
                        <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-cyan-400 border border-cyan-900 uppercase pointer-events-none">Primary Source (PDF)</div>
                        <PdfViewer 
                            pdfUrl={pdfUrl}
                            apiContent={fileContents.api}
                            htmlContent={fileContents.html}
                            scrapeContent={fileContents.scrape}
                            highlightText={highlightedText}
                            extractedText={activeCase.extractedData?.documentText}
                            onToggleAgent={() => setIsAgentOpen(!isAgentOpen)}
                            isAgentOpen={isAgentOpen}
                        />
                     </div>
                 </div>
             </div>

        </div>

        {/* Floating AI Agent */}
        <AIAgent 
            isOpen={isAgentOpen} 
            onClose={() => setIsAgentOpen(false)} 
            extractedData={activeCase.extractedData}
        />
    </div>
  );
};

export default CaseDetail;