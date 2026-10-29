import { notFound } from "next/navigation";
import RequestPhotos from "@/components/requests/RequestPhotos";
import { Panel, PanelTitle } from "@/components/account/ui";
import { decodeHtmlEntities, ltCount } from "@/lib/utils";
import ViewerBanner from "../ViewerBanner";
import { getTrackedRequestSummary } from "../data";

interface RequestBodyProps {
  params: Promise<{ id: string }>;
}

/** Side panel of the request page: details, description and photos. */
export default async function RequestBody({ params }: RequestBodyProps) {
  const { id } = await params;
  const request = await getTrackedRequestSummary(id);
  if (!request) notFound();

  const details: [string, string][] = [
    ["Miestas", request.location],
    ["Biudžetas", request.budget || "Nenurodytas"],
    ["Terminas", request.deadline || "Nenurodytas"],
    ["Kategorija", (request.categoryNames.length > 0 ? request.categoryNames : [request.category]).filter(Boolean).join(", ") || "—"],
    ["Peržiūrėjo", request.viewCount === 0 ? "Dar niekas" : ltCount(request.viewCount, ["meistras", "meistrai", "meistrų"])],
  ];

  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <PanelTitle>Užklausos informacija</PanelTitle>
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-surface-500">{label}</dt>
              <dd className="m-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel>
        <PanelTitle>Aprašymas</PanelTitle>
        <p className="whitespace-pre-wrap leading-relaxed text-surface-700 dark:text-surface-300">
          {decodeHtmlEntities(request.description)}
        </p>
        {request.attachmentUrls.length > 0 && (
          <div className="mt-4">
            <RequestPhotos urls={request.attachmentUrls} />
          </div>
        )}
      </Panel>
      {/* Session-dependent claim CTA / bookmark reminder (client island). */}
      <ViewerBanner clientId={request.clientId} trackingToken={id} />
    </div>
  );
}
