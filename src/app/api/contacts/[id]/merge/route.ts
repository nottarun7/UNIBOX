import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { mergeContactData } from "../../../../../lib/fuzzyMatch";

/**
 * POST /api/contacts/[id]/merge
 * Merge a duplicate contact into the primary contact
 */
export async function POST(req: Request, { params }: { params: any }) {
  try {
    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing contact id" }, { status: 400 });
    }

    const body = await req.json();
    const { duplicateId } = body;

    if (!duplicateId) {
      return NextResponse.json({ error: "Missing duplicateId" }, { status: 400 });
    }

    const [primary, duplicate] = await Promise.all([
      prisma.contact.findUnique({ where: { id } }),
      prisma.contact.findUnique({ where: { id: duplicateId } }),
    ]);

    if (!primary || !duplicate) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Merge data
    const mergedData = mergeContactData(primary, duplicate);

    // Update primary contact with merged data
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: mergedData,
    });

    // Update all messages, notes from duplicate to point to primary
    await Promise.all([
      prisma.message.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: id },
      }),
      prisma.note.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: id },
      }),
    ]);

    // Mark duplicate as merged (soft delete)
    // await prisma.contact.update({
    //   where: { id: duplicateId },
    //   data: { mergedIntoId: id },
    // });

    // Or hard delete the duplicate
    await prisma.contact.delete({
      where: { id: duplicateId },
    });

    return NextResponse.json({ 
      success: true, 
      contact: updatedContact,
      message: "Contacts merged successfully" 
    });
  } catch (err: any) {
    console.error("POST /api/contacts/[id]/merge error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
