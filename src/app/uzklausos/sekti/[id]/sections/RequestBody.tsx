import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import RequestPhotos from "@/components/requests/RequestPhotos";
import ViewerBanner from "../ViewerBanner";
import { getTrackedRequestSummary } from "../data";

interface RequestBodyProps {
  params: Promise<{ id: string }>;
}

export default async function RequestBody({ params }: RequestBodyProps) {
  const { id } = await params;
  const request = await getTrackedRequestSummary(id);
  if (!request) notFound();

  return (
    <>
      <Card className="mb-6">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
          {request.description}
        </p>
        {request.attachmentUrls.length > 0 && (
          <div className="mt-4">
            <RequestPhotos urls={request.attachmentUrls} />
          </div>
        )}
      </Card>

      {/* Session-dependent claim CTA / bookmark reminder. Client island so the
          server body can stream regardless of the client-only session read. */}
      <ViewerBanner clientId={request.clientId} trackingToken={id} />
    </>
  );
}
