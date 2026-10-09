import React from 'react';
import { CertificateItem } from '../types';
import { X, Award, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CertificateModalProps {
  certificate: CertificateItem | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2 text-amber-400">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
              Academic Completion Certificate
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Canvas / Container */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="border-[6px] border-amber-600/60 bg-gradient-to-b from-amber-950/20 via-slate-950 to-amber-950/20 p-8 rounded-2xl relative text-center text-slate-100 shadow-2xl">
            {/* Ornate corner decorations */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-400/80" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-400/80" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-400/80" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-400/80" />

            {/* University Crest */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 mb-3 shadow-lg shadow-amber-500/20">
              <Award className="w-9 h-9" />
            </div>

            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/90 font-semibold mb-1">
              Campus Academic Council &amp; Event Directorate
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-100 tracking-tight mb-4">
              Certificate of Attendance
            </h2>

            <p className="text-xs text-slate-400 italic mb-2">This is proudly presented to certify that</p>

            <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent font-serif border-b border-amber-500/30 pb-2 inline-block px-8 max-w-full">
              {certificate.studentName}
            </h3>

            <p className="text-xs text-slate-400 mt-1 mb-4">
              Student ID: <span className="font-mono text-slate-300 font-semibold">{certificate.studentId}</span>
            </p>

            <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              has successfully participated and completed all instructional sessions for the academic program:
            </p>

            <h4 className="text-lg md:text-xl font-bold text-amber-300 mt-2 mb-4 px-4 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/30 inline-block">
              {certificate.eventName}
            </h4>

            <p className="text-xs text-slate-400">
              Conducted on <span className="text-slate-200 font-semibold">{certificate.eventDate}</span>
            </p>

            {/* Signatures & Verification Code */}
            <div className="mt-8 pt-6 border-t border-amber-500/20 grid grid-cols-2 md:grid-cols-3 gap-4 items-end text-xs">
              <div>
                <div className="h-8 flex items-center justify-center">
                  <span className="font-serif italic text-amber-300 text-base">Dr. A. Verma</span>
                </div>
                <div className="border-t border-slate-700 pt-1 text-[11px] text-slate-400">Dean of Academics</div>
              </div>

              <div className="hidden md:flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-1">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Official Seal</span>
              </div>

              <div>
                <div className="h-8 flex items-center justify-center">
                  <span className="font-serif italic text-amber-300 text-base">Prof. S. Iyer</span>
                </div>
                <div className="border-t border-slate-700 pt-1 text-[11px] text-slate-400">Event Coordinator</div>
              </div>
            </div>

            {/* Verification Metadata */}
            <div className="mt-6 pt-3 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
              <span>Certificate ID: <strong className="text-slate-400 font-mono">{certificate.certificateId}</strong></span>
              <span>Verification Code: <strong className="text-amber-400 font-mono">{certificate.verificationCode}</strong></span>
              <span>Issued: {new Date(certificate.issueDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Print / Download Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
