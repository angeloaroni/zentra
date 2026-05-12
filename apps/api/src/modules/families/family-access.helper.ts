import { PrismaService } from '../../database/prisma.service';

/**
 * Given a userId and optional familyId, returns the list of user IDs
 * to scope queries to. In personal mode, returns [userId].
 * In family mode, returns all family member user IDs.
 *
 * This is reusable across all services and will also work for groups
 * when implemented (getGroupMemberIds follows the same pattern).
 */
export async function getScopeUserIds(
  prisma: PrismaService,
  userId: string,
  familyId?: string | null,
): Promise<string[]> {
  if (!familyId) {
    return [userId];
  }

  const members = await prisma.familyMember.findMany({
    where: { familyId },
    select: { userId: true },
  });

  const ids = members.map((m) => m.userId);

  // Ensure the requesting user is included (they might be the creator
  // but not a FamilyMember record, or vice versa)
  if (!ids.includes(userId)) {
    ids.push(userId);
  }

  return ids;
}

/**
 * Check if a user is a member of a specific family.
 */
export async function isFamilyMember(
  prisma: PrismaService,
  userId: string,
  familyId: string,
): Promise<boolean> {
  const member = await prisma.familyMember.findUnique({
    where: {
      userId_familyId: { userId, familyId },
    },
  });

  if (member) return true;

  // Also check if the user is the family creator
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { createdById: true },
  });

  return family?.createdById === userId;
}

/**
 * Get all family IDs a user belongs to (as creator or member).
 */
export async function getUserFamilyIds(
  prisma: PrismaService,
  userId: string,
): Promise<string[]> {
  const [created, memberOf] = await prisma.$transaction([
    prisma.family.findMany({
      where: { createdById: userId },
      select: { id: true },
    }),
    prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    }),
  ]);

  const ids = new Set<string>();
  created.forEach((f) => ids.add(f.id));
  memberOf.forEach((m) => ids.add(m.familyId));

  return Array.from(ids);
}
