import React, { useState } from 'react';
import { EventItem, RegistrationItem, CertificateItem, Student, EmailLogItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { AdminCalendarWidget } from '../components/AdminCalendarWidget';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  QrCode,
  Award,
  BarChart3,
  Mail,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  FileCheck2,
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

interface AdminDashboardProps {
  events: EventItem[];
  registrations: RegistrationItem[];
  certificates: CertificateItem[];
  students: Student[];
  emailLogs: EmailLogItem[];
  onOpenQRScanner: () => void;
  onOpenEmailLogs: () => void;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  registrations,
  certificates,
  students,
  emailLogs,
  onOpenQRScanner,
  onOpenEmailLogs,
  onRefresh,
}) => {
  const { user, setError } = useAuth();

  // Tabs for main section
  const [activeTab, setActiveTab] = useState<'operations' | 'registrations' | 'students' | 'analytics' | 'certificates'>('operations');

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form fields
  const [eventCustomId, setEventCustomId] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState<'Workshop' | 'Seminar' | 'Hackathon' | 'Guest Lecture' | 'Conference' | 'Academic'>('Workshop');
  const [eventDate, setEventDate] = useState('2026-10-15');
  const [eventTime, setEventTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('12:00');
  const [eventVenue, setEventVenue] = useState('Auditorium Hall A');
  const [eventCapacity, setEventCapacity] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [regFilter, setRegFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [selectedEventIdFilter, setSelectedEventIdFilter] = useState<string>('All');

  // Handlers for Events
  const openCreateModal = () => {
    setEditingEventId(null);
    setEventCustomId('');
    setEventName('');
    setEventDesc('');
    setEventCategory('Workshop');
    setEventDate('2026-10-15');
    setEventTime('10:00');
    setEventEndTime('12:00');
    setEventVenue('Auditorium Hall A');
    setEventCapacity('50');
    setIsEventModalOpen(true);
  };

  const openEditModal = (evt: EventItem) => {
    setEditingEventId(evt.eventId);
    setEventCustomId(evt.eventId);
    setEventName(evt.name);
    setEventDesc(evt.description);
    setEventCategory(evt.category);
    setEventDate(evt.date);
    setEventTime(evt.time);
    setEventEndTime(evt.endTime || '12:00');
    setEventVenue(evt.venue);
    setEventCapacity(String(evt.maxCapacity));
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const eventId = (editingEventId || eventCustomId || '').trim() || `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const payload = {
        eventId,
        name: eventName,
        description: eventDesc,
        category: eventCategory,
        date: eventDate,
        time: eventTime,
        endTime: eventEndTime,
        venue: eventVenue,
        maxCapacity: Number(eventCapacity),
        participantCount: 0,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdBy: user?.name || 'Admin',
      };

      let succeededViaApi = false;
      try {
        const res = await fetch(editingEventId ? `/api/events/${encodeURIComponent(editingEventId)}` : '/api/events', {
          method: editingEventId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {}

        if (data && res.ok) {
          succeededViaApi = true;
        } else if (data && !res.ok) {
          throw new Error(JSON.stringify({ message: data.error || 'Failed to save event', code: data.code || 'ERR_SAVE_EVENT' }));
        }
      } catch (networkErr: any) {
        if (networkErr.message && networkErr.message.includes('ERR_')) throw networkErr;
      }

      if (!succeededViaApi) {
        // Direct Firestore write
        await setDoc(doc(db, 'events', eventId), payload);
      }

      setIsEventModalOpen(false);
      onRefresh();
    } catch (err: any) {
      let parsed = { message: err.message, code: 'ERR_SAVE_EVENT' };
      try {
        parsed = JSON.parse(err.message);
      } catch {}
      setError(parsed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm(`Are you sure you want to delete event ${eventId}? Associated registrations will also be removed.`)) {
      return;
    }
    try {
      let succeededViaApi = false;
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
          method: 'DELETE',
        });
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        if (data && res.ok) succeededViaApi = true;
      } catch {}

      if (!succeededViaApi) {
        await deleteDoc(doc(db, 'events', eventId));
      }

      onRefresh();
    } catch (err: any) {
      let parsed = { message: err.message, code: 'ERR_DEL' };
      try {
        parsed = JSON.parse(err.message);
      } catch {}
      setError(parsed);
    }
  };

  // Student Account Approvals
  const handleApproveStudent = async (studentId: string) => {
    try {
      let succeeded = false;
      try {
        const res = await fetch('/api/admin/approve-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId }),
        });
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        if (data && res.ok) succeeded = true;
      } catch {}

      if (!succeeded) {
        await updateDoc(doc(db, 'students', studentId), {
          status: 'approved',
          approvedAt: new Date().toISOString(),
        });
      }

      onRefresh();
    } catch (err: any) {
      setError({ message: err.message, code: 'ERR_APPROVE_STUDENT' });
    }
  };

  const handleRejectStudent = async (studentId: string) => {
    const reason = prompt('Enter reason for rejecting this student account:');
    if (reason === null) return;
    try {
      let succeeded = false;
      try {
        const res = await fetch('/api/admin/reject-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, reason }),
        });
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        if (data && res.ok) succeeded = true;
      } catch {}

      if (!succeeded) {
        await updateDoc(doc(db, 'students', studentId), {
          status: 'rejected',
          rejectionReason: reason,
        });
      }

      onRefresh();
    } catch (err: any) {
      setError({ message: err.message, code: 'ERR_REJECT_STUDENT' });
    }
  };

  // Registration Approvals
  const handleApproveReg = async (regId: string) => {
    try {
      let succeeded = false;
      try {
        const res = await fetch(`/api/registrations/${encodeURIComponent(regId)}/approve`, {
          method: 'POST',
        });
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        if (data && res.ok) succeeded = true;
      } catch {}

      if (!succeeded) {
        await updateDoc(doc(db, 'registrations', regId), {
          status: 'Approved',
          approvalDate: new Date().toISOString(),
        });
      }

      onRefresh();
    } catch (err: any) {
      setError({ message: err.message, code: 'ERR_APPROVE_REG' });
    }
  };

  const handleRejectReg = async (regId: string) => {
    const reason = prompt('Enter reason for rejecting registration:');
    if (reason === null) return;
    try {
      let succeeded = false;
      try {
        const res = await fetch(`/api/registrations/${encodeURIComponent(regId)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        if (data && res.ok) succeeded = true;
      } catch {}

      if (!succeeded) {
        await updateDoc(doc(db, 'registrations', regId), {
          status: 'Rejected',
        });
      }

      onRefresh();
    } catch (err: any) {
      setError({ message: err.message, code: 'ERR_REJECT_REG' });
    }
  };

  const handleMarkAttendance = async (regId: string, status: 'Attended' | 'Absent') => {
    try {
      let succeeded = false;
      try {
        const res = await fetch(`/api/registrations/${encodeURIComponent(regId)}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendanceStatus: status }),
        });
        const text = await res.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch {}
        if (data && res.ok) succeeded = true;
      } catch {}

      if (!succeeded) {
        await updateDoc(doc(db, 'registrations', regId), { attendanceStatus: status });
      }

      onRefresh();
    } catch (err: any) {
      setError({ message: err.message, code: 'ERR_MARK_ATTENDANCE' });
    }
  };

  // Filtered registrations
  const filteredRegs = registrations.filter((r) => {
    const matchesStatus = regFilter === 'All' || r.status === regFilter;
    const matchesEvent = selectedEventIdFilter === 'All' || r.eventId === selectedEventIdFilter;
    return matchesStatus && matchesEvent;
  });

  const pendingStudents = students.filter((s) => s.status === 'pending');
  const pendingRegs = registrations.filter((r) => r.status === 'Pending');
  const approvedRegs = registrations.filter((r) => r.status === 'Approved');
  const rejectedRegs = registrations.filter((r) => r.status === 'Rejected');
  const attendedCount = registrations.filter((r) => r.attendanceStatus === 'Attended').length;

  return (
    <div className="space-y-6">
      {/* Admin Top Dashboard Bar */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Academic Directorate</span>
            <span>•</span>
            <span>Live Firestore Persistence</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Administrator Command Center
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Manage academic events, approve student registrations, scan QR passes, and audit automated dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>

          <button
            onClick={onOpenQRScanner}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Attendance Scanner</span>
          </button>

          <button
            onClick={onOpenEmailLogs}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Mail className="w-4 h-4 text-indigo-400" />
            <span>Email Audit Logs ({emailLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Total Events</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{events.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-slate-400 block font-medium">Registrations</span>
          <span className="text-2xl font-extrabold text-indigo-400 mt-1 block">{registrations.length}</span>
        </div>

        <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-amber-300 block font-medium">Pending Regs</span>
          <span className="text-2xl font-extrabold text-amber-400 mt-1 block">{pendingRegs.length}</span>
        </div>

        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-emerald-300 block font-medium">Approved Passes</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{approvedRegs.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-blue-300 block font-medium">Attended</span>
          <span className="text-2xl font-extrabold text-blue-400 mt-1 block">{attendedCount}</span>
        </div>

        <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] text-yellow-300 block font-medium">Pending Students</span>
          <span className="text-2xl font-extrabold text-yellow-400 mt-1 block">{pendingStudents.length}</span>
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT:
          Left / Center: Event Operations & Analytics
          Right: Google Calendar widget (Strictly required!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Operations & Analytics (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'operations'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Event Operations ({events.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('registrations')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'registrations'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Registration Approvals</span>
              {pendingRegs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {pendingRegs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Student Accounts</span>
              {pendingStudents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-yellow-500 text-slate-950 font-bold text-[10px]">
                  {pendingStudents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('certificates')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'certificates'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Certificates Registry ({certificates.length})</span>
            </button>
          </div>

          {/* TAB: EVENT OPERATIONS */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">Campus Events &amp; Workshops Directory</h3>
                <span className="text-xs text-slate-400 font-mono">{events.length} active events</span>
              </div>

              {events.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">No Events Created</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    The database is currently clean. Click <strong>Create New Event</strong> above to publish your first college workshop or seminar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div
                      key={evt.eventId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-950/70 px-2 py-0.5 rounded border border-blue-800/40">
                            {evt.category}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {evt.eventId}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              evt.status === 'open'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-950/80 text-red-300 border-red-500/40'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white">{evt.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{evt.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" /> {evt.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400" /> {evt.time} - {evt.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" /> {evt.venue}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-300">
                            <Users className="w-3.5 h-3.5 text-blue-400" /> {evt.participantCount} / {evt.maxCapacity} seats
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(evt)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteEvent(evt.eventId)}
                          className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-800/60 transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: REGISTRATION APPROVALS */}
          {activeTab === 'registrations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Participant Registrations &amp; Passes</h3>
                  <p className="text-xs text-slate-400">Review requests, approve entrance passes, or mark venue attendance.</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={regFilter}
                    onChange={(e: any) => setRegFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending Only</option>
                    <option value="Approved">Approved Only</option>
                    <option value="Rejected">Rejected Only</option>
                  </select>

                  <select
                    value={selectedEventIdFilter}
                    onChange={(e) => setSelectedEventIdFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none max-w-[160px]"
                  >
                    <option value="All">All Events</option>
                    {events.map((e) => (
                      <option key={e.eventId} value={e.eventId}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredRegs.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">No Registrations in this view</h4>
                  <p className="text-xs text-slate-500 mt-1">Students registering for events will appear here in real-time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRegs.map((reg) => (
                    <div
                      key={reg.registrationId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {reg.registrationId}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              reg.status === 'Approved'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : reg.status === 'Rejected'
                                ? 'bg-red-950/80 text-red-300 border-red-500/40'
                                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {reg.status}
                          </span>
                          {reg.attendanceStatus === 'Attended' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40">
                              Attended ✓
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-sm text-white pt-0.5">{reg.eventName}</div>
                        <div className="text-slate-300 font-medium">
                          Participant: <strong className="text-indigo-300">{reg.studentName}</strong> ({reg.studentId}) • {reg.studentCourse}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Registered on: {new Date(reg.registrationDate).toLocaleString()} • {reg.studentEmail}
                        </div>
                      </div>

                      {/* Approval / Attendance Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {reg.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApproveReg(reg.registrationId)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleRejectReg(reg.registrationId)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 flex items-center gap-1 transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {reg.status === 'Approved' && (
                          <div className="flex items-center gap-2">
                            {reg.attendanceStatus !== 'Attended' ? (
                              <button
                                onClick={() => handleMarkAttendance(reg.registrationId, 'Attended')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-md shadow-blue-600/20 transition-all"
                                title="Mark attendance and auto-issue certificate"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Check-In / Issue Certificate</span>
                              </button>
                            ) : (
                              <span className="text-xs text-blue-300 font-semibold px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-800/40">
                                Certificate Issued ✓
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: STUDENT ACCOUNTS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Student Account Approval Queue</h3>
                  <p className="text-xs text-slate-400">
                    Per college policy, students cannot log in until an administrator verifies their enrollment.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{students.length} students</span>
              </div>

              {students.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">No Student Accounts</h4>
                  <p className="text-xs text-slate-500 mt-1">When students create accounts, requests will appear here for verification.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((stu) => (
                    <div
                      key={stu.studentId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {stu.studentId}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              stu.status === 'approved'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : stu.status === 'rejected'
                                ? 'bg-red-950/80 text-red-300 border-red-500/40'
                                : 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40'
                            }`}
                          >
                            {stu.status}
                          </span>
                        </div>

                        <div className="font-bold text-sm text-white pt-0.5">{stu.name}</div>
                        <div className="text-slate-300">
                          Program: <strong className="text-indigo-300">{stu.course}</strong> • Username: <span className="font-mono">{stu.username}</span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Email: {stu.email} • Requested: {new Date(stu.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {stu.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveStudent(stu.studentId)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Authorize Access</span>
                            </button>

                            <button
                              onClick={() => handleRejectStudent(stu.studentId)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 flex items-center gap-1 transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        {stu.status === 'approved' && (
                          <span className="text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40">
                            Access Granted ✓
                          </span>
                        )}
                        {stu.status === 'rejected' && (
                          <span className="text-xs text-red-400 font-semibold px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-800/40">
                            Access Denied ✗
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                <h4 className="text-sm font-bold text-slate-200">Registration Status Breakdown</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                    <span className="text-xs text-emerald-300 block font-medium">Approved Passes</span>
                    <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{approvedRegs.length}</span>
                  </div>
                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                    <span className="text-xs text-amber-300 block font-medium">Pending Review</span>
                    <span className="text-xl font-extrabold text-amber-400 mt-1 block">{pendingRegs.length}</span>
                  </div>
                  <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl">
                    <span className="text-xs text-red-300 block font-medium">Rejected</span>
                    <span className="text-xl font-extrabold text-red-400 mt-1 block">{rejectedRegs.length}</span>
                  </div>
                </div>
              </div>

              {/* Event-Wise Registration Analytics */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                <h4 className="text-sm font-bold text-slate-200">Event-wise Capacity &amp; Attendance</h4>

                {events.length === 0 ? (
                  <p className="text-xs text-slate-500">No events created yet.</p>
                ) : (
                  <div className="space-y-4">
                    {events.map((evt) => {
                      const evtRegs = registrations.filter((r) => r.eventId === evt.eventId);
                      const approved = evtRegs.filter((r) => r.status === 'Approved').length;
                      const attended = evtRegs.filter((r) => r.attendanceStatus === 'Attended').length;
                      const capPct = Math.round((approved / (evt.maxCapacity || 1)) * 100);

                      return (
                        <div key={evt.eventId} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center text-slate-300 font-semibold">
                            <span>
                              {evt.name} <span className="font-mono text-slate-500 font-normal">({evt.eventId})</span>
                            </span>
                            <span className="font-mono text-blue-400">
                              {approved} / {evt.maxCapacity} Seats ({capPct}%) • {attended} Attended
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, capPct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CERTIFICATES REGISTRY */}
          {activeTab === 'certificates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Issued Certificates Ledger</h3>
                  <p className="text-xs text-slate-400">Cryptographically verifiable credentials issued to confirmed attendees.</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{certificates.length} credentials</span>
              </div>

              {certificates.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-300">No Certificates Generated Yet</h4>
                  <p className="text-xs text-slate-500 mt-1">Mark participant attendance in the registrations tab to issue certificates.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.certificateId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/40">
                            {cert.certificateId}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{cert.verificationCode}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{cert.eventName}</h4>
                        <p className="text-slate-300">
                          Recipient: <strong className="text-amber-300">{cert.studentName}</strong> ({cert.studentId})
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Issued on {new Date(cert.issueDate).toLocaleDateString()}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-bold uppercase text-[10px]">
                        Verified &amp; Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Google Calendar widget (Strictly positioned on right side of Event Operations & Analytics!) (4 Cols) */}
        <div className="lg:col-span-4 sticky top-20">
          <AdminCalendarWidget events={events} />
        </div>
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="font-bold text-slate-100 text-sm">
                {editingEventId ? `Edit Event ${editingEventId}` : 'Create Academic Event'}
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Event Code / ID (Optional - auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={eventCustomId}
                  onChange={(e) => setEventCustomId(e.target.value)}
                  placeholder="e.g., EVT-AI-01"
                  disabled={Boolean(editingEventId)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Modern Artificial Intelligence Workshop"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Comprehensive event summary, prerequisite knowledge, and learning outcomes..."
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category *</label>
                  <select
                    value={eventCategory}
                    onChange={(e: any) => setEventCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Guest Lecture">Guest Lecture</option>
                    <option value="Conference">Conference</option>
                    <option value="Academic">Academic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Capacity (Seats) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={eventCapacity}
                    onChange={(e) => setEventCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Venue / Hall *</label>
                <input
                  type="text"
                  required
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g., Computer Center Lab 4, Block C"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
