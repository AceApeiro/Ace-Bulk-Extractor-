
import React, { useState, useEffect } from 'react';
import { ExtractedData, Author, Affiliation } from '../types';
import { 
  User, 
  FileText, 
  List, 
  Download,
  Star,
  Edit3,
  Check,
  RotateCcw,
  Tag,
  Building2,
  Eye,
  Code,
  Columns
} from 'lucide-react';

interface ResultsViewProps {
  data: ExtractedData;
  onDataUpdate: (newData: ExtractedData) => void;
  onHighlight?: (text: string) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ data, onDataUpdate, onHighlight }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'xml' | 'split'>('visual');
  const [isEditing, setIsEditing] = useState(false);
  const [isXmlEditing, setIsXmlEditing] = useState(false);
  const [xmlContent, setXmlContent] = useState('');
  const [editableData, setEditableData] = useState<ExtractedData>(data);

  useEffect(() => {
    setEditableData(data);
  }, [data]);

  // Handle highlighting safely
  const handleHighlight = (text: string | undefined | null) => {
    if (text && onHighlight && !isEditing) {
      onHighlight(text);
    }
  };

  // Function to generate Elsevier-style CAR 2.0 XML
  const generateXML = (sourceData: ExtractedData) => {
    const timestamp = new Date().toISOString();
    
    // Helper to filter empty lines and join
    const cleanJoin = (lines: (string | null | undefined | false)[], separator = '\n') => {
        return lines.filter(line => line !== null && line !== undefined && line !== false && line.trim() !== '').join(separator);
    };

    // Helper to construct XML block
    const buildBlock = (tag: string, content: string | null | undefined, indent = '') => {
        if (!content) return null;
        return `${indent}<${tag}>${content}</${tag}>`;
    };
    
    // --- Author Groups ---
    let authorGroupsXML = '';
    if (sourceData.affiliations && sourceData.affiliations.length > 0) {
        authorGroupsXML = sourceData.affiliations.map((aff, affIndex) => {
            const linkedAuthors = sourceData.authors
                .map((a, i) => ({ ...a, globalSeq: i + 1 }))
                .filter(a => a.affiliationIndices && a.affiliationIndices.includes(affIndex));
            
            if (linkedAuthors.length === 0) return null; 

            const authorsXml = linkedAuthors.map(author => {
              const correspAttr = author.isCorresponding ? ' type="corresp"' : '';
              const orcidAttr = author.orcid ? ` orcid="${author.orcid}"` : '';
              
              const innerParts = cleanJoin([
                buildBlock('ce:initials', author.initials, '              '),
                buildBlock('ce:surname', author.surname, '              '),
                buildBlock('ce:given-name', author.firstName, '              '),
                buildBlock('ce:suffix', author.suffix, '              '),
                buildBlock('ce:degrees', author.degree, '              '),
                buildBlock('ce:e-address', author.email, '              ')
              ]);

              return `            <author seq="${author.globalSeq}"${orcidAttr}${correspAttr}>\n${innerParts}\n            </author>`;
            }).join('\n');

            const orgsXml = aff.organizations && aff.organizations.length > 0 
                ? aff.organizations.map(o => `              <organization>${o}</organization>`).join('\n')
                : `              <organization>${aff.text ? aff.text.split(',')[0] : ''}</organization>`;

            const affParts = cleanJoin([
                buildBlock('address-part', aff.addressPart, '              '),
                buildBlock('city', aff.city, '              '),
                buildBlock('state', aff.state, '              '),
                buildBlock('postal-code', aff.postalCode, '              '),
                aff.countryCode 
                    ? `              <country iso-code="${aff.countryCode}"/>` 
                    : buildBlock('country', aff.country, '              '),
                buildBlock('ce:source-text', aff.text, '              ')
            ]);

            return `          <author-group seq="${affIndex + 1}">
${authorsXml}
            <affiliation>
${orgsXml}
${affParts}
            </affiliation>
          </author-group>`;
        }).filter(Boolean).join('\n');
    }

    // --- Correspondence ---
    let correspondenceXML = '';
    const correspAuthors = sourceData.authors.filter(a => a.isCorresponding);
    if (correspAuthors.length > 0) {
        correspondenceXML = correspAuthors.map(author => {
             const personXML = cleanJoin([
                buildBlock('ce:initials', author.initials, '              '),
                buildBlock('ce:surname', author.surname, '              '),
                buildBlock('ce:given-name', author.firstName, '              '),
                buildBlock('ce:suffix', author.suffix, '              ')
             ]);

             let affXML = '';
             if (author.affiliationIndices && author.affiliationIndices.length > 0) {
                 const aff = sourceData.affiliations[author.affiliationIndices[0]];
                 if (aff) {
                    const orgsXml = aff.organizations && aff.organizations.length > 0 
                        ? aff.organizations.map(o => `              <organization>${o}</organization>`).join('\n')
                        : `              <organization>${aff.text ? aff.text.split(',')[0] : ''}</organization>`;
                    
                    const affParts = cleanJoin([
                        buildBlock('address-part', aff.addressPart, '              '),
                        buildBlock('city', aff.city, '              '),
                        buildBlock('state', aff.state, '              '),
                        buildBlock('postal-code', aff.postalCode, '              '),
                        aff.countryCode 
                            ? `              <country iso-code="${aff.countryCode}"/>` 
                            : buildBlock('country', aff.country, '              ')
                    ]);
                    
                    affXML = `            <affiliation>\n${orgsXml}\n${affParts}\n            </affiliation>`;
                 }
             }

             return `          <correspondence>
            <person>
${personXML}
            </person>
${affXML}
            ${buildBlock('ce:e-address', author.email, '            ')}
          </correspondence>`;
        }).join('\n');
    }

    const keywordsXML = sourceData.keywords && sourceData.keywords.length > 0 ? `
            <author-keywords>
${sourceData.keywords.map(k => `              <author-keyword>${k}</author-keyword>`).join('\n')}
            </author-keywords>` : '';

    const referencesXML = sourceData.references.map((ref, i) => `            <reference seq="${i + 1}">
              <ref-info/>
              <ref-fulltext>${ref}</ref-fulltext>
              <ce:source-text>${ref}</ce:source-text>
            </reference>`).join('\n');

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
            <abstract-language xml:lang="ENG"/>${keywordsXML}
          </citation-info>
          <citation-title>
            <titletext xml:lang="ENG" original="y">${sourceData.title}</titletext>
          </citation-title>
${authorGroupsXML}
${correspondenceXML}
          <abstracts>
            <abstract original="y" xml:lang="ENG">
              <ce:para>${sourceData.abstract}</ce:para>
            </abstract>
          </abstracts>
          <source srcid="???"/>
        </head>
        <tail>
          <bibliography refcount="${sourceData.references.length}">
${referencesXML}
          </bibliography>
        </tail>
      </bibrecord>
    </unit-content>
  </unit>
</units>`.trim();
  };

  useEffect(() => {
    if (editableData) {
        if (!isXmlEditing) {
           setXmlContent(generateXML(editableData));
        }
    }
  }, [editableData, isXmlEditing]);

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ACE_${editableData.arxivId || 'export'}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSaveEdits = () => {
    onDataUpdate(editableData);
    setIsEditing(false);
  };

  const handleCancelEdits = () => {
    setEditableData(data);
    setIsEditing(false);
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

  const updateReference = (index: number, value: string) => {
    const newRefs = [...editableData.references];
    newRefs[index] = value;
    setEditableData({ ...editableData, references: newRefs });
  };

  const Highlightable = ({ children, text, className = "" }: { children?: React.ReactNode, text: string | undefined | null, className?: string }) => (
    <div 
        onClick={() => handleHighlight(text)}
        className={`${!isEditing ? 'cursor-pointer hover:bg-yellow-50 hover:ring-2 hover:ring-yellow-200 rounded transition-all duration-200' : ''} ${className}`}
        title={!isEditing ? "Click to find in Source Document" : ""}
    >
        {children}
    </div>
  );

  const Label = ({ children }: {children?: React.ReactNode}) => (
      <span className="text-[9px] font-mono text-blue-500/70 mr-2 select-none">&lt;{children}&gt;</span>
  );

  const VisualEditorContent = () => (
      <div className="space-y-8 animate-fadeIn relative pb-10">
        <div className="absolute top-0 right-0 flex space-x-2 z-10">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded shadow-sm hover:bg-blue-100 text-xs font-medium"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit Content
            </button>
          ) : (
            <>
               <button 
                onClick={handleSaveEdits}
                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded shadow hover:bg-green-700 text-xs font-medium"
               >
                 <Check className="w-3 h-3 mr-1" />
                 Save
               </button>
               <button 
                onClick={handleCancelEdits}
                className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded shadow hover:bg-slate-50 text-xs font-medium"
               >
                 <RotateCcw className="w-3 h-3 mr-1" />
                 Cancel
               </button>
            </>
          )}
        </div>

        {/* Title & Keywords */}
        <div>
          {isEditing ? (
            <div className="mb-4 bg-white p-4 rounded-lg border border-slate-300 shadow-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Title</label>
              <input 
                className="w-full text-lg font-bold text-slate-900 border border-slate-400 rounded p-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none bg-white mb-4"
                value={editableData.title}
                onChange={(e) => setEditableData({...editableData, title: e.target.value})}
              />
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Keywords</label>
              <input 
                className="w-full text-sm border border-slate-400 rounded p-2 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-200 outline-none"
                value={editableData.keywords.join(', ')}
                onChange={(e) => setEditableData({...editableData, keywords: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
              />
            </div>
          ) : (
            <>
               <Highlightable text={editableData.title} className="mb-3 pr-20 p-2 -ml-2">
                   <div className="mb-1"><Label>titletext</Label></div>
                   <h2 className="text-xl font-bold text-slate-900 leading-tight">{editableData.title}</h2>
               </Highlightable>
               <div className="flex flex-wrap gap-2 mb-6 pl-2">
                 <Label>author-keywords</Label>
                 {editableData.keywords?.map((kw, i) => (
                   <span key={i} onClick={() => handleHighlight(kw)} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 flex items-center cursor-pointer hover:bg-yellow-50 hover:border-yellow-300">
                     <Tag className="w-3 h-3 mr-1 opacity-50"/> {kw}
                   </span>
                 ))}
               </div>
            </>
          )}
        </div>

        {/* Authors & Affiliations Linking */}
        <div className="grid grid-cols-1 gap-6">
            
            {/* Authors List */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><User className="w-3 h-3 mr-1"/> Author Group</h3>
                </div>
                {editableData.authors.map((author, idx) => (
                    <div key={idx} className={`flex flex-col p-3 rounded-lg border transition-all ${author.isCorresponding ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                        {isEditing ? (
                            <div className="space-y-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">First Name</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={author.firstName} onChange={e => updateAuthor(idx, 'firstName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Surname</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 font-semibold focus:border-blue-500 outline-none" value={author.surname} onChange={e => updateAuthor(idx, 'surname', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Initials</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={author.initials} onChange={e => updateAuthor(idx, 'initials', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Suffix</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={author.suffix || ''} onChange={e => updateAuthor(idx, 'suffix', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Affil IDs</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={author.affiliationIndices.join(',')} onChange={e => updateAuthor(idx, 'affiliationIndices', e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Email</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={author.email || ''} onChange={e => updateAuthor(idx, 'email', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">ORCID</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={author.orcid || ''} onChange={e => updateAuthor(idx, 'orcid', e.target.value)} placeholder="0000-0000-0000-0000"/>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Highlightable text={`${author.firstName} ${author.surname}`} className="p-1 -m-1">
                                <div className="flex items-baseline mb-1">
                                    <Label>author</Label>
                                    {author.isCorresponding && <Star className="w-3 h-3 text-blue-500 fill-blue-500 mr-1"/>}
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                                    <div className="text-right text-slate-400 text-xs">ce:surname</div>
                                    <div className="font-bold text-slate-900">{author.surname}</div>
                                    
                                    <div className="text-right text-slate-400 text-xs">ce:given-name</div>
                                    <div className="text-slate-800">{author.firstName}</div>
                                    
                                    <div className="text-right text-slate-400 text-xs">ce:initials</div>
                                    <div className="text-slate-800">{author.initials}</div>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1 ml-[104px]">
                                    {author.affiliationIndices.map(ai => (
                                        <span key={ai} className="inline-flex items-center text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                                            ref: aff{ai + 1}
                                        </span>
                                    ))}
                                    {author.email && <div className="w-full text-[10px] text-blue-700 font-medium"><span className="text-slate-400 mr-1">e-address:</span>{author.email}</div>}
                                    {author.orcid && <div className="w-full text-[10px] text-purple-700 font-medium"><span className="text-slate-400 mr-1">ORCID:</span>{author.orcid}</div>}
                                </div>
                            </Highlightable>
                        )}
                    </div>
                ))}
            </div>

            {/* Affiliations List */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center"><Building2 className="w-3 h-3 mr-1"/> Affiliations</h3>
                 {editableData.affiliations.map((aff, idx) => (
                     <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg text-sm relative group">
                         <span className="absolute top-2 right-2 text-[10px] font-mono bg-slate-100 px-1.5 rounded text-slate-500">#{idx + 1}</span>
                         {isEditing ? (
                              <div className="space-y-3 pr-6">
                                  <div className="grid grid-cols-2 gap-3">
                                     <div className="col-span-2">
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">Organizations</label>
                                        <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={aff.organizations.join(', ')} onChange={e => updateAffiliation(idx, 'organizations', e.target.value.split(',').map((s: string) => s.trim()))} />
                                     </div>
                                     {['addressPart', 'city', 'state', 'postalCode', 'countryCode'].map((field) => (
                                         <div key={field}>
                                             <label className="text-[10px] uppercase text-slate-500 font-bold">{field}</label>
                                             <input className="w-full text-sm p-2 border border-slate-400 rounded bg-white text-slate-900 focus:border-blue-500 outline-none" value={(aff as any)[field] || ''} onChange={e => updateAffiliation(idx, field as keyof Affiliation, e.target.value)} />
                                         </div>
                                     ))}
                                 </div>
                              </div>
                         ) : (
                             <Highlightable text={aff.text} className="pr-8 -m-1 p-1">
                                 <div className="mb-1"><Label>affiliation</Label></div>
                                 <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                                     <div className="text-right text-slate-400 text-xs">organization</div>
                                     <div className="font-bold text-slate-800">{aff.organizations.join(', ')}</div>
                                     
                                     {aff.addressPart && <>
                                        <div className="text-right text-slate-400 text-xs">address-part</div>
                                        <div className="text-slate-600">{aff.addressPart}</div>
                                     </>}
                                     
                                     {aff.city && <>
                                        <div className="text-right text-slate-400 text-xs">city</div>
                                        <div className="text-slate-600">{aff.city}</div>
                                     </>}

                                     {aff.state && <>
                                        <div className="text-right text-slate-400 text-xs">state</div>
                                        <div className="text-slate-600">{aff.state}</div>
                                     </>}
                                     
                                     {aff.postalCode && <>
                                        <div className="text-right text-slate-400 text-xs">postal-code</div>
                                        <div className="text-slate-600 bg-yellow-50 px-1 rounded inline-block w-fit">{aff.postalCode}</div>
                                     </>}

                                     {aff.countryCode && <>
                                        <div className="text-right text-slate-400 text-xs">country</div>
                                        <div className="text-slate-600">{aff.country || aff.countryCode} <span className="text-[9px] bg-slate-200 px-1 rounded ml-1">ISO: {aff.countryCode}</span></div>
                                     </>}
                                 </div>
                                 <div className="text-[10px] text-slate-400 mt-2 italic border-t border-slate-100 pt-1 truncate">
                                     <span className="font-mono not-italic mr-2">&lt;ce:source-text&gt;</span>{aff.text}
                                 </div>
                             </Highlightable>
                         )}
                     </div>
                 ))}
            </div>

        </div>

        {/* Abstract */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-6">
          <div className="flex items-center text-slate-800 font-semibold mb-3 text-sm">
            <Label>abstract</Label>
          </div>
          {isEditing ? (
            <textarea 
              className="w-full h-40 p-3 border border-slate-300 rounded text-sm text-slate-900 leading-relaxed font-mono bg-white focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
              value={editableData.abstract}
              onChange={(e) => setEditableData({...editableData, abstract: e.target.value})}
            />
          ) : (
            <Highlightable text={editableData.abstract} className="p-2 -m-2">
                <p className="text-sm text-slate-700 leading-relaxed text-justify font-medium">
                {editableData.abstract}
                </p>
            </Highlightable>
          )}
        </div>

        {/* References */}
        <div className="pb-12">
           <div className="flex items-center justify-between text-slate-800 font-semibold mb-3 mt-6">
             <div className="flex items-center text-sm">
                <Label>bibliography</Label> <span className="text-slate-400 text-xs">({editableData.references.length} refs)</span>
             </div>
          </div>
          <div className="space-y-2 pl-1">
            {editableData.references.map((ref, idx) => (
              <div key={idx} className="flex items-start text-xs text-slate-600 hover:bg-slate-50 p-1 rounded">
                <span className="mr-2 min-w-[24px] text-slate-400 font-mono select-none">[{idx + 1}]</span>
                {isEditing ? (
                   <textarea 
                      className="flex-1 border border-slate-300 rounded p-2 text-xs h-auto rows-2 bg-white text-slate-900 shadow-sm" 
                      value={ref} 
                      onChange={(e) => updateReference(idx, e.target.value)} 
                    />
                ) : (
                  <div className="cursor-pointer hover:bg-yellow-50 hover:text-slate-900 p-0.5 rounded" onClick={() => handleHighlight(ref)}>
                    <p className="break-words">{ref}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
  );

  const XmlEditorContent = () => (
      <div className="relative h-full flex flex-col">
         {/* XML Content */}
         {isXmlEditing ? (
           <textarea
             className="w-full h-full text-[11px] font-mono text-slate-300 bg-[#0f172a] p-4 rounded-lg border border-blue-500 focus:ring-2 focus:ring-blue-400 outline-none resize-none shadow-inner custom-scrollbar"
             value={xmlContent}
             onChange={(e) => setXmlContent(e.target.value)}
             spellCheck={false}
           />
         ) : (
           <pre className="w-full h-full text-[11px] font-mono text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto whitespace-pre-wrap shadow-inner custom-scrollbar">
             {xmlContent}
           </pre>
         )}
      </div>
  );

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/90 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center space-x-4">
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('visual')}
                    className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'visual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <Eye className="w-3 h-3 mr-1.5"/> Visual
                </button>
                <button
                    onClick={() => setActiveTab('xml')}
                    className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'xml' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <Code className="w-3 h-3 mr-1.5"/> XML
                </button>
                <button
                    onClick={() => setActiveTab('split')}
                    className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'split' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    <Columns className="w-3 h-3 mr-1.5"/> Side-by-Side
                </button>
            </div>
            
            {(activeTab === 'xml' || activeTab === 'split') && (
                <div className="flex space-x-2 animate-fadeIn">
                     {!isXmlEditing ? (
                        <button 
                            onClick={() => setIsXmlEditing(true)}
                            className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded hover:bg-blue-200 text-xs font-bold"
                        >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit XML
                        </button>
                     ) : (
                        <button 
                            onClick={() => setIsXmlEditing(false)}
                            className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200 text-xs font-bold"
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Done
                        </button>
                     )}
                     <button 
                        onClick={handleDownload}
                        className="flex items-center px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 text-xs font-bold"
                    >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex items-center space-x-2">
           <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
             {editableData.arxivId || "UNKNOWN ID"}
           </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-hidden relative">
        {activeTab === 'visual' && (
             <div className="h-full overflow-y-auto p-6 custom-scrollbar"><VisualEditorContent /></div>
        )}
        {activeTab === 'xml' && (
             <div className="h-full overflow-hidden p-0"><XmlEditorContent /></div>
        )}
        {activeTab === 'split' && (
             <div className="h-full grid grid-cols-2 divide-x divide-slate-200">
                  <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-white">
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 sticky top-0 bg-white z-10 py-1">Visual Preview</h4>
                      <VisualEditorContent />
                  </div>
                  <div className="h-full overflow-hidden bg-[#0f172a]">
                      <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2 absolute top-2 right-4 z-10">XML Output</h4>
                      <XmlEditorContent />
                  </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;
