
import React, { useState } from 'react';
import { X, Music, Minimize2, Maximize2 } from 'lucide-react';

interface JukeboxProps {
  isOpen: boolean;
  onClose: () => void;
}

const Jukebox: React.FC<JukeboxProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <div className={`fixed z-50 transition-all duration-500 ease-in-out font-orbitron
        ${isMinimized 
            ? 'bottom-12 right-4 w-72 h-10' // Moved up slightly to avoid NewsTicker
            : 'bottom-12 right-4 w-96 h-[400px]'
        }
        bg-[#121212] border border-[#00d9ff]/30 rounded-t-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="h-10 bg-[#282828] flex items-center justify-between px-3 shrink-0 select-none border-b border-white/10 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2 text-[#00d9ff]">
            <Music className={`w-3 h-3 ${!isMinimized ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest">SPOTIFY JUKEBOX</span>
        </div>
        <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white">
                {isMinimized ? <Maximize2 className="w-3 h-3"/> : <Minimize2 className="w-3 h-3"/>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-500">
                <X className="w-3 h-3"/>
            </button>
        </div>
      </div>

      {/* Spotify Embed Content - KEEP MOUNTED BUT HIDE WHEN MINIMIZED */}
      <div className={`flex-1 bg-black ${isMinimized ? 'hidden' : 'block'}`}>
           <iframe 
                style={{borderRadius: '0px'}} 
                src="https://open.spotify.com/embed/playlist/6f7qgUFPnb3JAv2KQIoKGi?utm_source=generator&theme=0" 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                allowFullScreen={false} 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
            ></iframe>
      </div>
    </div>
  );
};

export default Jukebox;
