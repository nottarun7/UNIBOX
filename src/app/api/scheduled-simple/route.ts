import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";

const scheduleMessageSchema = z.object({
  contactId: z.string(),
  channel: z.enum(["sms", "whatsapp", "email"]),
  content: z.string().min(1),
  subject: z.string().optional(),
  scheduledFor: z.string(), // ISO date string
});

/**
 * GET /api/scheduled-simple - List scheduled messages using Message table
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('all') === 'true';

    // Build where clause - always filter by scheduledAt being set (NOT NULL)
    const whereClause: any = {};
    
    // Only filter by userId if authenticated
    if (userId) {
      whereClause.userId = userId;
    }

    // If not includeAll, only show pending future messages
    if (!includeAll) {
      whereClause.scheduledAt = {
        not: null,
        gte: new Date(), // Only future scheduled messages that have scheduledAt set
      };
      whereClause.status = 'PENDING';
    } else {
      // If includeAll, show all messages that have scheduledAt (past and future)
      whereClause.scheduledAt = {
        not: null, // MUST have scheduledAt to be a scheduled message
      };
    }

    console.log('[GET /api/scheduled-simple] whereClause:', JSON.stringify(whereClause, null, 2));
    console.log('[GET /api/scheduled-simple] userId:', userId || 'unauthenticated');

    // Debug: Get ALL messages with scheduledAt to see what's in the DB
    const allScheduled = await prisma.message.findMany({
      where: { scheduledAt: { not: null } },
      select: { id: true, status: true, scheduledAt: true, channel: true, contactId: true, userId: true },
      take: 10,
    });
    console.log('[GET /api/scheduled-simple] ALL scheduled messages in DB:', allScheduled.length, allScheduled);

    // Get messages that have scheduledAt set (meaning they were scheduled)
    const scheduledMessages = await prisma.message.findMany({
      where: whereClause,
      include: {
        contact: true,
        user: true,
      },
      orderBy: {
        timestamp: 'desc', // Use timestamp instead of scheduledAt
      },
    });

    console.log(`[GET /api/scheduled-simple] Found ${scheduledMessages.length} messages`);


    return NextResponse.json({ scheduled: scheduledMessages });
  } catch (err: any) {
    console.error("GET /api/scheduled-simple error:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}

/**
 * POST /api/scheduled-simple - Create a scheduled message using Message table
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    // Allow unauthenticated for development (like threads endpoint)
    // In production, you should enforce authentication
    console.log('[POST /api/scheduled-simple] userId:', userId || 'unauthenticated');

    const body = await req.json();
    const parsed = scheduleMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error }, { status: 400 });
    }

    const { contactId, channel, content, subject, scheduledFor } = parsed.data;

    const scheduledDate = new Date(scheduledFor);
    const now = new Date();

    console.log('[POST /api/scheduled-simple] Creating scheduled message:', {
      contactId,
      channel,
      scheduledFor,
      scheduledDate: scheduledDate.toISOString(),
      now: now.toISOString(),
      isInFuture: scheduledDate > now,
      hasSubject: !!subject,
      hasUserId: !!userId,
    });

    // Create a message with status PENDING and scheduledAt set
    const scheduledMessage = await prisma.message.create({
      data: {
        contactId,
        ...(userId ? { userId } : {}),
        channel,
        content,
        ...(subject ? { subject } : {}),
        direction: 'outbound',
        scheduledAt: scheduledDate,
        status: 'PENDING',
      } as any,
      include: {
        contact: true,
      },
    });

    console.log('[POST /api/scheduled-simple] Created message with ID:', scheduledMessage.id);
    console.log('[POST /api/scheduled-simple] Message scheduledAt:', (scheduledMessage as any).scheduledAt);
    console.log('[POST /api/scheduled-simple] Message status:', scheduledMessage.status);

    return NextResponse.json({ scheduledMessage });
  } catch (err: any) {
    console.error("POST /api/scheduled-simple error:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
