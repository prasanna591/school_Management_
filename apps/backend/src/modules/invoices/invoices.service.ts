import type {
  CreateInvoiceInput,
  FeeDeskQuery,
  GenerateInvoicesInput,
  ListInvoicesQuery,
  UpdateInvoiceInput,
} from '@smartschool/shared';
import { SOCKET_EVENTS } from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToSchool } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifyUsers } from '../notifications/notifications.service';
import { assertOwnStudentId, resolveStudentSelf } from '../students/student-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const invoicesService = {
  async list(query: ListInvoicesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.InvoiceWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, query.studentId);
    if (schoolId) where.schoolId = schoolId;
    if (selfId) where.studentId = selfId;
    else if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (query.search) where.invoiceNo = { contains: query.search };
    const items = await prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { student: true, items: true, payments: true },
    });
    const total = await prisma.invoice.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { student: true, items: true, payments: true },
    });
    if (!inv) throw ApiError.notFound('Invoice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && inv.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, inv.studentId);
    return inv;
  },
  async create(input: CreateInvoiceInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    let ay = input.academicYearId;
    if (!ay) {
      const active = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
      ay = active?.id || (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    }
    if (!ay) throw ApiError.badRequest('Academic year required');
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    const issueDate = input.issueDate || new Date();
    const subtotal = input.items.reduce((sum, i) => sum + Number(i.amount), 0);
    const discount = Number(input.discount || 0);
    const total = Math.max(0, subtotal - discount);
    const invoiceNo = `INV-${Date.now()}`;
    const inv = await prisma.invoice.create({
      data: {
        schoolId,
        studentId: input.studentId,
        academicYearId: ay,
        invoiceNo,
        issueDate,
        dueDate: input.dueDate,
        subtotal,
        discount,
        total,
        balance: total,
        notes: input.notes,
      },
    });
    await prisma.invoiceItem.createMany({
      data: input.items.map((i) => ({
        invoiceId: inv.id,
        description: i.description,
        amount: i.amount,
        feeStructureId: i.feeStructureId || null,
      })),
    });
    emitToSchool(schoolId, SOCKET_EVENTS.INVOICE_CREATED, {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      studentId: inv.studentId,
      total: Number(inv.total),
      balance: Number(inv.balance),
    });
    if (student.userId) {
      await notifyUsers([student.userId], {
        schoolId,
        type: 'INVOICE',
        title: `New invoice ${inv.invoiceNo}`,
        body: `An invoice of ${Number(inv.total).toFixed(2)} was issued for your account.`,
        data: { invoiceId: inv.id, invoiceNo: inv.invoiceNo, total: Number(inv.total) },
      });
    }
    return inv;
  },
  async update(id: string, input: UpdateInvoiceInput, actor: Actor) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Invoice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.invoice.update({
      where: { id },
      data: {
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.discount !== undefined ? { discount: input.discount } : {}),
        ...(input.notes !== undefined || input.notes === null ? { notes: input.notes as any } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Invoice not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.invoice.delete({ where: { id } });
    return { success: true };
  },

  /** Issues one invoice per active student in a class/section from the fee structure. */
  async generateInvoices(input: GenerateInvoicesInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    let academicYearId = input.academicYearId;
    if (!academicYearId) {
      const current = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      });
      academicYearId =
        current?.id ?? (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    }
    if (!academicYearId) throw ApiError.badRequest('Academic year required');

    const structures = await prisma.feeStructure.findMany({
      where: { schoolId, academicYearId, classLevelId: input.classLevelId },
      include: { feeCategory: true },
      orderBy: { createdAt: 'asc' },
    });
    if (structures.length === 0) {
      throw ApiError.badRequest('No fee structure found for this class and academic year');
    }

    const studentWhere: Prisma.StudentProfileWhereInput = { schoolId, status: 'ACTIVE' };
    if (input.sectionId) studentWhere.sectionId = input.sectionId;
    else studentWhere.section = { classLevelId: input.classLevelId };
    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: { id: true },
      orderBy: { admissionNo: 'asc' },
    });

    const structureIds = structures.map((structure) => structure.id);
    const studentIds = students.map((student) => student.id);
    const existing =
      studentIds.length && structureIds.length
        ? await prisma.invoiceItem.findMany({
            where: {
              feeStructureId: { in: structureIds },
              invoice: { studentId: { in: studentIds }, academicYearId },
            },
            select: { invoice: { select: { studentId: true } } },
          })
        : [];
    const alreadyInvoiced = new Set(existing.map((item) => item.invoice.studentId));

    const issueDate = input.issueDate ?? new Date();
    let created = 0;
    let skipped = 0;

    for (const [index, student] of students.entries()) {
      if (alreadyInvoiced.has(student.id)) {
        skipped += 1;
        continue;
      }
      const subtotal = structures.reduce((sum, structure) => sum + Number(structure.amount), 0);
      const total = Math.max(0, subtotal);
      const invoiceNo = `INV-${Date.now()}-${index + 1}`;
      const invoice = await prisma.invoice.create({
        data: {
          schoolId,
          studentId: student.id,
          academicYearId,
          invoiceNo,
          issueDate,
          dueDate: input.dueDate,
          subtotal,
          discount: 0,
          total,
          balance: total,
        },
      });
      await prisma.invoiceItem.createMany({
        data: structures.map((structure) => ({
          invoiceId: invoice.id,
          description: `${structure.feeCategory.name} (${structure.frequency})`,
          amount: structure.amount,
          feeStructureId: structure.id,
        })),
      });
      created += 1;
    }

    return { created, skipped, total: students.length, feeItems: structures.length };
  },

  /** Collection summary, per-class breakdown and the outstanding-balance defaulters list. */
  async feeDesk(query: FeeDeskQuery, actor: Actor) {
    const schoolId = resolveSchoolScope(actor);
    const selfId = await resolveStudentSelf(actor);
    const baseWhere: Prisma.InvoiceWhereInput = { status: { not: 'CANCELLED' } };
    if (schoolId) baseWhere.schoolId = schoolId;
    if (selfId) baseWhere.studentId = selfId;
    if (query.sectionId) baseWhere.student = { sectionId: query.sectionId };
    else if (query.classLevelId) baseWhere.student = { section: { classLevelId: query.classLevelId } };

    const [aggregate, statusGroups, classLevels, defaulters] = await Promise.all([
      prisma.invoice.aggregate({
        where: baseWhere,
        _sum: { total: true, amountPaid: true, balance: true },
        _count: { _all: true },
      }),
      prisma.invoice.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } }),
      prisma.classLevel.findMany({
        where: schoolId ? { schoolId } : {},
        orderBy: { numericLevel: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.invoice.findMany({
        where: { ...baseWhere, balance: { gt: 0 } },
        orderBy: { balance: 'desc' },
        take: 100,
        include: {
          student: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              section: { include: { classLevel: true } },
            },
          },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const group of statusGroups) byStatus[group.status] = group._count._all;

    const byClassLevel = await Promise.all(
      classLevels.map(async (level) => {
        const where: Prisma.InvoiceWhereInput = {
          ...baseWhere,
          student: {
            ...(query.sectionId ? { sectionId: query.sectionId } : {}),
            section: { classLevelId: level.id },
          },
        };
        const agg = await prisma.invoice.aggregate({
          where,
          _sum: { total: true, amountPaid: true, balance: true },
          _count: { _all: true },
        });
        return {
          id: level.id,
          name: level.name,
          invoices: agg._count._all,
          billed: Number(agg._sum.total ?? 0),
          collected: Number(agg._sum.amountPaid ?? 0),
          outstanding: Number(agg._sum.balance ?? 0),
        };
      }),
    );

    return {
      totals: {
        invoices: aggregate._count._all,
        billed: Number(aggregate._sum.total ?? 0),
        collected: Number(aggregate._sum.amountPaid ?? 0),
        outstanding: Number(aggregate._sum.balance ?? 0),
      },
      byStatus,
      byClassLevel,
      defaulters: defaulters.map((invoice) => {
        const user = invoice.student.user;
        return {
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          studentId: invoice.studentId,
          studentName: user ? `${user.firstName} ${user.lastName}` : null,
          admissionNo: invoice.student.admissionNo,
          classLevel: invoice.student.section?.classLevel?.name ?? null,
          section: invoice.student.section?.name ?? null,
          dueDate: invoice.dueDate,
          total: Number(invoice.total),
          amountPaid: Number(invoice.amountPaid),
          balance: Number(invoice.balance),
        };
      }),
    };
  },
};
