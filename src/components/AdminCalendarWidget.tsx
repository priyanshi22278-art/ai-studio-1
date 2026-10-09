import React, { useState } from 'react';
import { EventItem } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, ExternalLink, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCachedGoogleAccessToken } from '../firebase';

interface AdminCalendarWidgetProps {
  events: EventItem[];
  onSelectEvent?: (event: EventItem) => void;
}

export const AdminCalendarWidget: React.FC<AdminCalendarWidgetProps> = ({ events, onSelectEvent }) => {
  const { googleConnected, connectGoogle, setError } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 8)); // October 2026 matching system time
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-08');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group events by YYYY-MM-DD
  const eventsByDate = events.reduce((acc, evt) => {
    const d = evt.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(evt);
    return acc;
  }, {} as Record<string, EventItem[]>);

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysArray.push({
      day,
      dateStr: formattedDate,
      hasEvents: Boolean(eventsByDate[formattedDate]?.length),
      eventCount: eventsByDate[formattedDate]?.length || 0,
      events: eventsByDate[formattedDate] || [],
    });
  }

  const selectedEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : [];

  const syncAllEventsToGoogleCalendar = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      let token = getCachedGoogleAccessToken();
      if (!token) {
        await connectGoogle();
        token = getCachedGoogleAccessToken();
        if (!token) throw new Error('Google authorization is required to sync calendar.');
      }

      if (events.length === 0) {
        setSyncStatus('No scheduled events to sync yet.');
        return;
      }

      let syncedCount = 0;
      for (const evt of events) {
        const datePart = evt.date || '2026-10-08';
        const timePart = evt.time && evt.time.includes(':') ? evt.time : '10:00';
        const startIso = new Date(`${datePart}T${timePart.padStart(5, '0')}:00`).toISOString();
        const endIso = new Date(`${datePart}T${(evt.endTime || '12:00').padStart(5, '0')}:00`).toISOString();

        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: `[Campus] ${evt.name}`,
            description: `${evt.description}\nCategory: ${evt.category}\nVenue: ${evt.venue}\nEvent ID: ${evt.eventId}`,
            location: evt.venue,
            start: { dateTime: startIso },
            end: { dateTime: endIso },
          }),
        });
        syncedCount++;
      }

      setSyncStatus(`Successfully synced ${syncedCount} event(s) to your Google Calendar!`);
    } catch (err: any) {
      console.warn('Sync error:', err);
      // Fallback web intent
      const gcalUrl = 'https://calendar.google.com/calendar/r';
      window.open(gcalUrl, '_blank');
      setSyncStatus('Opened Google Calendar view.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Google Academic Calendar</h3>
            <p className="text-[11px] text-slate-400">Event Schedules &amp; Important Dates</p>
          </div>
        </div>

        <button
          onClick={syncAllEventsToGoogleCalendar}
          disabled={isSyncing}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Sync events to primary Google Calendar"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>{isSyncing ? 'Syncing...' : 'Sync with G-Calendar'}</span>
        </button>
      </div>

      {syncStatus && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Month Navigator */}
      <div className="flex items-center justify-between py-3">
        <span className="text-sm font-bold text-slate-200">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {daysArray.map((item, idx) => {
          if (!item) {
            return <div key={`empty-${idx}`} className="h-8 rounded-lg opacity-0" />;
          }

          const isSelected = item.dateStr === selectedDateStr;
          return (
            <button
              key={item.dateStr}
              onClick={() => setSelectedDateStr(item.dateStr)}
              className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                  : item.hasEvents
                  ? 'bg-slate-800/80 text-blue-300 font-semibold border border-blue-500/30 hover:bg-slate-700'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span>{item.day}</span>
              {item.hasEvents && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-blue-400 animate-pulse'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day's Scheduled Events */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex-1 flex flex-col min-h-[160px]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300">
            {selectedDateStr ? `Events for ${selectedDateStr}` : 'Selected Date'}
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedEvents.length} scheduled
          </span>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1 pr-1 max-h-[220px]">
          {selectedEvents.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
              No events scheduled for this date.
            </div>
          ) : (
            selectedEvents.map((evt) => (
              <div
                key={evt.eventId}
                onClick={() => onSelectEvent?.(evt)}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                    {evt.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{evt.eventId}</span>
                </div>
                <h5 className="text-xs font-bold text-slate-100 mt-1 group-hover:text-blue-300 transition-colors">
                  {evt.name}
                </h5>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> {evt.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" /> {evt.venue}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
