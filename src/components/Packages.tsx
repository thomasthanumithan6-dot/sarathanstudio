import Link from "next/link";
import { getPackages } from "@/lib/packages";

export default async function Packages() {
  const packages = await getPackages();

  return (
    <section id="packages" className="bg-cream px-[8%] py-20 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        OUR PRICING
      </p>
      <h2 className="mt-2 font-display text-4xl font-semibold">
        Photography Packages
      </h2>

      <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
        {packages.map((pkg) => (
          <article
            key={pkg.id ?? pkg.name}
            className="rounded-lg border border-[#eee3d3] bg-white p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
          >
            <h3 className="font-display text-2xl">{pkg.name}</h3>
            <p className="mt-3 font-display text-3xl text-gold">
              Rs. {pkg.price_lkr.toLocaleString("en-LK")}
            </p>
            <p className="mt-3 min-h-[40px] text-[13px] leading-6 text-mocha">
              {pkg.description}
            </p>
            <Link
              href={`/booking?package=${encodeURIComponent(pkg.name)}`}
              className="mt-5 inline-block rounded-full bg-gold px-6 py-3 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso"
            >
              Choose Package
            </Link>
          </article>
        ))}
      </div>

      <p className="mt-5 text-[11px] text-mocha">
        These are sample prices until packages are managed in the admin
        dashboard (requires Supabase).
      </p>
    </section>
  );
}
