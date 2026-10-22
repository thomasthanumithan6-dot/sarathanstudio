export type PortfolioPhoto = {
  id: string;
  title: string;
  category: "wedding" | "birthday" | "portrait" | "family";
  src: string;
};

export const PORTFOLIO: PortfolioPhoto[] = [
  {
    id: "wedding",
    title: "Wedding",
    category: "wedding",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "birthday",
    title: "Birthday",
    category: "birthday",
    src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "portrait",
    title: "Portrait",
    category: "portrait",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "family",
    title: "Family",
    category: "family",
    src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  },
];

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1800&q=85";

export const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80";
