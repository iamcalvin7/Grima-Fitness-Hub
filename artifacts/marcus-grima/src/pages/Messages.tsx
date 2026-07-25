import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Image as ImageIcon } from 'lucide-react';
import type { Page } from '@/App';

interface MessagesProps {
  setPage: (page: Page) => void;
}

const conversations = [
  {
    id: 1,
    name: 'Marcus Grima',
    initials: 'MG',
    role: 'Personal Trainer',
    lastMessage: "Great work on yesterday's session. Make sure you're getting enough protein today — aim for at least 180g. See you Thursday 💪",
    time: '2h ago',
    unread: 1,
  },
];

type Message = { id: number; from: 'marcus' | 'me'; text: string; time: string };

const initialThread: Message[] = [
  { id: 1, from: 'marcus', text: "Morning Marcus! Quick check-in — how are you feeling after Tuesday's session? Any soreness?", time: '09:15' },
  { id: 2, from: 'me', text: "Chest and shoulders are a bit sore but in a good way. Feeling strong overall!", time: '09:22' },
  { id: 3, from: 'marcus', text: "That's what we want. DOMS from that session means we hit the right intensity. Make sure you're doing some light movement today — a walk, some stretching.", time: '09:24' },
  { id: 4, from: 'me', text: "Will do. Should I still come Thursday if I'm still sore?", time: '09:30' },
  { id: 5, from: 'marcus', text: "Absolutely. We'll be doing legs and core Thursday so your upper body will have fully recovered. Just make sure you're eating well and hydrating.", time: '09:31' },
  { id: 6, from: 'me', text: "Got it. What should I eat today?", time: '09:35' },
  { id: 7, from: 'marcus', text: "Great work on yesterday's session. Make sure you're getting enough protein today — aim for at least 180g. See you Thursday 💪", time: '10:45' },
];

export const Messages = ({ setPage }: MessagesProps) => {
  const [mobileOpenThread, setMobileOpenThread] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialThread);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: prev.length + 1, from: 'me', text, time: now }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: prev.length + 1, from: 'marcus', text: "Got it — I'll keep that in mind for Thursday's session. Keep up the great work.", time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    }, 1500);
  };

  const ThreadView = () => (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 bg-[#0A0A0A]">
        <button className="md:hidden text-foreground/60 hover:text-foreground transition-colors" onClick={() => setMobileOpenThread(false)}>
          <ChevronLeft size={22} />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/25 shrink-0">
          <img src={`${import.meta.env.BASE_URL}marcus.png`} alt="Marcus Grima" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-wider">Marcus Grima</h2>
          <p className="text-[10px] text-primary font-bold tracking-widest uppercase">Personal Trainer</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'} items-end gap-2`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.from === 'marcus' && (
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/25 shrink-0 mb-1">
                <img src={`${import.meta.env.BASE_URL}marcus.png`} alt="Marcus Grima" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-3 text-sm font-medium leading-relaxed ${
              msg.from === 'me'
                ? 'bg-primary text-primary-foreground rounded-sm rounded-br-none'
                : 'bg-[#1A1A1A] text-foreground/90 rounded-sm rounded-bl-none border border-white/5'
            }`}>
              {msg.text}
              <p className={`text-[10px] mt-1.5 font-semibold ${msg.from === 'me' ? 'text-foreground/50 text-right' : 'text-foreground/30'}`}>{msg.time}</p>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-white/5 bg-[#0A0A0A] flex gap-3 items-center">
        <button className="text-foreground/30 hover:text-foreground/60 transition-colors shrink-0"><ImageIcon size={20} /></button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Message..."
          className="flex-1 bg-[#1A1A1A] border border-white/10 px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/30 outline-none focus:border-primary/40 transition-colors rounded-sm"
        />
        <button onClick={sendMessage} className="w-10 h-10 bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors shrink-0 rounded-sm">
          <Send size={16} className="text-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground flex flex-col">
      {/* Desktop: split pane layout */}
      <div className="hidden md:flex flex-1 h-screen">
        {/* Conversation list */}
        <div className="w-80 border-r border-white/5 flex flex-col shrink-0">
          <div className="px-6 py-5 border-b border-white/5">
            <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Messages</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="w-full p-5 flex gap-4 items-start text-left border-b border-white/5 bg-primary/5 border-l-2 border-l-primary cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <div className="w-11 h-11 rounded-full overflow-hidden border border-white/25 shrink-0">
                  <img src={`${import.meta.env.BASE_URL}marcus.png`} alt={conv.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="font-bold text-sm tracking-wide">{conv.name}</h4>
                    <span className="text-[10px] text-foreground/40 font-semibold tracking-wider shrink-0 ml-2">{conv.time}</span>
                  </div>
                  <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1.5">{conv.role}</p>
                  <p className="text-xs text-foreground/60 font-medium leading-relaxed line-clamp-2">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 mt-1">{conv.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col">
          {ThreadView()}
        </div>
      </div>

      {/* Mobile: stack view */}
      <div className="md:hidden flex-1 pb-24">
        <AnimatePresence mode="wait">
          {!mobileOpenThread ? (
            <motion.div key="inbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
              <header className="px-5 py-4 sticky top-0 z-30 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
                <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Messages</h1>
              </header>
              <div className="px-5 pt-6 flex flex-col gap-3">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full bg-[#111111] border border-white/5 p-4 rounded-sm flex gap-4 items-start text-left hover:border-primary/20 transition-colors"
                    onClick={() => setMobileOpenThread(true)}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/25 shrink-0">
                      <img src={`${import.meta.env.BASE_URL}marcus.png`} alt={conv.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-sm tracking-wide">{conv.name}</h4>
                        <span className="text-[10px] text-foreground/40 font-semibold tracking-wider shrink-0 ml-2">{conv.time}</span>
                      </div>
                      <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-2">{conv.role}</p>
                      <p className="text-xs text-foreground/60 font-medium leading-relaxed line-clamp-2">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 mt-1">{conv.unread}</div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="thread" className="flex flex-col h-[calc(100vh-4rem)]" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
              {ThreadView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
