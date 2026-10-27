/**
 * Offline demo data for PSM School Management.
 *
 * Mirrors the seeded backend dataset (Greenfield Matriculation Higher
 * Secondary School) so the mobile app runs fully offline — no API, no
 * Metro bundler data dependency. All IDs, dates and shapes intentionally
 * match the real API responses so screens need no offline-specific branches.
 *
 * All data is clearly sample/demo data and must not be treated as real
 * school records.
 */

import type { Role } from '@smartschool/shared';
import type { SessionUser } from './api';

export interface DemoSchool {
  id: string;
  code: string;
  name: string;
  currency: string;
  timezone: string;
  address: string;
  phone: string;
}

export const DEMO_SCHOOL: DemoSchool = {
  id: 'sch_greenfield_001',
  code: 'DEMO',
  name: 'Greenfield Matriculation Higher Secondary School',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  address: '123 Education Road, Chennai, Tamil Nadu',
  phone: '+91-44-12345678',
};

const NOW = new Date().toISOString();
const TODAY = new Date().toISOString().slice(0, 10);

const PASSWORD = 'demo1234';

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  schoolId: string;
  isActive: boolean;
  phone: string | null;
  avatarUrl: string | null;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'usr_principal_001',
    email: 'principal@demo.school',
    password: PASSWORD,
    firstName: 'Rajesh',
    lastName: 'Kumar',
    role: 'PRINCIPAL',
    schoolId: 'sch_greenfield_001',
    isActive: true,
    phone: '+91-44-22334455',
    avatarUrl: null,
  },
  {
    id: 'usr_teacher_001',
    email: 'teacher@demo.school',
    password: PASSWORD,
    firstName: 'Amit',
    lastName: 'Singh',
    role: 'TEACHER',
    schoolId: 'sch_greenfield_001',
    isActive: true,
    phone: '+91-44-9876543211',
    avatarUrl: null,
  },
  {
    id: 'usr_accountant_001',
    email: 'accountant@demo.school',
    password: PASSWORD,
    firstName: 'Sunita',
    lastName: 'Sharma',
    role: 'ACCOUNTANT',
    schoolId: 'sch_greenfield_001',
    isActive: true,
    phone: '+91-44-9876543212',
    avatarUrl: null,
  },
  {
    id: 'usr_parent_001',
    email: 'parent@demo.school',
    password: PASSWORD,
    firstName: 'Vikram',
    lastName: 'Patel',
    role: 'PARENT',
    schoolId: 'sch_greenfield_001',
    isActive: true,
    phone: '+91-44-9876543210',
    avatarUrl: null,
  },
  {
    id: 'usr_student_001',
    email: 'student@demo.school',
    password: PASSWORD,
    firstName: 'Kavya',
    lastName: 'Ramesh',
    role: 'STUDENT',
    schoolId: 'sch_greenfield_001',
    isActive: true,
    phone: null,
    avatarUrl: null,
  },
  {
    id: 'usr_student_002',
    email: 'student2@demo.school',
    password: PASSWORD,
    firstName: 'Arjun',
    lastName: 'Nair',
    role: 'STUDENT',
    schoolId: 'sch_greenfield_001',
    isActive: true,
    phone: null,
    avatarUrl: null,
  },
];

export function findUserByEmail(email: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function demoUserToSession(user: DemoUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    schoolId: user.schoolId,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    lastLoginAt: new Date().toISOString(),
  };
}

export interface DemoTeacherProfile {
  id: string;
  userId: string;
  schoolId: string;
  employeeNo: string;
  qualification: string | null;
  specialization: string | null;
  joiningDate: string;
  status: string;
  designation: string;
  employmentType: string;
  user: DemoUser;
  school: DemoSchool;
}

export const DEMO_TEACHER_PROFILE: DemoTeacherProfile = {
  id: 'tch_001',
  userId: 'usr_teacher_001',
  schoolId: 'sch_greenfield_001',
  employeeNo: 'EMP1001',
  qualification: 'M.A., B.Ed.',
  specialization: 'Languages',
  joiningDate: '2023-06-01',
  status: 'ACTIVE',
  designation: 'OTHER',
  employmentType: 'FULL_TIME',
  user: DEMO_USERS.find((u) => u.id === 'usr_teacher_001')!,
  school: DEMO_SCHOOL,
};

export interface DemoClassLevel {
  id: string;
  schoolId: string;
  name: string;
  numericLevel: number;
}

export const DEMO_CLASS_LEVEL: DemoClassLevel = {
  id: 'cls_001',
  schoolId: 'sch_greenfield_001',
  name: 'Class 8',
  numericLevel: 8,
};

export interface DemoSection {
  id: string;
  schoolId: string;
  classLevelId: string;
  name: string;
  capacity: number;
  classLevel: DemoClassLevel;
}

export const DEMO_SECTION: DemoSection = {
  id: 'sec_8a_001',
  schoolId: 'sch_greenfield_001',
  classLevelId: 'cls_001',
  name: 'A',
  capacity: 40,
  classLevel: DEMO_CLASS_LEVEL,
};

export interface DemoSubject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  description: string | null;
}

export const DEMO_SUBJECTS: DemoSubject[] = [
  { id: 'sub_tamil', schoolId: 'sch_greenfield_001', name: 'Tamil', code: 'SUB01', description: 'Tamil for Class 8' },
  { id: 'sub_english', schoolId: 'sch_greenfield_001', name: 'English', code: 'SUB02', description: 'English for Class 8' },
  { id: 'sub_maths', schoolId: 'sch_greenfield_001', name: 'Mathematics', code: 'SUB03', description: 'Mathematics for Class 8' },
  { id: 'sub_science', schoolId: 'sch_greenfield_001', name: 'Science', code: 'SUB04', description: 'Science for Class 8' },
  { id: 'sub_social', schoolId: 'sch_greenfield_001', name: 'Social Science', code: 'SUB05', description: 'Social Science for Class 8' },
];

export interface DemoGuardian {
  id: string;
  userId: string | null;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  occupation: string | null;
  address: string | null;
  user: DemoUser | null;
  school: DemoSchool;
}

export const DEMO_GUARDIAN: DemoGuardian = {
  id: 'gdn_vikram_001',
  userId: 'usr_parent_001',
  schoolId: 'sch_greenfield_001',
  firstName: 'Vikram',
  lastName: 'Patel',
  email: 'parent@demo.school',
  phone: '+91-44-9876543210',
  occupation: 'Business',
  address: '45, Gandhi Road, Chennai, Tamil Nadu',
  user: DEMO_USERS.find((u) => u.id === 'usr_parent_001')!,
  school: DEMO_SCHOOL,
};

export interface DemoStudentGuardianLink {
  id: string;
  relation: string;
  isPrimary: boolean;
  guardian: DemoGuardian;
}

export interface DemoStudent {
  id: string;
  userId: string | null;
  schoolId: string;
  admissionNo: string;
  admissionDate: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string | null;
  address: string | null;
  rollNo: string | null;
  photoUrl: string | null;
  status: string;
  sectionId: string | null;
  section: DemoSection | null;
  user: DemoUser | null;
  guardians: DemoStudentGuardianLink[];
}

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    id: 'stu_kavya_001',
    userId: 'usr_student_001',
    schoolId: 'sch_greenfield_001',
    admissionNo: 'GREEN-8001',
    admissionDate: '2024-06-01',
    dateOfBirth: '2016-05-12',
    gender: 'FEMALE',
    bloodGroup: 'B+',
    address: '10, Anna Salai, Chennai, Tamil Nadu',
    rollNo: '8',
    photoUrl: null,
    status: 'ACTIVE',
    sectionId: 'sec_8a_001',
    section: DEMO_SECTION,
    user: DEMO_USERS.find((u) => u.id === 'usr_student_001')!,
    guardians: [
      {
        id: 'sg_kavya_001',
        relation: 'FATHER',
        isPrimary: true,
        guardian: DEMO_GUARDIAN,
      },
    ],
  },
  {
    id: 'stu_arjun_001',
    userId: 'usr_student_002',
    schoolId: 'sch_greenfield_001',
    admissionNo: 'GREEN-8002',
    admissionDate: '2024-06-01',
    dateOfBirth: '2017-08-20',
    gender: 'MALE',
    bloodGroup: 'O+',
    address: '22, Mount Road, Chennai, Tamil Nadu',
    rollNo: '9',
    photoUrl: null,
    status: 'ACTIVE',
    sectionId: 'sec_8a_001',
    section: DEMO_SECTION,
    user: DEMO_USERS.find((u) => u.id === 'usr_student_002')!,
    guardians: [],
  },
];

export const DEMO_STUDENT_ME: DemoStudent = DEMO_STUDENTS[0]!;

export interface DemoAttendance {
  id: string;
  studentId: string;
  sectionId: string;
  academicYearId: string;
  date: string;
  status: string;
  remarks: string | null;
  recordedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_ATTENDANCE: DemoAttendance[] = [
  {
    id: 'att_kavya_today',
    studentId: 'stu_kavya_001',
    sectionId: 'sec_8a_001',
    academicYearId: 'ay_2026_2027',
    date: TODAY,
    status: 'ABSENT',
    remarks: 'Leave application pending',
    recordedById: 'usr_teacher_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'att_kavya_yesterday',
    studentId: 'stu_kavya_001',
    sectionId: 'sec_8a_001',
    academicYearId: 'ay_2026_2027',
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    status: 'PRESENT',
    remarks: null,
    recordedById: 'usr_teacher_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'att_kavya_day_before',
    studentId: 'stu_kavya_001',
    sectionId: 'sec_8a_001',
    academicYearId: 'ay_2026_2027',
    date: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
    status: 'PRESENT',
    remarks: null,
    recordedById: 'usr_teacher_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'att_arjun_today',
    studentId: 'stu_arjun_001',
    sectionId: 'sec_8a_001',
    academicYearId: 'ay_2026_2027',
    date: TODAY,
    status: 'PRESENT',
    remarks: null,
    recordedById: 'usr_teacher_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'att_arjun_yesterday',
    studentId: 'stu_arjun_001',
    sectionId: 'sec_8a_001',
    academicYearId: 'ay_2026_2027',
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    status: 'LATE',
    remarks: 'Reached after assembly',
    recordedById: 'usr_teacher_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export interface DemoHomeworkSubmission {
  homeworkId: string;
  studentId: string;
  status: string;
  submittedAt: string | null;
  remarks: string | null;
}

export interface DemoHomework {
  id: string;
  schoolId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string | null;
  title: string;
  description: string | null;
  materials: string | null;
  assignedDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  subject: DemoSubject | null;
  section: DemoSection | null;
  teacher: DemoTeacherProfile | null;
  attachments: Array<{ id: string; homeworkId: string; name: string; url: string; createdAt: string }>;
  submissions: DemoHomeworkSubmission[];
}

export const DEMO_HOMEWORK: DemoHomework[] = [
  {
    id: 'hw_linear_001',
    schoolId: 'sch_greenfield_001',
    sectionId: 'sec_8a_001',
    subjectId: 'sub_maths',
    teacherId: 'tch_001',
    title: 'Linear Equations – Practice Worksheet',
    description: 'Solve exercise 3.1 (questions 1 to 10) from the Mathematics textbook and submit the workings on A4 paper.',
    materials: 'Mathematics textbook, Chapter 3',
    assignedDate: TODAY,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    createdAt: NOW,
    updatedAt: NOW,
    subject: DEMO_SUBJECTS.find((s) => s.id === 'sub_maths')!,
    section: DEMO_SECTION,
    teacher: DEMO_TEACHER_PROFILE,
    attachments: [
      { id: 'att_001', homeworkId: 'hw_linear_001', name: 'worksheet_3.1.pdf', url: 'https://demo.school/files/worksheet_3.1.pdf', createdAt: NOW },
    ],
    submissions: [
      { homeworkId: 'hw_linear_001', studentId: 'stu_kavya_001', status: 'SUBMITTED', submittedAt: NOW, remarks: 'Submitted on time' },
      { homeworkId: 'hw_linear_001', studentId: 'stu_arjun_001', status: 'PENDING', submittedAt: null, remarks: null },
    ],
  },
  {
    id: 'hw_essay_001',
    schoolId: 'sch_greenfield_001',
    sectionId: 'sec_8a_001',
    subjectId: 'sub_english',
    teacherId: 'tch_001',
    title: 'Essay – My Favourite Festival',
    description: 'Write a 200-word essay on your favourite festival and submit in your English notebook.',
    materials: 'English notebook, pen',
    assignedDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    createdAt: NOW,
    updatedAt: NOW,
    subject: DEMO_SUBJECTS.find((s) => s.id === 'sub_english')!,
    section: DEMO_SECTION,
    teacher: DEMO_TEACHER_PROFILE,
    attachments: [],
    submissions: [
      { homeworkId: 'hw_essay_001', studentId: 'stu_kavya_001', status: 'GRADED', submittedAt: NOW, remarks: 'Well written, A+' },
      { homeworkId: 'hw_essay_001', studentId: 'stu_arjun_001', status: 'SUBMITTED', submittedAt: NOW, remarks: null },
    ],
  },
];

export interface DemoExamResult {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemoExam {
  id: string;
  schoolId: string;
  academicYearId: string;
  termId: string | null;
  classLevelId: string;
  name: string;
  type: string;
  maxMarks: number;
  passingMarks: number;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_EXAM_RESULTS: DemoExamResult[] = [
  {
    id: 'res_kavya_maths',
    examId: 'exam_maths_unit_001',
    studentId: 'stu_kavya_001',
    subjectId: 'sub_maths',
    marksObtained: 42,
    maxMarks: 50,
    grade: 'B',
    remarks: 'Good effort',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'res_arjun_maths',
    examId: 'exam_maths_unit_001',
    studentId: 'stu_arjun_001',
    subjectId: 'sub_maths',
    marksObtained: 38,
    maxMarks: 50,
    grade: 'B',
    remarks: 'Can improve',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'res_kavya_english',
    examId: 'exam_maths_unit_001',
    studentId: 'stu_kavya_001',
    subjectId: 'sub_english',
    marksObtained: 45,
    maxMarks: 50,
    grade: 'A',
    remarks: 'Excellent',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const DEMO_EXAM: DemoExam = {
  id: 'exam_maths_unit_001',
  schoolId: 'sch_greenfield_001',
  academicYearId: 'ay_2026_2027',
  termId: null,
  classLevelId: 'cls_001',
  name: 'Mathematics Unit Test 1',
  type: 'UNIT_TEST',
  maxMarks: 50,
  passingMarks: 20,
  startDate: TODAY,
  endDate: TODAY,
  isPublished: true,
  createdAt: NOW,
  updatedAt: NOW,
};

export interface DemoTimetableEntry {
  id: string;
  schoolId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

export const DEMO_TIMETABLE: DemoTimetableEntry[] = [
  { id: 'tt_1', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_tamil', teacherId: 'tch_001', dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '09:45', room: '8-A-1' },
  { id: 'tt_2', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_maths', teacherId: 'tch_001', dayOfWeek: 'MONDAY', startTime: '09:45', endTime: '10:30', room: '8-A-1' },
  { id: 'tt_3', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_english', teacherId: 'tch_001', dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '09:45', room: '8-A-1' },
  { id: 'tt_4', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_science', teacherId: 'tch_001', dayOfWeek: 'TUESDAY', startTime: '09:45', endTime: '10:30', room: '8-A-1' },
  { id: 'tt_5', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_social', teacherId: 'tch_001', dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '09:45', room: '8-A-1' },
  { id: 'tt_6', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_tamil', teacherId: 'tch_001', dayOfWeek: 'WEDNESDAY', startTime: '09:45', endTime: '10:30', room: '8-A-1' },
  { id: 'tt_7', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_maths', teacherId: 'tch_001', dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '09:45', room: '8-A-1' },
  { id: 'tt_8', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_english', teacherId: 'tch_001', dayOfWeek: 'THURSDAY', startTime: '09:45', endTime: '10:30', room: '8-A-1' },
  { id: 'tt_9', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_science', teacherId: 'tch_001', dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '09:45', room: '8-A-1' },
  { id: 'tt_10', schoolId: 'sch_greenfield_001', sectionId: 'sec_8a_001', subjectId: 'sub_social', teacherId: 'tch_001', dayOfWeek: 'FRIDAY', startTime: '09:45', endTime: '10:30', room: '8-A-1' },
];

export interface DemoPayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
  receivedById: string | null;
  notes: string | null;
}

export interface DemoInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  amount: number;
  feeStructureId: string | null;
}

export interface DemoInvoice {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes: string | null;
  items: DemoInvoiceItem[];
  payments: DemoPayment[];
}

export const DEMO_INVOICE: DemoInvoice = {
  id: 'inv_001',
  schoolId: 'sch_greenfield_001',
  studentId: 'stu_kavya_001',
  academicYearId: 'ay_2026_2027',
  invoiceNo: 'INV-2026-0001',
  issueDate: TODAY,
  dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  status: 'PARTIALLY_PAID',
  subtotal: 15000,
  discount: 0,
  total: 15000,
  amountPaid: 5000,
  balance: 10000,
  notes: 'Class 8 tuition fee (annual)',
  items: [{ id: 'invitem_001', invoiceId: 'inv_001', description: 'Class 8 Tuition Fee – Academic Year', amount: 15000, feeStructureId: 'fs_001' }],
  payments: [
    { id: 'pay_001', invoiceId: 'inv_001', amount: 5000, method: 'CASH', reference: 'DEMO-RECPT-001', paidAt: NOW, receivedById: 'usr_accountant_001', notes: 'Demo payment - cash' },
  ],
};

export interface DemoServiceRequest {
  id: string;
  schoolId: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  studentId: string | null;
  requestedById: string | null;
  resolvedById: string | null;
  response: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_SERVICE_REQUESTS: DemoServiceRequest[] = [
  {
    id: 'sr_leave_001',
    schoolId: 'sch_greenfield_001',
    type: 'LEAVE',
    title: 'Leave request',
    description: 'Kavya needs leave on 2026-10-28 due to family function.',
    status: 'APPROVED',
    studentId: 'stu_kavya_001',
    requestedById: 'usr_parent_001',
    resolvedById: 'usr_principal_001',
    response: 'Leave approved for 2026-10-28.',
    resolvedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'sr_complaint_001',
    schoolId: 'sch_greenfield_001',
    type: 'COMPLAINT',
    title: 'Bus delay complaint',
    description: 'School bus is frequently late on route 3.',
    status: 'IN PROGRESS',
    studentId: 'stu_kavya_001',
    requestedById: 'usr_parent_001',
    resolvedById: null,
    response: null,
    resolvedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export interface DemoNotice {
  id: string;
  schoolId: string;
  title: string;
  body: string;
  audience: unknown | null;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_NOTICES: DemoNotice[] = [
  {
    id: 'notice_001',
    schoolId: 'sch_greenfield_001',
    title: 'School reopens after term break',
    body: 'Classes resume on 2 June 2026. Please ensure students come in proper uniform.',
    audience: null,
    isPinned: true,
    publishedAt: NOW,
    expiresAt: null,
    createdById: 'usr_principal_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'notice_002',
    schoolId: 'sch_greenfield_001',
    title: 'Parent-Teacher Meeting',
    body: 'PTM scheduled for 15 October 2026, 10:00 AM to 1:00 PM.',
    audience: null,
    isPinned: false,
    publishedAt: NOW,
    expiresAt: null,
    createdById: 'usr_principal_001',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export function findStudentByUserId(userId: string): DemoStudent | undefined {
  return DEMO_STUDENTS.find((s) => s.userId === userId);
}

export function studentIdsForGuardian(guardianUserId: string): string[] {
  return DEMO_STUDENTS.filter((s) =>
    s.guardians.some((g) => g.guardian.userId === guardianUserId),
  ).map((s) => s.id);
}

export function homeworkForStudent(studentId: string): DemoHomework[] {
  return DEMO_HOMEWORK.filter((hw) =>
    hw.submissions.some((sub) => sub.studentId === studentId),
  );
}

export function timetableForSection(sectionId: string): DemoTimetableEntry[] {
  return DEMO_TIMETABLE.filter((t) => t.sectionId === sectionId);
}

export function resultsForStudent(studentId: string): DemoExamResult[] {
  return DEMO_EXAM_RESULTS.filter((r) => r.studentId === studentId);
}

export function attendanceForStudent(studentId: string): DemoAttendance[] {
  return DEMO_ATTENDANCE.filter((a) => a.studentId === studentId);
}

export function invoiceForStudent(studentId: string): DemoInvoice | undefined {
  return DEMO_INVOICE.studentId === studentId ? DEMO_INVOICE : undefined;
}

export function noticesForSchool(): DemoNotice[] {
  return DEMO_NOTICES;
}
