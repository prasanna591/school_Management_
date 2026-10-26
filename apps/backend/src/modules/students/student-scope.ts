import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

/**
 * Resolve the student profile that belongs to the authenticated user.
 *
 * The id comes from the access token (`actor.id`), never from the request, so a
 * student cannot ask for another student's attendance, results or invoices by
 * changing a query parameter. Returns null for every other role.
 */
export async function resolveStudentSelf(actor: Actor): Promise<string | null> {
  if (actor.role !== 'STUDENT') return null;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: actor.id },
    select: { id: true, schoolId: true },
  });
  if (!profile) throw ApiError.forbidden('No student profile is linked to this account');
  if (actor.schoolId && profile.schoolId !== actor.schoolId) {
    throw ApiError.forbidden('Access denied');
  }
  return profile.id;
}

/** Reject a request that targets a student other than the signed-in one. */
export function assertOwnStudentId(selfId: string, requestedId: string | null | undefined): string {
  if (requestedId && requestedId !== selfId) {
    throw ApiError.forbidden('You can only access your own records');
  }
  return selfId;
}
