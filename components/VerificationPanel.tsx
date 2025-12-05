
import React, { useState } from 'react';
import { CheckCircle, AlertOctagon, AlertTriangle, ShieldCheck, Users, FileText, Ban, X } from 'lucide-react';
import { VerificationResult } from '../types';

interface VerificationPanelProps {
  result: VerificationResult;
}

const VerificationPanel: React.FC<VerificationPanelProps> = ({ result }) => {
  const { status, message, idComparison, titleComparison, authorComparison } = result;
  const [detailsModal, setDetailsModal] = useState<{ title: string, content: React.ReactNode } | null>(null);

  const getStatusConfig = () => {
    switch (status) {
      case 'SUCCESS':
        return {
          color: 'green',
          icon: CheckCircle,
          title: 'VERIFIED',
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700'
        };
      case 'MATCH_BY_TITLE':
        return {
          color: 'blue',
          icon: ShieldCheck,
          title: 'TITLE MATCH (NO ID)',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700'
        };
      case 'SUMMARY_MISMATCHED':
        return {
          color: 'red',
          icon: AlertOctagon,
          title: 'CRITICAL ID MISMATCH',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700'
        };
      case 'VERSION_MISMATCHED':
        return {
          color: 'orange',
          icon: AlertTriangle,
          title: 'VERSION DISCREPANCY',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700'
        };
      default:
        return {
          color: 'gray',
          icon: AlertTriangle,
          title: 'UNKNOWN',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Visual Helper: Determine if IDs match visually (ignoring API)
  const isIdVisualMatch = () => {
      const pdf = idComparison.pdfId;
      const scrape = idComparison.scrapeId;
      
      if (!pdf) return false;
      if (scrape && pdf === scrape) return true;
      if (!scrape) return true; // Cannot fail if no source to compare
      return false;
  };

  return (
    <>
        <div className={`p-3 border-b-2 ${config.bg} ${config.border}`}>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${config.text}`} />
                <div>
                    <h3 className={`text-sm font-black tracking-wide ${config.text}`}>{config.title}</h3>
                    {status === 'VERSION_MISMATCHED' && <div className="text-[10px] text-orange-600 font-bold uppercase">Hold for Review</div>}
                </div>
                <span className="text-xs text-slate-500 font-medium px-2 border-l border-slate-300">
                    {message}
                </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
                ACE VERIFICATION v2.1
            </div>
        </div>

        {/* Ultra Compact Grid */}
        <div className="grid grid-cols-12 gap-2 text-[10px]">
            
            {/* ID Matrix */}
            <div className={`col-span-4 bg-white rounded border p-1.5 shadow-sm ${status === 'SUMMARY_MISMATCHED' ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-400 uppercase">ID Comparison</span>
                    <span className={`font-mono font-bold ${isIdVisualMatch() ? 'text-green-600' : 'text-red-500'}`}>
                        {isIdVisualMatch() ? 'MATCH' : 'MISMATCH'}
                    </span>
                </div>
                <div className="grid grid-cols-[30px_1fr] gap-x-1 gap-y-0.5 leading-none">
                    <span className="text-slate-400 font-bold">PDF</span>
                    <span className="font-mono text-slate-700 truncate">{idComparison.pdfId || <span className="italic text-slate-300">Not Found</span>}</span>
                    
                    <span className="text-slate-400 font-bold">SCR</span>
                    <span className="font-mono text-slate-700 truncate">{idComparison.scrapeId || <span className="italic text-slate-300">Not Found</span>}</span>
                    
                    <span className="text-slate-400 font-bold">HTM</span>
                    <span className="font-mono text-slate-700 truncate">{idComparison.htmlId || <span className="italic text-slate-300">Not Found</span>}</span>
                </div>
            </div>

            {/* Title Match */}
            <div 
                className={`col-span-4 bg-white rounded border p-1.5 shadow-sm transition-all ${!titleComparison.match ? 'border-red-200 hover:border-red-400 hover:shadow-md cursor-pointer' : 'border-slate-200'}`}
                onClick={() => !titleComparison.match && setDetailsModal({
                    title: 'Title Discrepancy',
                    content: (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">PDF Document Title</label>
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700">{titleComparison.pdfTitle}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">HTML/Scrape Title</label>
                                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-slate-700">{titleComparison.htmlTitle}</div>
                            </div>
                        </div>
                    )
                })}
            >
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-400 uppercase">Title Match</span>
                    {titleComparison.match && <CheckCircle className="w-3 h-3 text-green-500"/>}
                </div>
                <div className="leading-tight truncate text-slate-700 font-medium" title={titleComparison.pdfTitle}>
                    {titleComparison.pdfTitle || <span className="text-slate-300 italic">No Title in PDF</span>}
                </div>
                {!titleComparison.match && (
                    <div className="mt-1 text-red-500 font-bold text-[9px] flex items-center gap-1">
                        <Ban className="w-3 h-3"/> CLICK TO VIEW DIFF
                    </div>
                )}
            </div>

            {/* Authors Logic */}
            <div 
                className={`col-span-4 bg-white rounded border p-1.5 shadow-sm flex flex-col justify-center transition-all ${authorComparison?.match ? 'border-slate-200' : 'border-orange-200 bg-orange-50 hover:bg-orange-100 cursor-pointer'}`}
                onClick={() => authorComparison && !authorComparison.match && setDetailsModal({
                    title: 'Author Discrepancy',
                    content: (
                        <div className="space-y-4">
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 font-medium">
                                <AlertTriangle className="w-4 h-4 inline-block mr-2 -mt-0.5"/>
                                {authorComparison.details}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">PDF Authors</label>
                                    <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs whitespace-pre-wrap h-40 overflow-auto">{authorComparison.pdfAuthorsSource}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expected (Scrape)</label>
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs whitespace-pre-wrap h-40 overflow-auto">{authorComparison.apiAuthorsSource}</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            >
                <div className="flex items-center gap-1 mb-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-slate-400 uppercase">Author Verification</span>
                </div>
                {authorComparison?.match ? (
                    <div className="text-green-600 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" /> NAMES VERIFIED
                    </div>
                ) : (
                    <div className="text-red-600 font-bold leading-tight mt-0.5">
                        <div className="flex items-center gap-1 text-[9px] uppercase"><AlertTriangle className="w-3 h-3"/> CLICK FOR DETAILS</div>
                        <div className="text-[8px] text-slate-500 truncate mt-0.5">{authorComparison?.details || "Name count mismatch"}</div>
                    </div>
                )}
            </div>
        </div>
        </div>

        {detailsModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailsModal(null)}>
                <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 relative animate-fade-in" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setDetailsModal(null)}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 pr-8 border-b border-slate-100 pb-2">{detailsModal.title}</h3>
                    {detailsModal.content}
                </div>
            </div>
        )}
    </>
  );
};

export default VerificationPanel;
