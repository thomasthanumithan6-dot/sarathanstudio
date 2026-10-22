import BookingForm from "@/components/BookingForm";
import { getPackages } from "@/lib/packages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Session | Sarathan Studio",
};

export default async function BookingPage() {
  const packages = await getPackages();

  return (
    <section className="px-[8%] py-16 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        RESERVE YOUR DATE
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Book Your Photography Session
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-mocha">
        Fill in the details below. We will open WhatsApp with your booking
        message ready to send to the studio.
      </p>
      <BookingForm packages={packages} />
    </section>
  );
}
