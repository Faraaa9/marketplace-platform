import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProviderInquiryDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <ProviderInquiryRedirect params={params} />
    </Suspense>
  );
}

async function ProviderInquiryRedirect({ params }: PageProps) {
  await connection();
  const { id } = await params;
  redirect(`/tiekejas/zinutes?thread=${encodeURIComponent(id)}`);
  return null;
}
