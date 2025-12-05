
import React, { useMemo, useState } from 'react';
import { Case, ParsingStatus } from '../types';
import { X, FileDown, Activity, CheckCircle, AlertTriangle, BarChart3, FileJson, LayoutList } from 'lucide-react';

interface ReportingPanelProps {
  cases: Case[];
  onClose: () => void;
}

const ReportingPanel: React.FC<ReportingPanelProps> = ({ cases, onClose }) => {
  // Stats Calculation
  const stats = useMemo(() => {
    const total = cases.length;
    const completed = cases.filter(c => c.status === ParsingStatus.SUCCESS).length;
    const failed = cases.filter(c => c.status === ParsingStatus.ERROR).length;
    const processing = cases.filter(c => c.status === ParsingStatus.PROCESSING).length;
    
    // Time stats
    const completedCases = cases.filter(c => c.status === ParsingStatus.SUCCESS && c.processingTime);
    const avgTime = completedCases.length > 0 
        ? Math.round(completedCases.reduce((acc, c) => acc + (c.processingTime || 0), 0) / completedCases.length)
        : 0;
    
    const maxTime = completedCases.length > 0 ? Math.max(...completedCases.map(c => c.processingTime || 0)) : 0;
    const minTime = completedCases.length > 0 ? Math.min(...completedCases.map(c => c.processingTime || 0)) : 0;

    const editedCount = cases.filter(c => c.isEdited).length;

    return { total, completed, failed, processing, avgTime, maxTime, minTime, editedCount, completedCases };
  }, [cases]);

  // Export CSV
  const downloadCSV = () => {
    const headers = ['Case ID', 'File Name', 'Status', 'Extracted Title', 'Processing Time (ms)', 'Is Edited', 'Verification Status', 'Validation Msg', 'PDF ID', 'HTML ID', 'Scrape ID'];
    const rows = cases.map(c => [
        c.id,
        c.name,
        ParsingStatus[c.status],
        `"${c.extractedData?.title?.replace(/"/g, '""') || ''}"`,
        c.processingTime || 0,
        c.isEdited ? 'Yes' : 'No',
        c.extractedData?.verification.status || 'N/A',
        `"${c.extractedData?.verification.message || ''}"`,
        c.extractedData?.verification.idComparison?.pdfId || 'N/A',
        c.extractedData?.verification.idComparison?.htmlId || 'N/A',
        c.extractedData?.verification.idComparison?.scrapeId || 'N/A',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ACE_Report_FULL_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const downloadJSON = () => {
    const data = {
        meta: {
            timestamp: new Date().toISOString(),
            system: "ACE - Apeiro Citation Extractor",
            version: "2.1"
        },
        stats: {
            total: stats.total,
            success: stats.completed,
            failed: stats.failed,
            avgTimeMs: stats.avgTime
        },
        cases: cases.map(c => ({
            id: c.id,
            name: c.name,
            status: ParsingStatus[c.status],
            data: c.extractedData,
            timings: {
                start: c.startTime,
                end: c.endTime,
                duration: c.processingTime
            }
        }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ACE_Report_FULL_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose} // Backdrop click closes modal
    >
        <div 
            className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-[101]"
            onClick={(e) => e.stopPropagation()} // Stop propagation to prevent closing when clicking inside
        >
            {/* Header */}
            <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-center relative z-[102] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/40">
                        <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-orbitron font-bold text-white tracking-wide">Analytics & Reporting</h2>
                        <p className="text-xs text-slate-400 font-mono">Session ID: {new Date().getTime().toString(36).toUpperCase()}</p>
                    </div>
                </div>
                
                {/* Close Button - Explicitly styled for interaction */}
                <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }} 
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700 hover:border-slate-500 shadow-lg active:scale-95 group"
                    aria-label="Close Report Panel"
                >
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0f172a] custom-scrollbar relative z-0">
                
                {/* Metric Cards */}
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
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Latency</div>
                        <div className="flex items-end gap-2">
                            <div className="text-3xl font-orbitron text-purple-400">{stats.avgTime}</div>
                            <span className="text-sm text-purple-400/60 mb-1">ms</span>
                        </div>
                         <div className="text-[10px] text-slate-500 mt-1">Range: {stats.minTime}ms - {stats.maxTime}ms</div>
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

                {/* Performance Chart */}
                {stats.completedCases.length > 0 && (
                    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-500"/> Processing Performance History
                            </h3>
                        </div>
                        <div className="h-32 flex items-end gap-1 w-full px-2 border-b border-l border-slate-600/50 pb-1">
                            {stats.completedCases.map((c, i) => {
                                const heightPercent = Math.min(100, Math.max(10, (c.processingTime || 0) / (stats.maxTime || 1) * 100));
                                return (
                                    <div key={i} className="flex-1 bg-blue-500/20 hover:bg-blue-400/40 rounded-t transition-all group relative" style={{ height: `${heightPercent}%` }}>
                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none border border-slate-700">
                                            {c.name}: {c.processingTime}ms
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
                            <span>First Processed</span>
                            <span>Most Recent</span>
                        </div>
                    </div>
                )}

                {/* Detailed Table Preview */}
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <LayoutList className="w-4 h-4 text-slate-500"/> Report Data Preview
                        </h3>
                        <div className="flex gap-2">
                             <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-mono">Displaying {cases.length} Records</span>
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-b border-slate-200 min-w-[50px]">#</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[200px]">File Name</th>
                                    <th className="p-3 border-b border-slate-200 bg-blue-50 text-blue-700 min-w-[120px] border-r border-blue-100">PDF ID</th>
                                    <th className="p-3 border-b border-slate-200 bg-orange-50 text-orange-700 min-w-[120px] border-r border-orange-100">HTML ID (Summary)</th>
                                    <th className="p-3 border-b border-slate-200 bg-green-50 text-green-700 min-w-[120px] border-r border-green-100">Scrape ID</th>
                                    <th className="p-3 border-b border-slate-200 min-w-[100px]">Status</th>
                                    <th className="p-3 border-b border-slate-200 text-center min-w-[100px]">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
                                {cases.map((c, i) => {
                                    const v = c.extractedData?.verification;
                                    const pdfId = v?.idComparison?.pdfId;
                                    const htmlId = v?.idComparison?.htmlId;
                                    const scrapeId = v?.idComparison?.scrapeId;
                                    
                                    // Logic to highlight individual mismatched cells if needed
                                    const status = v?.status;
                                    const isMismatch = status === 'SUMMARY_MISMATCHED' || status === 'VERSION_MISMATCHED';

                                    // Helper for cell styling based on mismatch
                                    const getCellClass = (id: string | undefined, refId: string | undefined, isRef: boolean = false) => {
                                        if (!id) return 'text-slate-400 italic';
                                        if (isMismatch) {
                                            // Simple diff check against PDF as base
                                            if (refId && id !== refId) return 'bg-red-50 text-red-600 font-bold';
                                        }
                                        return 'text-slate-700 font-mono';
                                    };

                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-mono text-slate-400">{i+1}</td>
                                            <td className="p-3 font-medium truncate max-w-[200px]" title={c.name}>{c.name}</td>
                                            
                                            {/* PDF ID (Base) */}
                                            <td className={`p-3 border-r border-slate-100 ${getCellClass(pdfId, undefined)}`}>
                                                {pdfId || 'N/A'}
                                            </td>

                                            {/* HTML ID */}
                                            <td className={`p-3 border-r border-slate-100 ${getCellClass(htmlId, pdfId)}`}>
                                                {htmlId || 'N/A'}
                                            </td>

                                            {/* Scrape ID */}
                                            <td className={`p-3 border-r border-slate-100 ${getCellClass(scrapeId, pdfId)}`}>
                                                {scrapeId || 'N/A'}
                                            </td>

                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    c.status === ParsingStatus.SUCCESS ? 'bg-green-100 text-green-700' :
                                                    c.status === ParsingStatus.ERROR ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {ParsingStatus[c.status]}
                                                </span>
                                            </td>
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

            {/* Footer / Actions */}
            <div className="bg-slate-900 p-4 border-t border-slate-800 flex justify-end items-center gap-3 shrink-0 relative z-[102]">
                <button 
                    onClick={downloadJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-all border border-slate-700 hover:border-slate-500 hover:text-white"
                >
                    <FileJson className="w-4 h-4"/> Export JSON
                </button>
                <button 
                    onClick={downloadCSV}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
                >
                    <FileDown className="w-4 h-4"/> Download Full Report (CSV)
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReportingPanel;
