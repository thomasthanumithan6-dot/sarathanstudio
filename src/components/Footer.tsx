import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-espresso px-6 py-12 text-center text-white">
      <h2 className="font-display text-2xl tracking-[4px]">SARATHAN STUDIO</h2>
      <p className="mt-2 text-[#c9bda9]">{site.tagline}</p>

      <nav className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#c9bda9]">
        <Link href="/#services" className="transition hover:text-white">Services</Link>
        <Link href="/#gallery" className="transition hover:text-white">Gallery</Link>
        <Link href="/album" className="transition hover:text-white">Album</Link>
        <Link href="/ai-preview" className="transition hover:text-white">AI Preview</Link>
        <Link href="/booking" className="transition hover:text-white">Booking</Link>
        <Link href="/my-gallery" className="transition hover:text-white">My Gallery</Link>
        <Link href="/admin" className="transition hover:text-white">Admin</Link>
      </nav>

      <p className="mt-6 text-xs text-[#c9bda9]">
        <a href={`tel:${site.phone}`} className="transition hover:text-white">
          {site.phone}
        </a>
        {" · "}
        <a href={`mailto:${site.email}`} className="transition hover:text-white">
          {site.email}
        </a>
      </p>
      <p className="mt-3 text-xs text-[#c9bda9]">
        © {new Date().getFullYear()} Sarathan Studio. All rights reserved.
      </p>
    </footer>
  );
}
