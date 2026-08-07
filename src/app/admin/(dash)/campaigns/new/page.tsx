import { PageHeader } from "@/components/admin/ui";
import { createCampaign } from "../actions";
import { CampaignForm } from "../campaign-form";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader title="Yeni kampaniya" />
      <CampaignForm action={createCampaign} />
    </>
  );
}
