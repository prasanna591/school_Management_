import { randomBytes } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, Role, Gender } from '@prisma/client';
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
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const year = new Date().getFullYear();
  const schoolName = process.env.SEED_SCHOOL_NAME ?? 'Shree Saraswati Vidya Mandir';
  
  const school = await prisma.school.upsert({
    where: { code: 'DEMO' },
    update: { name: schoolName },
    create: { name: schoolName, code: 'DEMO', currency: 'INR', timezone: 'Asia/Kolkata', address: '123 Education Road, New Delhi', phone: '+91-11-12345678' },
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

  const existingAy = await prisma.academicYear.findFirst({ where: { schoolId: school.id, name: `${year}-${year + 1}` } });
  if (existingAy) { await prisma.academicYear.update({ where: { id: existingAy.id }, data: { isCurrent: true } }); }
  else { await prisma.academicYear.create({ data: { schoolId: school.id, name: `${year}-${year + 1}`, startDate: new Date(`${year}-04-01`), endDate: new Date(`${year + 1}-03-31`), isCurrent: true } }); }

  // Create sections/classes
  const classNames = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];
  for (const name of classNames) {
    if ((prisma as any).section) {
      const existing = await (prisma as any).section.findFirst({ where: { schoolId: school.id, name } }).catch(()=>null);
      if (!existing) { await (prisma as any).section.create({ data: { name, schoolId: school.id } }).catch(()=>{}); }
    }
  }

  console.log('\n✅ Demo seed complete!');
  console.log(`School: ${school.name}`);
  console.log('\nDemo Logins (password: demo1234):');
  console.log('  Principal:   principal@demo.school');
  console.log('  Teacher:     teacher@demo.school');
  console.log('  Accountant:  accountant@demo.school');
  console.log('  Parent:      parent@demo.school');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
