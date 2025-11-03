import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * Simple contact merge stub: accepts { sourceId, targetId }
 * Moves messages and notes from source to target, then deletes source.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceId, targetId } = body;
    if (!sourceId || !targetId) return NextResponse.json({ error: "sourceId and targetId required" }, { status: 422 });

    await prisma.message.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
    await prisma.note.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
    await prisma.contact.delete({ where: { id: sourceId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/contacts/merge error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
