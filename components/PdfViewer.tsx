
import React, { useState, useEffect, useRef } from 'react';
import { FileCode, FileJson, Globe, Layers, ZoomIn, ZoomOut, RotateCcw, X, FileText, ScanLine, Copy, Check, ChevronLeft, ChevronRight, Loader, BookOpen, Bot, Search, ExternalLink, Maximize, Maximize2 } from 'lucide-react';
import ManualGuide from './ManualGuide';

// Declaration for PDF.js global
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface PdfViewerProps {
  pdfUrl: string | null;
  apiContent: string | null;
  htmlContent: string | null;
  scrapeContent: string | null;
  highlightText?: string | null;
  extractedText?: string | null;
  onToggleAgent?: () => void;
  isAgentOpen?: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, apiContent, htmlContent, scrapeContent, highlightText, extractedText, onToggleAgent, isAgentOpen }) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'api' | 'html' | 'scrape' | 'text'>('pdf');
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 100%
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [magnifierSize, setMagnifierSize] = useState(150);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [pageInput, setPageInput] = useState<string>("1");

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Auto-switch to PDF tab on highlight if PDF exists
  useEffect(() => {
    if (highlightText && pdfUrl) {
      setActiveTab('pdf');
    }
  }, [highlightText, pdfUrl]);

  // Sync page input
  useEffect(() => {
      setPageInput(pageNum.toString());
  }, [pageNum]);

  // Load PDF Document
  useEffect(() => {
    if (pdfUrl && activeTab === 'pdf') {
      const loadPdf = async () => {
        try {
          setIsRendering(true);
          setError(null);
          
          if (!window.pdfjsLib) {
             throw new Error("PDF.js library not loaded");
          }

          // Force using the CDN worker if local loading fails, but handle CORS for Blob URLs carefully
          // If we are serving this via file:// or simple local server, worker needs to be same origin or cors enabled
          // Using the CDN usually works fine for blob URLs created in the same context
          if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
             window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }

          const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
          const doc = await loadingTask.promise;
          
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setPageNum(1);
          setIsRendering(false);
          // Initial fit to width
          setTimeout(() => handleFitToWidth(doc), 100);
        } catch (err: any) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF document. " + (err.message || ""));
          setIsRendering(false);
        }
      };

      loadPdf();
    } else if (!pdfUrl) {
      setPdfDoc(null);
      setNumPages(0);
    }
  }, [pdfUrl, activeTab]);

  // Render Page
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      // Initial checks
      if (!pdfDoc || !activeTab || activeTab !== 'pdf') return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Ensure any previous render task is cancelled
      if (renderTaskRef.current) {
        try {
            renderTaskRef.current.cancel();
        } catch (err) {
            // Ignore cancel errors
        }
        renderTaskRef.current = null;
      }

      if (isCancelled) return;

      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNum);
        
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: zoom * 1.5 });

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        // Adjust CSS width/height for high-DPI
        canvas.style.width = `${viewport.width / 1.5}px`;
        canvas.style.height = `${viewport.height / 1.5}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (renderTaskRef.current === renderTask) {
            renderTaskRef.current = null;
        }

        if (isCancelled) return;

        if (textLayerRef.current) {
             const textContent = await page.getTextContent();
             if (isCancelled) return;
             
             if (textLayerRef.current) {
                 textLayerRef.current.innerHTML = ''; 
                 // Match canvas dimensions exactly
                 textLayerRef.current.style.height = `${viewport.height / 1.5}px`;
                 textLayerRef.current.style.width = `${viewport.width / 1.5}px`;
                 // CSS Scale variable for PDF.js text layer
                 textLayerRef.current.style.setProperty('--scale-factor', `${zoom * 1.5 / 1.5}`); // simplified to zoom

                 const textLayerRenderTask = window.pdfjsLib.renderTextLayer({
                     textContent: textContent,
                     container: textLayerRef.current,
                     viewport: page.getViewport({ scale: zoom * 1.5 / 1.5 }), // viewport for text layer needs to match CSS size
                     textDivs: []
                 });
                 
                 await textLayerRenderTask.promise;

                 // Apply Highlighting
                 if (highlightText && highlightText.length >= 2) {
                     const spans = textLayerRef.current.querySelectorAll('span');
                     const searchStr = highlightText.toLowerCase();
                     
                     spans.forEach((span: HTMLElement) => {
                         const text = span.textContent?.toLowerCase() || '';
                         if (text.includes(searchStr)) {
                             span.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                             span.style.borderRadius = '2px';
                             span.style.boxShadow = '0 0 4px rgba(255, 255, 0, 0.6)';
                             // Scroll to first match
                             span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         }
                     });
                 }
             }
        }

        setIsRendering(false);
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
            console.error("Page render error:", err);
            if (!isCancelled) setError("Render error: " + err.message);
        }
        if (!isCancelled) setIsRendering(false);
      }
    };

    if (pdfDoc && activeTab === 'pdf') {
        renderPage();
    }

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch (e) {}
          renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNum, zoom, activeTab, highlightText]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isMagnifying) return;
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect) {
          setMagnifierPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
  };

  const TabButton = ({ id, label, icon: Icon, disabled }: { id: typeof activeTab, label: string, icon: any, disabled: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      disabled={disabled}
      className={`flex items-center px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all h-full whitespace-nowrap
        ${activeTab === id 
          ? 'border-blue-500 text-blue-400 bg-slate-800' 
          : disabled 
            ? 'border-transparent text-slate-700 cursor-not-allowed'
            : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
        }`}
    >
      <Icon className={`w-3 h-3 mr-2 ${activeTab === id ? 'text-blue-400' : ''}`} />
      {label}
    </button>
  );

  const renderHighlightedText = (content: string | null) => {
    if (!content) return null;
    if (!highlightText || highlightText.length < 3) return content;

    const parts = content.split(new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
        part.toLowerCase() === highlightText.toLowerCase() 
            ? <mark key={i} className="bg-yellow-300 text-black rounded px-0.5 shadow-sm">{part}</mark> 
            : part
    );
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1.0);

  const handleFitToWidth = async (docInstance = pdfDoc) => {
      if (!docInstance) return;
      try {
          const page = await docInstance.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          const containerWidth = contentRef.current?.clientWidth || 800;
          // Calculate zoom to fit container width minus padding
          const targetZoom = (containerWidth - 40) / viewport.width;
          setZoom(targetZoom);
      } catch (e) { console.error(e); }
  };

  const handleFitToPage = async () => {
      if (!pdfDoc) return;
      try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          const containerHeight = contentRef.current?.clientHeight || 800;
          const targetZoom = (containerHeight - 40) / viewport.height;
          setZoom(targetZoom);
      } catch (e) { console.error(e); }
  };

  const changePage = (offset: number) => {
      setPageNum(prev => Math.min(Math.max(1, prev + offset), numPages));
  };
  
  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setPageInput(val);
  };
  
  const handlePageSubmit = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          const p = parseInt(pageInput);
          if (!isNaN(p) && p >= 1 && p <= numPages) {
              setPageNum(p);
          } else {
              setPageInput(pageNum.toString());
          }
      }
  };

  const handleCopy = () => {
    if (extractedText) {
        navigator.clipboard.writeText(extractedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePopOut = () => {
      const w = window.open('', '_blank', 'width=800,height=900,menubar=no,toolbar=no,location=no');
      if (!w) return;
      
      let content = '';
      // Cannot easily popout blob PDF URL due to security contexts, text fallback
      if (activeTab === 'pdf' && pdfUrl) {
          // Provide instruction or fallback since blobs revoke
          content = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ccc;font-family:sans-serif;">PDF Popout restricted by browser security. Please use the main viewer.</div>`;
      } else if (activeTab === 'html' && htmlContent) {
          content = htmlContent;
      } else if (activeTab === 'api' && apiContent) {
          content = `<pre style="white-space:pre-wrap;font-family:monospace;padding:10px;">${apiContent}</pre>`;
      } else if (activeTab === 'scrape' && scrapeContent) {
          content = `<pre style="white-space:pre-wrap;font-family:monospace;padding:10px;">${scrapeContent}</pre>`;
      }

      w.document.write(`
        <html>
            <head><title>ACE View: ${activeTab.toUpperCase()}</title></head>
            <body style="margin:0;padding:0;background:#1a1a1a;color:#ccc;overflow:hidden;height:100vh;">
                ${content}
            </body>
        </html>
      `);
      w.document.close();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden relative">
      <ManualGuide isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
      
      {/* Top Bar: Tabs & Tools */}
      <div className="flex items-center justify-between bg-slate-950 border-b border-slate-800 h-12 flex-shrink-0 px-2">
        <div className="flex items-center h-full overflow-x-auto custom-scrollbar no-scrollbar mr-4">
            <TabButton id="pdf" label="PDF Reader" icon={FileText} disabled={!pdfUrl} />
            <TabButton id="text" label="OCR Mirror" icon={ScanLine} disabled={!extractedText} />
            <TabButton id="api" label="API Data" icon={FileCode} disabled={!apiContent} />
            <TabButton id="html" label="HTML Page" icon={Globe} disabled={!htmlContent} />
            <TabButton id="scrape" label="Scrape Data" icon={FileJson} disabled={!scrapeContent} />
        </div>

        <div className="flex items-center gap-2">
            
            {/* Popout */}
            <button
                onClick={handlePopOut}
                disabled={activeTab === 'pdf' || (activeTab === 'text' && !extractedText)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Pop out in new window"
            >
                <ExternalLink className="w-3.5 h-3.5"/>
            </button>

            {/* Operator Manual */}
            <button 
                onClick={() => setIsManualOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold bg-purple-900/30 text-purple-300 border border-purple-800 rounded hover:bg-purple-900/50 transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)]"
            >
                <BookOpen className="w-3 h-3" /> MANUAL
            </button>
            
            {/* AI Agent Trigger */}
            {onToggleAgent && (
                <button 
                    onClick={onToggleAgent}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold border rounded transition-all ${isAgentOpen ? 'bg-green-600 text-white border-green-500' : 'bg-slate-800 text-green-400 border-slate-700 hover:bg-slate-700'}`}
                >
                    <Bot className="w-3 h-3" /> AGENT
                </button>
            )}

            <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>

            {/* Pagination Controls */}
             {activeTab === 'pdf' && pdfUrl && numPages > 0 && (
                <div className="flex items-center space-x-1 bg-slate-900/50 rounded-lg border border-slate-800/50 h-8 px-1">
                     <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4"/>
                     </button>
                     <div className="flex items-center text-[10px] text-slate-300 font-mono">
                         <input 
                            value={pageInput}
                            onChange={handlePageInput}
                            onKeyDown={handlePageSubmit}
                            className="w-8 bg-slate-800 border border-slate-700 rounded text-center text-white focus:outline-none focus:border-blue-500"
                         />
                         <span className="mx-1">/</span>
                         <span>{numPages}</span>
                     </div>
                     <button onClick={() => changePage(1)} disabled={pageNum >= numPages} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronRight className="w-4 h-4"/>
                     </button>
                </div>
            )}

            {/* Zoom & Magnify Controls */}
            {activeTab === 'pdf' && pdfUrl && (
                <div className="flex items-center px-2 space-x-1 bg-slate-900/50 rounded-lg border border-slate-800/50 h-8">
                    {/* Magnifier Controls */}
                    <div className="flex items-center gap-1 border-r border-slate-800 pr-2 mr-1">
                        <button 
                            onClick={() => setIsMagnifying(!isMagnifying)}
                            className={`p-1.5 rounded transition-colors ${isMagnifying ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="Toggle Lens"
                        >
                            <Search className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Magnifier Size Adjustment */}
                        {isMagnifying && (
                            <div className="flex items-center gap-1 animate-fadeIn">
                                <span className="text-[9px] text-slate-500">Size</span>
                                <input 
                                    type="range" 
                                    min="50" 
                                    max="300" 
                                    step="10"
                                    value={magnifierSize} 
                                    onChange={(e) => setMagnifierSize(parseInt(e.target.value))} 
                                    className="w-12 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Fit Buttons */}
                    <button onClick={() => handleFitToWidth()} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded" title="Fit Width">
                        <Maximize className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleFitToPage()} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded" title="Fit Page">
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
                    
                    {/* Zoom Buttons */}
                    <button 
                        onClick={handleZoomOut}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative group">
                        <select 
                            value={Math.round(zoom * 100)}
                            onChange={(e) => setZoom(parseInt(e.target.value) / 100)}
                            className="bg-slate-800 text-[10px] font-mono text-blue-400 border border-slate-700 rounded px-1 py-0.5 mx-1 focus:outline-none focus:border-blue-500 appearance-none text-center w-12 cursor-pointer hover:bg-slate-700"
                        >
                            <option value="50">50%</option>
                            <option value="75">75%</option>
                            <option value="100">100%</option>
                            <option value="125">125%</option>
                            <option value="150">150%</option>
                            <option value="200">200%</option>
                            <option value="300">300%</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleZoomIn}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
      </div>

      <div 
        className="flex-1 bg-slate-100 relative overflow-auto custom-scrollbar flex flex-col items-center" 
        ref={contentRef}
        onMouseMove={handleMouseMove}
      > 
        {activeTab === 'pdf' && (
          pdfUrl ? (
            <div className="relative my-4 shadow-lg border border-slate-300 bg-white">
                {error ? (
                    <div className="flex flex-col items-center justify-center p-8 text-red-500">
                        <X className="w-8 h-8 mb-2"/>
                        <p>{error}</p>
                    </div>
                ) : (
                    <>
                        {/* Using key to force full remount on page/zoom change to avoid canvas reuse error */}
                        <canvas 
                            ref={canvasRef} 
                            key={`${pdfUrl}-${pageNum}-${zoom}`}
                            className="block" 
                        />
                        <div ref={textLayerRef} className="textLayer" />
                        
                        {/* Magnifying Lens */}
                        {isMagnifying && !isRendering && (
                            <div 
                                className="absolute pointer-events-none border-2 border-blue-500 rounded-full shadow-2xl overflow-hidden bg-white z-50"
                                style={{
                                    width: `${magnifierSize}px`,
                                    height: `${magnifierSize}px`,
                                    left: magnifierPos.x - (magnifierSize/2),
                                    top: magnifierPos.y - (magnifierSize/2),
                                    backgroundImage: canvasRef.current ? `url(${canvasRef.current.toDataURL()})` : 'none',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: `${(canvasRef.current?.width || 0) * 2}px ${(canvasRef.current?.height || 0) * 2}px`,
                                    backgroundPosition: `-${magnifierPos.x * 2 - (magnifierSize/2)}px -${magnifierPos.y * 2 - (magnifierSize/2)}px`
                                }}
                            >
                                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <div className="w-[1px] h-4 bg-blue-900"></div>
                                    <div className="h-[1px] w-4 bg-blue-900 absolute"></div>
                                </div>
                            </div>
                        )}

                        {isRendering && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        )}
                    </>
                )}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-50">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No PDF Loaded</p>
            </div>
          )
        )}
        
        {/* Mirror View */}
        {activeTab === 'text' && extractedText && (
          <div className="w-full h-full overflow-auto custom-scrollbar bg-slate-100 flex flex-col items-center p-8">
            <div className="w-full max-w-[21cm] flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="p-1.5 bg-white rounded shadow-sm">
                        <ScanLine className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">OCR Text Mirror</h3>
                        <p className="text-[10px] text-slate-400">Digitized content verification</p>
                    </div>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                >
                    {copied ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                    {copied ? "Copied" : "Copy Text"}
                </button>
            </div>
            
            <div className="w-full max-w-[21cm] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] min-h-[29.7cm] p-[2.5cm] relative border border-slate-200">
                <div className="font-serif text-slate-900 leading-7 text-justify whitespace-pre-wrap selection:bg-blue-100 selection:text-blue-900 text-sm">
                    {renderHighlightedText(extractedText)}
                </div>
            </div>
          </div>
        )}

        {/* API/HTML/Scrape Views */}
        {activeTab === 'api' && apiContent && (
          <div className="w-full h-full p-4 overflow-auto custom-scrollbar bg-[#0d1117]">
            <pre className="text-xs font-mono text-purple-300 whitespace-pre-wrap leading-relaxed">
                {renderHighlightedText(apiContent)}
            </pre>
          </div>
        )}

        {activeTab === 'scrape' && scrapeContent && (
          <div className="w-full h-full p-4 overflow-auto custom-scrollbar bg-[#0d1117]">
             <pre className="text-xs font-mono text-green-300 whitespace-pre-wrap leading-relaxed">
                {renderHighlightedText(scrapeContent)}
             </pre>
          </div>
        )}

        {activeTab === 'html' && htmlContent && (
           <div className="w-full h-full bg-white relative">
             <iframe 
                title="html-preview"
                srcDoc={htmlContent} 
                className="w-full h-full border-none block"
                sandbox="allow-same-origin"
              />
           </div>
        )}
        
        {((activeTab === 'api' && !apiContent) || (activeTab === 'scrape' && !scrapeContent) || (activeTab === 'html' && !htmlContent) || (activeTab === 'text' && !extractedText)) && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-50">
             <Layers className="w-16 h-16 mb-4 opacity-20" />
             <p className="text-sm font-medium">Content Not Available</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;