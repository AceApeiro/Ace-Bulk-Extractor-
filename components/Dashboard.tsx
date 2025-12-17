
import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Case, ParsingStatus } from '../types';
import { Upload, FileText, CheckCircle, Play, Loader, FolderOpen, LayoutGrid, List as ListIcon, Activity, Search, FileDown, Edit3, Trash2, RotateCcw, PieChart, FileArchive } from 'lucide-react';
import ReportingPanel from './ReportingPanel';

interface DashboardProps {
  cases: Case[];
  onUpload: (files: File[]) => void;
  onSelectCase: (caseId: string) => void;
  onProcessAll: () => void;
  onReset: () => void;
  processingQueueSize: number;
  activeProcessingCount: number;
}

// --- Helper Components ---

// Real-time duration timer for individual files
const DurationDisplay: React.FC<{ startTime?: number, endTime?: number, status: ParsingStatus }> = ({ startTime, endTime, status }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (status === ParsingStatus.PROCESSING && startTime) {
            const interval = setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 100);
            return () => clearInterval(interval);
        } else if (status === ParsingStatus.SUCCESS && startTime && endTime) {
            setElapsed(endTime - startTime);
        } else if (status === ParsingStatus.ERROR && startTime && endTime) {
            setElapsed(endTime - startTime);
        } else {
            setElapsed(0);
        }
    }, [status, startTime, endTime]);

    if (status === ParsingStatus.IDLE) return <span className="text-slate-500">--:--</span>;

    const ms = elapsed % 1000;
    const s = Math.floor(elapsed / 1000) % 60;
    const m = Math.floor(elapsed / 60000);

    return (
        <span className={`font-mono ${status === ParsingStatus.PROCESSING ? 'text-blue-400' : 'text-slate-400'}`}>
            {m}:{s.toString().padStart(2, '0')}.{Math.floor(ms/100)}s
        </span>
    );
};

// Compact Grid Card
const GridCaseCard: React.FC<{ caseItem: Case; onClick: () => void }> = ({ caseItem, onClick }) => {
    const getStatusColors = () => {
      switch (caseItem.status) {
        case ParsingStatus.SUCCESS: return 'border-l-green-500 bg-slate-900/40 hover:bg-green-900/10';
        case ParsingStatus.ERROR: return 'border-l-red-500 bg-slate-900/40 hover:bg-red-900/10';
        case ParsingStatus.PROCESSING: return 'border-l-blue-500 bg-slate-800/60';
        default: return 'border-l-slate-600 bg-slate-900/20 hover:bg-slate-800/40';
      }
    };
  
    return (
      <div 
        onClick={onClick}
        className={`group relative cursor-pointer border-l-2 border-y border-r border-y-slate-800 border-r-slate-800 rounded-r p-3 transition-all flex flex-col justify-between h-28 ${getStatusColors()}`}
      >
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 overflow-hidden w-full">
                <FileText className={`w-4 h-4 flex-shrink-0 ${caseItem.status === ParsingStatus.PROCESSING ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-300 truncate font-mono" title={caseItem.name}>{caseItem.name}</span>
                    <span className="text-[10px] text-slate-500 truncate" title={caseItem.extractedData?.title || "Pending extraction..."}>
                        {caseItem.extractedData ? caseItem.extractedData.title : 'Pending extraction...'}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex justify-between items-end mt-2">
            <div className="flex gap-1 flex-wrap">
                 {['PDF', 'API', 'HTML', 'SCR'].map(type => {
                     let exists = false;
                     if(type==='PDF') exists = !!caseItem.files.pdf;
                     if(type==='API') exists = !!caseItem.files.api;
                     if(type==='HTML') exists = !!caseItem.files.html;
                     if(type==='SCR') exists = !!caseItem.files.scrape;
                     return (
                         <span key={type} className={`text-[6px] font-bold px-1 rounded ${exists ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-800 text-slate-600 border border-slate-700 opacity-50'}`}>
                            {type}
                         </span>
                     )
                 })}
            </div>
            <div className="text-[10px] font-mono">
                <DurationDisplay startTime={caseItem.startTime} endTime={caseItem.endTime} status={caseItem.status} />
            </div>
        </div>
        
        <div className="w-full bg-slate-800 h-0.5 mt-2 rounded-full overflow-hidden absolute bottom-2 left-2 right-2 w-[calc(100%-16px)]">
            <div 
                className={`h-full transition-all duration-500 ${
                    caseItem.status === ParsingStatus.SUCCESS ? 'w-full bg-green-500' : 
                    caseItem.status === ParsingStatus.PROCESSING ? 'w-2/3 bg-blue-500 animate-pulse' : 
                    caseItem.status === ParsingStatus.ERROR ? 'w-full bg-red-500' : 'w-0'
                }`} 
            />
        </div>
        
        {/* Verification Badge */}
        {caseItem.status === ParsingStatus.SUCCESS && (
            <div className={`absolute top-2 right-2 text-[9px] px-1 rounded border font-bold ${
                caseItem.extractedData?.verification.status === 'SUCCESS' ? 'text-green-500 border-green-900 bg-green-900/20' : 
                'text-orange-500 border-orange-900 bg-orange-900/20'
            }`}>
               {caseItem.extractedData?.verification.status === 'SUCCESS' ? 'VERIFIED' : 'CHECK'}
            </div>
        )}
         {caseItem.isEdited && (
             <div className="absolute top-2 right-16 text-[9px] px-1 rounded border border-blue-900 bg-blue-900/20 text-blue-400 font-bold flex items-center gap-0.5">
                 <Edit3 className="w-2 h-2"/> EDITED
             </div>
        )}
      </div>
    );
};

// List View Row
const ListCaseRow: React.FC<{ caseItem: Case; onClick: () => void; index: number }> = ({ caseItem, onClick, index }) => {
    return (
        <div 
            onClick={onClick}
            className={`grid grid-cols-12 gap-4 p-3 border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer transition-colors items-center
                ${caseItem.status === ParsingStatus.PROCESSING ? 'bg-blue-900/5' : ''}
            `}
        >
            <div className="col-span-1 text-slate-600 text-xs font-mono">{(index + 1).toString().padStart(2, '0')}</div>
            
            <div className="col-span-3 flex items-center gap-2">
                <FileText className={`w-4 h-4 ${caseItem.status === ParsingStatus.PROCESSING ? 'text-blue-400' : 'text-slate-500'}`}/>
                <span className="text-xs font-bold text-slate-300 font-mono truncate">{caseItem.name}</span>
                {caseItem.isEdited && <span title="Edited Manually"><Edit3 className="w-3 h-3 text-blue-400"/></span>}
            </div>

            <div className="col-span-4 text-xs text-slate-400 truncate">
                 {caseItem.extractedData ? caseItem.extractedData.title : <span className="opacity-30 italic">Waiting for analysis...</span>}
            </div>

            <div className="col-span-2 flex justify-center">
                 {caseItem.status === ParsingStatus.SUCCESS ? (
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                         caseItem.extractedData?.verification.status === 'SUCCESS' ? 'border-green-800 bg-green-900/20 text-green-400' : 'border-orange-800 bg-orange-900/20 text-orange-400'
                     }`}>
                         {caseItem.extractedData?.verification.status || 'DONE'}
                     </span>
                 ) : caseItem.status === ParsingStatus.ERROR ? (
                     <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-red-800 bg-red-900/20 text-red-400">ERROR</span>
                 ) : caseItem.status === ParsingStatus.PROCESSING ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800 bg-blue-900/20 text-blue-400 animate-pulse">RUNNING</span>
                 ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 text-slate-600">IDLE</span>
                 )}
            </div>
            
            <div className="col-span-2 text-right text-xs font-mono text-slate-500">
                <DurationDisplay startTime={caseItem.startTime} endTime={caseItem.endTime} status={caseItem.status} />
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ cases, onUpload, onSelectCase, onProcessAll, onReset, processingQueueSize, activeProcessingCount }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showReports, setShowReports] = useState(false);
  
  // Refs for both Folder and File uploads
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f: any) => !f.name.startsWith('.')) as File[];
    
    // Limit to 50
    if (files.length > 50) {
        alert("Upload limited to 50 files at once.");
        return;
    }

    if (files.length > 0) onUpload(files);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter((f: any) => !f.name.startsWith('.')) as File[];
      
      // Limit to 50
      if (files.length > 50) {
          alert("Upload limited to 50 files at once.");
          e.target.value = '';
          return;
      }

      onUpload(files);
      e.target.value = '';
    }
  };

  const stats = useMemo(() => ({
      total: cases.length,
      completed: cases.filter(c => c.status === ParsingStatus.SUCCESS).length,
      error: cases.filter(c => c.status === ParsingStatus.ERROR).length,
      processing: cases.filter(c => c.status === ParsingStatus.PROCESSING).length,
      idle: cases.filter(c => c.status === ParsingStatus.IDLE).length,
      edited: cases.filter(c => c.isEdited).length
  }), [cases]);

  const progressPercent = stats.total > 0 ? Math.round(((stats.completed + stats.error) / stats.total) * 100) : 0;
  const throughput = activeProcessingCount > 0 ? (activeProcessingCount * 12) : 0; 

  const filteredCases = cases.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  const isBatchComplete = cases.length > 0 && activeProcessingCount === 0 && (stats.completed + stats.error === stats.total);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-[#0a0a0a]">
      {showReports && <ReportingPanel cases={cases} onClose={() => setShowReports(false)} />}
      
      {/* Hidden Inputs */}
      <input 
            type="file" 
            ref={(node) => {
                folderInputRef.current = node;
                if (node) {
                    node.setAttribute("webkitdirectory", "");
                    node.setAttribute("directory", "");
                }
            }}
            onChange={handleFileSelection}
            className="hidden"
            multiple
      />
      <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelection}
            className="hidden"
            multiple
            accept=".pdf,.html,.htm,.json,.txt,.zip,application/zip,application/x-zip-compressed,multipart/x-zip"
      />

      {/* --- Analytics HUD --- */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        
        {/* Main Status */}
        <div className="col-span-12 lg:col-span-3 bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-12 h-12 text-blue-500" /></div>
             <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">System Status</div>
             <div className="flex items-end gap-2">
                 <span className={`text-2xl font-orbitron font-bold ${activeProcessingCount > 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                    {activeProcessingCount > 0 ? 'PROCESSING' : 'STANDBY'}
                 </span>
                 {activeProcessingCount > 0 && <span className="text-xs text-blue-500 mb-1 animate-pulse">● Live</span>}
             </div>
             <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
             </div>
             <div className="flex justify-between mt-1 text-[9px] text-slate-500 font-mono">
                 <span>{progressPercent}% Complete</span>
                 <span className="font-bold text-slate-300">SESSION: {stats.total} FILES</span>
             </div>
        </div>

        {/* Throughput */}
        <div className="col-span-6 lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur">
             <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Throughput</div>
             <div className="text-2xl font-orbitron text-green-400">{throughput} <span className="text-sm text-green-600/70">PPM</span></div>
             <div className="text-[9px] text-slate-500 mt-1">Est. Completion: {activeProcessingCount > 0 ? 'Calculating...' : '--:--'}</div>
        </div>

        {/* Edit Stats */}
        <div className="col-span-6 lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur">
             <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Manual Edits</div>
             <div className="text-2xl font-orbitron text-purple-400">{stats.edited} <span className="text-sm text-purple-600/70">Files</span></div>
             <div className="text-[9px] text-slate-500 mt-1">Intervention Rate: {stats.total > 0 ? Math.round((stats.edited/stats.total)*100) : 0}%</div>
        </div>

        {/* Master Controls */}
        <div className="col-span-12 lg:col-span-5 bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-900/30 rounded-xl p-4 flex items-center justify-between backdrop-blur">
             <div>
                 <div className="text-blue-200 text-sm font-bold font-orbitron">BATCH COMMAND</div>
                 <div className="text-blue-400/60 text-[10px]">Queue: {processingQueueSize} | Idle: {stats.idle}</div>
             </div>
             
             <div className="flex gap-2">
                 <button 
                     onClick={onReset}
                     disabled={activeProcessingCount > 0 || cases.length === 0}
                     className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2
                        ${activeProcessingCount > 0 || cases.length === 0
                            ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-500/50'
                        }`}
                     title="Reset Session"
                 >
                     <Trash2 className="w-4 h-4" /> Reset
                 </button>
                 <button 
                     onClick={() => setShowReports(true)}
                     className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
                     title="Open Reporting Panel"
                 >
                     <PieChart className="w-4 h-4" /> Reports
                 </button>
                 <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 hover:border-slate-500 transition-all flex items-center gap-2"
                     title="Upload files or ZIP archives"
                 >
                     <Upload className="w-3 h-3" /> Files / ZIP Archive
                 </button>
                 <button 
                     onClick={onProcessAll}
                     disabled={activeProcessingCount > 0 || stats.idle === 0}
                     className={`px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all
                        ${activeProcessingCount > 0 
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)]'
                        }`}
                 >
                     {activeProcessingCount > 0 ? <Loader className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3 fill-current" />}
                     {activeProcessingCount > 0 ? 'RUNNING...' : 'START EXTRACTION'}
                 </button>
             </div>
        </div>

      </div>

      {/* --- Batch Complete Banner --- */}
      {isBatchComplete && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl flex flex-wrap gap-4 items-center justify-between backdrop-blur animate-fade-in shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-full text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                      <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-lg font-orbitron font-bold text-green-400">Batch Processing Complete</h3>
                      <p className="text-slate-400 text-xs">Successfully processed {stats.completed} files with {stats.error} errors.</p>
                  </div>
              </div>
              <div className="flex gap-3">
                 <button 
                     onClick={() => setShowReports(true)}
                     className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"
                 >
                     <PieChart className="w-4 h-4"/> View & Download Reports
                 </button>
                 <button 
                     onClick={onReset}
                     className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all"
                 >
                     <RotateCcw className="w-4 h-4"/> Start New Session
                 </button>
              </div>
          </div>
      )}

      {/* --- Filters & Search & View Toggle --- */}
      <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search case ID or name..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <ListIcon className="w-4 h-4" />
              </button>
          </div>

          <div className="flex gap-2">
              <span className="text-xs text-slate-500 font-mono py-2">Total Capacity: 50 Slots</span>
          </div>
      </div>

      {/* --- Main Grid/List Area --- */}
      
      {cases.length === 0 ? (
        <div 
            className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/30'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-slate-700">
                <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-400' : 'text-slate-500'}`} />
            </div>
            <h2 className="text-3xl font-orbitron font-bold text-white mb-2 tracking-wide">ACE BULK UPLOAD</h2>
            <p className="text-slate-400 mb-8 max-w-md text-center text-sm">
                Drag & Drop files, a folder, or a <span className="text-blue-400 font-bold">ZIP archive</span> (max 50 files).
                <br/>Auto-detection of PDFs, HTML, JSON, and Scrape data.
            </p>
            
            <div className="flex gap-4">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20"
                >
                    <FileArchive className="w-5 h-5" /> Select ZIP / Files
                </button>
                <button 
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-8 py-3 rounded-lg font-bold transition-all border border-slate-700"
                >
                    <FolderOpen className="w-5 h-5" /> Select Folder
                </button>
            </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
            {viewMode === 'grid' ? (
                // --- GRID VIEW ---
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {/* Upload More Tile */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center h-28 cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all group"
                    >
                        <Upload className="w-6 h-6 text-slate-700 group-hover:text-blue-500 mb-1 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-300 uppercase">Add Files</span>
                    </div>

                    {filteredCases.map((c) => (
                        <GridCaseCard key={c.id} caseItem={c} onClick={() => onSelectCase(c.id)} />
                    ))}
                </div>
            ) : (
                // --- LIST VIEW ---
                <div className="flex flex-col">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 border-b border-slate-700 bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur z-10">
                        <div className="col-span-1">#</div>
                        <div className="col-span-3">Case File</div>
                        <div className="col-span-4">Extracted Title</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2 text-right">Time</div>
                    </div>
                    
                    {/* Add Button Row */}
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="grid grid-cols-12 gap-4 p-3 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer text-slate-500 hover:text-blue-400 transition-colors border-dashed bg-slate-900/20"
                    >
                        <div className="col-span-12 flex items-center justify-center gap-2 text-xs font-bold uppercase">
                            <Upload className="w-4 h-4" /> Add More Files
                        </div>
                    </div>

                    {filteredCases.map((c, idx) => (
                        <ListCaseRow key={c.id} index={idx} caseItem={c} onClick={() => onSelectCase(c.id)} />
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
