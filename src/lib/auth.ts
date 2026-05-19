import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { attachIdentityToUserByEmail } from "./imported/supplier-access";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "El. paštas", type: "email" },
        password: { label: "Slaptažodis", type: "password" },
      },
      async authorize(credentials) {
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

        if (!user) {
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
