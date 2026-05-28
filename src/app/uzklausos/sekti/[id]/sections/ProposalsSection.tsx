import { notFound } from "next/navigation";
import ProposalsClient from "../ProposalsClient";
import { getTrackedRequestProposals } from "../data";

interface ProposalsSectionProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalsSection({ params }: ProposalsSectionProps) {
  const { id } = await params;
  const request = await getTrackedRequestProposals(id);
  if (!request) notFound();

  return <ProposalsClient trackingToken={id} request={request} />;
}
