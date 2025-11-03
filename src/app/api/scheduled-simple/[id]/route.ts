import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/**
 * DELETE /api/scheduled-simple/[id] - Cancel a scheduled message
 */
export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const id = (await params).id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing message id" }, { status: 400 });
    }

    await prisma.message.update({
      where: { id },
      data: { status: 'FAILED' }, // Mark as FAILED to cancel
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/scheduled-simple/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
