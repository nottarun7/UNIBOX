import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

/**
 * GET /api/contacts - List all contacts for the authenticated user
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log('GET /api/contacts - Authenticated user:', userId);

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            messages: true,
            notes: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`GET /api/contacts - Found ${contacts.length} contacts for user ${userId}`);
    if (contacts.length > 0) {
      console.log('Sample contact userIds:', contacts.slice(0, 3).map(c => ({ id: c.id, name: c.name, userId: c.userId })));
    }

    return NextResponse.json({ contacts });
  } catch (err: any) {
    console.error("GET /api/contacts error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/contacts - Create a new contact for the authenticated user
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const body = await req.json();
    const { name, phone, whatsapp, email } = body;
    const contact = await prisma.contact.create({ 
      data: { 
        name, 
        phone, 
        whatsapp, 
        email,
        userId,
      } 
    });
    return NextResponse.json({ contact });
  } catch (err) {
    console.error("POST /api/contacts error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
