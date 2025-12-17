
import React, { useEffect, useState } from 'react';
import { Globe, Radio, Zap } from 'lucide-react';

// Enhanced Simulated Live Feed
const LIVE_NEWS = [
  { category: "ACE OPS", text: "Precision extraction protocol updated to v2.4. Processing latency reduced by 12%." },
  { category: "SCIENCE", text: "New preprint on quantum entanglement in macroscopic systems verified by independent labs." },
  { category: "GLOBAL", text: "International Data Standards Summit reaches consensus on citation metadata formats." },
  { category: "TECH", text: "AI-driven peer review assistants showing 95% accuracy in initial screening tests." },
  { category: "SPACE", text: "Deep space telemetry confirms arrival of probe at target exoplanet system." },
  { category: "SYSTEM", text: "Auto-scaling infrastructure active. Load distribution optimal across all nodes." },
  { category: "ARCHIVE", text: "Historical digitization project completes scanning of 1M+ 20th-century manuscripts." },
  { category: "ENERGY", text: "Fusion reactor prototype sustains plasma stability for record duration." }
];

const NewsTicker: React.FC = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setOffset(prev => {
        // Reset to simulate infinite loop. 
        if (prev < -3500) return window.innerWidth; 
        return prev - 0.8; 
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-[#050505] border-t border-slate-800 flex items-center z-40 overflow-hidden select-none shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
      {/* Static Label */}
      <div className="bg-[#00d9ff] h-full px-3 flex items-center justify-center z-10 shrink-0 shadow-[5px_0_20px_rgba(0,217,255,0.2)]">
        <Globe className="w-3.5 h-3.5 text-black mr-2 animate-pulse" />
        <span className="text-[10px] font-black text-black tracking-widest">LIVE FEED</span>
      </div>
      
      {/* Angle decoration */}
      <div className="w-0 h-0 border-b-[32px] border-b-[#050505] border-l-[20px] border-l-[#00d9ff] z-10 shrink-0"></div>

      {/* Scrolling Content */}
      <div className="flex items-center whitespace-nowrap" style={{ transform: `translateX(${offset}px)` }}>
        {LIVE_NEWS.map((item, i) => (
          <div key={i} className="flex items-center mr-16">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 ${
                item.category.includes('ACE') || item.category === 'SYSTEM' ? 'bg-purple-900/40 text-purple-300 border border-purple-800' : 
                'bg-blue-900/20 text-blue-300 border border-blue-900/50'
            }`}>
                {item.category}
            </span>
            <span className="text-xs text-slate-300 font-mono uppercase tracking-wide">
                {item.text}
            </span>
            {i !== LIVE_NEWS.length - 1 && (
                <div className="mx-6 h-1 w-1 rounded-full bg-slate-600"></div>
            )}
          </div>
        ))}
         {/* Duplicate for loop illusion */}
         {LIVE_NEWS.map((item, i) => (
          <div key={`dup-${i}`} className="flex items-center mr-16">
             <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 ${
                item.category.includes('ACE') || item.category === 'SYSTEM' ? 'bg-purple-900/40 text-purple-300 border border-purple-800' : 
                'bg-blue-900/20 text-blue-300 border border-blue-900/50'
            }`}>
                {item.category}
            </span>
            <span className="text-xs text-slate-300 font-mono uppercase tracking-wide">
                {item.text}
            </span>
            <div className="mx-6 h-1 w-1 rounded-full bg-slate-600"></div>
          </div>
        ))}
      </div>

      {/* Right Side Status Overlay */}
      <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#050505] via-[#050505] to-transparent w-64 z-10 flex items-center justify-end px-4 gap-4">
          <div className="flex items-center gap-1.5">
             <Radio className="w-3 h-3 text-green-500" />
             <span className="text-[9px] font-mono text-green-500">CONN: OPTIMAL</span>
          </div>
          <div className="flex items-center gap-1.5">
             <Zap className="w-3 h-3 text-yellow-500" />
             <span className="text-[9px] font-mono text-yellow-500">LATENCY: 14ms</span>
          </div>
      </div>
    </div>
  );
};

export default NewsTicker;
