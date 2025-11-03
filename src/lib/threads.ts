import { prisma } from "./prisma";

// Find or create a thread for a contact, optionally scoped to a team (teamId optional).
export async function findOrCreateThread(contactId: string, teamId?: string | null) {
  // Try to find an existing thread for this contact and team (or without team)
  const where: any = { contactId };
  if (teamId) where.teamId = teamId;

  let thread = await prisma.thread.findFirst({ where });
  if (thread) return thread;

  // If not found with teamId, try to find a thread without team (global thread for contact)
  if (teamId) {
    thread = await prisma.thread.findFirst({ where: { contactId, teamId: null } });
    if (thread) return thread;
  }

  // Create a new thread
  const created = await prisma.thread.create({ data: { contactId, teamId: teamId || null } });
  return created;
}

// Helper: find a teamId for a user if they belong to any team (returns first teamId or null)
export async function getTeamIdForUser(userId?: string | null) {
  if (!userId) return null;
  const membership = await prisma.teamMember.findFirst({ where: { userId } });
  return membership?.teamId || null;
}
