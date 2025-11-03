import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notes = await prisma.note.findMany({ where: { contactId: id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ notes });
  } catch (err) {
    console.error("GET /api/contacts/[id]/notes error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, isPrivate, userId } = body;
    if (!content || !userId) return NextResponse.json({ error: "content and userId required" }, { status: 422 });

    const note = await prisma.note.create({ data: { content, isPrivate: !!isPrivate, contactId: id, userId } });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contacts/[id]/notes error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
