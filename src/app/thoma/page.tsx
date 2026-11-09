import type { Metadata } from "next";
import ThomaWorkspace from "@/components/ThomaWorkspace";

export const metadata: Metadata = {
  title: "THOMA AI | Sarathan Studio",
  description: "Chat with THOMA AI, the Sarathan Studio assistant.",
};

export default function ThomaPage() {
  return <ThomaWorkspace />;
}