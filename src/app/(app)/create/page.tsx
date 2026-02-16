import { CreatePostForm } from "@/components/create/create-post-form";

export default function CreatePage() {
  return (
    <div>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neuer Post</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Teile dein bestes Meme mit der Community.
          </p>
        </div>
        <CreatePostForm />
      </div>
    </div>
  );
}
