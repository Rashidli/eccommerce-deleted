import { Checkbox, Field, FormGrid, FullWidth, TextArea } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImage: string | null;
  isPublished: boolean;
};

export function PostForm({
  action,
  post,
}: {
  action: (formData: FormData) => void;
  post?: Post;
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {post && <input type="hidden" name="id" value={post.id} />}

        <FormGrid>
          <Field name="title" label="Başlıq" defaultValue={post?.title} required />
          <Field
            name="slug"
            label="Slug"
            defaultValue={post?.slug}
            hint="Boş buraxsanız başlıqdan yaradılır."
          />

          <FullWidth>
            <Field name="coverImage" label="Örtük şəkli (URL)" defaultValue={post?.coverImage} />
          </FullWidth>

          <FullWidth>
            <TextArea
              name="excerpt"
              label="Qısa təsvir"
              rows={2}
              defaultValue={post?.excerpt}
              hint="Siyahıda göstərilir."
            />
          </FullWidth>

          <FullWidth>
            <TextArea name="body" label="Mətn" rows={14} defaultValue={post?.body} />
          </FullWidth>

          <FullWidth>
            <Checkbox
              name="isPublished"
              label="Dərc et"
              defaultChecked={post?.isPublished ?? false}
            />
          </FullWidth>
        </FormGrid>

        <div className="flex gap-2 border-t border-border pt-4">
          <SubmitButton />
          <CancelButton />
        </div>
      </form>
    </Card>
  );
}
