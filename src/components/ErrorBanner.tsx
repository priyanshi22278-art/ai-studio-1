import React from 'react';
import { AlertTriangle, X, ShieldAlert, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ErrorBanner: React.FC = () => {
  const { currentError, clearError } = useAuth();
  const [copied, setCopied] = React.useState(false);

  if (!currentError) return null;

  const copyDetails = () => {
    navigator.clipboard.writeText(JSON.stringify(currentError, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-[500px] z-50 animate-in fade-in slide-in-from-top duration-300">
      <div className="bg-red-950/90 backdrop-blur-md border border-red-500/60 rounded-xl p-4 shadow-2xl text-red-100 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse text-red-400" />
            <span className="text-sm uppercase tracking-wider">System Exception Detected</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-white rounded-lg p-1 transition-colors"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-red-900/40 rounded-lg p-3 border border-red-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono bg-red-950 px-2 py-0.5 rounded border border-red-700/50 text-red-300 font-bold">
              CODE: {currentError.code}
            </span>
            <span className="text-red-300/70 text-[11px]">{currentError.timestamp}</span>
          </div>

          <p className="text-sm font-medium text-red-100 leading-snug">
            {currentError.message}
          </p>

          {currentError.details && (
            <p className="text-xs font-mono text-red-300/80 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">
              {currentError.details}
            </p>
          )}
        </div>

        <div className="flex justify-end items-center gap-2 pt-1 text-xs">
          <button
            onClick={copyDetails}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/60 hover:bg-red-800/80 text-red-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Error Details'}</span>
          </button>
          <button
            onClick={clearError}
            className="px-2.5 py-1 rounded-md bg-red-700 hover:bg-red-600 text-white font-medium transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
