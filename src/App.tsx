import React, { useEffect, useState } from 'react';
import { onSnapshot, collection, doc, updateDoc } from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { ErrorBanner } from './components/ErrorBanner';
import { DigitalPassModal } from './components/DigitalPassModal';
import { CertificateModal } from './components/CertificateModal';
import { QRScannerModal } from './components/QRScannerModal';
import { EmailLogViewerModal } from './components/EmailLogViewerModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { StudentDashboard } from './views/StudentDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import {
  EventItem,
  RegistrationItem,
  CertificateItem,
  NotificationItem,
  Student,
  EmailLogItem,
} from './types';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const { user, role, setError } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);

  // Modals state
  const [selectedPass, setSelectedPass] = useState<RegistrationItem | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isEmailLogsOpen, setIsEmailLogsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  // 1. Connection check on startup per Firebase integration skill
  useEffect(() => {
    testConnection().catch((err) => console.warn('Firestore test connection notice:', err));
  }, []);

  // 2. Real-time Firestore Listeners with error handling
  useEffect(() => {
    // Events listener
    const unsubEvents = onSnapshot(
      collection(db, 'events'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as EventItem);
        // Sort by date ascending
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'events');
      }
    );

    // Registrations listener
    const unsubRegs = onSnapshot(
      collection(db, 'registrations'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as RegistrationItem);
        list.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
        setRegistrations(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'registrations');
      }
    );

    // Certificates listener
    const unsubCerts = onSnapshot(
      collection(db, 'certificates'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as CertificateItem);
        list.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        setCertificates(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'certificates');
      }
    );

    // Notifications listener
    const unsubNotifs = onSnapshot(
      collection(db, 'notifications'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as NotificationItem);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    // Students listener
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Student);
        setStudents(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );

    // Email logs listener
    const unsubEmail = onSnapshot(
      collection(db, 'emailLogs'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as EmailLogItem);
        list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        setEmailLogs(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'emailLogs');
      }
    );

    return () => {
      unsubEvents();
      unsubRegs();
      unsubCerts();
      unsubNotifs();
      unsubStudents();
      unsubEmail();
    };
  }, []);

  const handleNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err: any) {
      console.warn('Notification read error:', err);
    }
  };

  const handleRefresh = () => {
    // Handled automatically by Firestore real-time onSnapshot listeners!
  };

  // Filter notifications for logged-in user
  const userNotifications = notifications.filter((n) => {
    if (role === 'admin') return n.recipientRole === 'admin';
    if (role === 'student' && user) return n.recipientId === (user as Student).studentId;
    return false;
  });

  // Filter student personal items
  const studentRegistrations = registrations.filter(
    (r) => role === 'student' && user && r.studentId === (user as Student).studentId
  );
  const studentCertificates = certificates.filter(
    (c) => role === 'student' && user && c.studentId === (user as Student).studentId
  );

  if (!user || !role) {
    return (
      <>
        <ErrorBanner />
        <LoginView />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Error Banner */}
      <ErrorBanner />

      {/* Main Navbar */}
      <Navbar
        notifications={userNotifications}
        onOpenAI={() => setIsAIOpen(true)}
        onNotificationRead={handleNotificationRead}
      />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {role === 'admin' ? (
          <AdminDashboard
            events={events}
            registrations={registrations}
            certificates={certificates}
            students={students}
            emailLogs={emailLogs}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenEmailLogs={() => setIsEmailLogsOpen(true)}
            onRefresh={handleRefresh}
          />
        ) : (
          <StudentDashboard
            events={events}
            registrations={studentRegistrations}
            certificates={studentCertificates}
            onSelectPass={(reg) => setSelectedPass(reg)}
            onSelectCertificate={(cert) => setSelectedCert(cert)}
            onRefresh={handleRefresh}
          />
        )}
      </main>

      {/* Floating AI Agent Trigger Button */}
      <button
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-semibold text-xs border border-indigo-400/40"
        title="Open Campus AI Agent"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="hidden sm:inline">Ask AI Agent</span>
      </button>

      {/* Digital Pass Modal */}
      <DigitalPassModal
        registration={selectedPass}
        onClose={() => setSelectedPass(null)}
      />

      {/* Certificate Modal */}
      <CertificateModal
        certificate={selectedCert}
        onClose={() => setSelectedCert(null)}
      />

      {/* QR Scanner Modal (Admin) */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onAttendanceMarked={handleRefresh}
      />

      {/* Email Log Viewer Modal */}
      <EmailLogViewerModal
        isOpen={isEmailLogsOpen}
        onClose={() => setIsEmailLogsOpen(false)}
        emailLogs={emailLogs}
      />

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onDataChanged={handleRefresh}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
