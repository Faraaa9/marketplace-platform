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

    if (url.hostname.endsWith(".pooler.supabase.com")) {
      // Force transaction-mode pooler (port 6543) over session-mode (5432).
      // Session mode is capped at ~15 concurrent clients which serverless
      // bursts blow through; transaction mode scales far higher.
      if (url.port === "5432") {
        url.port = "6543";
      }

      // pgbouncer=true tells Prisma to skip prepared statements (required
      // with Supavisor transaction pooler).
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }

      // Keep each serverless instance to a single DB connection so we don't
      // exhaust the pool with parallel function instances.
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
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
