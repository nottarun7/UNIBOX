import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

/**
 * POST /api/teams/[id]/switch - Switch to a different active team
 */
export async function POST(
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
      include: { team: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    // Update user's active team
    await prisma.user.update({
      where: { id: userId },
      data: { activeTeamId: id } as any,
    });

    return NextResponse.json({ team: membership.team, role: membership.role });
  } catch (err: any) {
    console.error("POST /api/teams/[id]/switch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
