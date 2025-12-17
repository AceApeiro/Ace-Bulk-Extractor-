

import React, { useState, useRef, useEffect } from 'react';
import { X, BookOpen, GripHorizontal, Mail, MapPin } from 'lucide-react';

interface ManualGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualGuide: React.FC<ManualGuideProps> = ({ isOpen, onClose }) => {
  // Dragging state
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
        // Center initial
        setPosition({ x: (window.innerWidth / 2) - 450, y: (window.innerHeight / 2) - 300 });
    }
  }, [isOpen]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          setPosition({
              x: e.clientX - offsetRef.current.x,
              y: e.clientY - offsetRef.current.y
          });
      };
      
      const handleMouseUp = () => {
          setIsDragging(false);
      };

      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (dragRef.current && dragRef.current.contains(e.target as Node)) {
          setIsDragging(true);
          offsetRef.current = {
              x: e.clientX - position.x,
              y: e.clientY - position.y
          };
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
       <div 
         style={{ left: position.x, top: position.y }}
         className="pointer-events-auto absolute bg-[#0f172a] border border-slate-700 w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-inter"
       >
        
        {/* Header (Draggable) */}
        <div 
          ref={dragRef}
          onMouseDown={handleMouseDown}
          className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center shrink-0 cursor-move select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-orbitron font-bold text-white tracking-wide flex items-center gap-2">CAR 2.0 CREATION MANUAL <GripHorizontal className="w-4 h-4 opacity-50"/></h2>
              <p className="text-xs text-slate-400 font-mono">Official Business Rules & Guidelines</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-slate-300 text-sm leading-relaxed space-y-8 bg-[#0f172a]">
            
            <section>
                <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2">3. Affiliations & Breakdown</h3>
                <div className="space-y-4">
                    <p className="text-slate-400">Affiliations must be structurally broken down, not just captured as a single string. Use the following breakdown logic:</p>
                    
                    <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                        <h4 className="text-sm font-bold text-green-400 mb-2">Example Structure Breakdown</h4>
                        <p className="mb-2 italic opacity-70">Source: SRM University-AP, Mangalgiri Mandal, Neerukonda, Amravati, Andhra Pradesh-522502.</p>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="flex flex-col"><span className="text-slate-500">Organization</span> <span className="text-white">SRM University-AP</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">Address Part</span> <span className="text-white">Neerukonda, Mangalgiri Mandal</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">City</span> <span className="text-white">Amravati</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">State</span> <span className="text-white">Andhra Pradesh</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">Postal Code</span> <span className="text-white">522502</span></div>
                            <div className="flex flex-col"><span className="text-slate-500">Country</span> <span className="text-white">India</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400"/> Author Correspondence
                </h3>
                
                <div className="space-y-4">
                    <p className="text-xs text-slate-400">Identify correspondence via: "Corresponding author", "Reprint request to", "All correspondence to", "Contact address", or symbols (*, ✉) explicitly defined.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-4 rounded border border-slate-800">
                            <h4 className="font-bold text-green-400 text-xs mb-2">Single Author Rules</h4>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                <li>Has Email + Affiliation: <span className="text-green-500 font-bold">YES</span></li>
                                <li>Has Only Email: <span className="text-green-500 font-bold">YES</span></li>
                                <li>Has Only Affiliation: <span className="text-green-500 font-bold">YES</span></li>
                                <li>No Affiliation/Email: <span className="text-red-500 font-bold">NO</span></li>
                            </ul>
                        </div>
                        <div className="bg-slate-900 p-4 rounded border border-slate-800">
                             <h4 className="font-bold text-orange-400 text-xs mb-2">Multiple Authors Rules</h4>
                             <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                <li>Author has * or ✉: <span className="text-green-500 font-bold">YES</span></li>
                                <li>* denotes "Equal Contribution": <span className="text-red-500 font-bold">NO</span></li>
                                <li>Email matches author (no symbol): <span className="text-red-500 font-bold">NO</span></li>
                                <li>Author has * & ORCID has *: <span className="text-green-500 font-bold">YES</span></li>
                             </ul>
                        </div>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded mt-2">
                        <h4 className="font-bold text-blue-400 text-xs mb-2 flex items-center gap-2"><MapPin className="w-3 h-3"/> Address Correspondence Logic</h4>
                        <div className="space-y-2 text-xs text-slate-400">
                            <p><strong>Current/Present Address:</strong> If author has an affiliation AND a "Current/Present/Now at" address, and is marked as corresponding -> <span className="text-white">Mark the Current Address as corresponding.</span></p>
                            <p><strong>Contact Address:</strong> If explicit "Contact Address" differs from affiliation -> <span className="text-white">Mark Contact Address.</span></p>
                            <p><strong>Identical Match:</strong> If Contact Address and Affiliation are identical -> <span className="text-white">Capture only once.</span></p>
                        </div>
                    </div>
                </div>
            </section>
            
            <section>
                <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2">Email Addresses</h3>
                <div className="space-y-3">
                    <p className="text-slate-400"><strong>Element:</strong> ce:e-address</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
                         <li><strong>Format:</strong> Capture as they appear. Remove angle brackets/trailing periods. One @ symbol only.</li>
                         <li><strong>Obfuscated:</strong> Reconstruct "james.spearsat gmail com" -> "james.spears@gmail.com".</li>
                         <li><strong>Multiple:</strong> Capture FIRST or most relevant only.</li>
                    </ul>

                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                        <h4 className="font-bold text-blue-400 text-xs mb-1">Numeric & Sequence Logic</h4>
                        <p className="text-xs text-slate-500">
                           Numeric emails (e.g., <em>32122t323@gmail.com</em>) should be marked ONLY if directly linked to the author or if the sequence matches exactly.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                           <strong>Partial Match Rule:</strong> If there is a mix of name-based and numeric emails, but they don't match author count, <span className="text-red-400">DISCARD</span> numeric/garbage emails and keep name-matched ones.
                        </p>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2">Author Names & Scenarios</h3>
                <p className="mb-4">Author names are taken from the PDF and compared with the API. The author sequence and given name/surname assigning is mentioned in the API.</p>

                <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="font-bold text-green-400">Scenario 2 (API Expands Initial):</span> PDF "W Price" vs API "William Price" -> Use API.
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="font-bold text-purple-400">Scenario 4 (PDF More Complete):</span> PDF "William P Price" vs API "W Price" -> Use PDF.
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="font-bold text-purple-400">Scenario 7 (Multiple Authors Lumps):</span> If API lumps names, use PDF.
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="font-bold text-red-400">Scenario 8 (Garbled API):</span> If API is garbled, use PDF.
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-2 border-b border-slate-700 pb-2">Country Codes (Mandatory)</h3>
                <div className="flex gap-2 flex-wrap text-xs font-mono">
                    <span className="bg-slate-800 px-2 py-1 rounded text-cyan-300">Taiwan -> TWN</span>
                    <span className="bg-slate-800 px-2 py-1 rounded text-cyan-300">Hong Kong -> HKG</span>
                    <span className="bg-slate-800 px-2 py-1 rounded text-cyan-300">Macau -> MAC</span>
                    <span className="bg-slate-800 px-2 py-1 rounded text-cyan-300">United Kingdom -> GBR</span>
                    <span className="bg-slate-800 px-2 py-1 rounded text-cyan-300">USA -> USA</span>
                </div>
            </section>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-all"
            >
                Close Manual
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManualGuide;