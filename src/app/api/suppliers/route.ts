import { NextResponse } from "next/server";

// Catalog feature disabled 2026-05-26 (scrape quality concerns).
// Source preserved in src/lib/imported/ and Prisma schema.
// Revival playbook: docs/archive/katalogas.md
const disabled = () =>
  NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

export const GET = disabled;
