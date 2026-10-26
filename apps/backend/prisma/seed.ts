import { randomBytes } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const prisma = new PrismaClient();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

async function main(): Promise<void> {
  const schoolName = process.env.SEED_SCHOOL_NAME ?? 'SmartSchool Demo Academy';
  const adminEmail = (
    process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@smartschool.local'
  ).toLowerCase();

  let adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  let generatedPassword = false;
  if (!adminPassword || adminPassword.length < 8) {
    adminPassword = randomBytes(9).toString('base64url');
    generatedPassword = true;
  }

  const school = await prisma.school.upsert({
    where: { code: 'DEMO' },
    // `update` intentionally leaves currency alone: an existing school's
    // configured currency must not be rewritten by re-running the seed.
    update: { name: schoolName },
    create: { name: schoolName, code: 'DEMO', currency: 'INR', timezone: 'Asia/Kolkata' },
  });

  const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: Role.SUPER_ADMIN, schoolId: school.id, isActive: true },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      schoolId: school.id,
    },
  });

  const year = new Date().getFullYear();
  await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: `${year}-${year + 1}` } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: `${year}-${year + 1}`,
      startDate: new Date(`${year}-06-01`),
      endDate: new Date(`${year + 1}-04-30`),
      isCurrent: true,
    },
  });

  const student = await prisma.studentProfile.upsert({
    where: { schoolId_admissionNo: { schoolId: school.id, admissionNo: 'DEMO-0001' } },
    update: {},
    create: {
      schoolId: school.id,
      admissionNo: 'DEMO-0001',
      admissionDate: new Date(`${year}-06-01`),
      dateOfBirth: new Date(`${year - 12}-01-15`),
      gender: 'MALE',
      status: 'ACTIVE',
    },
  });

  console.log('\nSeed complete');
  console.log(`  School.......: ${school.name} (${school.id})`);
  console.log(`  Super admin..: ${adminEmail}`);
  console.log(`  Demo student.: ${student.admissionNo} (${student.id})`);
  if (generatedPassword) {
    console.log(`  Password.....: ${adminPassword}`);
    console.log('  ^ Generated randomly. Store it securely and change it after first login.');
  } else {
    console.log('  Password.....: (value of SEED_SUPER_ADMIN_PASSWORD)');
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
