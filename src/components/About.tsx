import Link from "next/link";
import { ABOUT_IMAGE } from "@/lib/photos";

export default function About() {
  return (
    <section
      id="about"
      className="grid items-center gap-12 px-[8%] py-20 md:grid-cols-2"
    >
      <img
        src={ABOUT_IMAGE}
        alt="Professional photography camera"
        className="h-[370px] w-full rounded-md object-cover max-md:h-[280px]"
      />
      <div>
        <p className="text-[11px] font-medium tracking-[3px] text-gold">
          ABOUT OUR STUDIO
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold">
          Every Picture Tells a Story
        </h2>
        <p className="mt-4 text-sm leading-7 text-mocha">
          Welcome to Sarathan Studio. We specialize in capturing weddings,
          birthdays, portraits, family photographs and special events.
        </p>
        <p className="mt-3 text-sm leading-7 text-mocha">
          Our goal is to turn your precious moments into beautiful memories
          that you can cherish forever.
        </p>
        <Link
          href="/#gallery"
          className="mt-6 inline-block rounded-full bg-gold px-6 py-3.5 text-[13px] text-white transition hover:-translate-y-0.5 hover:bg-espresso"
        >
          Explore Our Work →
        </Link>
      </div>
    </section>
  );
}
