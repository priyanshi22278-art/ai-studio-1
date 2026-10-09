import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Send, X, Bot, User, Wrench, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionsExecuted?: Array<{
    tool: string;
    arguments: any;
    result: any;
  }>;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose, onDataChanged }) => {
  const { user, role, setError } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        role === 'admin'
          ? `Hello Administrator ${user?.name || ''}! I am your AI Operations Co-Pilot. I can create events, delete events by code, approve registrations, verify student accounts, and summarize analytics via natural commands.`
          : `Hello ${user?.name || ''}! I am your Campus Event AI Guide. Ask me about upcoming workshops, seminars, check your registration status, or register for events!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  // Suggested prompt pills based on user role
  const adminSuggestions = [
    'Which events are scheduled this month?',
    'Give me an analytics summary of registrations',
    'Create an AI Workshop on 2026-11-15 at 10:00 in Audi-1 for 60 students',
    'How many students have registered?',
    'Show pending student accounts',
  ];

  const studentSuggestions = [
    'Which AI workshops are happening this month?',
    'Show me upcoming seminars',
    'What is the status of my registration?',
    'Am I registered for the business analytics workshop?',
    'Do I have a certificate for this event?',
    'Show me my upcoming events',
  ];

  const suggestions = role === 'admin' ? adminSuggestions : studentSuggestions;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          role,
          user,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with AI agent');
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: data.reply || 'Action completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionsExecuted: data.actionsExecuted,
      };

      setMessages((prev) => [...prev, botMsg]);

      // If backend tool mutated state, trigger dashboard data refresh
      if (data.actionsExecuted && data.actionsExecuted.length > 0) {
        onDataChanged?.();
      }
    } catch (err: any) {
      setError({
        code: 'ERR_AI_AGENT_RESPONSE',
        message: err.message || 'AI Agent encountered an issue.',
      });
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: `Error: ${err.message || 'Could not process command.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              Campus AI Agent
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {role === 'admin' ? 'Admin Ops' : 'Student Guide'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Live Tool Calling &amp; Database Automation</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto flex gap-1.5 no-scrollbar">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(s)}
            className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-slate-300 transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isMe = m.sender === 'user';
          return (
            <div key={m.id} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-2 ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700/70 text-slate-100 rounded-tl-none shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Display executed tools badge if any */}
                {m.actionsExecuted && m.actionsExecuted.length > 0 && (
                  <div className="pt-2 border-t border-slate-700/60 space-y-1">
                    <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-indigo-400" /> Database Tools Invoked
                    </span>
                    {m.actionsExecuted.map((act, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/70 rounded-lg p-2 font-mono text-[10px] border border-slate-800 text-slate-300"
                      >
                        <div className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{act.tool}</span>
                        </div>
                        {act.result?.message && (
                          <div className="text-slate-400 mt-0.5">{act.result.message}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[9px] text-right ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}
                >
                  {m.timestamp}
                </div>
              </div>

              {isMe && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-xs text-indigo-400">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 px-3 py-2 rounded-xl text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Analyzing live database and executing tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              role === 'admin'
                ? 'e.g. Approve registration REG-XXXX or create seminar...'
                : 'e.g. Register me for AI workshop or check status...'
            }
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
