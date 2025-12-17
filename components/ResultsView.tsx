import React, { useState, useEffect, useRef } from 'react';
import { ExtractedData, Author, Affiliation, Reference } from '../types';
import { 
  Edit3,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  User,
  MapPin,
  List,
  Hash,
  Type,
  Mail,
  Fingerprint,
  X,
  FileText,
  Keyboard,
  Superscript,
  Subscript,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import VerificationPanel from './VerificationPanel';

interface ResultsViewProps {
  data: ExtractedData;
  onDataUpdate: (newData: ExtractedData) => void;
  onHighlight?: (text: string) => void;
  onFocusField?: (field: string) => void;
  onClose?: () => void;
}

// --- Critical Error Banner ---
const CriticalErrorBanner: React.FC<{ status: string, message: string, onOverride: () => void }> = ({ status, message, onOverride }) => {
    const isCritical = status === 'SUMMARY_MISMATCHED' || status === 'VERSION_MISMATCHED';
    
    if (!isCritical) return null;

    return (
        <div className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-sm flex items-center justify-center p-8 animate-fadeIn">
            <div className="max-w-xl w-full bg-red-950/20 border border-red-500/50 rounded-xl p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-orbitron font-bold text-white mb-2 tracking-wide">PROCESSING HALTED</h2>
                <div className="bg-red-900/40 text-red-200 px-4 py-1 rounded text-xs font-bold font-mono mb-6 border border-red-800">
                    STATUS: {status}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-8">
                    {message}<br/>
                    A critical mismatch was detected between the <strong>PDF, HTML, and Scrape</strong> data sources. 
                    <br/><br/>
                    According to CAR 2.0 protocols, this file <strong>cannot be processed</strong> automatically.
                </p>
                <div className="flex gap-4">
                     <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg font-bold text-xs uppercase transition-all">
                         Return to Queue
                     </button>
                     <button 
                        onClick={onOverride}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white border border-red-400 rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-900/50 transition-all flex items-center gap-2"
                    >
                         <AlertTriangle className="w-4 h-4"/> Manual Override
                     </button>
                </div>
            </div>
        </div>
    );
};


// --- Virtual Keyboard Component ---

const VirtualKeyboard: React.FC<{ 
    isOpen: boolean; 
    onToggle: () => void;
    onInsert: (text: string) => void;
    onWrap: (tag: string) => void;
}> = ({ isOpen, onToggle, onInsert, onWrap }) => {
    const [tab, setTab] = useState<'greek' | 'math' | 'cryptic' | 'diacritics'>('greek');

    const greek = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "Ω", "Δ", "Σ", "Φ", "Ψ", "Γ", "Λ", "Ξ", "Π", "Θ"];
    const math = ["∞", "∂", "∇", "∫", "∬", "∭", "∮", "∑", "∏", "√", "→", "←", "↔", "⇒", "⇐", "⇔", "∀", "∃", "∈", "∉", "⊂", "⊃", "∪", "∩", "≠", "≤", "≥", "±", "×", "÷", "≈", "°"];
    const diacritics = ["à", "á", "â", "ä", "ã", "å", "è", "é", "ê", "ë", "ì", "í", "î", "ï", "ò", "ó", "ô", "ö", "õ", "ù", "ú", "û", "ü", "ñ", "ç", "ß", "ÿ", "ý", "š", "ž", "ğ"];
    const cryptic = ["†", "‡", "§", "¶", "©", "®", "™", "€", "£", "¥", "¢", "♠", "♣", "♥", "♦", "♪", "♫", "★", "☆", "✓", "✗", "♀", "♂", "∞", "∅", "‰", "⌘", "⌥"];

    const getChars = () => {
        switch(tab) {
            case 'greek': return greek;
            case 'math': return math;
            case 'diacritics': return diacritics;
            case 'cryptic': return cryptic;
            default: return greek;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a] border-t border-slate-600 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[100] animate-fadeIn h-48 flex flex-col">
            <div className="flex items-center justify-between px-2 bg-slate-900 border-b border-slate-700 h-10 shrink-0">
                <div className="flex gap-1">
                    {['greek', 'math', 'cryptic', 'diacritics'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTab(t as any)}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-t ${tab === t ? 'bg-[#0f172a] text-blue-400 border-x border-t border-slate-600' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={() => onWrap('sup')} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-white text-xs font-mono" title="Superscript">x<sup>2</sup></button>
                    <button onClick={() => onWrap('sub')} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-white text-xs font-mono" title="Subscript">x<sub>2</sub></button>
                    <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
                    <button onClick={onToggle} className="p-1 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded"><X className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="flex-1 p-2 overflow-y-auto grid grid-cols-12 sm:grid-cols-16 md:grid-cols-20 gap-1 content-start bg-[#0f172a]">
                {getChars().map(char => (
                    <button
                        key={char}
                        onMouseDown={(e) => { e.preventDefault(); onInsert(char); }}
                        className="h-8 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 font-mono text-sm transition-colors shadow-sm"
                    >
                        {char}
                    </button>
                ))}
            </div>
        </div>
    );
};


export const generateXML = (sourceData: ExtractedData) => {
    const timestamp = new Date().toISOString();
    const referencesCount = sourceData.references ? sourceData.references.length : 0;
    
    // Set to track which authors have been processed (via affiliations)
    const processedAuthorIndices = new Set<number>();

    // Author Groups Construction (Linked to Affiliations)
    let authorGroupsXML = '';
    
    if (sourceData.affiliations && sourceData.affiliations.length > 0) {
        authorGroupsXML = sourceData.affiliations.map((aff, affIndex) => {
            // Find authors linked to this affiliation
            const linkedAuthors = sourceData.authors
                .map((a, i) => ({ ...a, originalIndex: i, globalSeq: i + 1 }))
                .filter(a => a.affiliationIndices && a.affiliationIndices.includes(affIndex));
            
            // Mark these authors as processed
            linkedAuthors.forEach(a => processedAuthorIndices.add(a.originalIndex));
            
            // Even if no authors are linked (rare but possible), we might want to output affiliation if it exists. 
            // Standard allows groups.
            if (linkedAuthors.length === 0) return ''; 

            const authorsXml = linkedAuthors.map(author => {
                // Ensure ORCID is clean (no URL)
                const cleanOrcid = author.orcid ? author.orcid.replace(/https?:\/\/orcid\.org\//, '').trim() : '';
                return `
          <author${cleanOrcid ? ` orcid="${cleanOrcid}"` : ''} seq="${author.globalSeq}"${author.isCorresponding ? ' type="corresp"' : ''}>
            <ce:initials>${author.initials || ''}</ce:initials>${author.degree ? `\n            <ce:degrees>${author.degree}</ce:degrees>` : ''}
            <ce:surname>${author.surname || ''}</ce:surname>
            <ce:given-name>${author.firstName || ''}</ce:given-name>${author.suffix ? `\n            <ce:suffix>${author.suffix}</ce:suffix>` : ''}${author.email ? `\n            <ce:e-address>${author.email}</ce:e-address>` : ''}${author.alias ? `\n            <ce:alternative-name>${author.alias}</ce:alternative-name>` : ''}
          </author>`;
            }).join('');

            const orgsXml = aff.organizations && aff.organizations.length > 0 
                ? aff.organizations.map(o => `<organization>${o}</organization>`).join('\n            ')
                : `<organization>${aff.text ? aff.text.split(',')[0] : ''}</organization>`;

            return `
        <author-group seq="${affIndex + 1}">
          ${authorsXml}
          <affiliation>
            ${orgsXml}
            ${aff.addressPart ? `<address-part>${aff.addressPart}</address-part>` : ''}
            ${aff.city ? `<city>${aff.city}</city>` : ''}
            ${aff.state ? `<state>${aff.state}</state>` : ''}
            ${aff.postalCode ? `<postal-code>${aff.postalCode}</postal-code>` : ''}
            ${aff.countryCode ? `<country iso-code="${aff.countryCode}"/>` : (aff.country ? `<country>${aff.country}</country>` : '')}
            <ce:source-text>${aff.text || ''}</ce:source-text>
          </affiliation>
        </author-group>`;
        }).join('');
    }

    // Handle "Orphan" Authors (Authors not linked to any valid affiliation)
    const orphanAuthors = sourceData.authors
        .map((a, i) => ({ ...a, originalIndex: i, globalSeq: i + 1 }))
        .filter(a => !processedAuthorIndices.has(a.originalIndex));

    if (orphanAuthors.length > 0) {
        const orphanXml = orphanAuthors.map(author => {
            const cleanOrcid = author.orcid ? author.orcid.replace(/https?:\/\/orcid\.org\//, '').trim() : '';
            return `
          <author${cleanOrcid ? ` orcid="${cleanOrcid}"` : ''} seq="${author.globalSeq}"${author.isCorresponding ? ' type="corresp"' : ''}>
            <ce:initials>${author.initials || ''}</ce:initials>${author.degree ? `\n            <ce:degrees>${author.degree}</ce:degrees>` : ''}
            <ce:surname>${author.surname || ''}</ce:surname>
            <ce:given-name>${author.firstName || ''}</ce:given-name>${author.suffix ? `\n            <ce:suffix>${author.suffix}</ce:suffix>` : ''}${author.email ? `\n            <ce:e-address>${author.email}</ce:e-address>` : ''}${author.alias ? `\n            <ce:alternative-name>${author.alias}</ce:alternative-name>` : ''}
          </author>`;
        }).join('');
        
        // Add a group for orphans without affiliation details
        authorGroupsXML += `
        <author-group seq="orphan">
          ${orphanXml}
          <affiliation/>
        </author-group>`;
    }

    // References Construction
    const bibliographyXML = sourceData.references && sourceData.references.length > 0 ? `
      <tail>
        <bibliography refcount="${referencesCount}">
          ${sourceData.references.map((ref, i) => {
              const fullTextSafe = ref.fullText ? ref.fullText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
              const sourceTextSafe = ref.text ? ref.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
              return `
          <reference seq="${i + 1}">
            <ref-info/>
            <ref-fulltext>${fullTextSafe}</ref-fulltext>
            <ce:source-text>${sourceTextSafe}</ce:source-text>
          </reference>`;
          }).join('')}
        </bibliography>
      </tail>` : '<tail><bibliography refcount="0"/></tail>';

    return `<?xml version='1.0' encoding='utf-8'?>
<units xmlns="http://www.elsevier.com/xml/ani/ani" xmlns:ce="http://www.elsevier.com/xml/ani/common">
<unit type="ARTICLE">
  <unit-info>
    <unit-id>1</unit-id>
    <order-id>unknown</order-id>
    <parcel-id>none</parcel-id>
    <supplier-id>4</supplier-id>
    <timestamp>${timestamp}</timestamp>
  </unit-info>
  <unit-content>
    <bibrecord>
      <item-info>
        <status state="new"/>
        <itemidlist>
          <itemid idtype="ARXIV">${sourceData.arxivId || 'UNKNOWN'}</itemid>
        </itemidlist>
      </item-info>
      <head>
        <citation-info>
          <citation-type code="ar"/>
          <citation-language xml:lang="ENG"/>
          <abstract-language xml:lang="ENG"/>
          ${sourceData.keywords && sourceData.keywords.length > 0 ? `
          <author-keywords>
            ${sourceData.keywords.map(k => `<author-keyword>${k}</author-keyword>`).join('\n            ')}
          </author-keywords>` : ''}
        </citation-info>
        <citation-title>
          <titletext xml:lang="ENG" original="y">${sourceData.title}</titletext>
        </citation-title>
        ${authorGroupsXML}
        <abstracts>
          <abstract original="y" xml:lang="ENG">
            <ce:para>${sourceData.abstract}</ce:para>
          </abstract>
        </abstracts>
        <source srcid="???"/>
      </head>
      ${bibliographyXML}
    </bibrecord>
  </unit-content>
</unit>
</units>`;
};

const ResultsView: React.FC<ResultsViewProps> = ({ data, onDataUpdate, onHighlight, onFocusField, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<ExtractedData>(data);
  const activeInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const activeFieldRef = useRef<string>(''); // Keep track of which field key is focused
  const activeIndexRef = useRef<number>(-1); // Keep track of array index if applicable
  const [showErrorBanner, setShowErrorBanner] = useState(true);
  
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Section Collapse States
  const [sections, setSections] = useState({
      title: true,
      abstract: true,
      keywords: true,
      authors: true,
      references: true
  });

  const toggleSection = (section: keyof typeof sections) => {
      setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    setEditableData(data);
    // Re-show banner if data changes and status is bad
    if (data.verification.status === 'SUMMARY_MISMATCHED' || data.verification.status === 'VERSION_MISMATCHED') {
        setShowErrorBanner(true);
    }
  }, [data]);

  // Handle Field Interaction (View or Edit mode)
  const handleInteraction = (field: string, index: number = -1) => {
      // Notify parent to scroll XML
      if (onFocusField) onFocusField(field);
  };

  const handleFocus = (field: string, index: number = -1, e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      handleInteraction(field, index);
      activeInputRef.current = e.target;
      activeFieldRef.current = field;
      activeIndexRef.current = index;
  };

  const handleKeyboardInsert = (text: string) => {
      const input = activeInputRef.current;
      if (!input) return;

      const start = input.selectionStart;
      const end = input.selectionEnd;
      const val = input.value;
      const newValue = val.substring(0, start) + text + val.substring(end);
      
      // Update State based on active field logic
      updateFieldState(activeFieldRef.current, activeIndexRef.current, newValue);
      
      // Restore cursor
      setTimeout(() => {
          input.value = newValue; // Visual update for React controlled inputs glitch
          input.focus();
          input.setSelectionRange(start + text.length, start + text.length);
      }, 0);
  };

  const handleKeyboardWrap = (tag: string) => {
      const input = activeInputRef.current;
      if (!input) return;

      const start = input.selectionStart;
      const end = input.selectionEnd;
      const val = input.value;
      const selected = val.substring(start, end);
      const insertion = `<${tag}>${selected}</${tag}>`;
      const newValue = val.substring(0, start) + insertion + val.substring(end);

      updateFieldState(activeFieldRef.current, activeIndexRef.current, newValue);

       setTimeout(() => {
          input.value = newValue;
          input.focus();
          input.setSelectionRange(start + insertion.length, start + insertion.length);
      }, 0);
  };

  const updateFieldState = (field: string, index: number, value: string) => {
      if (field === 'title') setEditableData(prev => ({ ...prev, title: value }));
      else if (field === 'abstract') setEditableData(prev => ({ ...prev, abstract: value }));
      else if (field === 'keyword') {
          const newK = [...(editableData.keywords || [])];
          newK[index] = value;
          setEditableData(prev => ({ ...prev, keywords: newK }));
      }
      else if (field.startsWith('author-')) {
          const key = field.replace('author-', '') as keyof Author;
          const newAuthors = [...editableData.authors];
          if(newAuthors[index]) {
             newAuthors[index] = { ...newAuthors[index], [key]: value };
             setEditableData(prev => ({ ...prev, authors: newAuthors }));
          }
      }
      else if (field.startsWith('aff-')) {
          const key = field.replace('aff-', '') as keyof Affiliation;
          const newAffs = [...editableData.affiliations];
          if(newAffs[index]) {
             if(key === 'organizations' as any) return; 
             newAffs[index] = { ...newAffs[index], [key]: value };
             setEditableData(prev => ({ ...prev, affiliations: newAffs }));
          }
      }
      else if (field === 'reference') {
           // We are editing 'fullText' in the simple view
           const newRefs = [...(editableData.references || [])];
           newRefs[index] = { ...newRefs[index], fullText: value };
           setEditableData(prev => ({ ...prev, references: newRefs }));
      }
  };


  const updateAuthor = (index: number, field: keyof Author, value: any) => {
      const newAuthors = [...editableData.authors];
      newAuthors[index] = { ...newAuthors[index], [field]: value };
      setEditableData({ ...editableData, authors: newAuthors });
  };

  const updateAffiliation = (index: number, field: keyof Affiliation, value: any) => {
      const newAffs = [...editableData.affiliations];
      newAffs[index] = { ...newAffs[index], [field]: value };
      setEditableData({ ...editableData, affiliations: newAffs });
  };

  const updateKeyword = (index: number, value: string) => {
      const newKeywords = [...(editableData.keywords || [])];
      newKeywords[index] = value;
      setEditableData({ ...editableData, keywords: newKeywords });
  };

  const addKeyword = () => {
      setEditableData({ ...editableData, keywords: [...(editableData.keywords || []), "New Keyword"] });
  };

  const removeKeyword = (index: number) => {
      const newKeywords = editableData.keywords.filter((_, i) => i !== index);
      setEditableData({ ...editableData, keywords: newKeywords });
  };

  const updateReference = (index: number, value: string) => {
      const newRefs = [...(editableData.references || [])];
      newRefs[index] = { ...newRefs[index], fullText: value };
      setEditableData({ ...editableData, references: newRefs });
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] overflow-hidden relative pb-10">
      
      {/* Error Blocking Layer */}
      {showErrorBanner && (
        <CriticalErrorBanner 
            status={data.verification.status} 
            message={data.verification.message} 
            onOverride={() => setShowErrorBanner(false)} 
        />
      )}

      {/* Virtual Keyboard */}
      <VirtualKeyboard 
        isOpen={showKeyboard} 
        onToggle={() => setShowKeyboard(!showKeyboard)} 
        onInsert={handleKeyboardInsert}
        onWrap={handleKeyboardWrap}
      />

      {/* Toolbar */}
      <div className="p-3 border-b border-slate-800 bg-[#050505] flex justify-between items-center sticky top-0 z-20 shrink-0 shadow-lg">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Edit3 className="w-3 h-3" /> Extraction Editor
        </h2>
        
        <div className="flex items-center gap-2">
            
            {/* Keyboard Toggle */}
            {isEditing && (
                <button 
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className={`flex items-center px-2 py-1.5 rounded text-xs font-bold transition-colors mr-2 ${showKeyboard ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-blue-400'}`}
                    title="Toggle Symbols Keyboard"
                >
                    <Keyboard className="w-3 h-3 mr-1" /> Symbols
                </button>
            )}

            <div className="flex space-x-2 animate-fadeIn">
                {!isEditing && (
                <button 
                    onClick={() => { setIsEditing(true); setShowKeyboard(true); }}
                    className="flex items-center px-3 py-1.5 bg-slate-800 text-cyan-400 border border-slate-700 rounded hover:bg-slate-700 text-xs font-bold transition-colors shadow-sm"
                >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit Data
                </button>
                )}
                {isEditing && (
                <>
                    <button 
                        onClick={() => { onDataUpdate(editableData); setIsEditing(false); setShowKeyboard(false); }}
                        className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded shadow hover:bg-green-500 text-xs font-bold transition-colors"
                    >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                    </button>
                    <button 
                        onClick={() => { setEditableData(data); setIsEditing(false); setShowKeyboard(false); }}
                        className="flex items-center px-3 py-1.5 bg-slate-700 text-slate-300 rounded shadow hover:bg-slate-600 text-xs font-bold transition-colors"
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Cancel
                    </button>
                </>
                )}
            </div>
            {onClose && (
                <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded-lg transition-colors ml-2"
                >
                    <X className="w-4 h-4"/>
                </button>
            )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-grow overflow-y-auto custom-scrollbar bg-[#020617] p-2 ${showKeyboard ? 'mb-48' : ''}`}>
          <div className="space-y-4 pb-10 min-h-full max-w-3xl mx-auto">
            
            {/* Verification Block */}
            <VerificationPanel result={data.verification} arxivId={data.arxivId} />

            {/* Title Block */}
            <div className="border border-slate-800 bg-[#0a0a0a] rounded-lg overflow-hidden">
                <div 
                    className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors select-none group border-b border-slate-800/50"
                    onClick={() => toggleSection('title')}
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded transition-colors ${sections.title ? 'text-cyan-400' : 'text-slate-500'}`}>
                             {sections.title ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <FileText className="w-3 h-3 text-cyan-500"/> Title
                        </h3>
                    </div>
                </div>
                
                {sections.title && (
                    <div className="p-4 bg-[#050505]" onClick={() => !isEditing && handleInteraction('title')}>
                        {isEditing ? (
                            <textarea 
                                className="w-full p-3 bg-[#0f172a] border border-cyan-800/50 rounded-lg font-mono text-sm text-cyan-50 leading-relaxed focus:ring-1 focus:ring-cyan-500 outline-none min-h-[80px]"
                                value={editableData.title}
                                onFocus={(e) => handleFocus('title', -1, e)}
                                onChange={(e) => setEditableData({...editableData, title: e.target.value})}
                            />
                        ) : (
                            <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-lg font-mono text-sm text-slate-200 leading-relaxed hover:border-blue-500/30 transition-colors cursor-text" dangerouslySetInnerHTML={{__html: editableData.title}} />
                        )}
                    </div>
                )}
            </div>

            {/* Abstract Block */}
            <div className="border border-slate-800 bg-[#0a0a0a] rounded-lg overflow-hidden">
                <div 
                    className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors select-none group border-b border-slate-800/50"
                    onClick={() => toggleSection('abstract')}
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded transition-colors ${sections.abstract ? 'text-cyan-400' : 'text-slate-500'}`}>
                             {sections.abstract ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <Type className="w-3 h-3 text-cyan-500"/> Abstract
                        </h3>
                    </div>
                </div>
                
                {sections.abstract && (
                    <div className="p-4 bg-[#050505]" onClick={() => !isEditing && handleInteraction('abstract')}>
                        {isEditing ? (
                            <textarea 
                                className="w-full p-3 bg-[#0f172a] border border-cyan-800/50 rounded-lg font-mono text-xs text-cyan-50 leading-relaxed focus:ring-1 focus:ring-cyan-500 outline-none h-64 custom-scrollbar"
                                value={editableData.abstract}
                                onFocus={(e) => handleFocus('abstract', -1, e)}
                                onChange={(e) => setEditableData({...editableData, abstract: e.target.value})}
                            />
                        ) : (
                            <div 
                                className="p-3 bg-[#0f172a] border border-slate-800 rounded-lg font-mono text-xs text-slate-200 leading-relaxed h-64 overflow-y-auto custom-scrollbar text-justify hover:border-blue-500/30 transition-colors cursor-text"
                                dangerouslySetInnerHTML={{__html: editableData.abstract}}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Keywords Block */}
            <div className="border border-slate-800 bg-[#0a0a0a] rounded-lg overflow-hidden">
                <div 
                    className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors select-none group border-b border-slate-800/50"
                    onClick={() => toggleSection('keywords')}
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded transition-colors ${sections.keywords ? 'text-cyan-400' : 'text-slate-500'}`}>
                             {sections.keywords ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <Hash className="w-3 h-3 text-cyan-500"/> Keywords
                        </h3>
                    </div>
                    {isEditing && (
                        <button onClick={(e) => { e.stopPropagation(); addKeyword(); }} className="text-[10px] bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-500">
                            + Add
                        </button>
                    )}
                </div>
                
                {sections.keywords && (
                    <div className="p-4 bg-[#050505] flex flex-wrap gap-2">
                         {editableData.keywords?.map((k, i) => (
                             isEditing ? (
                                <div key={i} className="flex items-center gap-1 bg-[#0f172a] border border-cyan-900 rounded-md px-2 py-1">
                                    <input 
                                        value={k}
                                        onFocus={(e) => handleFocus('keyword', i, e)}
                                        onChange={(e) => updateKeyword(i, e.target.value)}
                                        className="bg-transparent border-none outline-none text-xs text-cyan-100 font-mono w-32"
                                    />
                                    <button onClick={() => removeKeyword(i)} className="text-red-400 hover:text-red-300"><Edit3 className="w-3 h-3"/></button>
                                </div>
                             ) : (
                                <span key={i} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 font-mono">
                                    {k}
                                </span>
                             )
                         ))}
                         {(!editableData.keywords || editableData.keywords.length === 0) && <span className="text-xs text-slate-600 italic">No keywords found.</span>}
                    </div>
                )}
            </div>

            {/* Authors & Affiliations Block */}
            <div className="border border-slate-800 bg-[#0a0a0a] rounded-lg overflow-hidden">
                 <div 
                    className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors select-none group border-b border-slate-800/50"
                    onClick={() => toggleSection('authors')}
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded transition-colors ${sections.authors ? 'text-cyan-400' : 'text-slate-500'}`}>
                             {sections.authors ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <User className="w-3 h-3 text-cyan-500"/> Authors & Affiliations
                        </h3>
                    </div>
                </div>

                {sections.authors && (
                    <div className="p-4 bg-[#050505]" onClick={() => !isEditing && handleInteraction('authors')}>
                        {/* Authors List */}
                        <div className="space-y-4 mb-6">
                            {editableData.authors.map((author, idx) => (
                                <div key={idx} className="p-3 bg-[#0f172a] rounded-lg border border-slate-800 relative hover:border-slate-700 transition-colors">
                                    <div className="absolute top-3 left-3 text-[10px] text-slate-500 font-mono">#{idx + 1}</div>
                                    <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        
                                        {/* Names */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-slate-500">Surname</label>
                                            {isEditing ? (
                                                <input 
                                                    value={author.surname} 
                                                    onFocus={(e) => handleFocus('author-surname', idx, e)}
                                                    onChange={e => updateAuthor(idx, 'surname', e.target.value)} 
                                                    className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                />
                                            ) : (
                                                <div className="text-sm font-bold text-slate-200">{author.surname}</div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-slate-500">Given Name</label>
                                            {isEditing ? (
                                                <input 
                                                    value={author.firstName} 
                                                    onFocus={(e) => handleFocus('author-firstName', idx, e)}
                                                    onChange={e => updateAuthor(idx, 'firstName', e.target.value)} 
                                                    className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                />
                                            ) : (
                                                <div className="text-sm text-slate-300">{author.firstName}</div>
                                            )}
                                        </div>

                                        {/* Degrees & Suffixes */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-slate-500">Degrees</label>
                                            {isEditing ? (
                                                <input value={author.degree || ''} onChange={e => updateAuthor(idx, 'degree', e.target.value)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" placeholder="PhD, MSc"/>
                                            ) : (
                                                <div className="text-xs text-slate-400">{author.degree || '-'}</div>
                                            )}
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-slate-500">Suffix</label>
                                            {isEditing ? (
                                                <input value={author.suffix || ''} onChange={e => updateAuthor(idx, 'suffix', e.target.value)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" placeholder="Jr, III"/>
                                            ) : (
                                                <div className="text-xs text-slate-400">{author.suffix || '-'}</div>
                                            )}
                                        </div>
                                         <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] uppercase font-bold text-slate-500">Alias/Alt Name</label>
                                            {isEditing ? (
                                                <input value={author.alias || ''} onChange={e => updateAuthor(idx, 'alias', e.target.value)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white" placeholder="Native name, nickname"/>
                                            ) : (
                                                <div className="text-xs text-slate-400 font-mono">{author.alias || '-'}</div>
                                            )}
                                        </div>


                                        {/* Email & ORCID */}
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</label>
                                            {isEditing ? (
                                                <input value={author.email || ''} onChange={e => updateAuthor(idx, 'email', e.target.value)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono" placeholder="Email Address"/>
                                            ) : (
                                                <div className="text-xs text-cyan-400 font-mono truncate">{author.email || '-'}</div>
                                            )}
                                        </div>
                                        
                                        {/* Only show ORCID field if available or editing */}
                                        {(isEditing || author.orcid) && (
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1"><Fingerprint className="w-3 h-3"/> ORCID</label>
                                                {isEditing ? (
                                                    <input value={author.orcid || ''} onChange={e => updateAuthor(idx, 'orcid', e.target.value)} className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-green-300 font-mono" placeholder="0000-0000-0000-0000"/>
                                                ) : (
                                                    <div className="text-xs text-green-400 font-mono truncate">{author.orcid}</div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Checkboxes */}
                                        <div className="md:col-span-2 flex items-center gap-4 mt-1">
                                             <label className="flex items-center gap-2 cursor-pointer">
                                                 <input 
                                                    type="checkbox" 
                                                    checked={!!author.isCorresponding} 
                                                    disabled={!isEditing}
                                                    onChange={e => updateAuthor(idx, 'isCorresponding', e.target.checked)}
                                                    className="w-3 h-3 accent-cyan-500"
                                                />
                                                 <span className={`text-[10px] font-bold uppercase ${author.isCorresponding ? 'text-cyan-400' : 'text-slate-600'}`}>Corresponding Author</span>
                                             </label>
                                             {/* Affiliation Indices */}
                                             <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                                 <MapPin className="w-3 h-3"/>
                                                 Affiliations: [{author.affiliationIndices.join(', ')}]
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Affiliations Detail List */}
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                             <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Affiliation Breakdown</h4>
                             {editableData.affiliations.map((aff, i) => (
                                 <div key={i} className="bg-[#0f172a] border border-slate-800 rounded p-3 text-xs">
                                     <div className="flex items-center gap-2 mb-2">
                                         <span className="text-slate-500 font-mono font-bold">[{i}]</span>
                                         {/* Clear display as Org - City */}
                                         <span className="text-slate-300 font-bold flex-1 truncate">
                                             {aff.organizations.join(', ')} {aff.city ? ` - ${aff.city}` : ''}
                                         </span>
                                     </div>
                                     {/* Broken Down Fields */}
                                     <div className="grid grid-cols-2 gap-2 pl-6">
                                         <div>
                                            <label className="text-[9px] text-slate-500 uppercase block">Organization</label>
                                            {isEditing ? (
                                                <input 
                                                    value={aff.organizations?.join('; ') || ''} 
                                                    onFocus={(e) => handleFocus('aff-organizations', i, e)}
                                                    onChange={e => updateAffiliation(i, 'organizations', e.target.value.split('; '))}
                                                    className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                                />
                                            ) : (
                                                <div className="text-slate-200">{aff.organizations?.join(', ')}</div>
                                            )}
                                         </div>
                                         <div>
                                            <label className="text-[9px] text-slate-500 uppercase block">Country Code</label>
                                            {isEditing ? (
                                                <input 
                                                    value={aff.countryCode || ''} 
                                                    onFocus={(e) => handleFocus('aff-countryCode', i, e)}
                                                    onChange={e => updateAffiliation(i, 'countryCode', e.target.value)}
                                                    className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono uppercase" maxLength={3}
                                                />
                                            ) : (
                                                <div className="text-cyan-400 font-mono">{aff.countryCode}</div>
                                            )}
                                         </div>
                                         <div className="col-span-2">
                                            <label className="text-[9px] text-slate-500 uppercase block">Address / City / State / Zip</label>
                                            <div className="flex gap-1">
                                                {isEditing ? (
                                                    <>
                                                    <input value={aff.addressPart || ''} onFocus={(e) => handleFocus('aff-addressPart', i, e)} onChange={e => updateAffiliation(i, 'addressPart', e.target.value)} className="flex-1 bg-black border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Street"/>
                                                    <input value={aff.city || ''} onFocus={(e) => handleFocus('aff-city', i, e)} onChange={e => updateAffiliation(i, 'city', e.target.value)} className="flex-1 bg-black border border-slate-700 rounded px-2 py-1 text-xs" placeholder="City"/>
                                                    <input value={aff.state || ''} onFocus={(e) => handleFocus('aff-state', i, e)} onChange={e => updateAffiliation(i, 'state', e.target.value)} className="w-16 bg-black border border-slate-700 rounded px-2 py-1 text-xs" placeholder="State"/>
                                                    <input value={aff.postalCode || ''} onFocus={(e) => handleFocus('aff-postalCode', i, e)} onChange={e => updateAffiliation(i, 'postalCode', e.target.value)} className="w-20 bg-black border border-slate-700 rounded px-2 py-1 text-xs" placeholder="Zip"/>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-400">
                                                        {[aff.addressPart, aff.city, aff.state, aff.postalCode].filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>

            {/* References Block */}
            <div className="border border-slate-800 bg-[#0a0a0a] rounded-lg overflow-hidden">
                <div 
                    className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors select-none group border-b border-slate-800/50"
                    onClick={() => toggleSection('references')}
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded transition-colors ${sections.references ? 'text-cyan-400' : 'text-slate-500'}`}>
                             {sections.references ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                        </div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <List className="w-3 h-3 text-cyan-500"/> References ({editableData.references?.length || 0})
                        </h3>
                    </div>
                </div>
                
                {sections.references && (
                    <div className="p-4 bg-[#050505] space-y-2">
                         {editableData.references?.map((ref, i) => (
                             <div key={i} className="flex gap-2 items-start">
                                 <span className="text-[10px] text-slate-500 font-mono mt-1 w-6 text-right">{i+1}.</span>
                                 {isEditing ? (
                                     <textarea 
                                        value={ref.fullText}
                                        onFocus={(e) => handleFocus('reference', i, e)}
                                        onChange={e => updateReference(i, e.target.value)}
                                        className="flex-1 bg-[#0f172a] border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 min-h-[60px] leading-relaxed focus:border-cyan-500/50 outline-none"
                                        placeholder="Full Reference Text"
                                     />
                                 ) : (
                                     <div className="flex-1 text-xs text-slate-300 leading-relaxed bg-[#0f172a] px-3 py-2 rounded border border-transparent hover:border-slate-800 transition-colors">
                                         {ref.fullText}
                                     </div>
                                 )}
                             </div>
                         ))}
                    </div>
                )}
            </div>

          </div>
      </div>
    </div>
  );
};

export default ResultsView;