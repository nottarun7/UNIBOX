import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

/**
 * POST /api/invitations/[id]/decline - Decline a team invitation
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;
    const userEmail = (session?.user as any)?.email;
    const { id } = await params;

    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Verify invitation belongs to current user
    if (invitation.email !== userEmail) {
      return NextResponse.json(
        { error: "This invitation is not for you" },
        { status: 403 }
      );
    }

    // Mark invitation as declined
    await prisma.teamInvitation.update({
      where: { id },
      data: { status: "DECLINED" },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/invitations/[id]/decline error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
