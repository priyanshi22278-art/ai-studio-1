import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { RegistrationItem } from '../types';
import { X, Calendar, MapPin, Clock, User, Hash, Download, CheckCircle, ExternalLink, CalendarPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCachedGoogleAccessToken } from '../firebase';

interface DigitalPassModalProps {
  registration: RegistrationItem | null;
  onClose: () => void;
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({ registration, onClose }) => {
  const { setError, googleConnected, connectGoogle } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [addingToCal, setAddingToCal] = useState<boolean>(false);
  const [calSuccess, setCalSuccess] = useState<string | null>(null);
  const passRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!registration) return;
    const qrPayload = JSON.stringify({
      passType: 'CAMPUS_EVENT_PASS',
      regId: registration.registrationId,
      studentId: registration.studentId,
      studentName: registration.studentName,
      eventId: registration.eventId,
      eventName: registration.eventName,
      date: registration.eventDate,
      time: registration.eventTime,
      venue: registration.eventVenue,
      status: registration.status,
    });

    QRCode.toDataURL(qrPayload, {
      width: 250,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [registration]);

  if (!registration) return null;

  const handlePrint = () => {
    window.print();
  };

  const addToGoogleCalendar = async () => {
    setAddingToCal(true);
    setCalSuccess(null);
    try {
      const token = getCachedGoogleAccessToken();
      if (!token) {
        // If not connected yet, trigger Google connect
        await connectGoogle();
        const freshToken = getCachedGoogleAccessToken();
        if (!freshToken) {
          throw new Error('Google authorization not completed');
        }
      }

      // Convert event date and time to ISO format
      // Default to event date + time (e.g., 2026-10-15 10:00)
      const datePart = registration.eventDate || new Date().toISOString().split('T')[0];
      const timePart = registration.eventTime && registration.eventTime.includes(':') ? registration.eventTime : '10:00';
      const startDateTime = `${datePart}T${timePart.padStart(5, '0')}:00`;
      // End time + 2 hours
      const endDateTime = `${datePart}T12:00:00`;

      const calendarPayload = {
        summary: `Academic Event: ${registration.eventName}`,
        description: `Your confirmed admission to "${registration.eventName}".\nRegistration ID: ${registration.registrationId}\nVenue: ${registration.eventVenue}\nStudent: ${registration.studentName} (${registration.studentId})`,
        location: registration.eventVenue,
        start: {
          dateTime: new Date(startDateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(endDateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: [{ email: registration.studentEmail, displayName: registration.studentName }],
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getCachedGoogleAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarPayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to add event to Google Calendar');
      }

      const eventData = await res.json();
      setCalSuccess(`Event added to your Google Calendar! Event link: ${eventData.htmlLink || 'Saved'}`);
    } catch (err: any) {
      console.warn('Google Calendar API error, fallback to calendar web link:', err);
      // Fallback: direct Google Calendar template web link
      const title = encodeURIComponent(registration.eventName);
      const details = encodeURIComponent(
        `Academic Event: ${registration.eventName}\nVenue: ${registration.eventVenue}\nRegistration ID: ${registration.registrationId}`
      );
      const loc = encodeURIComponent(registration.eventVenue);
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${loc}`;
      window.open(gcalUrl, '_blank');
      setCalSuccess('Opened Google Calendar to save your event.');
    } finally {
      setAddingToCal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-indigo-400">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
              Official Digital Event Pass
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / The Pass */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div
            ref={passRef}
            className="bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-2xl p-6 relative overflow-hidden shadow-xl"
          >
            {/* Holographic header accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            {/* Pass Watermark */}
            <div className="flex items-center justify-between pb-4 border-b border-indigo-500/20">
              <div>
                <p className="text-[10px] tracking-widest text-indigo-300 font-semibold uppercase">
                  College Academic Portal
                </p>
                <h4 className="text-xl font-extrabold text-white mt-0.5 leading-snug">
                  {registration.eventName}
                </h4>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                VERIFIED PASS
              </div>
            </div>

            {/* QR Code and Participant Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 items-center">
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner border border-slate-200">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Attendance Code" className="w-40 h-40 object-contain" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
                <span className="text-[10px] font-mono text-slate-600 mt-1">Scan for Attendance Check-in</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-400" /> Participant Name
                  </span>
                  <span className="font-bold text-slate-100 text-sm">{registration.studentName}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <Hash className="w-3 h-3 text-indigo-400" /> Student ID &amp; Course
                  </span>
                  <span className="font-semibold text-slate-200">
                    {registration.studentId} • {registration.studentCourse}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" /> Date &amp; Time
                  </span>
                  <span className="font-semibold text-slate-200">
                    {registration.eventDate} at {registration.eventTime}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-400" /> Venue / Room
                  </span>
                  <span className="font-semibold text-indigo-200">{registration.eventVenue}</span>
                </div>
              </div>
            </div>

            {/* Footer with Registration ID & Barcode stub */}
            <div className="pt-3 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-slate-400">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500">Registration ID</span>
                <span className="font-mono text-indigo-300 font-bold">{registration.registrationId}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-slate-500">Issued On</span>
                <span>{registration.approvalDate ? new Date(registration.approvalDate).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>
          </div>

          {calSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{calSuccess}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={addToGoogleCalendar}
              disabled={addingToCal}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <CalendarPlus className="w-4 h-4 text-indigo-400" />
              <span>{addingToCal ? 'Syncing...' : 'Add to Google Calendar'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
