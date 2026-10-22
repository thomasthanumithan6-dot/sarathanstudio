import Link from "next/link";
import { HERO_IMAGE } from "@/lib/photos";

export default function Hero() {
  return (
    <section
      className="flex min-h-[calc(100svh-98px)] items-center bg-cover bg-center px-[8%] py-16 max-md:min-h-[calc(100svh-90px)]"
      style={{
        backgroundImage: `linear-gradient(90deg, #f8f2e8 0%, rgba(248,242,232,0.87) 40%, rgba(248,242,232,0.2) 100%), url('${HERO_IMAGE}')`,
      }}
    >
      <div className="max-w-xl animate-fade-up">
        <p className="mb-4 text-[11px] font-medium tracking-[3px] text-gold">
          PROFESSIONAL PHOTOGRAPHY & VIDEOGRAPHY
        </p>
        <h1 className="font-display text-[clamp(48px,8vw,95px)] font-semibold leading-[0.95] tracking-wide">
          SARATHAN
          <br />
          STUDIO
        </h1>
        <h2 className="mt-4 font-display text-2xl italic">
          Capturing Moments, Creating Memories.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-mocha">
          Every moment tells a story. We capture your beautiful memories with
          creativity, passion and elegance.
        </p>
        <Link
          href="/booking"
          className="mt-7 inline-block rounded-full bg-gold px-6 py-3.5 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso"
        >
          Book Your Session →
        </Link>
      </div>
    </section>
  );
}
