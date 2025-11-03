import { NextResponse } from "next/server";
import type { Session } from "next-auth";

/**
 * Simple server-side role guard to use in API route handlers or server functions.
 * Example usage:
 * const session = await getServerAuthSession();
 * const guard = requireRole(session, ['admin','editor']);
 * if (guard) return guard; // returns NextResponse with 403
 */
export function requireRole(session: Session | null | undefined, allowed: string | string[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  const role = (session as any)?.user?.role as string | undefined;
  if (!session || !role || !roles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function ensureAuth(session: Session | null | undefined) {
  if (!session) return NextResponse.redirect(new URL("/signin", "http://localhost"));
  return null;
}
