import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { hashPassword } from "../../../../lib/hash";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Create user with a default team
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // Create default team for the new user
    const team = await prisma.team.create({
      data: {
        name: `${name || email}'s Team`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      } as any, // Type assertion until Prisma regenerated
    });

    // Set as active team
    await prisma.user.update({
      where: { id: user.id },
      data: { activeTeamId: team.id } as any, // Type assertion until Prisma regenerated
    });

    return NextResponse.json({ user, team }, { status: 201 });
  } catch (err) {
    console.error("/api/auth/signup error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
