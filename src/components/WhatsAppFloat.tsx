import { whatsappLink } from "@/lib/site";

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink(
        "Hello Sarathan Studio! I would like to ask about a photography booking."
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 rounded-full bg-[#208b57] px-5 py-3.5 text-sm text-white shadow-lg transition hover:-translate-y-0.5"
    >
      WhatsApp
    </a>
  );
}
