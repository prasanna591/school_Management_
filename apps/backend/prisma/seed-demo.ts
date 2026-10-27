import { randomBytes } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, Role, Gender, GuardianRelation, Weekday } from '@prisma/client';
import bcrypt from 'bcryptjs';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const INDIAN_FIRST_NAMES_MALE = [
  'Aarav', 'Vihaan', 'Aditya', 'Vivaan', 'Ananya', 'Arjun', 'Reyansh', 'Krishna', 'Ishaan', 'Shaurya',
  'Atharv', 'Advik', 'Pranav', 'Rohan', 'Kabir', 'Ayaan', 'Dhruv', 'Yuvraj', 'Nikhil', 'Rahul'
];
const INDIAN_FIRST_NAMES_FEMALE = [
  'Aanya', 'Diya', 'Ananya', 'Pari', 'Myra', 'Kiara', 'Avni', 'Anika', 'Ira', 'Navya',
  'Shreya', 'Aditi', 'Riya', 'Sneha', 'Pooja', 'Neha', 'Kritika', 'Tanisha', 'Meera', 'Saanvi'
];
const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Singh', 'Kumar', 'Gupta', 'Patel', 'Reddy', 'Nair', 'Joshi', 'Agarwal',
  'Chauhan', 'Mishra', 'Pandey', 'Yadav', 'Tiwari', 'Saxena', 'Mehta', 'Shah', 'Bansal', 'Khatri'
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

async function main() {
  const year = new Date().getFullYear();
  const schoolName = process.env.SEED_SCHOOL_NAME ?? 'Greenfield Matriculation Higher Secondary School';
  
  const school = await prisma.school.upsert({
    where: { code: 'DEMO' },
    update: { name: schoolName },
    create: { name: schoolName, code: 'DEMO', currency: 'INR', timezone: 'Asia/Kolkata', address: '123 Education Road, Chennai, Tamil Nadu', phone: '+91-44-12345678' },
  });

  const passwordHash = await bcrypt.hash('demo1234', SALT_ROUNDS);

  // Create users
  const principal = await prisma.user.upsert({
    where: { email: 'principal@demo.school' },
    update: { passwordHash, role: Role.PRINCIPAL, schoolId: school.id, isActive: true },
    create: { email: 'principal@demo.school', passwordHash, firstName: 'Rajesh', lastName: 'Kumar', role: Role.PRINCIPAL, schoolId: school.id },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@demo.school' },
    update: { passwordHash, role: Role.ACCOUNTANT, schoolId: school.id, isActive: true },
    create: { email: 'accountant@demo.school', passwordHash, firstName: 'Sunita', lastName: 'Sharma', role: Role.ACCOUNTANT, schoolId: school.id },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.school' },
    update: { passwordHash, role: Role.TEACHER, schoolId: school.id, isActive: true },
    create: { email: 'teacher@demo.school', passwordHash, firstName: 'Amit', lastName: 'Singh', role: Role.TEACHER, schoolId: school.id },
  });

  const parent = await prisma.user.upsert({
    where: { email: 'parent@demo.school' },
    update: { passwordHash, role: Role.PARENT, schoolId: school.id, isActive: true },
    create: { email: 'parent@demo.school', passwordHash, firstName: 'Vikram', lastName: 'Patel', role: Role.PARENT, schoolId: school.id },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@demo.school' },
    update: { passwordHash, role: Role.STUDENT, schoolId: school.id, isActive: true },
    create: { email: 'student@demo.school', passwordHash, firstName: 'Kavya', lastName: 'Ramesh', role: Role.STUDENT, schoolId: school.id },
  });

  const existingAy = await prisma.academicYear.findFirst({ where: { schoolId: school.id, name: `${year}-${year + 1}` } });
  const academicYear = existingAy ?? await prisma.academicYear.create({
    data: { schoolId: school.id, name: `${year}-${year + 1}`, startDate: new Date(`${year}-04-01`), endDate: new Date(`${year + 1}-03-31`), isCurrent: true },
  });
  if (!existingAy) { await prisma.academicYear.update({ where: { id: academicYear.id }, data: { isCurrent: true } }); }

  // ------------------------------------------------------------------
  // Academic structure: Class 8, Section A, and the subjects taught there.
  // ------------------------------------------------------------------
  const class8 = await prisma.classLevel.findFirst({ where: { schoolId: school.id, name: 'Class 8' } })
    ?? await prisma.classLevel.create({ data: { schoolId: school.id, name: 'Class 8', numericLevel: 8 } });

  const sectionA = await prisma.section.findFirst({ where: { classLevelId: class8.id, name: 'A' } })
    ?? await prisma.section.create({ data: { schoolId: school.id, classLevelId: class8.id, name: 'A', capacity: 40 } });

  const subjectNames = ['Tamil', 'English', 'Mathematics', 'Science', 'Social Science'];
  const subjects = await Promise.all(subjectNames.map((name, index) =>
    prisma.subject.findFirst({ where: { schoolId: school.id, code: `SUB${String(index + 1).padStart(2, '0')}` } })
      .then((existing) => existing ?? prisma.subject.create({
        data: { schoolId: school.id, name, code: `SUB${String(index + 1).padStart(2, '0')}`, description: `${name} for Class 8` },
      })),
  ));
  for (const subject of subjects) {
    await prisma.classSubject.findFirst({ where: { classLevelId: class8.id, subjectId: subject.id } })
      ?? await prisma.classSubject.create({ data: { classLevelId: class8.id, subjectId: subject.id, isMandatory: true } });
  }

  // ------------------------------------------------------------------
  // Teacher: Amit Singh, assigned to Class 8-A (all Class 8 subjects).
  // ------------------------------------------------------------------
  const teacherProfile = await prisma.teacherProfile.findFirst({ where: { userId: teacher.id } })
    ?? await prisma.teacherProfile.create({
      data: { userId: teacher.id, schoolId: school.id, employeeNo: 'EMP1001', qualification: 'M.A., B.Ed.', specialization: 'Languages', joiningDate: new Date(`${year - 3}-06-01`) },
    });
  for (const subject of subjects) {
    await prisma.teacherAssignment.findFirst({
      where: { teacherId: teacherProfile.id, sectionId: sectionA.id, subjectId: subject.id, academicYearId: academicYear.id },
    })
      ?? await prisma.teacherAssignment.create({
        data: { teacherId: teacherProfile.id, sectionId: sectionA.id, subjectId: subject.id, academicYearId: academicYear.id },
      });
  }

  // ------------------------------------------------------------------
  // Guardian: Vikram Patel (parent), linked to his child Kavya.
  // ------------------------------------------------------------------
  const guardian = await prisma.guardian.findFirst({ where: { userId: parent.id } })
    ?? await prisma.guardian.create({
      data: { userId: parent.id, schoolId: school.id, firstName: 'Vikram', lastName: 'Patel', phone: '+91-44-9876543210', occupation: 'Business' },
    });

  const studentProfile = await prisma.studentProfile.findFirst({ where: { userId: student.id } })
    ?? await prisma.studentProfile.create({
      data: { userId: student.id, schoolId: school.id, admissionNo: 'GREEN-8001', admissionDate: new Date(`${year - 2}-06-01`), dateOfBirth: new Date(`${year - 10}-05-12`), gender: Gender.FEMALE, rollNo: '8', sectionId: sectionA.id },
    });
  await prisma.studentGuardian.findFirst({ where: { studentId: studentProfile.id, guardianId: guardian.id } })
    ?? await prisma.studentGuardian.create({
      data: { studentId: studentProfile.id, guardianId: guardian.id, isPrimary: true, relation: GuardianRelation.FATHER },
    });

  // A second student in the same class so the roster is not empty.
  const student2User = await prisma.user.findFirst({ where: { email: 'student2@demo.school' } })
    ?? await prisma.user.create({
      data: { email: 'student2@demo.school', passwordHash, firstName: 'Arjun', lastName: 'Nair', role: Role.STUDENT, schoolId: school.id },
    });
  const student2Profile = await prisma.studentProfile.findFirst({ where: { userId: student2User.id } })
    ?? await prisma.studentProfile.create({
      data: { userId: student2User.id, schoolId: school.id, admissionNo: 'GREEN-8002', admissionDate: new Date(`${year - 2}-06-01`), dateOfBirth: new Date(`${year - 9}-08-20`), gender: Gender.MALE, rollNo: '9', sectionId: sectionA.id },
    });

  // ------------------------------------------------------------------
  // Homework assigned by the teacher for Class 8-A (Mathematics).
  // ------------------------------------------------------------------
  const mathSubject = subjects.find((s) => s.name === 'Mathematics')!;
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 3);
  const homework = await prisma.homework.findFirst({ where: { schoolId: school.id, title: 'Linear Equations – Practice Worksheet' } })
    ?? await prisma.homework.create({
      data: {
        schoolId: school.id,
        sectionId: sectionA.id,
        subjectId: mathSubject.id,
        teacherId: teacherProfile.id,
        title: 'Linear Equations – Practice Worksheet',
        description: 'Solve exercise 3.1 (questions 1 to 10) from the Mathematics textbook and submit the workings on A4 paper.',
        materials: 'Mathematics textbook, Chapter 3',
        assignedDate: today,
        dueDate,
      },
    });
  for (const studentId of [studentProfile.id, student2Profile.id]) {
    await prisma.homeworkSubmission.findFirst({ where: { homeworkId: homework.id, studentId } })
      ?? await prisma.homeworkSubmission.create({ data: { homeworkId: homework.id, studentId, status: 'PENDING' } });
  }

  // ------------------------------------------------------------------
  // Examination: Class 8 Mathematics unit test (draft, not yet published).
  // ------------------------------------------------------------------
  const exam = await prisma.exam.findFirst({ where: { schoolId: school.id, name: 'Mathematics Unit Test 1' } })
    ?? await prisma.exam.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classLevelId: class8.id,
        name: 'Mathematics Unit Test 1',
        type: 'UNIT_TEST',
        maxMarks: 50,
        passingMarks: 20,
        startDate: today,
        endDate: today,
        isPublished: false,
      },
    });
  for (const studentId of [studentProfile.id, student2Profile.id]) {
    await prisma.examResult.findFirst({ where: { examId: exam.id, studentId } })
      ?? await prisma.examResult.create({
        data: { examId: exam.id, studentId, subjectId: mathSubject.id, marksObtained: studentId === studentProfile.id ? 42 : 38, maxMarks: 50 },
      });
  }

  // ------------------------------------------------------------------
  // Timetable for Class 8-A (Monday–Friday).
  // ------------------------------------------------------------------
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
  const periods = [
    { day: 'MONDAY', subject: subjects[0], start: '09:00', end: '09:45', room: '8-A-1' },
    { day: 'MONDAY', subject: subjects[2], start: '09:45', end: '10:30', room: '8-A-1' },
    { day: 'TUESDAY', subject: subjects[1], start: '09:00', end: '09:45', room: '8-A-1' },
    { day: 'TUESDAY', subject: subjects[3], start: '09:45', end: '10:30', room: '8-A-1' },
    { day: 'WEDNESDAY', subject: subjects[4], start: '09:00', end: '09:45', room: '8-A-1' },
    { day: 'WEDNESDAY', subject: subjects[0], start: '09:45', end: '10:30', room: '8-A-1' },
    { day: 'THURSDAY', subject: subjects[2], start: '09:00', end: '09:45', room: '8-A-1' },
    { day: 'THURSDAY', subject: subjects[1], start: '09:45', end: '10:30', room: '8-A-1' },
    { day: 'FRIDAY', subject: subjects[3], start: '09:00', end: '09:45', room: '8-A-1' },
    { day: 'FRIDAY', subject: subjects[4], start: '09:45', end: '10:30', room: '8-A-1' },
  ];
  for (const p of periods) {
    await prisma.timetableEntry.findFirst({
      where: { sectionId: sectionA.id, dayOfWeek: p.day as Weekday, startTime: p.start },
    })
      ?? await prisma.timetableEntry.create({
        data: { schoolId: school.id, sectionId: sectionA.id, subjectId: p.subject!.id, teacherId: teacherProfile.id, dayOfWeek: p.day as Weekday, startTime: p.start, endTime: p.end, room: p.room },
      });
  }

  // ------------------------------------------------------------------
  // Fee invoice for Kavya (Class 8) – outstanding, ready for a demo payment.
  // ------------------------------------------------------------------
  const feeCategory = await prisma.feeCategory.findFirst({ where: { schoolId: school.id, name: 'Tuition Fee' } })
    ?? await prisma.feeCategory.create({ data: { schoolId: school.id, name: 'Tuition Fee', description: 'Annual tuition fee for Class 8' } });
  const feeStructure = await prisma.feeStructure.findFirst({
    where: { academicYearId: academicYear.id, classLevelId: class8.id, feeCategoryId: feeCategory.id },
  })
    ?? await prisma.feeStructure.create({ data: { schoolId: school.id, academicYearId: academicYear.id, classLevelId: class8.id, feeCategoryId: feeCategory.id, amount: 15000, frequency: 'ANNUAL', dueDay: 10 } });
  const invoiceDue = new Date(today);
  invoiceDue.setDate(today.getDate() + 14);
  const existingInvoice = await prisma.invoice.findFirst({ where: { schoolId: school.id, invoiceNo: 'INV-2026-0001' } });
  let invoice = existingInvoice;
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        schoolId: school.id,
        studentId: studentProfile.id,
        academicYearId: academicYear.id,
        invoiceNo: 'INV-2026-0001',
        issueDate: today,
        dueDate: invoiceDue,
        status: 'ISSUED',
        subtotal: 15000,
        discount: 0,
        total: 15000,
        amountPaid: 0,
        balance: 15000,
        notes: 'Class 8 tuition fee (annual)',
      },
    });
    await prisma.invoiceItem.create({
      data: { invoiceId: invoice.id, description: 'Class 8 Tuition Fee – Academic Year', amount: 15000, feeStructureId: feeStructure.id },
    });
  }

  console.log('\n✅ Demo seed complete!');
  console.log(`School: ${school.name}`);
  console.log('\nDemo Logins (password: demo1234):');
  console.log('  Principal:   principal@demo.school');
  console.log('  Teacher:     teacher@demo.school');
  console.log('  Parent:      parent@demo.school (child: Kavya Ramesh, Class 8-A)');
  console.log('  Student:     student@demo.school (Kavya Ramesh, Class 8-A)');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
