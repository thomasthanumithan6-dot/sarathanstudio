import { redirect } from "next/navigation";
import ConfigNotice from "@/components/ConfigNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { addGallery, addPackage, addPhoto } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-4 py-3 text-sm outline-none transition focus:border-gold";

type BookingRow = {
  id: string;
  name: string;
  phone: string;
  event_type: string;
  event_date: string;
  location: string | null;
  created_at: string;
};
type PackageRow = {
  id: string;
  name: string;
  price_lkr: number;
  description: string | null;
};
type GalleryRow = { id: string; title: string };
type PhotoRow = {
  id: string;
  title: string | null;
  url: string;
  gallery_id: string;
};
type ProfileRow = { id: string; full_name: string | null; role: string };

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
    { data: bookings },
    { data: packages },
    { data: galleries },
    { data: photos },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, name, phone, event_type, event_date, location, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("packages")
      .select("id, name, price_lkr, description")
      .order("price_lkr", { ascending: false }),
    supabase.from("galleries").select("id, title").order("created_at", { ascending: false }),
    supabase
      .from("photos")
      .select("id, title, url, gallery_id")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("created_at", { ascending: false }),
  ]);

  const bookingRows = (bookings ?? []) as BookingRow[];
  const packageRows = (packages ?? []) as PackageRow[];
  const galleryRows = (galleries ?? []) as GalleryRow[];
  const photoRows = (photos ?? []) as PhotoRow[];
  const customerRows = ((customers ?? []) as ProfileRow[]).filter(
    (profileRow) => profileRow.role === "customer"
  );

  return (
    <section className="px-[8%] py-16">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        ADMIN DASHBOARD
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Studio Management
      </h1>
      <p className="mt-2 text-sm text-mocha">
        Signed in as {profile.full_name || user.email}.
      </p>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#eee3d3] bg-white p-6 text-center">
          <p className="font-display text-3xl text-gold">{bookingRows.length}</p>
          <p className="mt-1 text-xs text-mocha">Bookings</p>
        </div>
        <div className="rounded-lg border border-[#eee3d3] bg-white p-6 text-center">
          <p className="font-display text-3xl text-gold">{photoRows.length}</p>
          <p className="mt-1 text-xs text-mocha">Photos</p>
        </div>
        <div className="rounded-lg border border-[#eee3d3] bg-white p-6 text-center">
          <p className="font-display text-3xl text-gold">{packageRows.length}</p>
          <p className="mt-1 text-xs text-mocha">Packages</p>
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-[#eee3d3] bg-white p-6">
          <h2 className="font-display text-2xl">Recent Bookings</h2>
          {bookingRows.length === 0 ? (
            <p className="mt-4 text-sm text-mocha">No bookings yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eee3d3] text-xs text-mocha">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingRows.map((booking) => (
                    <tr key={booking.id} className="border-b border-[#f4ecdf]">
                      <td className="py-2.5 pr-4">{booking.name}</td>
                      <td className="py-2.5 pr-4">{booking.event_type}</td>
                      <td className="py-2.5 pr-4">{booking.event_date}</td>
                      <td className="py-2.5">{booking.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid content-start gap-8">
          <div className="rounded-xl border border-[#eee3d3] bg-white p-6">
            <h2 className="font-display text-2xl">Add Package</h2>
            <form action={addPackage} className="mt-4 grid gap-3">
              <input name="name" required placeholder="Package name" className={inputClass} />
              <input
                name="price_lkr"
                required
                type="number"
                min="0"
                step="1"
                placeholder="Price in LKR"
                className={inputClass}
              />
              <input name="description" placeholder="Short description" className={inputClass} />
              <button
                type="submit"
                className="rounded-full bg-gold px-6 py-3 text-sm text-white transition hover:bg-espresso"
              >
                Add Package
              </button>
            </form>
            {packageRows.length > 0 && (
              <ul className="mt-4 space-y-2 text-left text-sm">
                {packageRows.map((pkg) => (
                  <li key={pkg.id} className="flex justify-between gap-4 border-b border-[#f4ecdf] pb-2">
                    <span>{pkg.name}</span>
                    <span className="text-gold">Rs. {pkg.price_lkr.toLocaleString("en-LK")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#eee3d3] bg-white p-6">
            <h2 className="font-display text-2xl">Add Customer Gallery</h2>
            {customerRows.length === 0 ? (
              <p className="mt-4 text-sm text-mocha">
                No customer accounts yet. Customers appear here after they
                create an account on the login page.
              </p>
            ) : (
              <form action={addGallery} className="mt-4 grid gap-3">
                <select name="customer_id" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Choose customer
                  </option>
                  {customerRows.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name || customer.id}
                    </option>
                  ))}
                </select>
                <input name="title" required placeholder="Gallery title (e.g. Perera Wedding)" className={inputClass} />
                <button
                  type="submit"
                  className="rounded-full bg-gold px-6 py-3 text-sm text-white transition hover:bg-espresso"
                >
                  Create Gallery
                </button>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-[#eee3d3] bg-white p-6">
            <h2 className="font-display text-2xl">Add Photo</h2>
            {galleryRows.length === 0 ? (
              <p className="mt-4 text-sm text-mocha">
                Create a customer gallery first, then add photos to it.
              </p>
            ) : (
              <form action={addPhoto} className="mt-4 grid gap-3">
                <select name="gallery_id" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Choose gallery
                  </option>
                  {galleryRows.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.title}
                    </option>
                  ))}
                </select>
                <input name="title" placeholder="Photo title (optional)" className={inputClass} />
                <input
                  name="url"
                  required
                  type="url"
                  placeholder="https://... (photo URL or signed storage URL)"
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="rounded-full bg-gold px-6 py-3 text-sm text-white transition hover:bg-espresso"
                >
                  Add Photo
                </button>
              </form>
            )}
            <p className="mt-3 text-xs leading-6 text-mocha">
              For private storage, upload files to a private Supabase bucket
              and paste a signed URL here (see README.md).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
