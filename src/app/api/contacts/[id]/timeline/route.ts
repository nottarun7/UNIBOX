import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;

    // Fetch all messages for this contact
    const messages = await prisma.message.findMany({
      where: { contactId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    // Fetch all notes for this contact
    const notes = await prisma.note.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    // Combine and sort by timestamp
    const timeline = [
      ...messages.map((m) => ({
        type: 'message',
        id: m.id,
        timestamp: m.timestamp,
        channel: m.channel,
        direction: m.direction,
        content: m.content,
        user: m.user,
      })),
      ...notes.map((n) => ({
        type: 'note',
        id: n.id,
        timestamp: n.createdAt,
        content: n.content,
        isPrivate: n.isPrivate,
        user: n.user,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
