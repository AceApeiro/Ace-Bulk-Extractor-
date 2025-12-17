
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Sparkles, GripHorizontal } from 'lucide-react';
import { chatWithDocument } from '../services/geminiService';
import { ExtractedData } from '../types';

interface AIAgentProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: ExtractedData | null;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
}

const AIAgent: React.FC<AIAgentProps> = ({ isOpen, onClose, extractedData }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', content: 'Hello Operator. I am the ACE AI Agent. I can assist you with CAR 2.0 guidelines, validate data points, or answer questions about this specific document.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 600 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        const response = await chatWithDocument(history, extractedData, userMsg);
        setMessages(prev => [...prev, { role: 'agent', content: response }]);
    } catch (e) {
        setMessages(prev => [...prev, { role: 'agent', content: "I encountered an error communicating with the neural core." }]);
    } finally {
        setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        style={{ left: position.x, top: position.y }}
        className="fixed w-96 h-[500px] bg-[#0f172a] border border-green-500/30 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col z-[100] overflow-hidden font-inter animate-fade-in"
    >
      {/* Header (Draggable) */}
      <div 
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className="bg-slate-900/90 border-b border-green-500/20 p-3 flex justify-between items-center backdrop-blur cursor-move select-none"
      >
        <div className="flex items-center gap-2 text-green-400">
            <div className="p-1.5 bg-green-500/10 rounded-lg">
                <Bot className="w-4 h-4" />
            </div>
            <div>
                <h3 className="text-sm font-bold font-orbitron tracking-wide flex items-center gap-2">ACE AGENT <GripHorizontal className="w-3 h-3 opacity-50"/></h3>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] text-green-600/80 font-mono">ONLINE</span>
                </div>
            </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050505]">
        {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700'
                }`}>
                    {msg.role === 'agent' && (
                        <div className="flex items-center gap-1 mb-1 text-green-500 font-bold text-[9px] uppercase tracking-wider">
                            <Sparkles className="w-2 h-2" /> ACE AI
                        </div>
                    )}
                    {msg.content}
                </div>
            </div>
        ))}
        {isTyping && (
            <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-700">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="relative">
            <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about guidelines or data..."
                className="w-full bg-[#0a0a0a] border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-xs text-slate-200 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 placeholder-slate-600"
            />
            <button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send className="w-3 h-3" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
