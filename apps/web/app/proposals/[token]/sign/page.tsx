import { PublicQuoteView } from "@/components/public-quote-view";

export default async function ProposalSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicQuoteView token={token} />;
}
