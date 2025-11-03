import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerAuthSession } from "../../../lib/auth";
import { getTeamIdForUser } from "../../../lib/threads";

export async function GET() {
  try {
  const session = (await getServerAuthSession()) as any;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  // Scope threads to the user's team.
  const teamId = await getTeamIdForUser(userId);

  // Fetch threads for contacts owned by this user, scoped to their team plus global threads (teamId = null).
  const whereFilter: any = { 
    contact: { userId }, // Only show threads for contacts owned by this user
    ...(teamId ? { OR: [{ teamId: teamId }, { teamId: null }] } : { teamId: null })
  };

  const threadsRaw = await (prisma as any).thread.findMany({
      where: whereFilter,
      include: {
        contact: true,
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    // Get unread counts separately for each thread
    const threadsWithUnread = await Promise.all(
      threadsRaw.map(async (t: any) => {
        const unreadCount = await prisma.message.count({
          where: {
            contactId: t.contact.id,
            direction: "inbound",
            read: false,
          },
        });

        return {
          id: t.id,
          contact: { id: t.contact.id, name: t.contact.name, phone: t.contact.phone, whatsapp: t.contact.whatsapp, email: t.contact.email },
          lastMessage: t.messages?.[0] ?? null,
          messageCount: t._count?.messages ?? 0,
          unreadCount,
          teamId: t.teamId ?? null,
        };
      })
    );

    const threads = threadsWithUnread;

    // If we found no Thread records (fresh DB), fall back to deriving threads from Contacts
    // that have messages. This helps during development or if threads weren't created yet.
    if ((!threads || threads.length === 0)) {
      const contactsWithMessages = await (prisma as any).contact.findMany({
        where: { messages: { some: {} } },
        include: {
          messages: { orderBy: { timestamp: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
        take: 200,
      });

      const derived = contactsWithMessages.map((c: any) => ({
        id: `virtual-${c.id}`,
        contact: { id: c.id, name: c.name, phone: c.phone, whatsapp: c.whatsapp, email: c.email },
        lastMessage: c.messages?.[0] ?? null,
        messageCount: c._count?.messages ?? 0,
        teamId: null,
      }));

      return NextResponse.json({ threads: derived });
    }

    return NextResponse.json({ threads });
  } catch (err) {
    console.error("GET /api/threads error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
