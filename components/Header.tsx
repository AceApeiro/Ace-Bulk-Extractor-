
import React, { useEffect, useRef, useState } from 'react';
import { Timer, Clock, Music } from 'lucide-react';

interface HeaderProps {
  startTime?: number | null;
  endTime?: number | null; // Added endTime prop
  onToggleJukebox?: () => void;
}

const TargetTimer: React.FC<{ start: number; end?: number | null }> = ({ start, end }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // If we have an end time, just show the final duration
    if (end) {
        setElapsed(Math.floor((end - start) / 1000));
        return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [start, end]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Thresholds: 1.5 min (90s) target, 2.0 min (120s) max
  const isWarning = elapsed > 90 && !end;
  const isOvertime = elapsed > 120 && !end;
  const isFinished = !!end;
  
  const colorClass = isFinished ? 'text-green-400' : isOvertime ? 'text-red-500' : isWarning ? 'text-orange-400' : 'text-[#00d9ff]';
  const borderClass = isFinished ? 'border-green-400/50' : isOvertime ? 'border-red-500/50' : isWarning ? 'border-orange-400/50' : 'border-[#00d9ff]/30';
  const bgClass = isFinished ? 'bg-green-400/10' : isOvertime ? 'bg-red-500/10' : isWarning ? 'bg-orange-400/10' : 'bg-[#00d9ff]/10';

  return (
    <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg border backdrop-blur-md ${borderClass} ${bgClass} transition-colors duration-500`}>
       <div className={`p-1 rounded-full ${isOvertime && !isFinished ? 'animate-pulse' : ''}`}>
           <Clock className={`w-4 h-4 ${colorClass}`} />
       </div>
       <div className="flex flex-col">
           <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
               {isFinished ? 'Total Time' : 'Session Time'}
           </span>
           <span className={`text-xl font-orbitron font-bold tracking-widest ${colorClass}`}>
               {formatTime(elapsed)}
           </span>
       </div>
       <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
       <div className="flex flex-col items-end">
           <span className="text-[9px] text-slate-500">Status</span>
           <span className={`text-xs font-bold ${isFinished ? 'text-green-400' : 'text-slate-300'}`}>
               {isFinished ? 'COMPLETE' : 'ACTIVE'}
           </span>
       </div>
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ startTime, endTime, onToggleJukebox }) => {
  const matrixRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const [isExploded, setIsExploded] = useState(false);

  useEffect(() => {
    // --- Ticker Animation Timer ---
    const timer = setInterval(() => {
      setIsExploded(prev => !prev);
    }, 4000);

    // --- Matrix Rain Animation ---
    const matrixContainer = matrixRef.current;
    if (!matrixContainer) return () => clearInterval(timer);
    
    // Updated letters for ACE context
    const letters = ['A', 'C', 'E', 'X', 'M', 'L'];
    let matrixInterval: ReturnType<typeof setInterval>;

    const createDrop = () => {
      if (!matrixContainer) return;
      const drop = document.createElement('div');
      // Inline styles for the drop
      drop.style.position = 'absolute';
      drop.style.color = '#00d9ff';
      drop.style.fontFamily = "'Courier New', monospace";
      drop.style.fontSize = `${Math.random() * 10 + 14}px`;
      drop.style.fontWeight = '700';
      drop.style.opacity = '0.95';
      drop.style.left = Math.random() * 100 + '%';
      drop.style.textShadow = '0 0 8px #00ffff';
      drop.style.pointerEvents = 'none';
      drop.style.top = '-50px';
      
      // Animation logic using Web Animations API for better performance cleanup than CSS injection
      const animation = drop.animate([
        { transform: 'translateY(-10vh)', opacity: 1 },
        { transform: 'translateY(110vh)', opacity: 0 }
      ], {
        duration: Math.random() * 2000 + 1500,
        easing: 'linear'
      });

      let i = Math.floor(Math.random() * letters.length);
      drop.textContent = letters[i];

      // Morph letters
      const morph = setInterval(() => {
        i = (i + 1) % letters.length;
        drop.textContent = letters[i];
      }, 250);

      matrixContainer.appendChild(drop);

      animation.onfinish = () => {
        clearInterval(morph);
        drop.remove();
      };
    };

    // Initial drops
    for (let i = 0; i < 30; i++) {
      setTimeout(createDrop, i * 100);
    }
    matrixInterval = setInterval(createDrop, 150);

    // --- Cube Particles Animation ---
    const cubeContainer = cubeRef.current;
    let cubeInterval: ReturnType<typeof setInterval>;

    const spawnCube = () => {
      if (!cubeContainer) return;
      const cube = document.createElement('div');
      const size = 12;
      
      cube.style.position = 'absolute';
      cube.style.width = `${size}px`;
      cube.style.height = `${size}px`;
      
      const colors = ['#00d9ff', '#00ffff', '#0099ff', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      cube.style.background = color;
      cube.style.boxShadow = `0 0 15px ${color}, 0 0 30px ${color}`;
      cube.style.opacity = '0';
      
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;
      const endX = (Math.random() - 0.5) * 500;
      const endY = (Math.random() - 0.5) * 500;

      cube.style.left = `${startX}px`;
      cube.style.top = `${startY}px`;

      const animation = cube.animate([
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.1 },
        { opacity: 0.9, offset: 0.9 },
        { transform: `translate(${endX}px, ${endY}px) rotate(720deg) scale(0)`, opacity: 0, offset: 1 }
      ], {
        duration: Math.random() * 2500 + 1500,
        easing: 'linear'
      });

      cubeContainer.appendChild(cube);

      animation.onfinish = () => {
        cube.remove();
      };
    };

    cubeInterval = setInterval(spawnCube, 180);

    return () => {
      clearInterval(matrixInterval);
      clearInterval(cubeInterval);
      clearInterval(timer);
      if (matrixContainer) matrixContainer.innerHTML = '';
      if (cubeContainer) cubeContainer.innerHTML = '';
    };
  }, []);

  return (
    <>
      {/* Background Animations Layer */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-slate-900/90">
        <div ref={matrixRef} className="absolute inset-0 w-full h-full" />
        <div ref={cubeRef} className="absolute inset-0 w-full h-full" />
        
        {/* Double Helix Gradients */}
        <div className="absolute top-0 left-[5%] w-1 h-full bg-gradient-to-b from-transparent via-[#0099ff] to-transparent opacity-30 blur-sm" />
        <div className="absolute top-0 right-[5%] w-1 h-full bg-gradient-to-b from-transparent via-[#0099ff] to-transparent opacity-30 blur-sm" />
      </div>

      {/* Header Content */}
      <header className="relative z-50 pt-6 pb-2 px-6 flex justify-between items-start">
        {/* Left: Jukebox Toggle */}
        <div className="w-48 hidden lg:flex items-center">
            <button 
                onClick={onToggleJukebox}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/20 hover:shadow-[0_0_15px_rgba(0,217,255,0.4)] transition-all group"
            >
                <div className="p-1 bg-[#00d9ff]/20 rounded group-hover:animate-spin-slow">
                     <Music className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200">System Audio</span>
                    <span className="text-xs font-orbitron font-bold">Jukebox</span>
                </div>
            </button>
        </div>

        <div className="flex flex-col items-center justify-center flex-1">
            {/* Logo Container */}
            <div className="relative w-16 h-16 mb-2">
                {/* Pulse Ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full border-2 border-white opacity-0 animate-[pulse_3s_ease-out_infinite] shadow-[0_0_10px_white]" />
                
                {/* Embed Circle */}
                <div className="w-full h-full rounded-full border-2 border-white bg-[radial-gradient(circle_at_center,rgba(0,153,255,0.06),rgba(0,0,0,0.6))] shadow-[0_0_15px_white,inset_0_0_15px_rgba(255,255,255,0.06)] backdrop-blur-[0.5px] relative overflow-hidden flex items-center justify-center">
                    
                    {/* Logo SVG */}
                    <svg className="w-full h-full p-1.5" viewBox="0 0 120 120">
                        <defs>
                            <linearGradient id="gradA1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#0099ff" />
                                <stop offset="100%" stopColor="#ffffff" />
                            </linearGradient>
                        </defs>
                        <circle cx="60" cy="60" r="46" fill="none" stroke="url(#gradA1)" strokeWidth="3"/>
                        <text x="60" y="73" textAnchor="middle" fill="url(#gradA1)" fontFamily="Orbitron" fontSize="34" fontWeight="700">A</text>
                        <polygon points="60,26 78,44 42,44" fill="url(#gradA1)" opacity="0.85" />
                        <rect x="47" y="78" width="26" height="12" fill="url(#gradA1)" opacity="0.6" rx="2" />
                    </svg>
                </div>
            </div>

            {/* Company Text - Animated Exploding Ticker */}
            <div className="text-center z-10 h-10 flex flex-col justify-center items-center relative w-full max-w-4xl overflow-hidden">
                <div className={`flex items-baseline justify-center transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isExploded ? 'gap-1 scale-100' : 'gap-6 scale-110'}`}>
                    <div className="flex items-baseline">
                        <span className="text-xl font-bold text-[#00d9ff] font-orbitron shadow-blue-glow drop-shadow-md">A</span>
                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-1000 ease-out text-[#00d9ff] font-orbitron font-medium text-sm tracking-widest ${isExploded ? 'max-w-[200px] opacity-100 ml-0.5 translate-x-0' : 'max-w-0 opacity-0 -translate-x-4'}`}>peiro</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-xl font-bold text-[#00d9ff] font-orbitron shadow-blue-glow drop-shadow-md">C</span>
                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-1000 ease-out text-[#00d9ff] font-orbitron font-medium text-sm tracking-widest ${isExploded ? 'max-w-[200px] opacity-100 ml-0.5 translate-x-0' : 'max-w-0 opacity-0 -translate-x-4'}`}>itation</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="text-xl font-bold text-[#00d9ff] font-orbitron shadow-blue-glow drop-shadow-md">E</span>
                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-1000 ease-out text-[#00d9ff] font-orbitron font-medium text-sm tracking-widest ${isExploded ? 'max-w-[200px] opacity-100 ml-0.5 translate-x-0' : 'max-w-0 opacity-0 -translate-x-4'}`}>xtractor</span>
                    </div>
                </div>
            </div>
            
            <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent mt-2 shadow-[0_0_10px_#00d9ff]" />
        </div>

        {/* Right Side: Target Timer */}
        <div className="w-48 flex justify-end pt-2">
            {startTime && <TargetTimer start={startTime} end={endTime} />}
        </div>
        
        <style>{`
            .font-orbitron { font-family: 'Orbitron', sans-serif; }
            .shadow-blue-glow { text-shadow: 0 0 10px #00d9ff, 0 0 20px #00d9ff; }
            .animate-spin-slow { animation: spin 4s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </header>
    </>
  );
};

export default Header;
