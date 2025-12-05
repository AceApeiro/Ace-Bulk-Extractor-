
import React, { useState } from 'react';
import { CheckSquare, Square, Check, AlertTriangle } from 'lucide-react';

interface QCChecklistProps {
  onComplete: () => void;
}

const CHECKLIST_ITEMS = [
  { id: 'id-verify', label: 'ArXiv ID & Version verified against HTML/Scrape', critical: true },
  { id: 'title-match', label: 'Title matches PDF content exactly', critical: true },
  { id: 'authors-names', label: 'Author names spelling & accents correct', critical: true },
  { id: 'authors-affil', label: 'Affiliation indices correctly mapped to authors', critical: true },
  { id: 'country-codes', label: 'Country Codes (ISO) present for all affiliations', critical: true },
  { id: 'corresp-email', label: 'Corresponding author email identified', critical: false },
  { id: 'abstract-clean', label: 'Abstract text clean (no artifacts/headers)', critical: false },
  { id: 'refs-format', label: 'References cleanly separated', critical: false }
];

const QCChecklist: React.FC<QCChecklistProps> = ({ onComplete }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleToggle = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const progress = Math.round((Object.values(checkedItems).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100);
  const allCriticalChecked = CHECKLIST_ITEMS.filter(i => i.critical).every(i => checkedItems[i.id]);

  return (
    <div className="p-8 max-w-2xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <CheckSquare className="w-6 h-6 text-blue-600"/> Quality Control Checklist
          </h2>
          <p className="text-slate-500 mt-2">Complete all critical checks before finalizing this case.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-700">Progress</span>
              <span className="font-mono text-blue-600 font-bold">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 w-full">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
          </div>
          <div className="divide-y divide-slate-100">
              {CHECKLIST_ITEMS.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleToggle(item.id)}
                    className={`p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${checkedItems[item.id] ? 'bg-blue-50/30' : ''}`}
                  >
                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                          checkedItems[item.id] 
                             ? 'bg-blue-500 border-blue-500 text-white' 
                             : 'bg-white border-slate-300 text-transparent'
                      }`}>
                          <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                          <p className={`text-sm font-medium ${checkedItems[item.id] ? 'text-slate-700' : 'text-slate-600'}`}>
                              {item.label}
                          </p>
                          {item.critical && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                  <AlertTriangle className="w-3 h-3"/> CRITICAL
                              </span>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      <button 
        disabled={!allCriticalChecked}
        onClick={onComplete}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform flex items-center justify-center gap-2
            ${allCriticalChecked 
                ? 'bg-green-600 hover:bg-green-500 text-white hover:scale-[1.01]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
      >
        {allCriticalChecked ? <Check className="w-6 h-6"/> : <Square className="w-6 h-6"/>}
        {allCriticalChecked ? 'Mark Case as Verified' : 'Complete Critical Checks'}
      </button>
    </div>
  );
};

export default QCChecklist;
