import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["sms", "whatsapp", "email"]),
  subject: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

/**
 * GET /api/templates - List all templates
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    const templates = await prisma.messageTemplate.findMany({
      where: {
        userId: userId || undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error("GET /api/templates error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/templates - Create a template
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = templateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error }, { status: 400 });
    }

    const { name, channel, subject, content, variables } = parsed.data;

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        channel,
        subject,
        content,
        variables: variables || [],
        userId,
      },
    });

    return NextResponse.json({ template });
  } catch (err: any) {
    console.error("POST /api/templates error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
