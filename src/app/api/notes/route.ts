import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession() as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, content, isPrivate } = body;

    if (!contactId || !content) {
      return NextResponse.json(
        { error: 'contactId and content are required' },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        content,
        isPrivate: isPrivate ?? false,
        userId: session.user.id,
        contactId,
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Note creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
