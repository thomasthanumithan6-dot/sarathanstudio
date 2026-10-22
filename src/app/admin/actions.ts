"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const BUCKET = "customer-photos";
const MAX_PHOTO_SIZE = 15 * 1024 * 1024; // 15 MB

type ActionResult = { error?: string };

/**
 * Every admin action re-verifies the caller's role on the server.
 * RLS is the second layer - even if a check here were bypassed,
 * the database policies still block non-admin writes.
 */
async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return supabase;
}

// ---------------- Customers ----------------

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const profileId = String(formData.get("profile_id") ?? "");
    const phone = String(formData.get("phone") ?? "").trim();
    const eventType = String(formData.get("event_type") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!profileId) return { error: "Choose a customer account." };

    const { error } = await supabase.from("customers").insert({
      profile_id: profileId,
      phone: phone || null,
      event_type: eventType || null,
      notes: notes || null,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create customer." };
  }
}

export async function updateCustomer(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const phone = String(formData.get("phone") ?? "").trim();
    const eventType = String(formData.get("event_type") ?? "").trim();
    const status = String(formData.get("status") ?? "active");
    const notes = String(formData.get("notes") ?? "").trim();

    if (!id) return { error: "Missing customer ID." };
    if (!["active", "completed", "archived"].includes(status)) {
      return { error: "Invalid status." };
    }

    const { error } = await supabase
      .from("customers")
      .update({
        phone: phone || null,
        event_type: eventType || null,
        status,
        notes: notes || null,
      })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update customer." };
  }
}

// ---------------- Galleries & photos ----------------

export async function createGallery(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const customerId = String(formData.get("customer_id") ?? "");
    const title = String(formData.get("title") ?? "").trim();

    if (!customerId) return { error: "Choose a customer." };
    if (title.length < 2) return { error: "Gallery title is required." };

    const { error } = await supabase
      .from("galleries")
      .insert({ customer_id: customerId, title });
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create gallery." };
  }
}

export async function deleteGallery(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing gallery ID." };

    // Remove the original files from private storage first.
    const { data: files } = await supabase.storage.from(BUCKET).list(id);
    if (files && files.length > 0) {
      await supabase.storage
        .from(BUCKET)
        .remove(files.map((file) => `${id}/${file.name}`));
    }

    // Row delete cascades to photos and their selections.
    const { error } = await supabase.from("galleries").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete gallery." };
  }
}

export async function uploadPhoto(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const galleryId = String(formData.get("gallery_id") ?? "");
    const file = formData.get("file");

    if (!galleryId) return { error: "Missing gallery." };
    if (!(file instanceof File)) return { error: "Choose a photo file." };
    if (!file.type.startsWith("image/")) return { error: "Only image files are allowed." };
    if (file.size > MAX_PHOTO_SIZE) return { error: "Photos must be 15 MB or smaller." };

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${galleryId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type });
    if (uploadError) return { error: uploadError.message };

    const { error: insertError } = await supabase.from("photos").insert({
      gallery_id: galleryId,
      title: file.name.replace(/\.[^.]+$/, ""),
      storage_path: storagePath,
    });

    if (insertError) {
      // Roll back the uploaded file so storage and the table stay in sync.
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return { error: insertError.message };
    }

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not upload photo." };
  }
}

export async function deletePhoto(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const storagePath = String(formData.get("storage_path") ?? "");
    if (!id || !storagePath) return { error: "Missing photo reference." };

    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) return { error: error.message };

    await supabase.storage.from(BUCKET).remove([storagePath]);

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete photo." };
  }
}

// ---------------- Selections workflow ----------------

export async function setSelectionStatus(
  customerId: string,
  newStatus: "draft" | "completed"
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!customerId) return { error: "Missing customer." };

    // Reopen: submitted -> draft. Complete: submitted -> completed.
    const { error } = await supabase
      .from("photo_selections")
      .update({ status: newStatus })
      .eq("customer_id", customerId)
      .eq("status", "submitted");
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update selection status." };
  }
}

// ---------------- Bookings ----------------

export async function createBooking(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const eventType = String(formData.get("event_type") ?? "").trim();
    const eventDate = String(formData.get("event_date") ?? "");
    const location = String(formData.get("location") ?? "").trim();
    const customerId = String(formData.get("customer_id") ?? "");

    if (name.length < 2) return { error: "Customer name is required." };
    if (phone.length < 7) return { error: "Enter a valid contact number." };
    if (!eventType) return { error: "Event type is required." };
    if (!eventDate) return { error: "Event date is required." };

    const { error } = await supabase.from("bookings").insert({
      name,
      phone,
      event_type: eventType,
      event_date: eventDate,
      location: location || null,
      customer_id: customerId || null,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create booking." };
  }
}

export async function updateBooking(
  id: string,
  paymentStatus: string,
  bookingStatus: string
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!id) return { error: "Missing booking." };
    if (!["unpaid", "advance", "paid"].includes(paymentStatus)) {
      return { error: "Invalid payment status." };
    }
    if (!["pending", "confirmed", "completed", "cancelled"].includes(bookingStatus)) {
      return { error: "Invalid booking status." };
    }

    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: paymentStatus, booking_status: bookingStatus })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update booking." };
  }
}

// ---------------- Packages ----------------

export async function addPackage(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const price = Number(formData.get("price_lkr"));
    const description = String(formData.get("description") ?? "").trim();

    if (name.length < 2) return { error: "Package name is required." };
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Enter a valid package price." };
    }

    const { error } = await supabase.from("packages").insert({
      name,
      price_lkr: Math.round(price),
      description: description || null,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add package." };
  }
}

export async function deletePackage(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing package." };

    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete package." };
  }
}
