import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { updateCampaign } from "../actions";
import { CampaignForm } from "../campaign-form";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  return (
    <>
      <PageHeader title={campaign.titleAz} subtitle="Kampaniyanı redaktə et" />
      <CampaignForm action={updateCampaign} campaign={campaign} />
    </>
  );
}
