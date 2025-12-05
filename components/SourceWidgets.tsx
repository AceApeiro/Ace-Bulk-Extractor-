
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, FileJson, Globe } from 'lucide-react';

interface SourceWidgetsProps {
  apiContent: string | null;
  htmlContent: string | null;
  scrapeContent: string | null;
}

const WidgetItem = ({ title, content, icon: Icon, colorClass, isHtml = false }: { title: string, content: string | null, icon: any, colorClass: string, isHtml?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mb-2 shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center">
            <div className={`w-5 h-5 rounded flex items-center justify-center mr-2 bg-${colorClass}-100 text-${colorClass}-600`}>
                <Icon className="w-3 h-3" />
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="p-0 border-t border-slate-200">
          {isHtml ? (
              <div className="h-96 w-full bg-white relative">
                  <iframe 
                    title="html-preview"
                    srcDoc={content} 
                    className="w-full h-full border-none block"
                    sandbox="allow-same-origin"
                  />
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] px-2 py-1 font-bold shadow-sm z-10">Landing Page Preview</div>
              </div>
          ) : (
            <pre className="text-[10px] text-slate-600 font-mono p-3 bg-slate-50/50 overflow-x-auto max-h-40 custom-scrollbar whitespace-pre-wrap">
                {content.length > 10000 ? content.slice(0, 10000) + '... (truncated)' : content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const SourceWidgets: React.FC<SourceWidgetsProps> = ({ apiContent, htmlContent, scrapeContent }) => {
  if (!apiContent && !htmlContent && !scrapeContent) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Auxiliary Data Widgets</h3>
      <WidgetItem title="API Data" content={apiContent} icon={FileCode} colorClass="purple" />
      <WidgetItem title="HTML Landing Page" content={htmlContent} icon={Globe} colorClass="orange" isHtml={true} />
      <WidgetItem title="Scrapping Data" content={scrapeContent} icon={FileJson} colorClass="green" />
    </div>
  );
};

export default SourceWidgets;
