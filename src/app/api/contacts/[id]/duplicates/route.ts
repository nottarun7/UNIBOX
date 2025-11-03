import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { findPotentialDuplicates } from "../../../../../lib/fuzzyMatch";

/**
 * GET /api/contacts/[id]/duplicates
 * Find potential duplicate contacts
 */
export async function GET(req: Request, { params }: { params: any }) {
  try {
    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing contact id" }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get all other contacts (excluding merged ones)
    const allContacts = await prisma.contact.findMany({
      where: {
        id: { not: id },
        mergedIntoId: null,
      },
    });

    const duplicates = findPotentialDuplicates(contact, allContacts);

    return NextResponse.json({ duplicates });
  } catch (err: any) {
    console.error("GET /api/contacts/[id]/duplicates error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
