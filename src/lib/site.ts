export const site = {
  name: "Sarathan Studio",
  tagline: "Capturing Moments, Creating Memories.",
  phone: process.env.NEXT_PUBLIC_STUDIO_PHONE ?? "+94776292002",
  email: "sarathanstudio24@gmail.com",
  mapsUrl: "https://maps.app.goo.gl/xqP9Liacfk9WAhEt5",
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94776292002").replace(/\D/g, ""),
};

export function whatsappLink(message: string): string {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
