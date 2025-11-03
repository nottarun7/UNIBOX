import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

/**
 * PATCH /api/contacts/[id] - Update a contact (only if owned by authenticated user)
 */
export async function PATCH(req: Request, { params }: { params: any }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // In Next.js App Router route handlers `params` can be a Promise.
    // Await it before accessing properties to avoid the runtime error.
    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing contact id in route params" }, { status: 400 });
    }

    // Verify the contact belongs to the user
    const existingContact = await prisma.contact.findFirst({
      where: { id, userId },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, phone, whatsapp, email } = body;
    const contact = await prisma.contact.update({ 
      where: { id }, 
      data: { name, phone, whatsapp, email } 
    });
    return NextResponse.json({ contact });
  } catch (err: any) {
    console.error("PATCH /api/contacts/[id] error:", err);
    // Prisma unique constraint error (e.g., phone already exists)
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Unique constraint failed: a contact with this phone already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id] - Delete a contact (only if owned by authenticated user)
 */
export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing contact id in route params" }, { status: 400 });
    }

    // Verify the contact belongs to the user before deleting
    const existingContact = await prisma.contact.findFirst({
      where: { id, userId },
    });

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Delete the contact and all related data
    await prisma.contact.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/contacts/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
