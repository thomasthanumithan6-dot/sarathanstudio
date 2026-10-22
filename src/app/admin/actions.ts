"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function addPackage(formData: FormData) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price_lkr"));
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 2) throw new Error("Package name is required.");
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Enter a valid package price.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("packages").insert({
    name,
    price_lkr: Math.round(price),
    description: description || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addGallery(formData: FormData) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const customerId = String(formData.get("customer_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!customerId) throw new Error("Choose a customer.");
  if (title.length < 2) throw new Error("Gallery title is required.");

  const supabase = createClient();
  const { error } = await supabase
    .from("galleries")
    .insert({ customer_id: customerId, title });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addPhoto(formData: FormData) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const galleryId = String(formData.get("gallery_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!galleryId) throw new Error("Choose a gallery.");
  try {
    new URL(url);
  } catch {
    throw new Error("Enter a valid photo URL.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("photos").insert({
    gallery_id: galleryId,
    title: title || null,
    url,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
