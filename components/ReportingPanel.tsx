

import React, { useMemo, useState, useEffect } from 'react';
import { Case, ParsingStatus, HistoricalSession } from '../types';
import { X, FileDown, Activity, CheckCircle, AlertTriangle, FileJson, LayoutList, History, RotateCcw } from 'lucide-react';

interface ReportingPanelProps {
  cases: Case[];
  onClose: () => void;
}

const formatDuration = (ms: number) => {
    if (!ms) return '0s';
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000);
    const h = Math.floor(ms / 3600000);
    if (h > 0) return `${h}h ${m%60}m ${s}s`;
    return `${m}m ${s}s`;
};

const ReportingPanel: React.FC<ReportingPanelProps> = ({ cases: currentSessionCases, onClose }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [history, setHistory] = useState<HistoricalSession[]>([]);

  useEffect(() => {
      const stored = localStorage.getItem('ace_history');
      if (stored) {
          try {
              setHistory(JSON.parse(stored));
          } catch(e) {
              console.error("Failed to load history", e);
          }
      }
  }, []);

  const clearHistory = () => {
      if(confirm("Clear all historical data? This cannot be undone.")) {
          localStorage.removeItem('ace_history');
          setHistory([]);
      }
  };

  // Combine cases based on view
  const displayCases = activeTab === 'current' 
    ? currentSessionCases 
    : history.flatMap(s => s.cases);

  const stats = useMemo(() => {
    const total = displayCases.length;
    const completed = displayCases.filter(c => c.status === ParsingStatus.SUCCESS).length;
    const failed = displayCases.filter(c => c.status === ParsingStatus.ERROR).length;
    const processing = displayCases.filter(c => c.status === ParsingStatus.PROCESSING).length;
    
    const completedCases = displayCases.filter(c => c.status === ParsingStatus.SUCCESS && c.processingTime);
    const avgExtractionTime = completedCases.length > 0 
        ? Math.round(completedCases.reduce((acc, c) => acc + (c.processingTime || 0), 0) / completedCases.length)
        : 0;
    
    // QC Stats
    const qcCases = displayCases.filter(c => c.qcDuration);
    const avgQcTime = qcCases.length > 0 
        ? Math.round(qcCases.reduce((acc, c) => acc + (c.qcDuration || 0), 0) / qcCases.length)
        : 0;

    const editedCount = displayCases.filter(c => c.isEdited).length;

    return { total, completed, failed, processing, avgExtractionTime, avgQcTime, editedCount };
  }, [displayCases]);

  const downloadCSV = () => {
    const headers = [
        'Session Date', 'Case ID', 'File Name', 'Status', 'Extracted Title', 
        'Extraction Time (ms)', 'Extraction Duration', 
        'QC Time (ms)', 'QC Duration', 
        'Total Time',
        'Is Edited', 'Verification Status', 'PDF ID', 'HTML ID', 'Scrape ID'
    ];
    
    const rows = displayCases.map(c => {
        const totalTime = (c.processingTime || 0) + (c.qcDuration || 0);
        return [
            new Date(c.endTime || Date.now()).toLocaleDateString(),
            c.id,
            c.name,
            ParsingStatus[c.status],
            `"${c.extractedData?.title?.replace(/"/g, '""') || ''}"`,
            c.processingTime || 0,
            formatDuration(c.processingTime || 0),
            c.qcDuration || 0,
            formatDuration(c.qcDuration || 0),
            formatDuration(totalTime),
            c.isEdited ? 'Yes' : 'No',
            c.extractedData?.verification.status || 'N/A',
            c.extractedData?.verification.idComparison?.pdfId || 'N/A',
            c.extractedData?.verification.idComparison?.htmlId || 'N/A',
            c.extractedData?.verification.idComparison?.scrapeId || 'N/A',
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ACE_Report_${activeTab}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
    >
        <div 
            className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()} 
        >
            <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/40">
                        <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-orbitron font-bold text-white tracking-wide">Analytics & Reporting</h2>
                        <div className="flex gap-4 text-xs font-mono mt-1">
                             <button onClick={() => setActiveTab('current')} className={`hover:text-white transition-colors ${activeTab === 'current' ? 'text-blue-400 font-bold border-b border-blue-400' : 'text-slate-500'}`}>Current Session</button>
                             <button onClick={() => setActiveTab('history')} className={`hover:text-white transition-colors ${activeTab === 'history' ? 'text-blue-400 font-bold border-b border-blue-400' : 'text-slate-500'}`}>Historical Data ({history.length} Sessions)</button>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={onClose} 
                    className="p-2 bg-slate-800 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-500 transition-colors border border-slate-700 hover:border-red-500/50 group"
                >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#0f172a] custom-scrollbar">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Processed</div>
                        <div className="text-3xl font-orbitron text-white">{stats.total}</div>
                        <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${(stats.completed / Math.max(stats.total, 1)) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Success Rate</div>
                        <div className="flex items-end gap-2">
                            <div className={`text-3xl font-orbitron ${stats.completed === stats.total ? 'text-green-400' : 'text-blue-400'}`}>
                                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                            </div>
                            <span className="text-xs text-slate-400 mb-1">{stats.completed} OK / {stats.failed} ERR</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Times</div>
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between text-[10px] text-slate-400">
                                 <span>Extraction:</span>
                                 <span className="text-purple-400 font-mono">{formatDuration(stats.avgExtractionTime)}</span>
                             </div>
                             <div className="flex justify-between text-[10px] text-slate-400">
                                 <span>QC Check:</span>
                                 <span className="text-green-400 font-mono">{formatDuration(stats.avgQcTime)}</span>
                             </div>
                             <div className="w-full bg-slate-700 h-0.5 my-1"></div>
                             <div className="flex justify-between text-[10px] font-bold text-slate-300">
                                 <span>Total Avg:</span>
                                 <span>{formatDuration(stats.avgExtractionTime + stats.avgQcTime)}</span>
                             </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Quality</div>
                        <div className="flex items-end gap-2">
                             <div className="text-3xl font-orbitron text-yellow-400">{stats.editedCount}</div>
                             <span className="text-sm text-yellow-400/60 mb-1">Edits</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Manual Intervention Required</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <LayoutList className="w-4 h-4 text-slate-500"/> {activeTab === 'current' ? 'Current Session Data' : 'All Historical Data'}
                        </h3>
                        <div className="flex gap-2">
                             <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-mono">Displaying {displayCases.length} Records</span>
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-b border-slate-200 min-w-[50px]">#</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[200px]">File Name</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[100px]">Status</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[100px] bg-purple-50 text-purple-700 border-r border-purple-100">Extract Time</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[100px] bg-green-50 text-green-700 border-r border-green-100">QC Time</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[100px] font-bold">Total</th>
                                    <th className="p-3 border-b border-slate-200 text-center min-w-[100px]">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                                {displayCases.map((c, i) => {
                                    const v = c.extractedData?.verification;
                                    
                                    return (
                                        <tr key={`${c.id}-${i}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-mono text-slate-400">{i+1}</td>
                                            <td className="p-3 font-medium truncate max-w-[200px]" title={c.name}>{c.name}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    c.status === ParsingStatus.SUCCESS ? 'bg-green-100 text-green-700' :
                                                    c.status === ParsingStatus.ERROR ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {ParsingStatus[c.status]}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-purple-600 bg-purple-50/30">{formatDuration(c.processingTime || 0)}</td>
                                            <td className="p-3 font-mono text-green-600 bg-green-50/30">{formatDuration(c.qcDuration || 0)}</td>
                                            <td className="p-3 font-mono font-bold">{formatDuration((c.processingTime || 0) + (c.qcDuration || 0))}</td>
                                            <td className="p-3 text-center">
                                                {v?.status === 'SUCCESS' ? (
                                                    <div className="flex items-center justify-center text-green-600 gap-1 font-bold text-[10px]">
                                                        <CheckCircle className="w-3.5 h-3.5"/> MATCH
                                                    </div>
                                                ) : c.extractedData ? (
                                                    <div className={`flex items-center justify-center gap-1 font-bold text-[10px] ${
                                                        v?.status === 'VERSION_MISMATCHED' ? 'text-orange-500' : 'text-red-500'
                                                    }`}>
                                                        <AlertTriangle className="w-3.5 h-3.5"/> 
                                                        {v?.status === 'VERSION_MISMATCHED' ? 'VERSION' : 'ID ERR'}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 p-4 border-t border-slate-800 flex justify-end items-center gap-3 shrink-0">
                {activeTab === 'history' && (
                     <button 
                        onClick={clearHistory}
                        className="mr-auto flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg text-sm font-bold transition-all border border-red-900/50"
                    >
                        <RotateCcw className="w-4 h-4"/> Clear History
                    </button>
                )}
                <button 
                    onClick={downloadCSV}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
                >
                    <FileDown className="w-4 h-4"/> Download Report (CSV)
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReportingPanel;