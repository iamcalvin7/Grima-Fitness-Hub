import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Image as ImageIcon } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
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

type Message = {
  id: number;
  from: 'marcus' | 'me';
  text: string;
  time: string;
};

const initialThread: Message[] = [
  { id: 1, from: 'marcus', text: "Morning Marcus! Quick check-in — how are you feeling after Tuesday's session? Any soreness?", time: '09:15' },
  { id: 2, from: 'me', text: "Chest and shoulders are a bit sore but in a good way. Feeling strong overall!", time: '09:22' },
  { id: 3, from: 'marcus', text: "That's what we want. DOMS from that session means we hit the right intensity. Make sure you're doing some light movement today — a walk, some stretching.", time: '09:24' },
  { id: 4, from: 'me', text: "Will do. Should I still come Thursday if I'm still sore?", time: '09:30' },
  { id: 5, from: 'marcus', text: "Absolutely. We'll be doing legs and core Thursday so your upper body will have fully recovered. Just make sure you're eating well and hydrating.", time: '09:31' },
  { id: 6, from: 'me', text: "Got it. What should I eat today?", time: '09:35' },
  { id: 7, from: 'marcus', text: "Great work on yesterday's session. Make sure you're getting enough protein today — aim for at least 180g. See you Thursday 💪", time: '10:45' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
};

export const Messages = ({ setPage }: MessagesProps) => {
  const [openThread, setOpenThread] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialThread);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openThread) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [openThread, messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: messages.length + 1,
      from: 'me',
      text,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    // Auto-reply after 1.5s
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          from: 'marcus',
          text: "Got it — I'll keep that in mind for Thursday's session. Keep up the great work.",
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-foreground pb-24 overflow-x-hidden flex flex-col">
      <AnimatePresence mode="wait">
        {!openThread ? (
          <motion.div
            key="inbox"
            className="flex flex-col flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
          >
            {/* Header */}
            <header className="px-5 py-4 sticky top-0 z-30 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5">
              <h1 className="text-xl font-bold tracking-[0.15em] uppercase">Messages</h1>
            </header>

            <motion.div
              className="px-5 pt-6 flex flex-col gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {conversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  variants={itemVariants}
                  className="w-full bg-[#111111] border border-white/5 p-4 rounded-sm flex gap-4 items-start text-left hover:border-primary/20 transition-colors"
                  onClick={() => setOpenThread(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold shrink-0 text-sm">
                    {conv.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-sm tracking-wide">{conv.name}</h4>
                      <span className="text-[10px] text-foreground/40 font-semibold tracking-wider shrink-0 ml-2">{conv.time}</span>
                    </div>
                    <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-2">{conv.role}</p>
                    <p className="text-xs text-foreground/60 font-medium leading-relaxed line-clamp-2">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 mt-1">
                      {conv.unread}
                    </div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="thread"
            className="flex flex-col flex-1 h-screen"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Thread Header */}
            <header className="px-5 py-4 sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 flex items-center gap-3">
              <button onClick={() => setOpenThread(false)} className="text-foreground/60 hover:text-foreground transition-colors">
                <ChevronLeft size={22} />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-xs shrink-0">
                MG
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wider">Marcus Grima</h2>
                <p className="text-[10px] text-primary font-bold tracking-widest uppercase">Personal Trainer</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-32 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i < initialThread.length ? 0 : 0 }}
                >
                  {msg.from === 'marcus' && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold shrink-0 text-[10px] mb-1">
                      MG
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-sm text-sm font-medium leading-relaxed ${
                      msg.from === 'me'
                        ? 'bg-primary text-foreground rounded-br-none'
                        : 'bg-[#1A1A1A] text-foreground/90 rounded-bl-none border border-white/5'
                    }`}
                  >
                    {msg.text}
                    <p className={`text-[10px] mt-1.5 font-semibold ${msg.from === 'me' ? 'text-foreground/50 text-right' : 'text-foreground/30'}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#0A0A0A] border-t border-white/10 p-4 flex gap-3 items-center z-40">
              <button className="text-foreground/30 hover:text-foreground/60 transition-colors">
                <ImageIcon size={20} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Message..."
                className="flex-1 bg-[#1A1A1A] border border-white/10 px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/30 outline-none focus:border-primary/40 transition-colors rounded-sm"
              />
              <button
                onClick={sendMessage}
                className="w-10 h-10 bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors shrink-0"
              >
                <Send size={16} className="text-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!openThread && <BottomNav activePage="messages" onNavigate={setPage} />}
    </div>
  );
};
