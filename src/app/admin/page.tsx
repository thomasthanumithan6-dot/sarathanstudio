import { redirect } from "next/navigation";
import ConfigNotice from "@/components/ConfigNotice";
import CustomersAdmin, {
  type AdminCustomer,
  type AdminProfile,
} from "@/components/admin/CustomersAdmin";
import GalleriesAdmin, {
  type AdminGallery,
  type AdminPhoto,
  type CustomerOption,
} from "@/components/admin/GalleriesAdmin";
import SelectionsAdmin, {
  type AdminSelection,
} from "@/components/admin/SelectionsAdmin";
import BookingsAdmin, {
  type AdminBooking,
} from "@/components/admin/BookingsAdmin";
import PackagesAdmin, {
  type AdminPackage,
} from "@/components/admin/PackagesAdmin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "customer-photos";

type PhotoRow = {
  id: string;
  gallery_id: string;
  title: string | null;
  storage_path: string;
  created_at: string;
};

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return (
      <section className="px-[8%] py-16">
        <ConfigNotice title="Admin dashboard requires Supabase">
          Add your Supabase keys to .env.local, run supabase/schema.sql, then
          set your account&apos;s role to &quot;admin&quot; in the profiles
          table. This page enforces authorization on the server - it is not
          only hidden in the UI.
        </ConfigNotice>
      </section>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // Server-side authorization: non-admins never reach the data queries below.
  if (profile?.role !== "admin") {
    return (
      <section className="px-[8%] py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-10 text-center">
          <h1 className="font-display text-2xl">Access denied</h1>
          <p className="mt-3 text-sm text-mocha">
            The account {user.email} is not an administrator. Ask the studio
            owner to set your profile role to &quot;admin&quot; in Supabase.
          </p>
        </div>
      </section>
    );
  }

  const [
    { data: profiles },
    { data: customers },
    { data: galleries },
    { data: photos },
    { data: selections },
    { data: bookings },
    { data: packages },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, profile_id, customer_code, phone, event_type, status, notes, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("galleries")
      .select("id, customer_id, title, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("photos")
      .select("id, gallery_id, title, storage_path, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("photo_selections")
      .select("customer_id, photo_id, status, submitted_at")
      .limit(1000),
    supabase
      .from("bookings")
      .select("id, name, phone, event_type, event_date, location, payment_status, booking_status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("packages")
      .select("id, name, price_lkr, description")
      .order("price_lkr", { ascending: false }),
  ]);

  const profileRows = (profiles ?? []) as AdminProfile[];
  const customerRows = (customers ?? []) as AdminCustomer[];
  const galleryRows = (galleries ?? []) as AdminGallery[];
  const photoRows = (photos ?? []) as PhotoRow[];
  const selectionRows = (selections ?? []) as AdminSelection[];
  const bookingRows = (bookings ?? []) as AdminBooking[];
  const packageRows = (packages ?? []) as AdminPackage[];

  // Short-lived signed URLs so originals stay in the private bucket.
  const signedUrlByPath = new Map<string, string>();
  if (photoRows.length > 0) {
    const { data: signedList } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        photoRows.map((photo) => photo.storage_path),
        300
      );
    for (const entry of signedList ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrlByPath.set(entry.path, entry.signedUrl);
      }
    }
  }

  const adminPhotos: AdminPhoto[] = photoRows.map((photo) => ({
    ...photo,
    url: signedUrlByPath.get(photo.storage_path) ?? "",
  }));

  const customerOptions: CustomerOption[] = customerRows.map((customer) => {
    const linked = profileRows.find((row) => row.id === customer.profile_id);
    return {
      id: customer.id,
      label: `${customer.customer_code} - ${linked?.full_name || "Unnamed"}`,
    };
  });

  const stats = [
    { label: "Customers", value: customerRows.length },
    { label: "Photos uploaded", value: photoRows.length },
    { label: "Photos selected", value: selectionRows.length },
    {
      label: "Pending bookings",
      value: bookingRows.filter((booking) => booking.booking_status === "pending").length,
    },
  ];

  return (
    <section className="px-[8%] py-16">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        ADMIN DASHBOARD
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Studio Management
      </h1>
      <p className="mt-2 text-sm text-mocha">
        Signed in as {profile.full_name || user.email} (admin).
      </p>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[#eee3d3] bg-white p-6 text-center"
          >
            <p className="font-display text-3xl text-gold">{stat.value}</p>
            <p className="mt-1 text-xs text-mocha">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-10">
        <CustomersAdmin
          profiles={profileRows}
          customers={customerRows}
          selections={selectionRows}
        />
        <GalleriesAdmin
          customers={customerOptions}
          galleries={galleryRows}
          photos={adminPhotos}
        />
        <SelectionsAdmin
          customers={customerOptions}
          selections={selectionRows}
          photos={adminPhotos}
        />
        <BookingsAdmin bookings={bookingRows} customers={customerOptions} />
        <PackagesAdmin packages={packageRows} />
      </div>
    </section>
  );
}
