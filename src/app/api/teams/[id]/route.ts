import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
});

/**
 * GET /api/teams/[id] - Get team details
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a member of this team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        invitations: {
          where: { status: "PENDING" },
          include: { invitedBy: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: { members: true, threads: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team, myRole: membership.role });
  } catch (err: any) {
    console.error("GET /api/teams/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/[id] - Update team details
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or owner
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId },
      },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Only admins can update team" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error },
        { status: 400 }
      );
    }

    const team = await prisma.team.update({
      where: { id },
      data: parsed.data as any,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    return NextResponse.json({ team });
  } catch (err: any) {
    console.error("PATCH /api/teams/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[id] - Delete team (owner only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owner can delete team" },
        { status: 403 }
      );
    }

    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/teams/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
