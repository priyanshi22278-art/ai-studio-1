import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';
import {
  GraduationCap,
  ShieldCheck,
  Bell,
  Sparkles,
  LogOut,
  CalendarCheck2,
  CalendarPlus,
  User,
  CheckCircle2,
  X,
} from 'lucide-react';

interface NavbarProps {
  notifications: NotificationItem[];
  onOpenAI: () => void;
  onNotificationRead: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ notifications, onOpenAI, onNotificationRead }) => {
  const { user, role, logout, googleConnected, connectGoogle } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                CampusEventFlow
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  role === 'admin'
                    ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                    : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                }`}
              >
                {role === 'admin' ? 'Administrator' : 'Student Portal'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {role === 'admin'
                ? 'Academic Events &amp; Registration Directorate'
                : 'Workshops, Seminars &amp; Academic Passes'}
            </p>
          </div>
        </div>

        {/* Right tools and user info */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Google Workspace / Calendar Status */}
          <button
            onClick={connectGoogle}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              googleConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
            }`}
            title={googleConnected ? 'Google Workspace Connected' : 'Connect Google Calendar'}
          >
            {googleConnected ? (
              <>
                <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Calendar Active</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Connect Google Calendar</span>
              </>
            )}
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">AI Agent</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-xs text-slate-200">Campus Alerts &amp; Updates</span>
                  <span className="text-[10px] text-slate-400 font-mono">{notifications.length} total</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.notificationId}
                        onClick={() => onNotificationRead(n.notificationId)}
                        className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                          n.read
                            ? 'bg-slate-950/40 border-slate-800/70 text-slate-400'
                            : 'bg-indigo-950/40 border-indigo-500/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span className="font-semibold text-indigo-300">{n.title}</span>
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile capsule */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left text-xs leading-tight">
              <div className="font-bold text-slate-200 line-clamp-1">{user?.name}</div>
              <div className="text-[10px] text-slate-400 line-clamp-1">
                {role === 'student' ? (user as any)?.course : (user as any)?.department}
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800/60 border border-slate-700 text-slate-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
