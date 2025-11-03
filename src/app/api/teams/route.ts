import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});

/**
 * GET /api/teams - List all teams the user belongs to
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            _count: {
              select: { members: true, threads: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const teams = memberships.map((m) => ({
      ...m.team,
      myRole: m.role,
    }));

    return NextResponse.json({ teams });
  } catch (err: any) {
    console.error("GET /api/teams error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams - Create a new team
 */
export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession();
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error },
        { status: 400 }
      );
    }

    const { name, slug } = parsed.data;

    // Check if slug already exists
    if (slug) {
      const existing = await prisma.team.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { error: "Team slug already exists" },
          { status: 409 }
        );
      }
    }

    // Create team with the user as owner
    const team = await prisma.team.create({
      data: {
        name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      } as any,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/teams error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
