
import React, { useEffect, useRef, useState } from 'react';
import { Timer, Clock, Music, Shield, MessageCircle } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  startTime?: number | null;
  endTime?: number | null;
  onToggleJukebox?: () => void;
  currentUser?: User | null;
  onOpenAdmin?: () => void;
}

const TargetTimer: React.FC<{ start: number; end?: number | null }> = ({ start, end }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
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

  const isWarning = elapsed > 90 && !end;
  const isOvertime = elapsed > 120 && !end;
  const isFinished = !!end;
  
  const colorClass = isFinished ? 'text-green-400' : isOvertime ? 'text-red-500' : isWarning ? 'text-orange-400' : 'text-[#00d9ff]';

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border bg-slate-900/50 border-slate-700`}>
       <Clock className={`w-3 h-3 ${colorClass}`} />
       <span className={`text-sm font-orbitron font-bold tracking-widest ${colorClass}`}>
           {formatTime(elapsed)}
       </span>
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ startTime, endTime, onToggleJukebox, currentUser, onOpenAdmin }) => {
  const matrixRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const matrixContainer = matrixRef.current;
    if (!matrixContainer) return;
    
    // Updated letters for ACE context
    const letters = ['A', 'C', 'E', 'X', 'M', 'L'];
    let matrixInterval: ReturnType<typeof setInterval>;

    const createDrop = () => {
      if (!matrixContainer) return;
      const drop = document.createElement('div');
      drop.style.position = 'absolute';
      drop.style.color = '#00d9ff';
      drop.style.fontFamily = "'Courier New', monospace";
      drop.style.fontSize = `${Math.random() * 10 + 10}px`;
      drop.style.fontWeight = '700';
      drop.style.opacity = '0.5';
      drop.style.left = Math.random() * 100 + '%';
      drop.style.textShadow = '0 0 8px #00ffff';
      drop.style.pointerEvents = 'none';
      drop.style.top = '-50px';
      
      const animation = drop.animate([
        { transform: 'translateY(-10vh)', opacity: 0.5 },
        { transform: 'translateY(110vh)', opacity: 0 }
      ], {
        duration: Math.random() * 2000 + 1500,
        easing: 'linear'
      });

      let i = Math.floor(Math.random() * letters.length);
      drop.textContent = letters[i];
      matrixContainer.appendChild(drop);
      animation.onfinish = () => drop.remove();
    };

    matrixInterval = setInterval(createDrop, 300);

    return () => {
      clearInterval(matrixInterval);
      if (matrixContainer) matrixContainer.innerHTML = '';
    };
  }, []);

  return (
    <>
      {/* Background Animations Layer */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-slate-900/90">
        <div ref={matrixRef} className="absolute inset-0 w-full h-full" />
        <div ref={cubeRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Compact Header Content */}
      <header className="relative z-50 h-14 flex justify-between items-center px-4 bg-[#0a0a0a]/80 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full border border-[#00d9ff] flex items-center justify-center bg-[#00d9ff]/10">
                    <span className="font-orbitron font-bold text-[#00d9ff]">A</span>
                 </div>
                 <div>
                     <h1 className="text-sm font-bold text-white font-orbitron tracking-widest">ACE</h1>
                     <p className="text-[8px] text-slate-500 uppercase tracking-widest leading-none">Apeiro Citation Extractor</p>
                 </div>
            </div>
            
            <button 
                onClick={onToggleJukebox}
                className="ml-4 p-1.5 rounded-full bg-slate-800 hover:bg-[#00d9ff]/20 text-slate-400 hover:text-[#00d9ff] transition-colors"
                title="System Audio"
            >
                <Music className="w-3.5 h-3.5" />
            </button>

            <a 
                href="https://wa.me/" 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 rounded-full bg-slate-800 hover:bg-green-500/20 text-slate-400 hover:text-green-500 transition-colors flex items-center gap-1"
                title="WhatsApp Support"
            >
                <MessageCircle className="w-3.5 h-3.5" />
            </a>
        </div>

        <div className="flex items-center gap-4">
            {currentUser?.role === 'ADMIN' && (
                <button 
                    onClick={onOpenAdmin}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-purple-900/20 text-purple-400 border border-purple-500/30 hover:bg-purple-900/40 text-xs font-bold transition-all animate-fadeIn"
                >
                    <Shield className="w-3 h-3" /> ADMIN DASHBOARD
                </button>
            )}

            {startTime && <TargetTimer start={startTime} end={endTime} />}
            <div className="h-6 w-[1px] bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-mono text-green-500">SYSTEM READY</span>
            </div>
            {currentUser && (
                <div className="text-[9px] font-mono text-slate-500 ml-2">
                    OP: {currentUser.username}
                </div>
            )}
        </div>
        
        <style>{`
            .font-orbitron { font-family: 'Orbitron', sans-serif; }
        `}</style>
      </header>
    </>
  );
};

export default Header;
