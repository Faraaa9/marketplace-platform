import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InquiryConversationPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <InquiryConversationRedirect params={params} />
    </Suspense>
  );
}

async function InquiryConversationRedirect({ params }: PageProps) {
  await connection();
  const { token } = await params;
  redirect(`/paskyra/zinutes?thread=${encodeURIComponent(token)}`);
  return null;
}
