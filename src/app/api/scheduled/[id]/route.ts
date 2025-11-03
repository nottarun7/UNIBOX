import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * DELETE /api/scheduled/[id] - Cancel a scheduled message
 */
export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing scheduled message id" }, { status: 400 });
    }

    await prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/scheduled/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/scheduled/[id] - Update a scheduled message
 */
export async function PATCH(req: Request, { params }: { params: any }) {
  try {
    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing scheduled message id" }, { status: 400 });
    }

    const body = await req.json();
    const { content, subject, scheduledFor } = body;

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        content: content || undefined,
        subject: subject || undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      },
      include: {
        contact: true,
      },
    });

    return NextResponse.json({ scheduledMessage: updated });
  } catch (err: any) {
    console.error("PATCH /api/scheduled/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
