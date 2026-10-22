import { redirect } from "next/navigation";
import DemoGallery from "@/components/DemoGallery";
import PhotoSelector from "@/components/PhotoSelector";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PhotoRow = { id: string; title: string | null; url: string };
type GalleryRow = {
  id: string;
  title: string;
  photos: PhotoRow[] | null;
};

export default async function MyGalleryPage() {
  if (!isSupabaseConfigured()) {
    return <DemoGallery />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/my-gallery");
  }

  const { data: galleries } = await supabase
    .from("galleries")
    .select("id, title, photos ( id, title, url )")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: selectionRows } = await supabase
    .from("selections")
    .select("photo_id")
    .eq("customer_id", user.id);

  const photos = ((galleries ?? []) as GalleryRow[]).flatMap((gallery) =>
    (gallery.photos ?? []).map((photo) => ({
      id: photo.id,
      title: photo.title,
      url: photo.url,
      galleryTitle: gallery.title,
    }))
  );

  const selectedIds = (selectionRows ?? []).map(
    (row: { photo_id: string }) => row.photo_id
  );

  return (
    <section className="px-[8%] py-16">
      <p className="text-center text-[11px] font-medium tracking-[3px] text-gold">
        YOUR PRIVATE GALLERY
      </p>
      <h1 className="mt-2 text-center font-display text-4xl font-semibold">
        Select Your Favourite Photos
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-mocha">
        Signed in as {user.email}. Tap the heart on any photo to add it to
        your selection - only you and the studio can see these photos.
      </p>

      {photos.length === 0 ? (
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-[#eee3d3] bg-sand p-10 text-center">
          <p className="font-display text-xl">No photos yet</p>
          <p className="mt-2 text-sm text-mocha">
            The studio has not shared a gallery with your account yet. Please
            contact us on WhatsApp once your photos are ready.
          </p>
        </div>
      ) : (
        <PhotoSelector photos={photos} initialSelectedIds={selectedIds} />
      )}
    </section>
  );
}
