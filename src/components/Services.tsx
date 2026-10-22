const SERVICES = [
  {
    icon: "💍",
    title: "Wedding Photography",
    text: "Beautiful photographs of your special day.",
  },
  {
    icon: "🎉",
    title: "Birthday Photography",
    text: "Keep your birthday celebrations memorable.",
  },
  {
    icon: "📷",
    title: "Portrait Photography",
    text: "Professional portraits that show your personality.",
  },
  {
    icon: "🎬",
    title: "Event Videography",
    text: "Relive your celebrations through beautiful videos.",
  },
];

export default function Services() {
  return (
    <section id="services" className="px-[8%] py-20 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        WHAT WE DO
      </p>
      <h2 className="mt-2 font-display text-4xl font-semibold">
        Our Photography Services
      </h2>
      <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => (
          <article
            key={service.title}
            className="rounded-lg border border-[#eee3d3] bg-white p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
          >
            <span className="text-3xl" aria-hidden="true">
              {service.icon}
            </span>
            <h3 className="mt-3 font-display text-xl">{service.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-mocha">
              {service.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
