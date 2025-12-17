

import React, { useState } from 'react';
import { Check, X, AlertTriangle, ChevronDown, ChevronRight, Activity, ShieldCheck, FileCheck, Users, FileText } from 'lucide-react';
import { VerificationResult } from '../types';

interface VerificationPanelProps {
  result: VerificationResult;
  arxivId?: string;
}

const VerificationPanel: React.FC<VerificationPanelProps> = ({ result, arxivId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { status, idComparison, authorComparison, titleComparison } = result;
  
  const isSuccess = status === 'SUCCESS' || status === 'MATCH_BY_TITLE';
  const baseId = arxivId || idComparison.pdfId || 'Pending';
  
  const idRows = [
    { name: 'PDF', id: idComparison.pdfId || '-', ver: idComparison.pdfVersion || '-', doi: '-', source: 'Document' },
    { name: 'SCRAPE', id: idComparison.scrapeId || '-', ver: idComparison.scrapeVersion || '-', doi: idComparison.scrapeId ? `10.48550/arXiv.${idComparison.scrapeId}` : '-', source: 'Metadata' },
    { name: 'API', id: idComparison.apiId || '-', ver: idComparison.apiVersion || '-', doi: '-', source: 'Official' },
    { name: 'HTML', id: idComparison.htmlId || '-', ver: idComparison.htmlVersion || '-', doi: idComparison.htmlId ? `10.48550/arXiv.${idComparison.htmlId}` : '-', source: 'Landing' },
  ];

  return (
    <div className="bg-[#020617] border-b border-slate-800 font-inter transition-all">
      {/* Collapsible Header */}
      <div 
        className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-slate-900/40 transition-colors select-none group border-l-2 border-l-transparent hover:border-l-cyan-500"
        onClick={() => setIsOpen(!isOpen)}
      >
          <div className="flex items-center gap-4">
              <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
              
              <div>
                  <div className="flex items-center gap-3">
                      <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Validation & Checks</h2>
                      <span className="text-slate-700">|</span>
                      <span className="font-mono text-slate-200 font-bold">{baseId}</span>
                  </div>
                  {!isOpen && (
                      <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-500 font-mono">
                          <span className={`flex items-center gap-1 ${idComparison.versionMatch ? 'text-green-500' : 'text-red-500'}`}>
                            {idComparison.versionMatch ? <Check className="w-3 h-3"/> : <X className="w-3 h-3"/>} Version Check
                          </span>
                          <span className={`flex items-center gap-1 ${authorComparison?.match ? 'text-green-500' : 'text-orange-500'}`}>
                            {authorComparison?.match ? <Check className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>} Author Seq
                          </span>
                      </div>
                  )}
              </div>
          </div>

          <div className="flex items-center gap-3">
             <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isSuccess ? 'bg-green-950 text-green-400 border-green-900' : 'bg-red-950 text-red-400 border-red-900'}`}>
                 Status: <span className="ml-1 text-white">{status}</span>
            </div>
          </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-6 pb-6 animate-fadeIn border-t border-slate-800/50 pt-4 bg-[#03081c]">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: ID & Version */}
                <div className="bg-[#050505] rounded border border-slate-800 overflow-hidden">
                    <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3"/> ID & Version Control (3-Way)
                        </span>
                        {idComparison.versionMatch 
                            ? <span className="text-[9px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900">MATCH</span>
                            : <span className="text-[9px] text-red-400 bg-red-900/20 px-2 py-0.5 rounded border border-red-900">MISMATCH</span>
                        }
                    </div>
                    <div className="p-0">
                        {idRows.map((row, idx) => (
                            <div key={row.name} className={`grid grid-cols-12 gap-2 px-3 py-2 text-[10px] items-center ${idx !== idRows.length -1 ? 'border-b border-slate-800/50' : ''}`}>
                                <div className="col-span-2 font-bold text-slate-500">{row.name}</div>
                                <div className="col-span-4 font-mono text-slate-300">{row.id}</div>
                                <div className={`col-span-2 font-mono text-center font-bold ${row.ver === '-' ? 'text-slate-600' : 'text-cyan-400'}`}>{row.ver}</div>
                                <div className="col-span-4 font-mono text-slate-600 truncate">{row.doi}</div>
                            </div>
                        ))}
                    </div>
                    {status === 'MATCH_BY_TITLE' && (
                        <div className="px-3 py-2 bg-blue-900/10 border-t border-slate-800 text-[9px] text-blue-400 flex items-center gap-2">
                            <Check className="w-3 h-3"/> PDF ID Missing but Title Matched. Using HTML ID.
                        </div>
                    )}
                </div>

                {/* Right: Author & Title */}
                <div className="space-y-4">
                    
                    {/* Author Verification */}
                    <div className="bg-[#050505] rounded border border-slate-800 overflow-hidden">
                        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-3 h-3"/> Author Sequence (PDF vs API)
                            </span>
                            {authorComparison.match 
                                ? <span className="text-[9px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900">MATCH</span>
                                : <span className="text-[9px] text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded border border-orange-900">CHECK</span>
                            }
                        </div>
                        <div className="p-3 text-xs text-slate-300">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500">Validation:</span>
                                <span className="font-mono text-cyan-400">{authorComparison.details}</span>
                            </div>
                            <div className="flex gap-4 text-[10px] text-slate-500 font-mono">
                                <span>PDF Count: {authorComparison.pdfCount}</span>
                                <span>API Count: {authorComparison.apiCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Title Authority */}
                    <div className="bg-[#050505] rounded border border-slate-800 overflow-hidden">
                        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-3 h-3"/> Title Authority
                            </span>
                            <span className="text-[9px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900">
                                USED: {titleComparison.sourceUsed}
                            </span>
                        </div>
                        <div className="p-3 text-[10px] space-y-2">
                            {titleComparison.match ? (
                                <div className="text-green-500 flex items-center gap-2">
                                    <Check className="w-3 h-3"/> PDF and HTML Titles match.
                                </div>
                            ) : (
                                <>
                                    <div className="text-orange-400 flex items-center gap-2 mb-1">
                                        <AlertTriangle className="w-3 h-3"/> Discrepancy. Using HTML (Authority).
                                    </div>
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-2 text-slate-500">PDF:</div>
                                        <div className="col-span-10 text-slate-400 italic truncate">{titleComparison.pdfTitle}</div>
                                        <div className="col-span-2 text-slate-500">HTML:</div>
                                        <div className="col-span-10 text-cyan-300">{titleComparison.htmlTitle}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default VerificationPanel;
