
import React, { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';
import { User as UserType } from '../types';
import MorphingLogo from './MorphingLogo';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Attempt Full Screen on Login
    try {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log("Full screen request denied or not supported:", err);
            });
        }
    } catch(e) { console.log(e); }
    
    // Admin Credentials
    // Accepting UID, UID1, UID01, UID2, UID02
    const normalizedUser = username.toUpperCase();
    const adminIds = ['UID', 'UID1', 'UID01', 'UID2', 'UID02'];
    
    if (adminIds.includes(normalizedUser) && (password === '001' || password === '002')) {
      onLogin({
        id: normalizedUser,
        username: normalizedUser,
        role: 'ADMIN'
      });
    } 
    // New Test User
    else if (normalizedUser === 'UIDTEST' && password === 'PW') {
        onLogin({
            id: 'UIDTEST',
            username: 'UIDTEST',
            role: 'OPERATOR'
        });
    }
    // Standard Operator
    else if (normalizedUser.startsWith('OP') && password.length > 0) {
       onLogin({
        id: normalizedUser,
        username: normalizedUser,
        role: 'OPERATOR'
      });
    }
    else {
      setError('Invalid Access Credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden font-inter">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-cyan-900/20 to-transparent"></div>
        <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-transparent via-purple-900/20 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 flex flex-col items-center">
        <div className="mb-8 scale-110">
           <MorphingLogo />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white font-orbitron tracking-widest mb-2">ACE</h1>
          <p className="text-xs text-slate-500 uppercase tracking-[0.3em]">Apeiro Citation Extractor</p>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl w-full">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3 h-3" /> Operator ID
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#050505] border border-slate-800 rounded-lg py-3 px-4 text-sm text-cyan-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-700 font-mono"
                placeholder="UID1 / OP..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" /> Secure Key
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#050505] border border-slate-800 rounded-lg py-3 px-4 text-sm text-cyan-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-700 font-mono"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 p-3 rounded-lg text-center font-bold tracking-wide animate-pulse">
                ⚠ {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full group bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 uppercase tracking-wider text-xs flex items-center justify-center gap-2"
            >
              Initialize Session <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
        
        <div className="mt-12 text-center space-y-2 opacity-60">
           <p className="text-[10px] text-cyan-500 font-orbitron tracking-widest uppercase glow-text">Powered By Apeiro</p>
           <p className="text-[9px] text-slate-500 tracking-[0.2em]">Endless opportunities</p>
        </div>
      </div>
      
      <style>{`
        .glow-text { text-shadow: 0 0 10px rgba(6,182,212,0.5); }
      `}</style>
    </div>
  );
};

export default Login;
