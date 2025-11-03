import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * POST /api/messages/mark-read
 * Mark all messages for a contact as read
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    // Update all inbound messages for this contact to mark them as read
    await prisma.message.updateMany({
      where: {
        contactId,
        direction: "inbound",
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/messages/mark-read error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
