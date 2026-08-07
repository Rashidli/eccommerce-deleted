import { PageHeader } from "@/components/admin/ui";
import { createSlide } from "../actions";
import { SlideForm } from "../slide-form";

export default function NewSlidePage() {
  return (
    <>
      <PageHeader title="Yeni slayd" />
      <SlideForm action={createSlide} />
    </>
  );
}
