import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import ThomaAssistant from "@/components/ThomaAssistant";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Sarathan Studio | Photography",
  description:
    "Wedding, birthday, portrait, family and event photography. Capturing moments, creating memories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${poppins.variable} bg-ivory font-body text-espresso antialiased`}
      >
        <Navbar />
        <main className="pt-[98px] max-md:pt-[90px]">{children}</main>
        <Footer />
        <WhatsAppFloat />
        <ThomaAssistant />
      </body>
    </html>
  );
}
