import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getNormalizedDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);

    // Supabase pooled connections can hit their session-mode cap quickly in dev.
    // Keep Prisma to a single DB connection unless the env already overrides it.
    if (url.hostname.endsWith(".pooler.supabase.com") && !url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    // If the app is later switched to Supavisor transaction mode (port 6543),
    // Prisma needs pgbouncer mode enabled to avoid prepared statement issues.
    if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

const prismaOptions: Prisma.PrismaClientOptions = {};
const normalizedDatabaseUrl = getNormalizedDatabaseUrl();

if (normalizedDatabaseUrl) {
  prismaOptions.datasources = {
    db: {
      url: normalizedDatabaseUrl,
    },
  };
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

// Cache the singleton in ALL environments to prevent connection leaks on serverless
globalForPrisma.prisma = prisma;
