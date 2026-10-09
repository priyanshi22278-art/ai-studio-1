import React, { useState } from 'react';
import { EventItem, RegistrationItem, CertificateItem, Student } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Clock3,
  Award,
  QrCode,
  Tag,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Mail,
  User as UserIcon,
  Filter,
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

interface StudentDashboardProps {
  events: EventItem[];
  registrations: RegistrationItem[];
  certificates: CertificateItem[];
  onSelectPass: (reg: RegistrationItem) => void;
  onSelectCertificate: (cert: CertificateItem) => void;
  onRefresh: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  events,
  registrations,
  certificates,
  onSelectPass,
  onSelectCertificate,
  onRefresh,
}) => {
  const { user, setError } = useAuth();
  const student = user as Student;

  const [activeTab, setActiveTab] = useState<'events' | 'my-registrations' | 'certificates' | 'profile'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedEventDetails, setSelectedEventDetails] = useState<EventItem | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  const categories = ['All', 'Workshop', 'Seminar', 'Hackathon', 'Guest Lecture', 'Conference', 'Academic'];

  // Registration map by eventId for quick lookup
  const registeredEventMap = new Map<string, RegistrationItem>();
  registrations.forEach((r) => {
    registeredEventMap.set(r.eventId, r);
  });

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || evt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleRegister = async (evt: EventItem) => {
    setRegisteringEventId(evt.eventId);
    try {
      let isSuccess = false;
      try {
        const res = await fetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.studentId,
            eventId: evt.eventId,
          }),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {}

        if (data && res.ok) {
          isSuccess = true;
        } else if (data && !res.ok) {
          throw new Error(JSON.stringify({ message: data.error || 'Registration failed', code: data.code || 'ERR_REGISTRATION' }));
        }
      } catch (networkErr: any) {
        if (networkErr.message && networkErr.message.includes('ERR_')) {
          throw networkErr;
        }
      }

      if (!isSuccess) {
        // Direct Firestore Fallback
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let regId = 'REG-';
        for (let i = 0; i < 6; i++) regId += chars.charAt(Math.floor(Math.random() * chars.length));

        const regRecord = {
          registrationId: regId,
          studentId: student.studentId,
          studentName: student.name,
          studentEmail: student.email,
          studentCourse: student.course,
          eventId: evt.eventId,
          eventName: evt.name,
          eventDate: evt.date,
          eventTime: evt.time,
          eventVenue: evt.venue,
          registrationDate: new Date().toISOString(),
          status: 'Pending',
          approvalDate: null,
          attendanceStatus: 'Pending',
        };

        await setDoc(doc(db, 'registrations', regId), regRecord);
      }

      onRefresh();
      setActiveTab('my-registrations');
    } catch (err: any) {
      let parsed = { message: err.message, code: 'ERR_REG' };
      try {
        parsed = JSON.parse(err.message);
      } catch {}
      setError(parsed);
    } finally {
      setRegisteringEventId(null);
    }
  };

  const approvedRegistrations = registrations.filter((r) => r.status === 'Approved');
  const pendingRegistrations = registrations.filter((r) => r.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Student Academic Portal</span>
            <span>•</span>
            <span className="font-mono">{student.course}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {student.name}
          </h2>
          <p className="text-slate-300 text-xs md:text-sm mt-1 leading-relaxed">
            Browse upcoming workshops, verify entrance passes, download accredited certificates, and let our AI Agent manage your academic agenda.
          </p>

          <div className="flex flex-wrap gap-4 mt-5 text-xs">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 flex items-center gap-2">
              <span className="font-bold text-indigo-400 text-sm">{registrations.length}</span>
              <span>Total Registrations</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 flex items-center gap-2">
              <span className="font-bold text-emerald-400 text-sm">{approvedRegistrations.length}</span>
              <span>Approved Passes</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-300 flex items-center gap-2">
              <span className="font-bold text-amber-400 text-sm">{certificates.length}</span>
              <span>Certificates Earned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Available Academic Events</span>
        </button>

        <button
          onClick={() => setActiveTab('my-registrations')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'my-registrations'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock3 className="w-4 h-4" />
          <span>My Registrations &amp; Passes</span>
          {pendingRegistrations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
              {pendingRegistrations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'certificates'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Certificates ({certificates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Student Profile</span>
        </button>
      </div>

      {/* TAB 1: BROWSE EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search workshops, seminars, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                    categoryFilter === cat
                      ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-300">No events found</h4>
              <p className="text-xs text-slate-500 mt-1">
                {events.length === 0
                  ? 'No events have been scheduled by the academic administration yet.'
                  : 'Try modifying your search query or category filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((evt) => {
                const reg = registeredEventMap.get(evt.eventId);
                const isFull = evt.participantCount >= evt.maxCapacity;
                const isClosed = evt.status !== 'open';

                return (
                  <div
                    key={evt.eventId}
                    className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-800/40">
                          {evt.category}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">{evt.eventId}</span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {evt.name}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span>{evt.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span>{evt.time} - {evt.endTime || '17:00'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="line-clamp-1">{evt.venue}</span>
                        </div>
                      </div>

                      {/* Capacity progress */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Seats Capacity</span>
                          <span className="font-mono font-semibold text-slate-200">
                            {evt.participantCount} / {evt.maxCapacity}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isFull ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                            style={{
                              width: `${Math.min(100, ((evt.participantCount || 0) / (evt.maxCapacity || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-5 pt-2">
                      {reg ? (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                          <div className="text-[11px]">
                            <span className="text-slate-500 block">Status:</span>
                            <span
                              className={`font-bold ${
                                reg.status === 'Approved'
                                  ? 'text-emerald-400'
                                  : reg.status === 'Rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {reg.status}
                            </span>
                          </div>

                          {reg.status === 'Approved' ? (
                            <button
                              onClick={() => onSelectPass(reg)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>View Pass</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {reg.registrationId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegister(evt)}
                          disabled={isFull || isClosed || registeringEventId === evt.eventId}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
                        >
                          {registeringEventId === evt.eventId ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : isFull ? (
                            <span>Capacity Full</span>
                          ) : isClosed ? (
                            <span>Registration Closed</span>
                          ) : (
                            <span>Register for Event</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY REGISTRATIONS & DIGITAL PASSES */}
      {activeTab === 'my-registrations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">My Registered Academic Events</h3>
              <p className="text-xs text-slate-400">
                Track approval status, generate QR event passes, and verify attendance records.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{registrations.length} total</span>
          </div>

          {registrations.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Clock3 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-300">No Registrations Yet</h4>
              <p className="text-xs text-slate-500 mt-1">
                You have not registered for any events. Browse the events catalog to enroll.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg) => (
                <div
                  key={reg.registrationId}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
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

                    <h4 className="text-base font-bold text-white">{reg.eventName}</h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {reg.eventDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> {reg.eventTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {reg.eventVenue}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {reg.status === 'Approved' && (
                      <button
                        onClick={() => onSelectPass(reg)}
                        className="py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View Digital Pass</span>
                      </button>
                    )}

                    {reg.status === 'Pending' && (
                      <span className="text-xs text-amber-400 italic bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/40">
                        Awaiting Admin Review
                      </span>
                    )}

                    {reg.status === 'Rejected' && (
                      <span className="text-xs text-red-400 italic bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-800/40">
                        Registration Not Approved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">Verified Academic Certificates</h3>
              <p className="text-xs text-slate-400">
                Official certificates awarded upon confirmed attendance check-in.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{certificates.length} earned</span>
          </div>

          {certificates.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-300">No Certificates Issued Yet</h4>
              <p className="text-xs text-slate-500 mt-1">
                Attend your registered workshops and seminars. When your entrance pass is scanned at the venue, your certificate will appear here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.certificateId}
                  className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-amber-400/60 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Award className="w-4 h-4" /> Certificate of Attendance
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{cert.certificateId}</span>
                    </div>

                    <h4 className="text-base font-bold text-white mt-1">{cert.eventName}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Event Date: <span className="text-slate-200">{cert.eventDate}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-2">
                      Code: {cert.verificationCode}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => onSelectCertificate(cert)}
                      className="py-2 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      <span>View &amp; Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 pb-3 border-b border-slate-800">
            Student Profile Information
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Full Name</span>
              <span className="font-semibold text-slate-200 text-sm">{student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Student Roll ID</span>
              <span className="font-mono font-semibold text-slate-200 text-sm">{student.studentId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">College Email</span>
              <span className="text-slate-200 font-medium">{student.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Degree / Course</span>
              <span className="text-slate-200 font-medium">{student.course}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Username</span>
              <span className="font-mono text-slate-300 font-semibold">{student.username}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Account Status</span>
              <span className="px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 font-bold uppercase text-[10px]">
                {student.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
