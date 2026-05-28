import { notFound } from "next/navigation";
import { connection } from "next/server";

// Catalog feature disabled 2026-05-26 (scrape quality concerns).
// Source preserved in src/lib/imported/ and Prisma schema.
// Revival playbook: docs/archive/katalogas.md
export default async function Page() {
  await connection();
  notFound();
}
