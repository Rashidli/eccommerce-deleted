import { PageHeader } from "@/components/admin/ui";
import { createPost } from "../actions";
import { PostForm } from "../post-form";

export default function NewPostPage() {
  return (
    <>
      <PageHeader title="Yeni bloq yazısı" />
      <PostForm action={createPost} />
    </>
  );
}
