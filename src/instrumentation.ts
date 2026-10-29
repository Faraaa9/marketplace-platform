import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // email.ts reads fs and Prisma; keep it out of any non-Node bundle.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;

  const err = error instanceof Error ? error : new Error(String(error));
  const digest = (error as { digest?: string }).digest;
  const { sendAlert } = await import("@/lib/alert");
  await sendAlert(`req:${context.routePath}:${err.message.slice(0, 100)}`, `Klaida ${context.routePath}`, {
    Klaida: err.message,
    // Query strings carry verification/login tokens; keep them out of the inbox.
    Kelias: `${request.method} ${request.path.split("?")[0]}`,
    Maršrutas: `${context.routePath} (${context.routeType}, ${context.routerKind})`,
    Digest: digest,
    Stack: err.stack?.split("\n").slice(0, 8).join("\n"),
  });
};
