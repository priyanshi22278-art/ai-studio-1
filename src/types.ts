export type UserRole = 'student' | 'admin';

export interface Student {
  studentId: string;
  name: string;
  email: string;
  course: string;
  username: string;
  password?: string;
  role: 'student';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string | null;
  rejectionReason?: string;
}

export interface AdminUser {
  adminId: string;
  name: string;
  email: string;
  department: string;
  username: string;
  password?: string;
  role: 'admin';
  createdAt: string;
}

export type EventCategory = 'Workshop' | 'Seminar' | 'Hackathon' | 'Guest Lecture' | 'Conference' | 'Academic';
export type EventStatus = 'open' | 'closed' | 'completed' | 'cancelled';

export interface EventItem {
  eventId: string;
  name: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  endTime: string;
  venue: string;
  maxCapacity: number;
  participantCount: number;
  status: EventStatus;
  createdAt: string;
  createdBy: string;
}

export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected';
export type AttendanceStatus = 'Pending' | 'Attended' | 'Absent';

export interface RegistrationItem {
  registrationId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentCourse: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  registrationDate: string;
  status: RegistrationStatus;
  approvalDate?: string | null;
  attendanceStatus: AttendanceStatus;
  calendarEventId?: string | null;
}

export interface CertificateItem {
  certificateId: string;
  studentId: string;
  studentName: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  issueDate: string;
  certificateStatus: 'Issued' | 'Revoked';
  verificationCode: string;
}

export interface NotificationItem {
  notificationId: string;
  recipientId: string;
  recipientRole: 'student' | 'admin';
  title: string;
  message: string;
  type: 'registration' | 'approval' | 'rejection' | 'event_update' | 'pass_available' | 'certificate_available' | 'account_approval';
  read: boolean;
  createdAt: string;
}

export interface EmailLogItem {
  logId: string;
  to: string;
  subject: string;
  body: string;
  status: 'sent' | 'queued' | 'simulated';
  sentAt: string;
  eventId?: string;
}

export interface SystemErrorItem {
  code: string;
  message: string;
  timestamp: string;
  details?: string;
}
