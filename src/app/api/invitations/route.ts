import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const sendInvitationSchema = z.object({
  teamId: z.string(),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

/**
 * GET /api/invitations - List pending invitations for the current user
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;
    const userEmail = (session?.user as any)?.email;

    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get invitations for this user's email
    const invitations = await prisma.teamInvitation.findMany({
      where: {
        email: userEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        team: {
          select: { id: true, name: true, slug: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (err: any) {
    console.error("GET /api/invitations error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations - Send a team invitation
 */
export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = sendInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error },
        { status: 400 }
      );
    }

    const { teamId, email, role } = parsed.data;

    // Check if current user is admin or owner of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Only admins can send invitations" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: {
          where: { teamId },
        },
      },
    });

    if (existingUser && existingUser.teamMemberships.length > 0) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.teamInvitation.findUnique({
      where: {
        teamId_email: { teamId, email },
      },
    });

    if (existingInvitation && existingInvitation.status === "PENDING") {
      return NextResponse.json(
        { error: "Invitation already sent" },
        { status: 409 }
      );
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        role,
        invitedById: userId,
        userId: existingUser?.id,
        expiresAt,
      },
      include: {
        team: {
          select: { id: true, name: true },
        },
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // TODO: Send email with invitation link
    // For now, we'll just return the invitation

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/invitations error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
