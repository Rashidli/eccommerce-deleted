import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { updateSlide } from "../actions";
import { SlideForm } from "../slide-form";

export default async function EditSlidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slide = await prisma.slide.findUnique({ where: { id } });
  if (!slide) notFound();

  return (
    <>
      <PageHeader title={slide.titleAz} subtitle="Slaydı redaktə et" />
      <SlideForm action={updateSlide} slide={slide} />
    </>
  );
}
