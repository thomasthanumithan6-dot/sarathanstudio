"use client";

import { useState } from "react";
import { PORTFOLIO } from "@/lib/photos";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "wedding", label: "Wedding" },
  { id: "birthday", label: "Birthday" },
  { id: "portrait", label: "Portrait" },
  { id: "family", label: "Family" },
];

export default function PortfolioGallery() {
  const [filter, setFilter] = useState<string>("all");

  const visible = PORTFOLIO.filter(
    (photo) => filter === "all" || photo.category === filter
  );

  return (
    <section id="gallery" className="bg-cream px-[8%] py-20 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        OUR PORTFOLIO
      </p>
      <h2 className="mt-2 font-display text-4xl font-semibold">
        Beautiful Moments
      </h2>

      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={`rounded-full border border-[#dfd1bc] px-5 py-2.5 text-sm transition ${
              filter === item.id
                ? "bg-gold text-white"
                : "hover:bg-gold hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((photo) => (
          <figure
            key={photo.id}
            className="group relative overflow-hidden rounded-md"
          >
            <img
              src={photo.src}
              alt={`${photo.title} photography`}
              loading="lazy"
              className="h-[270px] w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-left font-display text-xl text-white">
              {photo.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
