import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader, PrimaryLink, Table, Td } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form-actions";
import { deleteSlide } from "./actions";

export default async function AdminSlidesPage() {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("marketing");

  const slides = await prisma.slide.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <>
      <PageHeader
        title="Slayder"
        subtitle="Ana səhifənin baş bannerləri"
        action={
          <PrimaryLink href="/admin/slides/new">
            <Plus className="h-4 w-4" />
            Yeni slayd
          </PrimaryLink>
        }
      />

      <Card>
        {slides.length === 0 ? (
          <EmptyState>Hələ slayd yoxdur. İlkini əlavə edin.</EmptyState>
        ) : (
          <Table head={["Sıra", "Slayd", "Keçid", "Status", ""]}>
            {slides.map((slide) => (
              <tr key={slide.id} className="hover:bg-secondary/50">
                <Td className="text-muted-foreground">{slide.sortOrder}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt=""
                      className="h-11 w-20 shrink-0 rounded-lg bg-secondary object-cover"
                    />
                    <span className="min-w-0">
                      <Link
                        href={`/admin/slides/${slide.id}`}
                        className="block truncate font-medium text-brand-ink hover:text-brand"
                      >
                        {slide.titleAz}
                      </Link>
                      {slide.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {slide.subtitle}
                        </span>
                      )}
                    </span>
                  </div>
                </Td>
                <Td className="font-mono text-xs text-muted-foreground">
                  {slide.href}
                </Td>
                <Td>
                  <Badge
                    status={slide.isActive ? "active" : "inactive"}
                    label={slide.isActive ? "Aktiv" : "Gizli"}
                  />
                </Td>
                <Td className="text-right">
                  <DeleteButton action={deleteSlide} id={slide.id} compact />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
