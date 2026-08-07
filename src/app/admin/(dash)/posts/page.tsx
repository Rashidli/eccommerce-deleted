import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, PrimaryLink, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";
import { DeleteButton } from "@/components/admin/form-actions";
import { deletePost } from "./actions";

const PAGE_SIZE = 50;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("marketing");

  const { page = "1" } = await searchParams;
  const current = Math.max(1, parseInt(page, 10) || 1);

  // Bloq yazıları vaxtla artır — siyahı səhifələnir.
  const [total, posts] = await Promise.all([
    prisma.post.count(),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Bloq"
        subtitle={`${total} yazı`}
        action={
          <PrimaryLink href="/admin/posts/new">
            <Plus className="h-4 w-4" />
            Yeni yazı
          </PrimaryLink>
        }
      />

      <Card>
        {posts.length === 0 ? (
          <EmptyState>Hələ bloq yazısı yoxdur.</EmptyState>
        ) : (
          <Table head={["Başlıq", "Slug", "Dərc tarixi", "Status", ""]}>
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-secondary/50">
                <Td>
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="font-medium text-brand-ink hover:text-brand"
                  >
                    {post.title}
                  </Link>
                  {post.excerpt && (
                    <span className="block max-w-md truncate text-xs text-muted-foreground">
                      {post.excerpt}
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-xs text-muted-foreground">
                  {post.slug}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(post.publishedAt)}
                </Td>
                <Td>
                  <Badge
                    status={post.isPublished ? "active" : "inactive"}
                    label={post.isPublished ? "Dərc olunub" : "Qaralama"}
                  />
                </Td>
                <Td className="text-right">
                  <DeleteButton action={deletePost} id={post.id} compact />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Pagination page={current} pages={pages} basePath="/admin/posts" />
    </>
  );
}
