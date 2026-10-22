import { getPackages } from "@/lib/packages";
import { site } from "@/lib/site";

export type PublicSearchResult = {
  title: string;
  description: string;
  href: string;
};

const PUBLIC_PAGES: PublicSearchResult[] = [
  {
    title: "About Sarathan Studio",
    description:
      "We specialize in capturing weddings, birthdays, portraits, family photographs and special events. Our goal is to turn precious moments into beautiful memories.",
    href: "/#about",
  },
  {
    title: "Wedding Photography",
    description: "Beautiful photographs of your special day.",
    href: "/#services",
  },
  {
    title: "Birthday Photography",
    description: "Keep your birthday celebrations memorable.",
    href: "/#services",
  },
  {
    title: "Portrait Photography",
    description: "Professional portraits that show your personality.",
    href: "/#services",
  },
  {
    title: "Event Videography",
    description: "Relive your celebrations through beautiful videos.",
    href: "/#services",
  },
  {
    title: "Photography Gallery",
    description: "Explore our photography work and portfolio.",
    href: "/#gallery",
  },
  {
    title: "Photography Packages",
    description: "View photography packages and sample prices in Sri Lankan rupees.",
    href: "/#packages",
  },
  {
    title: "Book a Photography Session",
    description:
      "Reserve your date. Submit your event type, date and location, then continue with WhatsApp.",
    href: "/booking",
  },
  {
    title: "Contact Sarathan Studio",
    description:
      `Contact the studio by phone at ${site.phone} or email ${site.email}, or view the location and photos.`,
    href: "/#contact",
  },
  {
    title: "AI Photo Preview",
    description:
      "Upload a photo to preview cinematic, wedding, black and white, or studio portrait styles.",
    href: "/ai-preview",
  },
  {
    title: "Album",
    description: "Browse the studio album.",
    href: "/album",
  },
];

const IGNORED_SEARCH_WORDS = new Set(["a", "an", "and", "for", "in", "of", "our", "the", "to"]);

export async function getPublicStudioContent(): Promise<PublicSearchResult[]> {
  const packages = await getPackages();
  const packageResults = packages.map((item) => ({
    title: item.name,
    description: `${item.description ?? "Photography package"} Price: Rs. ${item.price_lkr.toLocaleString("en-LK")}.`,
    href: `/booking?package=${encodeURIComponent(item.name)}`,
  }));

  return [...PUBLIC_PAGES, ...packageResults];
}

export async function searchPublicStudioContent(
  query: string
): Promise<PublicSearchResult[]> {
  const words = (query.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => !IGNORED_SEARCH_WORDS.has(word)
  );
  if (!words.length) return [];

  const entries = await getPublicStudioContent();
  return entries
    .map((entry) => {
      const title = entry.title.toLocaleLowerCase();
      const content = `${entry.title} ${entry.description}`.toLocaleLowerCase();
      const score = words.reduce((total, word) => {
        if (!content.includes(word)) return total;
        return total + (title.includes(word) ? 3 : 1);
      }, 0);
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ entry }) => entry);
}