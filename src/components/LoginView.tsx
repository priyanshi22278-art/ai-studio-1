import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { GraduationCap, ShieldCheck, UserCheck, KeyRound, Mail, BookOpen, Building, CheckCircle2, AlertCircle, Sparkles, Clock } from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    login,
    registerStudent,
    registerAdmin,
    isLoading,
    googleConnected,
    connectGoogle,
    pendingApprovalStudent,
    clearPendingApproval,
    approveStudentDirect,
  } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [existingAccountNotice, setExistingAccountNotice] = useState<string | null>(null);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Student registration state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentCourse, setStudentCourse] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Admin registration state
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminDept, setAdminDept] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionSuccess(null);
    try {
      await login(username, password, activeRole);
    } catch {
      // Error is caught and displayed by ErrorBanner
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionSuccess(null);

    if (activeRole === 'student') {
      try {
        const res = await registerStudent({
          studentId,
          name: studentName,
          email: studentEmail,
          course: studentCourse,
          username: regUsername,
          password: regPassword,
        });
        setSubmissionSuccess(
          'Your student account request has been successfully submitted! An Administrator must review and approve your registration before you can log in. Only one request is allowed.'
        );
        setIsRegistering(false);
        setUsername(regUsername);
        setPassword('');
        // Clear registration fields
        setStudentId('');
        setStudentName('');
        setStudentEmail('');
        setStudentCourse('');
        setRegUsername('');
        setRegPassword('');
      } catch (err: any) {
        if (err.code === 'AUTH_STUDENT_ID_EXISTS') {
          setExistingAccountNotice(
            `Student ID "${studentId}" is already registered. You do not need to register again—please sign in using your Student ID or Username.`
          );
          setUsername(studentId);
          setIsRegistering(false);
        }
      }
    } else {
      try {
        await registerAdmin({
          adminId,
          name: adminName,
          email: adminEmail,
          department: adminDept,
          username: regUsername,
          password: regPassword,
        });
      } catch {
        // Error handled in context
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/30">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            CampusEventFlow
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            AI-Powered Academic Events, Passes &amp; Verification Portal
          </p>
        </div>

        {submissionSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-sm flex gap-3 items-start animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Request Received</p>
              <p className="mt-1 text-xs text-emerald-200/90 leading-relaxed">{submissionSuccess}</p>
            </div>
          </div>
        )}

        {existingAccountNotice && (
          <div className="mb-6 p-4 rounded-xl bg-blue-950/90 border border-blue-500/50 text-blue-200 text-xs space-y-2 animate-in fade-in shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Account Already Registered</span>
              </div>
              <button
                type="button"
                onClick={() => setExistingAccountNotice(null)}
                className="text-blue-400 hover:text-white text-xs px-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-blue-200/90 leading-relaxed">{existingAccountNotice}</p>
          </div>
        )}

        {pendingApprovalStudent && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs space-y-2 animate-in fade-in shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                <span>Student Account Verification Pending</span>
              </div>
              <button
                type="button"
                onClick={clearPendingApproval}
                className="text-amber-400 hover:text-white text-xs px-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              Student <strong>{pendingApprovalStudent.name}</strong> ({pendingApprovalStudent.studentId}) has registered and is waiting for Administrator authorization.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => approveStudentDirect(pendingApprovalStudent.studentId)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
              >
                <span>⚡ Authorize Account &amp; Log In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRole('admin');
                  clearPendingApproval();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700"
              >
                Switch to Admin Portal
              </button>
            </div>
          </div>
        )}

        {/* Card Container */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8">
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveRole('student');
                setSubmissionSuccess(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeRole === 'student'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRole('admin');
                setSubmissionSuccess(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeRole === 'admin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isRegistering ? `Create ${activeRole === 'student' ? 'Student' : 'Admin'} Account` : `${activeRole === 'student' ? 'Student' : 'Admin'} Sign In`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRegistering
                  ? activeRole === 'student'
                    ? 'Requires admin approval before access'
                    : 'Create college administrator account'
                  : 'Enter your credentials to continue'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setSubmissionSuccess(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
            >
              {isRegistering ? 'Already have account?' : 'Create Account'}
            </button>
          </div>

          {!isRegistering ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {activeRole === 'student' ? 'Username, Student ID, or Email' : 'Username, Admin ID, or Email'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={
                      activeRole === 'student'
                        ? 'e.g., student 1 or 2502070001 or email'
                        : 'e.g., admin_events or ADM-FACULTY-01'
                    }
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {activeRole === 'student' && (
                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-indigo-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>
                    New student? Request access via <strong>Create Account</strong>. After admin approval, sign in here to manage registrations.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign In as {activeRole === 'student' ? 'Student' : 'Administrator'}</span>
                )}
              </button>
            </form>
          ) : (
            /* CREATE ACCOUNT FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {activeRole === 'student' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Student ID / Roll No *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g., STU-2026-442"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g., Priyanshi Sharma"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      College Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="student@college.edu"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Academic Course / Degree *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={studentCourse}
                        onChange={(e) => setStudentCourse(e.target.value)}
                        placeholder="e.g., B.Tech Computer Science & AI"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* ADMIN REGISTRATION FIELDS */
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Staff ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      placeholder="e.g., ADM-FACULTY-01"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g., Dr. Rajesh Kumar"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Official College Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@college.edu"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Department / Office *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={adminDept}
                        onChange={(e) => setAdminDept(e.target.value)}
                        placeholder="e.g., Department of Computer Science & Academic Affairs"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Shared Username & Password */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Choose Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g., student_id"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Set Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {activeRole === 'student' && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-200/90">
                  ⚠️ Note: Student accounts require Admin approval before first login. Only one registration request is allowed per student.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>{activeRole === 'student' ? 'Submit Student Account Request' : 'Create Administrator Account'}</span>
                )}
              </button>
            </form>
          )}

          {/* Google Workspace Connection status footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${googleConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              Google Calendar &amp; Gmail
            </span>
            <button
              type="button"
              onClick={connectGoogle}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              {googleConnected ? 'Connected ✓' : 'Connect Account'}
            </button>
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-slate-400 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="block font-semibold text-slate-200">Real-Time</span>
            <span>Firestore Sync</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="block font-semibold text-slate-200">Digital Pass</span>
            <span>QR Attendance</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <span className="block font-semibold text-slate-200">AI Agent</span>
            <span>Natural Tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
};
