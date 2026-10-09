import React, { useState } from 'react';
import { EmailLogItem } from '../types';
import { X, Mail, Send, CheckCircle2, Search, Calendar, User } from 'lucide-react';

interface EmailLogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailLogs: EmailLogItem[];
}

export const EmailLogViewerModal: React.FC<EmailLogViewerModalProps> = ({ isOpen, onClose, emailLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);

  if (!isOpen) return null;

  const filtered = emailLogs.filter(
    (l) =>
      l.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2 text-indigo-400">
            <Mail className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
              Email Notification Dispatch Audit Logs
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left list */}
          <div className="w-full md:w-1/2 border-r border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter logs by recipient or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No email dispatches found.
                </div>
              ) : (
                filtered.map((log) => {
                  const isSelected = selectedLog?.logId === log.logId;
                  return (
                    <div
                      key={log.logId}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-100 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono text-indigo-400 font-semibold">{log.to}</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(log.sentAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{log.subject}</h5>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Dispatched
                        </span>
                        <span className="font-mono text-[9px]">{log.logId}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right preview */}
          <div className="w-full md:w-1/2 p-5 bg-slate-950/30 flex flex-col overflow-y-auto">
            {selectedLog ? (
              <div className="space-y-4 text-xs">
                <div className="pb-3 border-b border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      To: <strong className="text-slate-200">{selectedLog.to}</strong>
                    </span>
                    <span className="text-[10px]">{new Date(selectedLog.sentAt).toLocaleString()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-indigo-200 pt-1">{selectedLog.subject}</h4>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-200 whitespace-pre-wrap font-sans leading-relaxed text-xs">
                  {selectedLog.body}
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/30 text-[11px] text-indigo-300/80">
                  Status: <strong>{selectedLog.status.toUpperCase()}</strong> • Delivery confirmed to campus student inbox.
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                <Mail className="w-8 h-8 text-slate-600 mb-2" />
                Select any dispatch on the left to review message body and payload details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
