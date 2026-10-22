"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoSignOut, getDemoUser, type DemoUser } from "@/lib/demo-auth";

/**
 * Shown on /my-gallery when Supabase is not configured.
 * Uses the browser-local demo account session.
 */
export default function DemoGallery() {
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null | undefined>(undefined);

  useEffect(() => {
    setUser(getDemoUser());
  }, []);

  if (user === undefined) {
    return (
      <section className="px-[8%] py-16 text-center">
        <p className="text-sm text-mocha">Loading…</p>
      </section>
    );
  }

  if (user === null) {
    return (
      <section className="px-[8%] py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-[#eee3d3] bg-sand p-10 text-center">
          <p className="font-display text-xl">Sign in required</p>
          <p className="mt-2 text-sm text-mocha">
            Please sign in or create an account to view your private gallery.
          </p>
          <Link
            href="/login?next=/my-gallery"
            className="mt-5 inline-block rounded-full bg-gold px-6 py-3 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso"
          >
            Go to Login →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-[8%] py-16">
      <p className="text-center text-[11px] font-medium tracking-[3px] text-gold">
        YOUR PRIVATE GALLERY
      </p>
      <h1 className="mt-2 text-center font-display text-4xl font-semibold">
        Welcome{user.fullName ? `, ${user.fullName}` : ""}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-mocha">
        Signed in as {user.email}.
      </p>

      <p className="mx-auto mt-6 max-w-xl rounded-md bg-amber-50 px-4 py-3 text-center text-xs leading-6 text-amber-800">
        Demo mode: Supabase is not connected, so this account and any photos
        are stored only in this browser. Connect Supabase (see README.md) for
        real private galleries shared by the studio.
      </p>

      <div className="mx-auto mt-8 max-w-xl rounded-xl border border-[#eee3d3] bg-sand p-10 text-center">
        <p className="font-display text-xl">No photos yet</p>
        <p className="mt-2 text-sm text-mocha">
          The studio has not shared a gallery with your account yet. Please
          contact us on WhatsApp once your photos are ready.
        </p>
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => {
            demoSignOut();
            router.push("/");
            router.refresh();
          }}
          className="rounded-full border border-[#dfd1bc] px-6 py-3 text-[13px] text-espresso transition hover:border-gold hover:text-gold"
        >
          Sign Out
        </button>
      </div>
    </section>
  );
}
