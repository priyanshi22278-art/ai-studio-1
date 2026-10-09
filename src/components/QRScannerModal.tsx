import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, AlertCircle, Camera, Check, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttendanceMarked: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onAttendanceMarked }) => {
  const { setError } = useAuth();
  const [scanInput, setScanInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPass, setVerifiedPass] = useState<any | null>(null);
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyAndMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setIsVerifying(true);
    setScanResultMsg(null);
    setVerifiedPass(null);

    try {
      let regId = scanInput.trim();
      let parsedPayload: any = null;

      // Check if raw JSON was pasted/scanned
      if (scanInput.includes('{') && scanInput.includes('}')) {
        try {
          parsedPayload = JSON.parse(scanInput);
          regId = parsedPayload.regId || parsedPayload.registrationId || regId;
        } catch {}
      }

      // Mark attendance via backend
      const res = await fetch(`/api/registrations/${encodeURIComponent(regId)}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceStatus: 'Attended' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify pass or mark attendance');
      }

      setVerifiedPass(parsedPayload || { regId });
      setScanResultMsg(data.message || 'Attendance verified! Certificate has been generated.');
      onAttendanceMarked();
    } catch (err: any) {
      setError({
        code: 'SCANNER_VERIFICATION_FAILED',
        message: err.message || 'Pass verification failed',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-2 text-indigo-400">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
              QR Entrance Check-In &amp; Verification
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Scan attendee digital pass QR code or input the <strong>Registration ID</strong> (e.g., <code className="text-indigo-300">REG-XXXXXX</code>) to confirm venue entry and automatically issue their attendance certificate.
          </p>

          <form onSubmit={handleVerifyAndMarkAttendance} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Scan Data / Registration ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Paste QR payload or enter REG-XXXXXX"
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isVerifying ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Verify &amp; Mark Attended</span>
                </>
              )}
            </button>
          </form>

          {scanResultMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Check-in Confirmed!</span>
              </div>
              <p className="text-emerald-200/90 leading-relaxed">{scanResultMsg}</p>
              {verifiedPass && verifiedPass.studentName && (
                <div className="mt-2 pt-2 border-t border-emerald-800/60 font-mono text-[11px]">
                  Participant: <strong>{verifiedPass.studentName}</strong> ({verifiedPass.studentId})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
