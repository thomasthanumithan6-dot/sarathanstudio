import Link from "next/link";
import { site } from "@/lib/site";

export default function ContactSection() {
  return (
    <section id="contact" className="px-[8%] py-20 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        GET IN TOUCH
      </p>
      <h2 className="mt-2 font-display text-4xl font-semibold">
        Contact Sarathan Studio
      </h2>
      <p className="mt-3 text-sm text-mocha">
        We would love to capture your special moments.
      </p>

      <p className="mt-6 text-sm text-mocha">
        📞 Phone:{" "}
        <a
          href={`tel:${site.phone}`}
          className="text-espresso underline underline-offset-4 transition hover:text-gold"
        >
          {site.phone}
        </a>
      </p>
      <p className="mt-3 text-sm text-mocha">
        📧 Email:{" "}
        <a
          href={`mailto:${site.email}`}
          className="text-espresso underline underline-offset-4 transition hover:text-gold"
        >
          {site.email}
        </a>
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={site.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-gold px-6 py-3 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso"
        >
          View Location &amp; Photos
        </a>
        <Link
          href="/booking"
          className="rounded-full bg-gold px-6 py-3 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso"
        >
          Book Now →
        </Link>
      </div>
    </section>
  );
}
