import { LearnGuidePage } from "@/lib/learn-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LearnGuidePage slug={slug} space="coach" />;
}
