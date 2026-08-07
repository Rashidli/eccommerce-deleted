import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { Checkbox, Field, FormGrid, Select } from "@/components/admin/fields";
import { DeleteButton, SubmitButton } from "@/components/admin/form-actions";
import { PERMISSIONS, ROLE_LABELS, can } from "@/lib/admin-permissions";
import {
  createAdmin,
  deleteAdmin,
  revokeAdminSessions,
  setAdminPassword,
  updateAdmin,
} from "./actions";

/**
 * ADMİNLƏR — panelə girişi olan hesablar.
 *
 * Əvvəl giriş `.env`-dəki TƏK paylaşılan parol idi: kimin nə etdiyi
 * bilinmirdi, bir nəfərin girişini ayrıca bağlamaq mümkün deyildi və parolu
 * dəyişmək üçün deploy lazım gəlirdi.
 *
 * Bu bölmə MÜŞTƏRİLƏRDƏN (`/admin/users`) tam ayrıdır — ayrı cədvəl, ayrı
 * sessiya, ayrı cookie (qayda #1).
 */

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  // Bu bölmə öz icazəsini tələb edir — admin yaratmaq ən həssas əməliyyatdır.
  const me = await requirePermission("admins");
  const { error, ok } = await searchParams;

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <>
      <PageHeader
        title="Adminlər"
        subtitle={`${admins.length} hesab · panelə giriş yalnız bunlarla mümkündür`}
      />

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand-ink">
          Yadda saxlanıldı.
        </p>
      )}

      <Card className="mb-4 p-5">
        <h2 className="mb-3 font-semibold text-brand-ink">Yeni admin</h2>
        <form action={createAdmin} className="space-y-4">
          <FormGrid>
            <Field name="fullName" label="Ad Soyad" required />
            <Field name="email" label="E-poçt" type="email" required />
            <Field
              name="password"
              label="Parol"
              type="password"
              required
              hint="Ən azı 8 simvol."
            />
            <Select
              name="role"
              label="Rol"
              defaultValue="admin"
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </FormGrid>

          <PermissionPicker />

          <div className="border-t border-border pt-4">
            <SubmitButton>Admin yarat</SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        {admins.length === 0 ? (
          <EmptyState>
            Hesab yoxdur — giriş səhifəsində ilk hesabı yaradın.
          </EmptyState>
        ) : (
          <Table head={["Ad", "E-poçt", "Rol", "İcazə", "Sessiya", "Son giriş", "Status"]}>
            {admins.map((a) => (
              <tr key={a.id} className="align-top hover:bg-secondary/50">
                <Td>
                  <span className="font-medium text-brand-ink">{a.fullName}</span>
                  {a.id === me.id && (
                    <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      siz
                    </span>
                  )}
                </Td>
                <Td className="text-muted-foreground">{a.email}</Td>
                <Td className="text-muted-foreground">
                  {ROLE_LABELS[a.role] ?? a.role}
                </Td>
                <Td className="text-muted-foreground">
                  {a.role === "owner"
                    ? "hamısı"
                    : `${a.permissions.length}/${PERMISSIONS.length}`}
                </Td>
                <Td className="text-muted-foreground">{a._count.sessions}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {a.lastLoginAt ? formatDate(a.lastLoginAt) : "—"}
                </Td>
                <Td>
                  <Badge
                    status={a.isActive ? "active" : "inactive"}
                    label={a.isActive ? "Aktiv" : "Bağlı"}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="mt-4 space-y-4">
        {admins.map((a) => (
          <Card key={a.id} className="p-5">
            <h3 className="mb-3 font-semibold text-brand-ink">
              {a.fullName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {a.email}
              </span>
            </h3>

            <div className="grid gap-4 lg:grid-cols-2">
              <form action={updateAdmin} className="space-y-4">
                <input type="hidden" name="id" value={a.id} />
                <FormGrid>
                  <Field name="fullName" label="Ad Soyad" defaultValue={a.fullName} required />
                  <Field name="email" label="E-poçt" type="email" defaultValue={a.email} required />
                  <Select
                    name="role"
                    label="Rol"
                    defaultValue={a.role}
                    options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                  <div className="flex items-end">
                    <Checkbox name="isActive" label="Aktiv" defaultChecked={a.isActive} />
                  </div>
                </FormGrid>

                <PermissionPicker admin={a} />

                <SubmitButton />
              </form>

              <div className="space-y-4">
                <form action={setAdminPassword} className="space-y-3">
                  <input type="hidden" name="id" value={a.id} />
                  <Field
                    name="password"
                    label="Yeni parol"
                    type="password"
                    hint="Dəyişəndə bu hesabın bütün sessiyaları bağlanır."
                  />
                  <SubmitButton>Parolu dəyiş</SubmitButton>
                </form>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <form action={revokeAdminSessions}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium"
                    >
                      Sessiyaları bağla ({a._count.sessions})
                    </button>
                  </form>
                  {a.id !== me.id && <DeleteButton action={deleteAdmin} id={a.id} />}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/**
 * İCAZƏ SEÇİMİ.
 *
 * Rol yalnız şablondur — həqiqi icazə bu qutulardır. Heç biri seçilməsə
 * server rolun şablonunu tətbiq edir (icazəsiz admin heç bir bölməni aça
 * bilməzdi).
 *
 * `owner` üçün siyahı sönük göstərilir: o, bütün yoxlamalardan onsuz da
 * keçir və qutuları söndürmək yanlış təəssürat yaradardı.
 */
function PermissionPicker({
  admin,
}: {
  admin?: { role: string; permissions: string[] };
}) {
  const isOwner = admin?.role === "owner";

  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium text-brand-ink">İcazələr</legend>
      {isOwner && (
        <p className="mb-2 text-xs text-muted-foreground">
          Sahib bütün bölmələrə çıxa bilir — seçim tətbiq olunmur.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PERMISSIONS.map((p) => (
          <label key={p.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="permissions"
              value={p.key}
              defaultChecked={admin ? can(admin, p.key) : undefined}
              disabled={isOwner}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            <span className={isOwner ? "text-muted-foreground" : ""}>{p.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
