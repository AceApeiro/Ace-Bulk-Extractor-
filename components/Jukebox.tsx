
import React, { useState } from 'react';
import { X, Music, Minimize2, Maximize2, Disc } from 'lucide-react';

interface JukeboxProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLAYLISTS = [
    { name: 'ACE Focus (Lofi)', id: '0vvXsKvCC9XrZJc86bmRED' },
    { name: 'Deep Work (Electronic)', id: '37i9dQZF1DXdLEN7aqioXM' },
    { name: 'Rock Classics', id: '37i9dQZF1DWXRqgorJj26U' },
    { name: 'Jazz Vibes', id: '37i9dQZF1DXbITWG1ZJKYt' },
    { name: 'Classical Focus', id: '37i9dQZF1DWWEJlAGA9gs0' },
    { name: 'Cyberpunk / Synth', id: '37i9dQZF1DX6J5NfMJS675' }
];

const Jukebox: React.FC<JukeboxProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(PLAYLISTS[0].id);

  if (!isOpen) return null;

  return (
    <div className={`fixed z-50 transition-all duration-500 ease-in-out font-orbitron
        ${isMinimized 
            ? 'bottom-12 right-4 w-72 h-10' 
            : 'bottom-12 right-4 w-96 h-[480px]'
        }
        bg-[#121212] border border-[#00d9ff]/30 rounded-t-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="h-10 bg-[#282828] flex items-center justify-between px-3 shrink-0 select-none border-b border-white/10 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2 text-[#00d9ff]">
            <Music className={`w-3 h-3 ${!isMinimized ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest">AUDIO LINK</span>
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

      {/* Main Player Area */}
      <div className={`flex-1 bg-black flex flex-col ${isMinimized ? 'hidden' : 'flex'}`}>
           
           {/* Genre Selector */}
           <div className="p-2 bg-[#1a1a1a] border-b border-white/10 flex gap-2 overflow-x-auto custom-scrollbar">
                {PLAYLISTS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedPlaylist(p.id)}
                        className={`text-[9px] whitespace-nowrap px-3 py-1 rounded-full font-bold transition-all ${
                            selectedPlaylist === p.id 
                                ? 'bg-[#00d9ff] text-black' 
                                : 'bg-[#333] text-gray-400 hover:bg-[#444] hover:text-white'
                        }`}
                    >
                        {p.name}
                    </button>
                ))}
           </div>

           <iframe 
                key={selectedPlaylist}
                style={{borderRadius: '0px'}} 
                src={`https://open.spotify.com/embed/playlist/${selectedPlaylist}?utm_source=generator&theme=0`} 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                allowFullScreen={false} 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                className="flex-1"
            ></iframe>
      </div>
    </div>
  );
};

export default Jukebox;
