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
  templateName: z.string().optional(),
});

/**
 * GET /api/scheduled - List all scheduled messages
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';

    // Check if ScheduledMessage table exists
    try {
      const scheduled = await (prisma as any).scheduledMessage.findMany({
        where: {
          userId: userId || undefined,
          status: status as any,
        },
        include: {
          contact: true,
          user: true,
        },
        orderBy: {
          scheduledFor: 'asc',
        },
      });

      return NextResponse.json({ scheduled });
    } catch (tableError: any) {
      // Table doesn't exist yet - return empty array
      console.log("ScheduledMessage table not found, returning empty array");
      return NextResponse.json({ scheduled: [], message: "Migration pending - scheduled messages not available yet" });
    }
  } catch (err: any) {
    console.error("GET /api/scheduled error:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}

/**
 * POST /api/scheduled - Create a scheduled message
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = scheduleMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error }, { status: 400 });
    }

    const { contactId, channel, content, subject, scheduledFor, templateName } = parsed.data;

    try {
      const scheduledMessage = await (prisma as any).scheduledMessage.create({
        data: {
          contactId,
          userId,
          channel,
          content,
          subject,
          scheduledFor: new Date(scheduledFor),
          templateName,
          status: 'PENDING',
        },
        include: {
          contact: true,
        },
      });

      return NextResponse.json({ scheduledMessage });
    } catch (tableError: any) {
      return NextResponse.json({ 
        error: "Migration pending", 
        message: "Scheduled messages feature requires database migration. Please run: npx prisma migrate dev" 
      }, { status: 503 });
    }
  } catch (err: any) {
    console.error("POST /api/scheduled error:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
