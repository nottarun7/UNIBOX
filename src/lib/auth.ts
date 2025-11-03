import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { verifyPassword } from "./hash";
import { getServerSession as nextGetServerSession } from "next-auth/next";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await verifyPassword(credentials.password, (user as any).passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          // Upsert user and create default team if new user
          const existingUser = await prisma.user.findUnique({ 
            where: { email: user.email || "" },
            include: { teamMemberships: true }
          });

          if (!existingUser) {
            // New user - create user with a personal team
            const newUser = await prisma.user.create({
              data: {
                email: user.email || "",
                name: user.name || "",
                role: "member",
              },
            });

            // Create default team for new user
            const team = await prisma.team.create({
              data: {
                name: `${user.name || user.email}'s Team`,
                ownerId: newUser.id,
                members: {
                  create: {
                    userId: newUser.id,
                    role: "OWNER",
                  },
                },
              },
            });

            // Set as active team
            await prisma.user.update({
              where: { id: newUser.id },
              data: { activeTeamId: team.id },
            });
          } else {
            // Existing user - just update name if changed
            await prisma.user.update({
              where: { email: user.email || "" },
              data: { name: user.name || undefined },
            });
          }
        }
      } catch (e) {
        console.error("Error upserting user on signIn:", e);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id || token.sub;
        token.role = (user as any).role;
      }
      
      // Fetch active team for the user
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: {
              activeTeam: true,
              teamMemberships: {
                include: { team: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          });

          if (dbUser) {
            token.role = dbUser.role;
            token.teamId = dbUser.activeTeamId;
            token.teamRole = dbUser.teamMemberships.find(
              (m: any) => m.teamId === dbUser.activeTeamId
            )?.role || null;
            token.teams = dbUser.teamMemberships.map((m: any) => ({
              id: m.team.id,
              name: m.team.name,
              role: m.role,
            }));
          }
        } catch (e) {
          console.error("Error fetching user teams in JWT:", e);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).teamId = token.teamId;
        (session.user as any).teamRole = token.teamRole;
        (session.user as any).teams = token.teams || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getServerAuthSession() {
  return nextGetServerSession(authOptions as any);
}
