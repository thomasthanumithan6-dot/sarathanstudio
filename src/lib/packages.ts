import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase/config";

export type Package = {
  id?: string;
  name: string;
  price_lkr: number;
  description: string | null;
};

export const FALLBACK_PACKAGES: Package[] = [
  { name: "Wedding Package", price_lkr: 45000, description: "Wedding day photography." },
  { name: "Birthday Package", price_lkr: 15000, description: "Birthday event photography." },
  { name: "Studio Package", price_lkr: 10000, description: "Portrait and family photos." },
];

/**
 * Loads packages from Supabase when configured (uses the public anon key -
 * packages are publicly readable via RLS). Falls back to the built-in
 * sample packages otherwise or on any error.
 */
export async function getPackages(): Promise<Package[]> {
  if (!isSupabaseConfigured()) return FALLBACK_PACKAGES;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from("packages")
      .select("id, name, price_lkr, description")
      .order("price_lkr", { ascending: false });

    if (error || !data || data.length === 0) return FALLBACK_PACKAGES;
    return data as Package[];
  } catch {
    return FALLBACK_PACKAGES;
  }
}
