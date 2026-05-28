import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { attachIdentityToUserByEmail } from "./imported/supplier-access";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "El. paštas", type: "email" },
        password: { label: "Slaptažodis", type: "password" },
        signinToken: { label: "Auto signin token", type: "text" },
      },
      async authorize(credentials) {
        // Branch A: one-time signin token issued during registration. Lets the
        // original tab auto-login after the user verifies email in another tab.
        if (credentials?.signinToken) {
          const tokenRow = await prisma.pendingSignInToken.findUnique({
            where: { token: credentials.signinToken },
            select: {
              id: true,
              userId: true,
              expiresAt: true,
              usedAt: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                  image: true,
                  emailVerified: true,
                },
              },
            },
          });

          if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt < new Date()) {
            throw new Error("Patvirtinimo nuoroda nebegalioja");
          }

          if (!tokenRow.user.emailVerified) {
            throw new Error("El. paštas dar nepatvirtintas");
          }

          // Burn the token so it can't be replayed.
          await prisma.pendingSignInToken.update({
            where: { id: tokenRow.id },
            data: { usedAt: new Date() },
          });

          return {
            id: tokenRow.user.id,
            email: tokenRow.user.email,
            name: tokenRow.user.name,
            role: tokenRow.user.role,
            image: tokenRow.user.image,
          };
        }

        // Branch B: classic email + password.
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Įveskite el. paštą ir slaptažodį");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            image: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("Neteisingas el. paštas arba slaptažodis");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Neteisingas el. paštas arba slaptažodis");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      // Auto-bind any unbound SupplierIdentity records that match this user's email
      if (user.id && user.email) {
        try {
          await attachIdentityToUserByEmail(user.email, user.id);
        } catch (err) {
          console.error("Failed to auto-bind supplier identities:", err);
        }
      }
    },
  },
  callbacks: {
    // Defense-in-depth for `allowDangerousEmailAccountLinking`. Google verifies
    // email ownership, so linking a Google login onto a matching account is
    // normally safe. The one risky path: an existing *credentials* account whose
    // email was never verified could have been squatted with someone else's
    // address — auto-linking Google to it would hand that row to the Google
    // owner. Block only that case; the legitimate owner can still sign in with
    // their password (authorize() does not gate on emailVerified).
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: { password: true, emailVerified: true },
        });
        if (existing?.password && !existing.emailVerified) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }

      const lastRoleSync = typeof token.roleSyncedAt === "number" ? token.roleSyncedAt : 0;
      const shouldSyncRole =
        !!token.id &&
        (trigger === "update" || lastRoleSync === 0 || Date.now() - lastRoleSync > 60_000);

      // Keep authorization decisions aligned with the current database role.
      if (shouldSyncRole) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
        token.roleSyncedAt = Date.now();
      }

      // Heartbeat: refresh User.lastSeenAt at most once per minute. The jwt
      // callback fires on every getServerSession() call, so authenticated
      // navigation across the app keeps this current without an extra endpoint.
      const lastSeenSync = typeof token.lastSeenSyncedAt === "number" ? token.lastSeenSyncedAt : 0;
      if (token.id && Date.now() - lastSeenSync > 60_000) {
        try {
          await prisma.user.update({
            where: { id: token.id as string },
            data: { lastSeenAt: new Date() },
            select: { id: true },
          });
        } catch {
          // User may have been deleted; swallow and move on.
        }
        token.lastSeenSyncedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/prisijungti",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
