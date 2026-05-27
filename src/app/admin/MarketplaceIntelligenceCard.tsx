import { AlertTriangle, Compass, TrendingUp } from "lucide-react";
import Card from "@/components/ui/Card";

interface MarketplaceIntelligence {
  supplyDemandGaps: Array<{
    categoryId: string;
    categoryName: string;
    requestCount: number;
    providerCount: number;
    gapScore: number;
  }>;
  unansweredRequests: Array<{
    id: string;
    title: string;
    categoryName: string;
    location: string;
    createdAt: string;
  }>;
  recommendations: string[];
}

function formatTime(value: string): string {
  return new Date(value).toLocaleDateString("lt-LT", {
    month: "short",
    day: "numeric",
  });
}

export default function MarketplaceIntelligenceCard({
  intelligence,
}: {
  intelligence: MarketplaceIntelligence;
}) {
  const hasGaps = intelligence.supplyDemandGaps.length > 0;
  const hasUnanswered = intelligence.unansweredRequests.length > 0;

  return (
    <Card className="mb-8 p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
              Marketplace intelligence
            </h2>
          </div>
          <p className="text-body-sm text-surface-500 dark:text-surface-400">
            Paklausos, pasiūlos ir atsakymų signalai per paskutines 14 dienų.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-body-sm font-semibold text-surface-900 dark:text-white">
              Kur trūksta tiekėjų
            </h3>
          </div>
          {hasGaps ? (
            <div className="space-y-3">
              {intelligence.supplyDemandGaps.map((item) => (
                <div key={item.categoryId}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-body-sm font-medium text-surface-800 dark:text-surface-100">
                      {item.categoryName}
                    </p>
                    <span className="shrink-0 text-micro text-surface-500">
                      {item.requestCount}:{item.providerCount}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, item.gapScore * 12)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-surface-500 dark:text-surface-400">
              Ryškių pasiūlos skylių nėra.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-body-sm font-semibold text-surface-900 dark:text-white">
              Užklausos be atsakymų
            </h3>
          </div>
          {hasUnanswered ? (
            <div className="space-y-3">
              {intelligence.unansweredRequests.map((request) => (
                <div key={request.id} className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-surface-800 dark:text-surface-100">
                    {request.title}
                  </p>
                  <p className="truncate text-micro text-surface-500">
                    {request.categoryName} · {request.location} · {formatTime(request.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-surface-500 dark:text-surface-400">
              Naujos užklausos gauna atsakymus.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-surface-200 p-4 dark:border-surface-700">
          <h3 className="mb-3 text-body-sm font-semibold text-surface-900 dark:text-white">
            Veiksmai
          </h3>
          <div className="space-y-3">
            {intelligence.recommendations.map((item) => (
              <p key={item} className="text-body-sm text-surface-600 dark:text-surface-300">
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
