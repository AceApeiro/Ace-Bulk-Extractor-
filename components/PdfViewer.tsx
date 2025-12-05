
import React, { useState, useEffect, useRef } from 'react';
import { FileCode, FileJson, Globe, Layers, ZoomIn, ZoomOut, RotateCcw, AlignLeft, X, FileText, ScanLine, Copy, Check, ChevronLeft, ChevronRight, Loader } from 'lucide-react';

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
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, apiContent, htmlContent, scrapeContent, highlightText, extractedText }) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'api' | 'html' | 'scrape' | 'text'>('pdf');
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 100%
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Default to PDF if available
  useEffect(() => {
    if (pdfUrl) {
       // logic to stay on pdf usually
    }
  }, [pdfUrl]);

  // Auto-switch to PDF tab on highlight if PDF exists
  useEffect(() => {
    if (highlightText && pdfUrl) {
      setActiveTab('pdf');
    }
  }, [highlightText, pdfUrl]);

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

          // Important: Explicitly set worker source again just in case index.html timing was off
          if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
             window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }

          const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
          const doc = await loadingTask.promise;
          
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setPageNum(1);
          setIsRendering(false);
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
    const renderPage = async () => {
      // Initial checks
      if (!pdfDoc || !activeTab) return;
      // We check canvasRef.current late inside execution or just return if not activeTab='pdf'
      // But let's check basic sanity
      if (activeTab !== 'pdf') return;

      try {
        // Cancel previous render if existing
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom * 1.5 }); // Base scale boost for clarity

        const canvas = canvasRef.current;
        // FIX: Check if canvas exists after async call
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render Canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        // Render Text Layer (for selection/highlighting)
        if (textLayerRef.current) {
             const textContent = await page.getTextContent();
             
             // Check if ref still exists after await
             if (textLayerRef.current) {
                 textLayerRef.current.innerHTML = ''; // Clear previous
                 textLayerRef.current.style.height = `${viewport.height}px`;
                 textLayerRef.current.style.width = `${viewport.width}px`;
                 
                 // FIX: Set CSS variable for PDF.js 3.11+
                 textLayerRef.current.style.setProperty('--scale-factor', `${viewport.scale}`);

                 // PDF.js utility to render text layer
                 window.pdfjsLib.renderTextLayer({
                     textContentSource: textContent,
                     container: textLayerRef.current,
                     viewport: viewport,
                     textDivs: []
                 });
             }
        }

      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
            console.error("Page render error:", err);
        }
      }
    };

    if (pdfDoc && activeTab === 'pdf') {
        renderPage();
    }
  }, [pdfDoc, pageNum, zoom, activeTab]);


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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1.0);

  const changePage = (offset: number) => {
      setPageNum(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handleCopy = () => {
    if (extractedText) {
        navigator.clipboard.writeText(extractedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden relative">
      <div className="flex items-center justify-between bg-slate-950 border-b border-slate-800 h-12 flex-shrink-0 px-2">
        <div className="flex items-center h-full overflow-x-auto custom-scrollbar no-scrollbar mr-4">
            <TabButton id="pdf" label="PDF Reader" icon={FileText} disabled={!pdfUrl} />
            <TabButton id="text" label="OCR Mirror" icon={ScanLine} disabled={!extractedText} />
            <TabButton id="api" label="API Data" icon={FileCode} disabled={!apiContent} />
            <TabButton id="html" label="HTML Page" icon={Globe} disabled={!htmlContent} />
            <TabButton id="scrape" label="Scrape Data" icon={FileJson} disabled={!scrapeContent} />
        </div>

        <div className="flex items-center gap-3">
            {/* Pagination Controls */}
             {activeTab === 'pdf' && pdfUrl && numPages > 0 && (
                <div className="flex items-center space-x-1 bg-slate-900/50 rounded-lg border border-slate-800/50 h-8 px-1">
                     <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4"/>
                     </button>
                     <span className="text-[10px] text-slate-300 font-mono w-16 text-center">
                        {pageNum} / {numPages}
                     </span>
                     <button onClick={() => changePage(1)} disabled={pageNum >= numPages} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">
                        <ChevronRight className="w-4 h-4"/>
                     </button>
                </div>
            )}

            {/* Zoom Controls (Only for PDF) */}
            {activeTab === 'pdf' && pdfUrl && (
                <div className="flex items-center px-2 space-x-1 bg-slate-900/50 rounded-lg border border-slate-800/50 h-8">
                    <button 
                        onClick={handleZoomOut}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-blue-400 w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
                    <button 
                        onClick={handleZoomIn}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
                    <button 
                        onClick={handleZoomReset}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Reset Zoom"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 bg-slate-100 relative overflow-auto custom-scrollbar flex flex-col items-center" ref={contentRef}> 
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
                        <canvas ref={canvasRef} className="block" />
                        {/* Text Layer for Selection */}
                        <div ref={textLayerRef} className="textLayer" />
                        
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
        
        {/* Styled OCR Mirror View */}
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
                {/* Watermark/Header on the paper */}
                <div className="absolute top-8 right-8 opacity-10 pointer-events-none select-none">
                     <span className="font-orbitron text-4xl font-bold uppercase text-slate-900">OCR COPY</span>
                </div>
                
                <div className="font-serif text-slate-900 leading-7 text-justify whitespace-pre-wrap selection:bg-blue-100 selection:text-blue-900 text-sm">
                    {renderHighlightedText(extractedText)}
                </div>
                
                {/* Footer simulation */}
                <div className="absolute bottom-8 left-0 w-full text-center text-[10px] text-slate-300 font-mono select-none">
                     ACE EXTRACTED CONTENT • GENERATED BY GEMINI FLASH
                </div>
            </div>
          </div>
        )}

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
              {highlightText && (
                 <div className="absolute bottom-4 right-4 bg-yellow-100 text-yellow-800 text-xs px-3 py-1.5 rounded shadow-md border border-yellow-200">
                     Highlighting unavailable in HTML Preview.
                 </div>
              )}
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
