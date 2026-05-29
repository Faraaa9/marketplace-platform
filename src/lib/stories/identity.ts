import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ANON_COOKIE = "spr_aid";
const ANON_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface ViewerIdentity {
  /** Logged-in user id, or null for an anonymous viewer. */
  viewerId: string | null;
  /** Stable per-viewer key for view/reaction dedupe: "u:<userId>" or "a:<anonId>".
   *  Null only when the viewer is anonymous and we were asked not to mint a cookie. */
  dedupeKey: string | null;
}

/**
 * Resolve who is looking at a story. Logged-in viewers are identified by their
 * user id; anonymous viewers by a first-party cookie so repeat views/reactions
 * dedupe without exposing identity.
 *
 * Pass `createAnon: true` on write paths (record view, react) to mint the cookie
 * if missing. Read paths (feed seen-state) pass false — a brand-new visitor has
 * simply seen nothing yet.
 */
export async function resolveViewerIdentity(
  opts?: { createAnon?: boolean },
): Promise<ViewerIdentity> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { viewerId: session.user.id, dedupeKey: `u:${session.user.id}` };
  }

  const store = await cookies();
  let anon = store.get(ANON_COOKIE)?.value;
  if (!anon) {
    if (!opts?.createAnon) return { viewerId: null, dedupeKey: null };
    anon = crypto.randomUUID();
    store.set(ANON_COOKIE, anon, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ANON_MAX_AGE,
      path: "/",
    });
  }
  return { viewerId: null, dedupeKey: `a:${anon}` };
}
