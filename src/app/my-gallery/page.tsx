import { redirect } from "next/navigation";
import DemoGallery from "@/components/DemoGallery";
import PhotoSelector from "@/components/PhotoSelector";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PhotoRow = { id: string; title: string | null; storage_path: string };
type GalleryRow = {
  id: string;
  title: string;
  photos: PhotoRow[] | null;
};
type CustomerRow = {
  id: string;
  customer_code: string;
  galleries: GalleryRow[] | null;
};
type SelectionRow = { photo_id: string; status: "draft" | "submitted" | "completed" };

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

  // The RLS policies guarantee this only ever returns the caller's own record.
  const { data: customer } = await supabase
    .from("customers")
    .select("id, customer_code, galleries ( id, title, photos ( id, title, storage_path ) )")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!customer) {
    return (
      <section className="px-[8%] py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-[#eee3d3] bg-sand p-10 text-center">
          <p className="font-display text-xl">No customer profile yet</p>
          <p className="mt-2 text-sm leading-7 text-mocha">
            Your account ({user.email}) is signed in, but the studio has not
            linked a customer profile to it yet. Please contact us on WhatsApp
            and we will set up your private gallery.
          </p>
        </div>
      </section>
    );
  }

  const typedCustomer = customer as CustomerRow;

  const { data: selectionRows } = await supabase
    .from("photo_selections")
    .select("photo_id, status")
    .eq("customer_id", typedCustomer.id);

  const selections = (selectionRows ?? []) as SelectionRow[];

  // Short-lived signed URLs keep original photos private.
  const photos = await Promise.all(
    (typedCustomer.galleries ?? []).flatMap((gallery) =>
      (gallery.photos ?? []).map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from("customer-photos")
          .createSignedUrl(photo.storage_path, 300);

        return {
          id: photo.id,
          title: photo.title,
          url: signed?.signedUrl ?? "",
          galleryTitle: gallery.title,
        };
      })
    )
  );

  const overallStatus =
    selections.length === 0
      ? "draft"
      : selections.every((s) => s.status === "completed")
        ? "completed"
        : selections.some((s) => s.status === "submitted")
          ? "submitted"
          : "draft";

  return (
    <section className="px-[8%] py-16">
      <p className="text-center text-[11px] font-medium tracking-[3px] text-gold">
        YOUR PRIVATE GALLERY
      </p>
      <h1 className="mt-2 text-center font-display text-4xl font-semibold">
        Select Your Favourite Photos
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-mocha">
        Signed in as {user.email} · Customer ID{" "}
        <span className="font-medium text-gold">{typedCustomer.customer_code}</span>.
        Only you and the studio can see these photos.
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
        <PhotoSelector
          photos={photos.filter((photo) => photo.url !== "")}
          customerId={typedCustomer.id}
          initialSelections={selections}
          initialStatus={overallStatus}
        />
      )}
    </section>
  );
}
