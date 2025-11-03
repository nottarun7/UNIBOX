import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { z } from "zod";

const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
});

/**
 * GET /api/teams/[id]/members - List team members
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

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch (err: any) {
    console.error("GET /api/teams/[id]/members error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/[id]/members/[userId] - Update member role
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const currentUserId = (session?.user as any)?.id;
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Check if current user is admin or owner
    const currentMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: currentUserId },
      },
    });

    if (
      !currentMembership ||
      (currentMembership.role !== "OWNER" && currentMembership.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "Only admins can update member roles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error },
        { status: 400 }
      );
    }

    // Update the member role
    const member = await prisma.teamMember.update({
      where: {
        teamId_userId: { teamId: id, userId: targetUserId },
      },
      data: { role: parsed.data.role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ member });
  } catch (err: any) {
    console.error("PATCH /api/teams/[id]/members error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[id]/members/[userId] - Remove member from team
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const currentUserId = (session?.user as any)?.id;
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Check if current user is admin or owner
    const currentMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: currentUserId },
      },
    });

    if (
      !currentMembership ||
      (currentMembership.role !== "OWNER" && currentMembership.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    // Can't remove owner
    const targetMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: targetUserId },
      },
    });

    if (targetMembership?.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove team owner" },
        { status: 403 }
      );
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: { teamId: id, userId: targetUserId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/teams/[id]/members error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
