import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

/**
 * POST /api/invitations/[id]/accept - Accept a team invitation
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
      include: { team: true },
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

    // Check if invitation is still valid
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invitation already ${invitation.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.teamInvitation.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Check if already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: invitation.teamId, userId },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Already a member of this team" },
        { status: 409 }
      );
    }

    // Create team membership
    const member = await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
      },
      include: {
        team: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Mark invitation as accepted
    await prisma.teamInvitation.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // If this is the user's first team, set it as active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teamMemberships: true },
    });

    if (user && !user.activeTeamId) {
      await prisma.user.update({
        where: { id: userId },
        data: { activeTeamId: invitation.teamId } as any,
      });
    }

    return NextResponse.json({ member, team: invitation.team });
  } catch (err: any) {
    console.error("POST /api/invitations/[id]/accept error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
