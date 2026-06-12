import { BellRing, MessageSquareDashed, TimerReset } from "lucide-react";
import Card from "@/components/ui/Card";

type FollowUpBucket =
  | "provider_replied_client_silent"
  | "client_open_no_provider_replies"
  | "provider_no_reply_to_lead"
  | "client_inquiry_provider_silent";

interface FollowUpAdminSignal {
  totalThreads: number;
  countsByBucket: Record<FollowUpBucket, number>;
  stalledLeads: Array<{
    type: "response" | "direct";
    id: string;
    title: string;
    daysSinceActivity: number;
    bucket: FollowUpBucket;
  }>;
  unansweredRequests: Array<{
    id: string;
    title: string;
    ageDays: number;
  }>;
  recommendations: string[];
}

const BUCKET_LABELS: Record<FollowUpBucket, string> = {
  provider_replied_client_silent: "Klientas tyli",
  client_open_no_provider_replies: "Užkl. be atsakymų",
  provider_no_reply_to_lead: "Tiekėjas neatsako",
  client_inquiry_provider_silent: "Žinutė be atsakymo",
};

export default function FollowUpAgentCard({
  followUps,
}: {
  followUps: FollowUpAdminSignal;
}) {
  const hasStalled = followUps.stalledLeads.length > 0;
  const hasUnanswered = followUps.unansweredRequests.length > 0;
  const hasAny = followUps.totalThreads > 0;

  return (
    <Card className="mb-8 p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
              Follow-up agent
            </h2>
          </div>
          <p className="text-body-sm text-surface-500 dark:text-surface-400">
            Sustojusių pokalbių ir lead&apos;ų signalai per paskutines 14 dienų. Patarimai
            tik žmogui — agentas nieko nesiunčia automatiškai.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-lg bg-surface-100 px-3 py-1 text-caption font-semibold text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          {followUps.totalThreads} signalai
        </span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(BUCKET_LABELS) as FollowUpBucket[]).map((bucket) => (
          <div
            key={bucket}
            className="rounded-xl border border-surface-200/60 bg-surface-50 p-3 dark:border-surface-700/50 dark:bg-surface-800/40"
          >
            <p className="text-micro text-surface-500">{BUCKET_LABELS[bucket]}</p>
            <p className="mt-1 text-heading-3 font-bold text-surface-900 dark:text-white">
              {followUps.countsByBucket[bucket]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="mb-3 flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-body-sm font-semibold text-surface-900 dark:text-white">
              Sustoję pokalbiai
            </h3>
          </div>
          {hasStalled ? (
            <div className="space-y-3">
              {followUps.stalledLeads.map((lead) => (
                <div key={`${lead.type}-${lead.id}`} className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-surface-800 dark:text-surface-100">
                    {lead.title}
                  </p>
                  <p className="truncate text-micro text-surface-500">
                    {BUCKET_LABELS[lead.bucket]} · {lead.daysSinceActivity} d. nuo
                    paskutinės žinutės
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-surface-500 dark:text-surface-400">
              Sustojusių pokalbių nėra.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareDashed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-body-sm font-semibold text-surface-900 dark:text-white">
              Užklausos be atsakymo
            </h3>
          </div>
          {hasUnanswered ? (
            <div className="space-y-3">
              {followUps.unansweredRequests.map((request) => (
                <div key={request.id} className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-surface-800 dark:text-surface-100">
                    {request.title}
                  </p>
                  <p className="truncate text-micro text-surface-500">
                    {request.ageDays} d. atvira
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-surface-500 dark:text-surface-400">
              Naujos užklausos sulaukia atsakymų.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <h3 className="mb-3 text-body-sm font-semibold text-surface-900 dark:text-white">
            Veiksmai
          </h3>
          {followUps.recommendations.length > 0 ? (
            <div className="space-y-3">
              {followUps.recommendations.map((item) => (
                <p
                  key={item}
                  className="text-body-sm text-surface-600 dark:text-surface-300"
                >
                  {item}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-surface-500 dark:text-surface-400">
              {hasAny
                ? "Daugiau veiksmų nereikia."
                : "Signalų nėra — viskas juda sklandžiai."}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
