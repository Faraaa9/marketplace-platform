import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email";

// GET shows a confirm button instead of unsubscribing outright: mail scanners
// prefetch links, and a GET that mutates would opt providers out unseen. Mail
// clients' one-click unsubscribe (RFC 8058) POSTs here directly.

function page(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PaslaugųRinka</title></head>` +
      `<body style="font-family:sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#111827">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function params(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  return { userId, token, valid: !!userId && !!token && verifyUnsubscribeToken(userId, token) };
}

const INVALID = "<h1>Nuoroda negalioja</h1><p>Atsisakyti laiškų galite paskyros nustatymuose arba parašę mums.</p>";

export async function GET(req: Request) {
  await connection();
  const { userId, token, valid } = params(req);
  if (!valid) return page(INVALID, 400);
  const action = `/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`;
  return page(
    `<h1>Atsisakyti laiškų apie naujas užklausas?</h1>` +
      `<p>Nebegausite el. laiškų apie naujas užklausas. Pranešimai paskyroje liks.</p>` +
      `<form method="post" action="${action}"><button type="submit" style="min-height:44px;padding:12px 24px;background:#2563eb;color:#fff;border:0;border-radius:8px;font-size:16px">Atsisakyti</button></form>`,
  );
}

export async function POST(req: Request) {
  await connection();
  const { userId, valid } = params(req);
  if (!valid) return page(INVALID, 400);
  await prisma.user.updateMany({ where: { id: userId }, data: { emailAlertsOptOut: true } });
  return page("<h1>Atsisakėte</h1><p>Laiškų apie naujas užklausas daugiau nesiųsime.</p>");
}
