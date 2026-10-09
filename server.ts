import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for Backend
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, (firebaseConfig as any).firestoreDatabaseId);

// Initialize Gemini AI
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const app = express();
app.use(express.json());

// Helper for generating standard IDs
function generateId(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let str = '';
  for (let i = 0; i < 6; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${str}`;
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

// Register Student Request
app.post('/api/auth/register-student', async (req, res) => {
  try {
    const { studentId, name, email, course, username, password } = req.body;
    if (!studentId || !name || !email || !course || !username || !password) {
      return res.status(400).json({ error: 'All fields are required', code: 'AUTH_MISSING_FIELDS' });
    }

    // Check if username already exists
    const usersQ = query(collection(db, 'students'), where('username', '==', username.trim().toLowerCase()));
    const existingUser = await getDocs(usersQ);
    if (!existingUser.empty) {
      return res.status(400).json({ error: 'Username already taken', code: 'AUTH_USERNAME_EXISTS' });
    }

    // Check if studentId already exists
    const idDoc = await getDoc(doc(db, 'students', studentId.trim()));
    if (idDoc.exists()) {
      return res.status(400).json({
        error: 'Student ID already registered. Only one account request is permitted per student.',
        code: 'AUTH_STUDENT_ID_EXISTS',
      });
    }

    const studentRecord = {
      studentId: studentId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      course: course.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(), // Stored for academic prototype
      role: 'student',
      status: 'pending', // Awaiting Admin Approval
      createdAt: new Date().toISOString(),
      approvedAt: null,
    };

    await setDoc(doc(db, 'students', studentId.trim()), studentRecord);

    // Notify Admins about new student account request
    const notifId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', notifId), {
      notificationId: notifId,
      recipientId: 'admin',
      recipientRole: 'admin',
      title: 'New Student Account Request',
      message: `Student ${name} (${studentId}, ${course}) requested account access. Approval required.`,
      type: 'account_approval',
      read: false,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      message: 'Account request submitted successfully. Waiting for admin approval.',
      status: 'pending',
      student: studentRecord,
    });
  } catch (error: any) {
    console.error('Error registering student:', error);
    return res.status(500).json({ error: error.message || 'Server error', code: 'ERR_STUDENT_REGISTRATION' });
  }
});

// Register Admin
app.post('/api/auth/register-admin', async (req, res) => {
  try {
    const { adminId, name, email, department, username, password } = req.body;
    if (!adminId || !name || !email || !department || !username || !password) {
      return res.status(400).json({ error: 'All fields are required', code: 'AUTH_MISSING_FIELDS' });
    }

    // Check if username taken
    const q = query(collection(db, 'admins'), where('username', '==', username.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return res.status(400).json({ error: 'Username already taken', code: 'AUTH_USERNAME_EXISTS' });
    }

    const adminRecord = {
      adminId: adminId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'admins', adminId.trim()), adminRecord);

    return res.json({
      message: 'Admin account created successfully.',
      admin: adminRecord,
    });
  } catch (error: any) {
    console.error('Error registering admin:', error);
    return res.status(500).json({ error: error.message || 'Server error', code: 'ERR_ADMIN_REGISTRATION' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Identifier (Username, Student ID, or Email), password, and role are required', code: 'AUTH_MISSING_CREDENTIALS' });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const normalizedInput = cleanUser.replace(/\s+/g, '');

    if (role === 'admin') {
      let adminData = null;
      // Try by adminId doc
      const docSnap = await getDoc(doc(db, 'admins', cleanUser));
      if (docSnap.exists()) {
        adminData = docSnap.data();
      }

      // Try by username or email
      if (!adminData) {
        const snap = await getDocs(collection(db, 'admins'));
        for (const d of snap.docs) {
          const a = d.data();
          if (
            (a.username && a.username.toLowerCase() === cleanUser) ||
            (a.username && a.username.toLowerCase().replace(/\s+/g, '') === normalizedInput) ||
            (a.email && a.email.toLowerCase() === cleanUser) ||
            (a.adminId && a.adminId.toLowerCase() === cleanUser)
          ) {
            adminData = a;
            break;
          }
        }
      }

      if (!adminData) {
        return res.status(401).json({ error: 'Admin account not found.', code: 'AUTH_ADMIN_NOT_FOUND' });
      }
      if (adminData.password !== cleanPass) {
        return res.status(401).json({ error: 'Invalid password credentials.', code: 'AUTH_INVALID_PASSWORD' });
      }
      return res.json({ user: adminData, role: 'admin' });
    } else {
      // Student login: Support Username, Student ID, or Email
      let studentData = null;

      // 1. Check direct doc by studentId
      const docSnap = await getDoc(doc(db, 'students', cleanUser));
      if (docSnap.exists()) {
        studentData = docSnap.data();
      }

      // 2. Search by username, studentId, or email
      if (!studentData) {
        const snap = await getDocs(collection(db, 'students'));
        for (const d of snap.docs) {
          const s = d.data();
          if (
            (s.username && s.username.toLowerCase() === cleanUser) ||
            (s.username && s.username.toLowerCase().replace(/\s+/g, '') === normalizedInput) ||
            (s.studentId && s.studentId.toLowerCase() === cleanUser) ||
            (s.email && s.email.toLowerCase() === cleanUser)
          ) {
            studentData = s;
            break;
          }
        }
      }

      if (!studentData) {
        return res.status(401).json({
          error: 'Student account not found. Please verify your Username, Student ID, or Email.',
          code: 'AUTH_STUDENT_NOT_FOUND',
        });
      }

      if (studentData.password !== cleanPass) {
        return res.status(401).json({ error: 'Invalid password credentials.', code: 'AUTH_INVALID_PASSWORD' });
      }

      // Check account approval status
      if (studentData.status === 'pending') {
        return res.status(403).json({
          error: 'Your account registration is currently pending Administrator approval. You cannot log in until an Admin approves your access.',
          code: 'AUTH_ACCOUNT_PENDING_APPROVAL',
        });
      }
      if (studentData.status === 'rejected') {
        return res.status(403).json({
          error: `Your account registration was rejected by the Administrator. Reason: ${studentData.rejectionReason || 'Access denied'}.`,
          code: 'AUTH_ACCOUNT_REJECTED',
        });
      }

      return res.json({ user: studentData, role: 'student' });
    }
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: error.message || 'Server error', code: 'ERR_LOGIN_FAILED' });
  }
});

// ----------------------------------------------------
// ADMIN - STUDENT ACCOUNT MANAGEMENT
// ----------------------------------------------------

// List all students or filter by status
app.get('/api/admin/students', async (req, res) => {
  try {
    const status = req.query.status as string;
    let snap;
    if (status) {
      snap = await getDocs(query(collection(db, 'students'), where('status', '==', status)));
    } else {
      snap = await getDocs(collection(db, 'students'));
    }
    const students = snap.docs.map((d) => d.data());
    return res.json(students);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_FETCH_STUDENTS' });
  }
});

// Approve Student Account
app.post('/api/admin/approve-student', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required', code: 'MISSING_PARAM' });

    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return res.status(404).json({ error: 'Student not found', code: 'NOT_FOUND' });

    const studentData = snap.data();
    await updateDoc(studentRef, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });

    // Create in-app notification for student
    const notifId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', notifId), {
      notificationId: notifId,
      recipientId: studentId,
      recipientRole: 'student',
      title: 'Account Approved!',
      message: 'Your college portal account has been approved by the Admin. You can now log in and register for academic events.',
      type: 'account_approval',
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Create Email Log
    const logId = generateId('MAIL');
    await setDoc(doc(db, 'emailLogs', logId), {
      logId,
      to: studentData.email,
      subject: 'Account Approved - Campus Academic Portal',
      body: `Dear ${studentData.name},\n\nYour account access request for the Campus Event Management Portal has been APPROVED by the administration.\n\nYou may now sign in using your username "${studentData.username}" and participate in workshops and seminars.`,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });

    return res.json({ message: 'Student account approved successfully.', studentId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_APPROVE_STUDENT' });
  }
});

// Reject Student Account
app.post('/api/admin/reject-student', async (req, res) => {
  try {
    const { studentId, reason } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required', code: 'MISSING_PARAM' });

    const studentRef = doc(db, 'students', studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return res.status(404).json({ error: 'Student not found', code: 'NOT_FOUND' });

    const studentData = snap.data();
    await updateDoc(studentRef, {
      status: 'rejected',
      rejectionReason: reason || 'Information does not match college enrollment records.',
    });

    // Email Log
    const logId = generateId('MAIL');
    await setDoc(doc(db, 'emailLogs', logId), {
      logId,
      to: studentData.email,
      subject: 'Account Registration Status - Campus Academic Portal',
      body: `Dear ${studentData.name},\n\nYour account access request was not approved. Reason: ${reason || 'Details do not match current student records'}.\n\nPlease contact the academic office.`,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });

    return res.json({ message: 'Student account rejected.', studentId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_REJECT_STUDENT' });
  }
});

// ----------------------------------------------------
// EVENT MANAGEMENT ROUTES
// ----------------------------------------------------

// List all events
app.get('/api/events', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'events'));
    const events = snap.docs.map((d) => d.data());
    return res.json(events);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_FETCH_EVENTS' });
  }
});

// Create event
app.post('/api/events', async (req, res) => {
  try {
    const {
      eventId: customId,
      name,
      description,
      category,
      date,
      time,
      endTime,
      venue,
      maxCapacity,
      createdBy,
    } = req.body;

    if (!name || !description || !category || !date || !time || !venue || !maxCapacity) {
      return res.status(400).json({ error: 'All event fields are required', code: 'ERR_MISSING_EVENT_FIELDS' });
    }

    const eventId = customId && customId.trim() ? customId.trim() : generateId('EVT');

    // Check if event ID exists
    const existing = await getDoc(doc(db, 'events', eventId));
    if (existing.exists()) {
      return res.status(400).json({ error: `Event with code ${eventId} already exists`, code: 'ERR_EVENT_EXISTS' });
    }

    const newEvent = {
      eventId,
      name: name.trim(),
      description: description.trim(),
      category,
      date,
      time,
      endTime: endTime || '17:00',
      venue: venue.trim(),
      maxCapacity: Number(maxCapacity),
      participantCount: 0,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'Admin',
    };

    await setDoc(doc(db, 'events', eventId), newEvent);

    return res.json({ message: 'Event created successfully', event: newEvent });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_CREATE_EVENT' });
  }
});

// Update event
app.put('/api/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventRef = doc(db, 'events', eventId);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: `Event ${eventId} not found`, code: 'ERR_EVENT_NOT_FOUND' });
    }

    const updateData = { ...req.body };
    delete updateData.eventId; // Do not allow modifying primary key

    if (updateData.maxCapacity) {
      updateData.maxCapacity = Number(updateData.maxCapacity);
    }

    await updateDoc(eventRef, updateData);

    // Notify registered participants if details changed
    const regSnap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId)));
    for (const rDoc of regSnap.docs) {
      const reg = rDoc.data();
      const notifId = generateId('NOTIF');
      await setDoc(doc(db, 'notifications', notifId), {
        notificationId: notifId,
        recipientId: reg.studentId,
        recipientRole: 'student',
        title: `Event Updated: ${updateData.name || snap.data().name}`,
        message: `Details for event "${updateData.name || snap.data().name}" have been updated by the organizer. Please review your dashboard.`,
        type: 'event_update',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ message: 'Event updated successfully', eventId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_UPDATE_EVENT' });
  }
});

// Delete event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventRef = doc(db, 'events', eventId);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: `Event with code ${eventId} not found`, code: 'ERR_EVENT_NOT_FOUND' });
    }

    await deleteDoc(eventRef);

    // Also remove or cancel associated registrations
    const regSnap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId)));
    for (const rDoc of regSnap.docs) {
      await deleteDoc(rDoc.ref);
    }

    return res.json({ message: `Event ${eventId} deleted successfully.`, eventId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_DELETE_EVENT' });
  }
});

// ----------------------------------------------------
// REGISTRATION MANAGEMENT
// ----------------------------------------------------

// List registrations
app.get('/api/registrations', async (req, res) => {
  try {
    const { studentId, eventId, status } = req.query;
    let q = collection(db, 'registrations');
    let snap;

    if (studentId) {
      snap = await getDocs(query(q, where('studentId', '==', studentId)));
    } else if (eventId) {
      snap = await getDocs(query(q, where('eventId', '==', eventId)));
    } else {
      snap = await getDocs(q);
    }

    let items = snap.docs.map((d) => d.data());
    if (status) {
      items = items.filter((i: any) => i.status === status);
    }

    return res.json(items);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_FETCH_REGISTRATIONS' });
  }
});

// Student Event Registration
app.post('/api/registrations', async (req, res) => {
  try {
    const { studentId, eventId } = req.body;
    if (!studentId || !eventId) {
      return res.status(400).json({ error: 'studentId and eventId are required', code: 'ERR_MISSING_REG_FIELDS' });
    }

    // 1. Fetch student
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (!studentDoc.exists()) {
      return res.status(404).json({ error: 'Student not found', code: 'ERR_STUDENT_NOT_FOUND' });
    }
    const student = studentDoc.data();
    if (student.status !== 'approved') {
      return res.status(403).json({ error: 'Student account must be approved to register', code: 'ERR_STUDENT_NOT_APPROVED' });
    }

    // 2. Fetch event
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      return res.status(404).json({ error: `Event ${eventId} not found`, code: 'ERR_EVENT_NOT_FOUND' });
    }
    const event = eventDoc.data();

    // Validate registration is open
    if (event.status !== 'open') {
      return res.status(400).json({
        error: `Event is currently ${event.status}. Registrations are not accepted.`,
        code: 'ERR_EVENT_CLOSED',
      });
    }

    // 3. Prevent duplicate registration
    const existingQ = query(
      collection(db, 'registrations'),
      where('studentId', '==', studentId),
      where('eventId', '==', eventId)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      return res.status(400).json({
        error: `You have already registered for this event (${event.name}). Duplicate registrations are not permitted.`,
        code: 'ERR_DUPLICATE_REGISTRATION',
      });
    }

    // 4. Prevent registration if maximum capacity reached
    if (event.participantCount >= event.maxCapacity) {
      return res.status(400).json({
        error: `Event has reached maximum capacity (${event.maxCapacity} seats). Registration closed.`,
        code: 'ERR_CAPACITY_FULL',
      });
    }

    const regId = generateId('REG');
    const registrationRecord = {
      registrationId: regId,
      studentId: student.studentId,
      studentName: student.name,
      studentEmail: student.email,
      studentCourse: student.course,
      eventId: event.eventId,
      eventName: event.name,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      registrationDate: new Date().toISOString(),
      status: 'Pending',
      approvalDate: null,
      attendanceStatus: 'Pending',
      calendarEventId: null,
    };

    await setDoc(doc(db, 'registrations', regId), registrationRecord);

    // Notify Student
    const notifStudentId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', notifStudentId), {
      notificationId: notifStudentId,
      recipientId: student.studentId,
      recipientRole: 'student',
      title: 'Registration Submitted',
      message: `Your registration request for "${event.name}" on ${event.date} has been submitted. Status: Pending Admin Approval.`,
      type: 'registration',
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Notify Admin
    const notifAdminId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', notifAdminId), {
      notificationId: notifAdminId,
      recipientId: 'admin',
      recipientRole: 'admin',
      title: 'New Event Registration Request',
      message: `${student.name} (${student.course}) submitted a registration request for "${event.name}".`,
      type: 'registration',
      read: false,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      message: 'Registration request submitted. Pending Admin approval.',
      registration: registrationRecord,
    });
  } catch (error: any) {
    console.error('Error in registration:', error);
    return res.status(500).json({ error: error.message, code: 'ERR_SUBMIT_REGISTRATION' });
  }
});

// Admin Approve Registration
app.post('/api/registrations/:id/approve', async (req, res) => {
  try {
    const regId = req.params.id;
    const regRef = doc(db, 'registrations', regId);
    const snap = await getDoc(regRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Registration not found', code: 'ERR_NOT_FOUND' });
    }

    const reg = snap.data();
    if (reg.status === 'Approved') {
      return res.json({ message: 'Registration is already approved.', registration: reg });
    }

    // Check event capacity
    const eventRef = doc(db, 'events', reg.eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Associated event not found', code: 'ERR_EVENT_NOT_FOUND' });
    }
    const event = eventSnap.data();

    if (event.participantCount >= event.maxCapacity) {
      return res.status(400).json({ error: 'Cannot approve: Event maximum capacity has been reached.', code: 'ERR_CAPACITY_FULL' });
    }

    const approvalDate = new Date().toISOString();
    await updateDoc(regRef, {
      status: 'Approved',
      approvalDate,
    });

    // Increment participant count
    await updateDoc(eventRef, {
      participantCount: (event.participantCount || 0) + 1,
    });

    // In-app Notification for Student
    const notifId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', notifId), {
      notificationId: notifId,
      recipientId: reg.studentId,
      recipientRole: 'student',
      title: `Registration Approved: ${reg.eventName}`,
      message: `Congratulations! Your registration for "${reg.eventName}" has been APPROVED. Your Digital Event Pass with QR code is now available on your dashboard.`,
      type: 'approval',
      read: false,
      createdAt: approvalDate,
    });

    // Notification that Pass is available
    const passNotifId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', passNotifId), {
      notificationId: passNotifId,
      recipientId: reg.studentId,
      recipientRole: 'student',
      title: 'Digital Event Pass Ready',
      message: `Your entrance pass for "${reg.eventName}" at ${reg.eventVenue} (${reg.eventDate} ${reg.eventTime}) is ready for download.`,
      type: 'pass_available',
      read: false,
      createdAt: approvalDate,
    });

    // Email Notification
    const mailId = generateId('MAIL');
    const mailBody = `Dear ${reg.studentName},\n\nWe are pleased to inform you that your registration for the academic event "${reg.eventName}" has been APPROVED.\n\nEvent Details:\nDate: ${reg.eventDate}\nTime: ${reg.eventTime}\nVenue: ${reg.eventVenue}\nRegistration ID: ${reg.registrationId}\n\nYour Digital Event Pass with an attendance QR code has been generated. Please display this pass at the venue entrance.\n\nA Google Calendar invitation is also scheduled for your convenience.\n\nWarm regards,\nEvent Organizing Committee`;

    await setDoc(doc(db, 'emailLogs', mailId), {
      logId: mailId,
      to: reg.studentEmail,
      subject: `Registration Approved: ${reg.eventName} - Digital Pass Issued`,
      body: mailBody,
      status: 'sent',
      sentAt: approvalDate,
      eventId: reg.eventId,
    });

    return res.json({
      message: 'Registration approved successfully. Digital pass generated and notification sent.',
      registration: { ...reg, status: 'Approved', approvalDate },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_APPROVE_REGISTRATION' });
  }
});

// Admin Reject Registration
app.post('/api/registrations/:id/reject', async (req, res) => {
  try {
    const regId = req.params.id;
    const { reason } = req.body;
    const regRef = doc(db, 'registrations', regId);
    const snap = await getDoc(regRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Registration not found', code: 'ERR_NOT_FOUND' });
    }

    const reg = snap.data();
    const wasApproved = reg.status === 'Approved';

    await updateDoc(regRef, {
      status: 'Rejected',
    });

    // If was approved before, decrement participant count
    if (wasApproved) {
      const eventRef = doc(db, 'events', reg.eventId);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        const count = Math.max(0, (eventSnap.data().participantCount || 1) - 1);
        await updateDoc(eventRef, { participantCount: count });
      }
    }

    // In-app Notification for student
    const notifId = generateId('NOTIF');
    await setDoc(doc(db, 'notifications', notifId), {
      notificationId: notifId,
      recipientId: reg.studentId,
      recipientRole: 'student',
      title: `Registration Update: ${reg.eventName}`,
      message: `Your registration request for "${reg.eventName}" was not approved. ${reason ? `Reason: ${reason}` : ''}`,
      type: 'rejection',
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Email Notification
    const mailId = generateId('MAIL');
    await setDoc(doc(db, 'emailLogs', mailId), {
      logId: mailId,
      to: reg.studentEmail,
      subject: `Registration Status Update: ${reg.eventName}`,
      body: `Dear ${reg.studentName},\n\nWe regret to inform you that your registration for "${reg.eventName}" could not be accommodated at this time.\n\nReason: ${reason || 'Event capacity constraints or prerequisite requirements'}.\n\nThank you for your interest,\nEvent Organizing Committee`,
      status: 'sent',
      sentAt: new Date().toISOString(),
      eventId: reg.eventId,
    });

    return res.json({ message: 'Registration rejected.', registrationId: regId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_REJECT_REGISTRATION' });
  }
});

// Mark Attendance and Auto-Generate Certificate
app.post('/api/registrations/:id/attendance', async (req, res) => {
  try {
    const regId = req.params.id;
    const { attendanceStatus } = req.body; // 'Attended' or 'Absent'
    if (!attendanceStatus || !['Attended', 'Absent'].includes(attendanceStatus)) {
      return res.status(400).json({ error: 'attendanceStatus must be Attended or Absent', code: 'ERR_INVALID_STATUS' });
    }

    const regRef = doc(db, 'registrations', regId);
    const snap = await getDoc(regRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Registration not found', code: 'ERR_NOT_FOUND' });
    }

    const reg = snap.data();
    await updateDoc(regRef, { attendanceStatus });

    let certRecord = null;
    if (attendanceStatus === 'Attended') {
      // Check if certificate already exists
      const certQ = query(
        collection(db, 'certificates'),
        where('studentId', '==', reg.studentId),
        where('eventId', '==', reg.eventId)
      );
      const certSnap = await getDocs(certQ);

      if (certSnap.empty) {
        const certId = generateId('CERT');
        certRecord = {
          certificateId: certId,
          studentId: reg.studentId,
          studentName: reg.studentName,
          eventId: reg.eventId,
          eventName: reg.eventName,
          eventDate: reg.eventDate,
          issueDate: new Date().toISOString(),
          certificateStatus: 'Issued',
          verificationCode: `VERIF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        };
        await setDoc(doc(db, 'certificates', certId), certRecord);

        // Notify Student that Certificate is Available
        const notifId = generateId('NOTIF');
        await setDoc(doc(db, 'notifications', notifId), {
          notificationId: notifId,
          recipientId: reg.studentId,
          recipientRole: 'student',
          title: 'Certificate of Attendance Issued!',
          message: `Your verified Certificate of Attendance for "${reg.eventName}" has been issued and is available for viewing/download in your Certificates tab.`,
          type: 'certificate_available',
          read: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        certRecord = certSnap.docs[0].data();
      }
    }

    return res.json({
      message: `Attendance marked as ${attendanceStatus}.${certRecord ? ' Certificate generated.' : ''}`,
      registrationId: regId,
      attendanceStatus,
      certificate: certRecord,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_MARK_ATTENDANCE' });
  }
});

// ----------------------------------------------------
// CERTIFICATES
// ----------------------------------------------------

app.get('/api/certificates', async (req, res) => {
  try {
    const { studentId, eventId } = req.query;
    let snap;
    if (studentId) {
      snap = await getDocs(query(collection(db, 'certificates'), where('studentId', '==', studentId)));
    } else if (eventId) {
      snap = await getDocs(query(collection(db, 'certificates'), where('eventId', '==', eventId)));
    } else {
      snap = await getDocs(collection(db, 'certificates'));
    }
    return res.json(snap.docs.map((d) => d.data()));
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_FETCH_CERTIFICATES' });
  }
});

// ----------------------------------------------------
// NOTIFICATIONS & EMAIL LOGS
// ----------------------------------------------------

app.get('/api/notifications', async (req, res) => {
  try {
    const { recipientId, role } = req.query;
    let snap;
    if (recipientId) {
      snap = await getDocs(query(collection(db, 'notifications'), where('recipientId', '==', recipientId)));
    } else if (role === 'admin') {
      snap = await getDocs(query(collection(db, 'notifications'), where('recipientRole', '==', 'admin')));
    } else {
      snap = await getDocs(collection(db, 'notifications'));
    }
    const notifs = snap.docs.map((d) => d.data());
    notifs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(notifs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_FETCH_NOTIFICATIONS' });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const notifRef = doc(db, 'notifications', req.params.id);
    await updateDoc(notifRef, { read: true });
    return res.json({ message: 'Marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_READ_NOTIF' });
  }
});

app.get('/api/email-logs', async (req, res) => {
  try {
    const snap = await getDocs(collection(db, 'emailLogs'));
    const logs = snap.docs.map((d) => d.data());
    logs.sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_FETCH_EMAIL_LOGS' });
  }
});

// ----------------------------------------------------
// ANALYTICS
// ----------------------------------------------------

app.get('/api/analytics', async (req, res) => {
  try {
    const eventsSnap = await getDocs(collection(db, 'events'));
    const events = eventsSnap.docs.map((d) => d.data());

    const regSnap = await getDocs(collection(db, 'registrations'));
    const regs = regSnap.docs.map((d) => d.data());

    const certSnap = await getDocs(collection(db, 'certificates'));
    const certs = certSnap.docs.map((d) => d.data());

    const studentSnap = await getDocs(collection(db, 'students'));
    const students = studentSnap.docs.map((d) => d.data());

    const totalEvents = events.length;
    const totalRegistrations = regs.length;
    const approvedRegistrations = regs.filter((r: any) => r.status === 'Approved').length;
    const pendingRegistrations = regs.filter((r: any) => r.status === 'Pending').length;
    const rejectedRegistrations = regs.filter((r: any) => r.status === 'Rejected').length;
    const totalParticipants = approvedRegistrations;
    const certificatesIssued = certs.length;
    const attendedCount = regs.filter((r: any) => r.attendanceStatus === 'Attended').length;

    // Event-wise registrations
    const eventStats = events.map((e: any) => {
      const eventRegs = regs.filter((r: any) => r.eventId === e.eventId);
      return {
        eventId: e.eventId,
        name: e.name,
        category: e.category,
        maxCapacity: e.maxCapacity,
        participantCount: e.participantCount || 0,
        totalRegs: eventRegs.length,
        approved: eventRegs.filter((r: any) => r.status === 'Approved').length,
        pending: eventRegs.filter((r: any) => r.status === 'Pending').length,
        attended: eventRegs.filter((r: any) => r.attendanceStatus === 'Attended').length,
      };
    });

    return res.json({
      totalEvents,
      totalRegistrations,
      approvedRegistrations,
      pendingRegistrations,
      rejectedRegistrations,
      totalParticipants,
      certificatesIssued,
      attendedCount,
      totalStudents: students.length,
      pendingStudents: students.filter((s: any) => s.status === 'pending').length,
      eventStats,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message, code: 'ERR_ANALYTICS' });
  }
});

// ----------------------------------------------------
// AI AGENT / TOOL CALLING BACKEND
// ----------------------------------------------------

const AI_TOOLS = [
  // Shared / Student Tools
  {
    name: 'list_events',
    description: 'List or search upcoming events, workshops, or seminars in the college system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Optional category: Workshop, Seminar, Hackathon, Guest Lecture, Conference, Academic' },
        query: { type: Type.STRING, description: 'Optional search keyword in title or description' },
      },
    },
  },
  {
    name: 'get_event_details',
    description: 'Get comprehensive details for a specific event by ID or title.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        identifier: { type: Type.STRING, description: 'Event ID (e.g., EVT-XXXX) or approximate event name' },
      },
      required: ['identifier'],
    },
  },
  {
    name: 'register_student_for_event',
    description: 'Register the authenticated student for an open event. Checks capacity and duplicate status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING, description: 'The unique event ID to register for' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'get_my_registrations',
    description: 'Retrieve current registration requests, approval statuses, and passes for the logged-in student.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'check_certificate_status',
    description: 'Check if the student has earned a completion certificate for a particular event or list all certificates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING, description: 'Optional event ID to check' },
      },
    },
  },
  // Admin-Only Tools
  {
    name: 'admin_create_event',
    description: 'Create a new college academic event, workshop or seminar. Admin permission required.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Event title' },
        description: { type: Type.STRING, description: 'Detailed event description' },
        category: { type: Type.STRING, description: 'Workshop, Seminar, Hackathon, Guest Lecture, Conference, or Academic' },
        date: { type: Type.STRING, description: 'Date format YYYY-MM-DD' },
        time: { type: Type.STRING, description: 'Start time (e.g., 10:00 AM or 10:00)' },
        endTime: { type: Type.STRING, description: 'End time (e.g., 12:00 PM or 12:00)' },
        venue: { type: Type.STRING, description: 'Campus hall, lab or auditorium' },
        maxCapacity: { type: Type.NUMBER, description: 'Maximum seating capacity' },
      },
      required: ['name', 'description', 'category', 'date', 'time', 'venue', 'maxCapacity'],
    },
  },
  {
    name: 'admin_delete_event',
    description: 'Delete an event by its event code/ID. Admin permission required.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: { type: Type.STRING, description: 'The code of the event to delete (e.g., EVT-XXXX)' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'admin_approve_registration',
    description: 'Approve a pending student registration request and issue their digital pass. Admin only.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        registrationId: { type: Type.STRING, description: 'The registration ID to approve (e.g., REG-XXXX)' },
      },
      required: ['registrationId'],
    },
  },
  {
    name: 'admin_reject_registration',
    description: 'Reject a student registration request. Admin only.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        registrationId: { type: Type.STRING, description: 'The registration ID to reject' },
        reason: { type: Type.STRING, description: 'Reason for rejection' },
      },
      required: ['registrationId'],
    },
  },
  {
    name: 'admin_approve_student_account',
    description: 'Approve a student account registration request so they can log in. Admin only.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: 'The student ID to approve' },
      },
      required: ['studentId'],
    },
  },
  {
    name: 'admin_get_analytics_summary',
    description: 'Get overall event management analytics, capacity stats, and registration counts. Admin only.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

// Execute AI agent tools against live Firestore
async function executeAITool(toolName: string, args: any, user: any, role: string) {
  try {
    switch (toolName) {
      case 'list_events': {
        const snap = await getDocs(collection(db, 'events'));
        let events = snap.docs.map((d) => d.data());
        if (args.category) {
          events = events.filter((e: any) => e.category.toLowerCase() === args.category.toLowerCase());
        }
        if (args.query) {
          const q = args.query.toLowerCase();
          events = events.filter((e: any) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
        }
        return { count: events.length, events };
      }

      case 'get_event_details': {
        const identifier = (args.identifier || '').trim().toLowerCase();
        const snap = await getDocs(collection(db, 'events'));
        const event = snap.docs
          .map((d) => d.data())
          .find((e: any) => e.eventId.toLowerCase() === identifier || e.name.toLowerCase().includes(identifier));
        if (!event) return { error: `No event found matching "${args.identifier}"` };
        return { event };
      }

      case 'register_student_for_event': {
        if (role !== 'student' || !user?.studentId) {
          return { error: 'Only logged-in students can register for events.' };
        }
        const eventDoc = await getDoc(doc(db, 'events', args.eventId));
        if (!eventDoc.exists()) return { error: `Event ${args.eventId} does not exist.` };
        const event = eventDoc.data();
        if (event.status !== 'open') return { error: `Event is ${event.status}. Registrations closed.` };
        if (event.participantCount >= event.maxCapacity) return { error: 'Event capacity reached.' };

        // Duplicate check
        const dupSnap = await getDocs(
          query(collection(db, 'registrations'), where('studentId', '==', user.studentId), where('eventId', '==', args.eventId))
        );
        if (!dupSnap.empty) return { error: 'You have already registered for this event.' };

        const regId = generateId('REG');
        const regRecord = {
          registrationId: regId,
          studentId: user.studentId,
          studentName: user.name,
          studentEmail: user.email,
          studentCourse: user.course,
          eventId: event.eventId,
          eventName: event.name,
          eventDate: event.date,
          eventTime: event.time,
          eventVenue: event.venue,
          registrationDate: new Date().toISOString(),
          status: 'Pending',
          approvalDate: null,
          attendanceStatus: 'Pending',
        };
        await setDoc(doc(db, 'registrations', regId), regRecord);

        return { success: true, message: `Registration submitted for "${event.name}". Status: Pending Admin Approval.`, registrationId: regId };
      }

      case 'get_my_registrations': {
        if (role !== 'student' || !user?.studentId) {
          return { error: 'Student login required to check personal registrations.' };
        }
        const snap = await getDocs(query(collection(db, 'registrations'), where('studentId', '==', user.studentId)));
        const regs = snap.docs.map((d) => d.data());
        return { count: regs.length, registrations: regs };
      }

      case 'check_certificate_status': {
        if (role !== 'student' || !user?.studentId) {
          return { error: 'Student login required to view certificates.' };
        }
        let q = query(collection(db, 'certificates'), where('studentId', '==', user.studentId));
        const snap = await getDocs(q);
        let certs = snap.docs.map((d) => d.data());
        if (args.eventId) {
          certs = certs.filter((c: any) => c.eventId === args.eventId);
        }
        return { certificatesCount: certs.length, certificates: certs };
      }

      case 'admin_create_event': {
        if (role !== 'admin') return { error: 'Access denied: Admin role required to create events.' };
        const eventId = generateId('EVT');
        const newEvent = {
          eventId,
          name: args.name,
          description: args.description,
          category: args.category || 'Workshop',
          date: args.date,
          time: args.time,
          endTime: args.endTime || '17:00',
          venue: args.venue,
          maxCapacity: Number(args.maxCapacity) || 50,
          participantCount: 0,
          status: 'open',
          createdAt: new Date().toISOString(),
          createdBy: user.name || 'Admin',
        };
        await setDoc(doc(db, 'events', eventId), newEvent);
        return { success: true, message: `Event "${args.name}" successfully created with Code: ${eventId}`, event: newEvent };
      }

      case 'admin_delete_event': {
        if (role !== 'admin') return { error: 'Access denied: Admin role required to delete events.' };
        const eventRef = doc(db, 'events', args.eventId);
        const snap = await getDoc(eventRef);
        if (!snap.exists()) return { error: `Event with code "${args.eventId}" not found.` };
        await deleteDoc(eventRef);
        return { success: true, message: `Event ${args.eventId} (${snap.data().name}) has been deleted.` };
      }

      case 'admin_approve_registration': {
        if (role !== 'admin') return { error: 'Access denied: Admin role required.' };
        const regRef = doc(db, 'registrations', args.registrationId);
        const snap = await getDoc(regRef);
        if (!snap.exists()) return { error: `Registration ${args.registrationId} not found.` };
        const reg = snap.data();
        await updateDoc(regRef, { status: 'Approved', approvalDate: new Date().toISOString() });
        // Update participant count
        const eventRef = doc(db, 'events', reg.eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          await updateDoc(eventRef, { participantCount: (eventSnap.data().participantCount || 0) + 1 });
        }
        return { success: true, message: `Registration ${args.registrationId} for ${reg.studentName} has been approved.` };
      }

      case 'admin_reject_registration': {
        if (role !== 'admin') return { error: 'Access denied: Admin role required.' };
        const regRef = doc(db, 'registrations', args.registrationId);
        const snap = await getDoc(regRef);
        if (!snap.exists()) return { error: `Registration ${args.registrationId} not found.` };
        await updateDoc(regRef, { status: 'Rejected' });
        return { success: true, message: `Registration ${args.registrationId} has been rejected.` };
      }

      case 'admin_approve_student_account': {
        if (role !== 'admin') return { error: 'Access denied: Admin role required.' };
        const sRef = doc(db, 'students', args.studentId);
        const snap = await getDoc(sRef);
        if (!snap.exists()) return { error: `Student ${args.studentId} not found.` };
        await updateDoc(sRef, { status: 'approved', approvedAt: new Date().toISOString() });
        return { success: true, message: `Student account ${args.studentId} (${snap.data().name}) approved.` };
      }

      case 'admin_get_analytics_summary': {
        if (role !== 'admin') return { error: 'Access denied: Admin role required.' };
        const eSnap = await getDocs(collection(db, 'events'));
        const rSnap = await getDocs(collection(db, 'registrations'));
        const cSnap = await getDocs(collection(db, 'certificates'));
        const sSnap = await getDocs(collection(db, 'students'));
        return {
          totalEvents: eSnap.size,
          totalRegistrations: rSnap.size,
          approvedRegistrations: rSnap.docs.filter((d) => d.data().status === 'Approved').length,
          pendingRegistrations: rSnap.docs.filter((d) => d.data().status === 'Pending').length,
          certificatesIssued: cSnap.size,
          registeredStudents: sSnap.size,
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { error: err.message || 'Tool execution error' };
  }
}

// AI Chat Endpoint with Tool Calling
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, role, user, conversationHistory } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API is not configured. Please ensure GEMINI_API_KEY is available.',
        code: 'ERR_NO_AI_KEY',
      });
    }

    const systemPrompt = `You are the CampusEventFlow Intelligent Agent for an academic event management system.
Current User Role: ${role || 'guest'}
User Details: ${JSON.stringify(user || {})}
Current Date: 2026-10-08

Instructions:
1. Always use the provided tools to query or mutate database information. Never hallucinate or assume event dates, registration statuses, codes, or counts.
2. Strictly enforce user roles:
   - Students can query events, view their own registrations/passes/certificates, and register for open events.
   - Admins can create events, delete events (e.g. by event code), approve or reject registrations, approve student accounts, and view overall analytics.
   - If a student asks to delete an event, approve registrations, or create an event, politely inform them that this command requires Administrator privileges.
3. Be concise, professional, clear, and action-oriented. State the exact codes (Event ID, Registration ID, etc.) when an action succeeds.`;

    // Filter tools according to role
    const allowedTools = AI_TOOLS.filter((t) => {
      if (t.name.startsWith('admin_')) return role === 'admin';
      return true;
    });

    const modelName = 'gemini-2.5-flash';

    // Step 1: Call Gemini with tool definitions
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUser request: ${message}` }],
        },
      ],
      config: {
        tools: [{ functionDeclarations: allowedTools as any }],
      },
    });

    const functionCalls = response.functionCalls;

    if (!functionCalls || functionCalls.length === 0) {
      return res.json({
        reply: response.text || 'I understood your request. How else may I assist you?',
        actionsExecuted: [],
      });
    }

    // Step 2: Execute each function call against live database
    const actionsExecuted: any[] = [];
    const toolResultsParts: any[] = [];

    for (const call of functionCalls) {
      const toolName = call.name || '';
      const toolResult = await executeAITool(toolName, call.args, user, role);
      actionsExecuted.push({
        tool: toolName,
        arguments: call.args,
        result: toolResult,
      });

      toolResultsParts.push({
        functionResponse: {
          name: toolName,
          response: toolResult,
        },
      });
    }

    // Step 3: Send tool results back to Gemini for natural language synthesis
    const followUp = await ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser request: ${message}` }] },
        { role: 'model', parts: functionCalls.map((c: any) => ({ functionCall: c })) },
        { role: 'user', parts: toolResultsParts },
      ],
    });

    return res.json({
      reply: followUp.text || 'Action completed successfully.',
      actionsExecuted,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: error.message || 'AI processing error', code: 'ERR_AI_AGENT' });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVING
// ----------------------------------------------------

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
