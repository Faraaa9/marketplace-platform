import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { attachIdentityToUserByEmail } from "./imported/supplier-access";
import { normalizeBrandColor } from "./brand-theme";
import { loginAllowed, passwordFingerprint } from "./auth-guards";
import { telegramLoginBindingMatches } from "./telegram-login";

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
        telegramLoginToken: { label: "Telegram login token", type: "text" },
      },
      async authorize(credentials, req) {
        // Branch 0: Telegram QR login confirmed in the bot. The browser only
        // receives this token after the bot writes userId onto the challenge.
        if (credentials?.telegramLoginToken) {
          const loginToken = credentials.telegramLoginToken;
          // Only the browser that started the login holds the binding cookie,
          // so a token seen elsewhere (QR screenshot, shared link) is useless.
          if (!telegramLoginBindingMatches(loginToken, req?.headers?.cookie)) {
            throw new Error("Telegram prisijungimas nebegalioja");
          }

          // Consume in one conditional write so two concurrent sign-ins with
          // the same token can't both pass.
          const consumed = await prisma.telegramLoginToken.updateMany({
            where: {
              token: loginToken,
              status: "CONFIRMED",
              consumedAt: null,
              expiresAt: { gt: new Date() },
              userId: { not: null },
            },
            data: { consumedAt: new Date() },
          });
          const tokenRow =
            consumed.count === 1
              ? await prisma.telegramLoginToken.findUnique({
                  where: { token: loginToken },
                  select: { userId: true },
                })
              : null;
          if (!tokenRow?.userId) {
            throw new Error("Telegram prisijungimas nebegalioja");
          }

          const user = await prisma.user.findUnique({
            where: { id: tokenRow.userId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              image: true,
              brandColor: true,
              blocked: true,
            },
          });

          if (!user || user.blocked) {
            throw new Error("Paskyra nerasta arba užblokuota");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
            brandColor: user.brandColor,
          };
        }

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
                  brandColor: true,
                  emailVerified: true,
                  blocked: true,
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

          if (tokenRow.user.blocked) {
            throw new Error("Paskyra užblokuota");
          }

          // Burn the token so it can't be replayed; conditional so a
          // concurrent second use loses.
          const burned = await prisma.pendingSignInToken.updateMany({
            where: { id: tokenRow.id, usedAt: null },
            data: { usedAt: new Date() },
          });
          if (burned.count !== 1) {
            throw new Error("Patvirtinimo nuoroda nebegalioja");
          }

          return {
            id: tokenRow.user.id,
            email: tokenRow.user.email,
            name: tokenRow.user.name,
            role: tokenRow.user.role,
            image: tokenRow.user.image,
            brandColor: tokenRow.user.brandColor,
          };
        }

        // Branch B: classic email + password.
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Įveskite el. paštą ir slaptažodį");
        }

        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip =
          (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : "") || "unknown";
        if (!(await loginAllowed(credentials.email, ip))) {
          throw new Error("Per daug bandymų. Pabandykite po 15 minučių.");
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
            brandColor: true,
            blocked: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("Neteisingas el. paštas arba slaptažodis");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Neteisingas el. paštas arba slaptažodis");
        }

        if (user.blocked) {
          throw new Error("Paskyra užblokuota");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          brandColor: user.brandColor,
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
          select: { password: true, emailVerified: true, blocked: true },
        });
        if (existing?.blocked) {
          return false;
        }
        if (existing?.password && !existing.emailVerified) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.brandColor = normalizeBrandColor((user as { brandColor?: string | null }).brandColor);
      }

      if (trigger === "update") {
        const nextBrandColor =
          (session as { brandColor?: string; user?: { brandColor?: string } } | undefined)
            ?.brandColor ??
          (session as { brandColor?: string; user?: { brandColor?: string } } | undefined)
            ?.user?.brandColor;
        if (nextBrandColor) token.brandColor = normalizeBrandColor(nextBrandColor);
      }

      const lastRoleSync = typeof token.roleSyncedAt === "number" ? token.roleSyncedAt : 0;
      const shouldSyncRole =
        !!token.id &&
        (trigger === "update" || lastRoleSync === 0 || Date.now() - lastRoleSync > 60_000);

      // Keep authorization decisions aligned with the current database row.
      // Throwing here makes next-auth drop the session (and clear the cookie
      // where it can), so a block, a deleted account or a password reset ends
      // every existing session within a minute.
      if (shouldSyncRole) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, brandColor: true, blocked: true, password: true },
        });
        if (!dbUser || dbUser.blocked) {
          throw new Error("SESSION_REVOKED");
        }
        const fingerprint = passwordFingerprint(dbUser.password);
        // Tokens issued before this check existed adopt the current stamp.
        if (typeof token.pwf !== "string") {
          token.pwf = fingerprint;
        } else if (token.pwf !== fingerprint) {
          throw new Error("SESSION_REVOKED");
        }
        token.role = dbUser.role;
        token.brandColor = normalizeBrandColor(dbUser.brandColor);
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
        (session.user as { brandColor?: string | null }).brandColor = normalizeBrandColor(
          token.brandColor,
        );
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
