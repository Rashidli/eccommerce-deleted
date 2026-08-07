import { PageHeader } from "@/components/admin/ui";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <PageHeader
        title="Yeni istifadəçi"
        subtitle="Müştəri hesabı yaradılır — admin girişi ilə qarışmır."
      />

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <UserForm action={createUser} />
    </>
  );
}
