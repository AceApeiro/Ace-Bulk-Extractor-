import React, { useEffect, useRef } from 'react';

const MorphingLogo: React.FC = () => {
  const matrixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Matrix Rain Logic
    const matrixContainer = matrixRef.current;
    if (!matrixContainer) return;

    const letters = ['A', 'P', 'E', 'I', 'R', 'O', '1', '0', 'X'];
    let rainInterval: ReturnType<typeof setInterval>;

    const createDrop = () => {
      if (!matrixContainer) return;
      const drop = document.createElement('div');
      
      // Tailwind classes for style
      drop.className = 'absolute text-[#0099ff] font-mono font-bold opacity-80 pointer-events-none';
      drop.style.fontSize = `${Math.random() * 8 + 10}px`;
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.top = '-50px';
      drop.style.textShadow = '0 0 5px #0099ff';
      
      // Animation logic manually to avoid external CSS dependency issues
      const duration = Math.random() * 2000 + 2000;
      const animation = drop.animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(100vh)', opacity: 0 }
      ], {
        duration: duration,
        easing: 'linear'
      });

      let i = Math.floor(Math.random() * letters.length);
      drop.textContent = letters[i];

      // Morphing letter logic
      const morph = setInterval(() => {
        i = (i + 1) % letters.length;
        if (drop.isConnected) drop.textContent = letters[i];
        else clearInterval(morph);
      }, 300);

      matrixContainer.appendChild(drop);

      animation.onfinish = () => {
        clearInterval(morph);
        drop.remove();
      };
    };

    // Initial drops
    for (let i = 0; i < 20; i++) {
        setTimeout(createDrop, i * 100);
    }
    rainInterval = setInterval(createDrop, 200);

    return () => {
      clearInterval(rainInterval);
      if (matrixContainer) matrixContainer.innerHTML = '';
    };
  }, []);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Matrix Rain Container limited to logo area or global? Using local for effect */}
        <div ref={matrixRef} className="absolute inset-[-100px] overflow-hidden pointer-events-none opacity-30 mask-radial" style={{ maskImage: 'radial-gradient(circle, black 40%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 70%)' }}></div>

        {/* Pulse Ring */}
        <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-[pulse_3s_ease-out_infinite] scale-110 opacity-0 mix-blend-screen shadow-[0_0_15px_rgba(255,255,255,0.1)]"></div>

        {/* Circular Container */}
        <div className="relative w-32 h-32 rounded-full border-2 border-white/90 shadow-[0_0_20px_#0099ff,inset_0_0_15px_rgba(255,255,255,0.1)] bg-radial-gradient flex items-center justify-center overflow-hidden backdrop-blur-sm z-10 animate-[borderGlisten_3s_infinite]">
            <style>{`
                @keyframes borderGlisten {
                    0%, 100% { box-shadow: 0 0 15px white, 0 0 30px #0099ff; border-color: white; }
                    50% { box-shadow: 0 0 25px white, 0 0 50px #0099ff; border-color: rgba(255,255,255,0.8); }
                }
                .logo-morph { transition: opacity 1s ease-in-out, transform 0.8s ease; }
            `}</style>
            
            {/* SVG 1: A Symbol */}
            <svg className="absolute w-full h-full p-4 animate-[morph1_6s_infinite]" viewBox="0 0 120 120">
                 <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0099ff" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                 </defs>
                 <circle cx="60" cy="60" r="46" fill="none" stroke="url(#grad1)" strokeWidth="3"/>
                 <text x="60" y="73" textAnchor="middle" fill="url(#grad1)" fontFamily="sans-serif" fontSize="34" fontWeight="bold">A</text>
                 <polygon points="60,26 78,44 42,44" fill="url(#grad1)" opacity="0.85" />
                 <rect x="47" y="78" width="26" height="12" fill="url(#grad1)" opacity="0.6" rx="2" />
            </svg>

            {/* SVG 2: Abstract Hex */}
            <svg className="absolute w-full h-full p-4 animate-[morph2_6s_infinite]" viewBox="0 0 120 120">
                <defs>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0099ff" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                 </defs>
                 <path d="M60 12 L90 40 L90 84 L60 108 L30 84 L30 40 Z" fill="none" stroke="url(#grad2)" strokeWidth="3" />
                 <circle cx="60" cy="44" r="12" fill="url(#grad2)" />
                 <path d="M46 66 Q60 76 74 66" stroke="url(#grad2)" strokeWidth="4" fill="none" strokeLinecap="round"/>
            </svg>
            
            <style>{`
                @keyframes morph1 {
                    0%, 45% { opacity: 1; transform: scale(1); }
                    50%, 95% { opacity: 0; transform: scale(0.92); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes morph2 {
                    0%, 45% { opacity: 0; transform: scale(0.92); }
                    50%, 95% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(0.92); }
                }
            `}</style>
        </div>
    </div>
  );
};

export default MorphingLogo;