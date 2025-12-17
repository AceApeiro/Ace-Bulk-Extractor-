import React, { useState, useEffect } from 'react';
import { Target, FileDown, CheckCircle, Folder } from 'lucide-react';
import { ExtractedData, CaseFiles } from '../types';
import { generateXML } from './ResultsView';

interface QCChecklistProps {
  data: ExtractedData;
  files: CaseFiles;
  onComplete: () => void;
  onToggleAgent?: () => void;
  isAgentOpen?: boolean;
}

interface QCItem {
    id: string;
    label: string;
    pdfChecked: boolean;
    scrapeChecked: boolean;
    summaryChecked: boolean;
    mandatory: boolean;
    notes?: string;
    snippet?: string;
}

const QCChecklist: React.FC<QCChecklistProps> = ({ data, files, onComplete, onToggleAgent, isAgentOpen }) => {
  const [items, setItems] = useState<QCItem[]>([]);
  
  // --- Initialize Checklist ---
  useEffect(() => {
    const v = data.verification;
    setItems([
        { 
            id: 'arxiv_id', 
            label: 'ArXiv ID & Version', 
            pdfChecked: !!v.idComparison.pdfId, 
            scrapeChecked: !!v.idComparison.scrapeId, 
            summaryChecked: !!v.idComparison.htmlId, 
            mandatory: true,
            notes: v.status === 'SUMMARY_MISMATCHED' ? 'ID Mismatch Detected' : (v.status === 'VERSION_MISMATCHED' ? 'Version Mismatch' : 'Matches across sources'),
            snippet: data.arxivId
        },
        { 
            id: 'title', 
            label: 'Title Content', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            notes: 'HTML title takes precedence on discrepancy.',
            snippet: data.title.substring(0, 60) + '...'
        },
        { 
            id: 'authors', 
            label: 'Authors & Sequence', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            notes: 'Check sequence vs PDF. API used for full names.',
            snippet: `${data.authors.length} Authors Identified`
        },
        { 
            id: 'orcid', 
            label: 'ORCID Checks', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            notes: 'Verify ORCID IDs found in footnotes/margins.',
            snippet: `${data.authors.filter(a => a.orcid).length} ORCIDs Extracted`
        },
        { 
            id: 'affiliations', 
            label: 'Affiliations', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            snippet: `${data.affiliations.length} Orgs Linked`
        },
        { 
            id: 'correspondence', 
            label: 'Correspondence', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            notes: 'Verify * or envelope symbols.',
            snippet: data.authors.find(a => a.isCorresponding) ? 'Found' : 'Not Found'
        },
        { 
            id: 'keywords', 
            label: 'Keywords', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: false,
            snippet: data.keywords ? `${data.keywords.length} found` : 'None'
        },
        { 
            id: 'categories', 
            label: 'Categories', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: false,
            snippet: data.categories ? data.categories.join(', ') : 'None'
        },
        { 
            id: 'abstract', 
            label: 'Abstract', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            snippet: 'HTML Source used'
        },
        { 
            id: 'references', 
            label: 'References', 
            pdfChecked: false, 
            scrapeChecked: false, 
            summaryChecked: false, 
            mandatory: true,
            snippet: `${data.references.length} Refs`
        }
    ]);
  }, [data]);

  const toggleCheck = (itemId: string, source: 'pdfChecked' | 'scrapeChecked' | 'summaryChecked') => {
      setItems(prev => prev.map(item => {
          if (item.id === itemId) {
              return { ...item, [source]: !item[source] };
          }
          return item;
      }));
  };

  const calculateScore = () => {
      let checked = 0;
      let totalSlots = items.length * 3; 
      items.forEach(i => {
          if(i.pdfChecked) checked++;
          if(i.scrapeChecked) checked++;
          if(i.summaryChecked) checked++;
      });
      return items.length > 0 ? Math.round((checked/totalSlots) * 100) : 0;
  };

  const score = calculateScore();

  const handleDownload = async () => {
      const xml = generateXML(data);
      const fileName = `ACE_${data.arxivId}_Validated.xml`;
      let saved = false;

      // Attempt modern File System Access API
      // Wrap in try-catch to handle cross-origin/iframe restrictions
      if ('showSaveFilePicker' in window) {
          try {
              const handle = await (window as any).showSaveFilePicker({
                  suggestedName: fileName,
                  types: [{
                      description: 'XML File',
                      accept: {'text/xml': ['.xml']},
                  }],
              });
              const writable = await handle.createWritable();
              await writable.write(xml);
              await writable.close();
              saved = true;
          } catch (err: any) {
              // Ignore AbortError (user cancelled)
              // Log others (SecurityError, etc)
              if (err.name !== 'AbortError') {
                  console.warn("File System Access API not available in this context:", err);
              } else {
                  return; // User cancelled, do not proceed to complete
              }
          }
      }

      // Fallback to Blob download if File System API failed or isn't available
      if (!saved) {
          try {
            const blob = new Blob([xml], { type: 'text/xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            saved = true;
          } catch (e) {
             console.error("Fallback download failed", e);
             alert("Failed to save file. Please check permissions.");
             return;
          }
      }
      
      if (saved) {
          onComplete(); // Triggers QC Stop Timer in Parent
      }
  };

  return (
    <div className="h-full flex bg-[#050505] text-slate-300 overflow-hidden justify-center">
        
        {/* Main Checklist Container (Centered, Full Width allowed) */}
        <div className="w-full max-w-5xl flex flex-col border-x border-slate-800 bg-[#020408]">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex-shrink-0">
                <div className="flex justify-between items-center mb-0">
                    <div>
                        <h1 className="text-xl font-orbitron font-bold text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-500" /> 
                            PRECISION CHECK
                        </h1>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-bold font-orbitron ${score === 100 ? 'text-green-400' : 'text-purple-500'}`}>{score}%</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500">QC Score</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="space-y-6">
                    {items.map(item => (
                        <div key={item.id} className="bg-[#0a0a0a] rounded-xl border border-slate-800/50 overflow-hidden hover:border-slate-700 transition-colors">
                            <div className="p-4 bg-slate-900/50 border-b border-slate-800/50 flex justify-between items-center">
                                <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                    {item.label}
                                    {item.mandatory && <span className="text-[9px] text-red-400 bg-red-950/30 px-1 rounded">REQ</span>}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono italic max-w-[250px] truncate">{item.notes}</span>
                            </div>
                            
                            <div className="p-4 grid grid-cols-12 gap-6">
                                <div className="col-span-8 text-[11px] font-mono text-cyan-200/80 bg-slate-900/30 p-3 rounded border border-slate-800/50 break-words flex items-center">
                                    {item.snippet || 'No Data Extracted'}
                                </div>
                                
                                <div className="col-span-4 grid grid-cols-3 gap-2">
                                    <label className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer border transition-all ${item.pdfChecked ? 'bg-blue-900/20 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                                        <span className="text-[9px] font-bold mb-1">PDF</span>
                                        <input type="checkbox" checked={item.pdfChecked} onChange={() => toggleCheck(item.id, 'pdfChecked')} className="accent-blue-500" />
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer border transition-all ${item.scrapeChecked ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                                        <span className="text-[9px] font-bold mb-1">SCRAPE</span>
                                        <input type="checkbox" checked={item.scrapeChecked} onChange={() => toggleCheck(item.id, 'scrapeChecked')} className="accent-green-500" />
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer border transition-all ${item.summaryChecked ? 'bg-orange-900/20 border-orange-500/50 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                                        <span className="text-[9px] font-bold mb-1">SUMMARY</span>
                                        <input type="checkbox" checked={item.summaryChecked} onChange={() => toggleCheck(item.id, 'summaryChecked')} className="accent-orange-500" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-4">
                <div className="flex-1 flex items-center gap-2 text-xs text-slate-500 italic">
                    <Folder className="w-4 h-4" /> 
                    {'showSaveFilePicker' in window ? 'System will prompt for save location.' : 'File will download to default folder.'}
                </div>
                <button 
                    onClick={handleDownload}
                    disabled={score < 100}
                    className={`flex-1 py-4 rounded-lg font-bold text-xs uppercase tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all 
                    ${score >= 100 
                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 cursor-pointer' 
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                >
                    {score >= 100 ? (
                        <>
                            <CheckCircle className="w-4 h-4" /> FINALIZE & SAVE XML
                        </>
                    ) : (
                        <>
                            <FileDown className="w-4 h-4" /> Requires 100% Score
                        </>
                    )}
                </button>
            </div>
        </div>

    </div>
  );
};

export default QCChecklist;