import { cn } from "@/lib/utils";
import type { RequestOutcomeStamp } from "@/lib/account/request-progress";

/** Rubber stamp on a request that no longer takes offers (see requestOutcomeStamp). */
export default function OutcomeStamp({ stamp, inline = false }: { stamp: RequestOutcomeStamp; inline?: boolean }) {
  return (
    <span
      className={cn("found-stamp", stamp.tone !== "found" && "found-stamp--muted", inline && "found-stamp--inline")}
      aria-label={[stamp.lead, stamp.main, stamp.note].filter(Boolean).join(" ")}
    >
      <span className="found-stamp__lead">{stamp.lead}</span>
      <span className="found-stamp__main">{stamp.main}</span>
      {stamp.note && <span className="found-stamp__note">{stamp.note}</span>}
    </span>
  );
}
