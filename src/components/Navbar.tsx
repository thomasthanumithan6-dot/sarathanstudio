"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { demoSignOut, getDemoUser } from "@/lib/demo-auth";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/album", label: "Album" },
  { href: "/ai-preview", label: "AI Preview" },
  { href: "/my-gallery", label: "My Gallery" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => setSignedIn(Boolean(user)));
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSignedIn(Boolean(session));
      });
      return () => subscription.unsubscribe();
    }

    setSignedIn(Boolean(getDemoUser()));
  }, []);

  async function handleSignOut() {
    if (isSupabaseConfigured()) {
      await createClient().auth.signOut();
    } else {
      demoSignOut();
    }
    setSignedIn(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-ivory/95 shadow-[0_2px_15px_rgba(0,0,0,0.04)] backdrop-blur">
      <div className="mx-auto flex h-[98px] max-w-7xl items-center justify-between px-[6%] max-md:h-[90px]">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
          aria-label="Sarathan Studio home"
        >
          <img
            src="/thanu.jpg"
            alt="Sarathan Studio logo"
            className="h-14 w-14 flex-none object-contain"
          />
          <span className="font-display text-xl font-bold leading-none tracking-wide">
            SARATHAN
            <span className="mt-1 block font-body text-[9px] font-medium tracking-[4px]">
              STUDIO
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-espresso transition hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden text-[13px] text-espresso transition hover:text-gold md:inline"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden text-[13px] text-espresso transition hover:text-gold md:inline"
            >
              Login
            </Link>
          )}
          <Link
            href="/booking"
            className="whitespace-nowrap rounded-full bg-gold px-5 py-3 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso max-md:px-3 max-md:py-2.5 max-md:text-xs"
          >
            Book Now
          </Link>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="text-2xl leading-none lg:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-cream bg-ivory px-6 py-4 lg:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm text-espresso transition hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
          {signedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full py-2 text-left text-sm text-espresso transition hover:text-gold"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block py-2 text-sm text-espresso transition hover:text-gold"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
