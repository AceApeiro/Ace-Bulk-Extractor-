
import React, { useEffect, useState } from 'react';
import { Globe, TrendingUp, Radio, Zap } from 'lucide-react';

const NEWS_ITEMS = [
  { category: "WORLD", text: "Global markets rally as tech sector shows unexpected growth in Q3." },
  { category: "TECH", text: "AI regulation summit concludes in Geneva with new framework for generative models." },
  { category: "SCIENCE", text: "Astronomers detect potential biosignatures on exoplanet K2-18b." },
  { category: "FINANCE", text: "Cryptocurrency volatility index drops to 6-month low." },
  { category: "ACE SYS", text: "System capacity increased to 50 concurrent vectors. Latency nominal." },
  { category: "WORLD", text: "Energy transition talks stall amidst new geopolitical tensions in Eastern Europe." },
  { category: "TECH", text: "Quantum computing breakthrough: new qubit stability record set at 15ms." },
  { category: "BUSINESS", text: "Semiconductor shortage officially declared over by major manufacturing consortium." }
];

const NewsTicker: React.FC = () => {
  const [offset, setOffset] = useState(0);

  // Simple animation loop
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setOffset(prev => {
        // Reset when it scrolls far enough (simulating infinite loop)
        // detailed width calculation would be better, but rough estimation works for visual effect
        if (prev < -2000) return window.innerWidth; 
        return prev - 1; // Speed
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-[#050505] border-t border-slate-800 flex items-center z-40 overflow-hidden select-none shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
      {/* Static Label */}
      <div className="bg-[#00d9ff] h-full px-3 flex items-center justify-center z-10 shrink-0">
        <Globe className="w-3.5 h-3.5 text-black mr-2 animate-pulse" />
        <span className="text-[10px] font-black text-black tracking-widest">LIVE FEED</span>
      </div>
      
      {/* Angle decoration */}
      <div className="w-0 h-0 border-b-[32px] border-b-[#050505] border-l-[20px] border-l-[#00d9ff] z-10 shrink-0"></div>

      {/* Scrolling Content */}
      <div className="flex items-center whitespace-nowrap" style={{ transform: `translateX(${offset}px)` }}>
        {NEWS_ITEMS.map((item, i) => (
          <div key={i} className="flex items-center mr-16">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 ${
                item.category === 'ACE SYS' ? 'bg-red-900/40 text-red-400 border border-red-800' : 
                item.category === 'TECH' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
                {item.category}
            </span>
            <span className="text-xs text-slate-300 font-mono uppercase tracking-wide">
                {item.text}
            </span>
            {i !== NEWS_ITEMS.length - 1 && (
                <div className="mx-6 h-1 w-1 rounded-full bg-slate-600"></div>
            )}
          </div>
        ))}
         {/* Duplicate for loop illusion */}
         {NEWS_ITEMS.map((item, i) => (
          <div key={`dup-${i}`} className="flex items-center mr-16">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 ${
                item.category === 'ACE SYS' ? 'bg-red-900/40 text-red-400 border border-red-800' : 
                item.category === 'TECH' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                'bg-slate-800 text-slate-400 border border-slate-700'
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
      <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#050505] via-[#050505] to-transparent w-48 z-10 flex items-center justify-end px-4 gap-4">
          <div className="flex items-center gap-1.5">
             <Radio className="w-3 h-3 text-green-500" />
             <span className="text-[9px] font-mono text-green-500">ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5">
             <Zap className="w-3 h-3 text-yellow-500" />
             <span className="text-[9px] font-mono text-yellow-500">LOW LATENCY</span>
          </div>
      </div>
    </div>
  );
};

export default NewsTicker;
