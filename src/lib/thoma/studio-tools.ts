import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const STUDIO_LOOKUPS = [
  "todays_bookings",
  "pending_payments",
  "search_customers",
  "gallery_status",
  "selection_status",
] as const;

export type StudioLookup = (typeof STUDIO_LOOKUPS)[number];
export type StudioPermission =
  | "bookings.read"
  | "customers.read"
  | "galleries.read"
  | "selections.read"
  | "payments.read";

const REQUIRED_PERMISSION: Record<StudioLookup, StudioPermission> = {
  todays_bookings: "bookings.read",
  pending_payments: "payments.read",
  search_customers: "customers.read",
  gallery_status: "galleries.read",
  selection_status: "selections.read",
};

const VALID_PERMISSIONS = new Set<StudioPermission>([
  "bookings.read",
  "customers.read",
  "galleries.read",
  "selections.read",
  "payments.read",
]);

export async function getStudioToolAccess() {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { supabase, isOwner: true, permissions: Array.from(VALID_PERMISSIONS) };
  }

  const { data: staff } = await supabase
    .from("studio_staff_access")
    .select("permissions")
    .eq("user_id", user.id)
    .maybeSingle();

  const permissions = Array.isArray(staff?.permissions)
    ? staff.permissions.filter((permission): permission is StudioPermission =>
        VALID_PERMISSIONS.has(permission as StudioPermission)
      )
    : [];

  return { supabase, isOwner: false, permissions };
}

export function getAvailableStudioLookups(
  access: Awaited<ReturnType<typeof getStudioToolAccess>>
): StudioLookup[] {
  if (!access) return [];
  return STUDIO_LOOKUPS.filter(
    (lookup) => access.isOwner || access.permissions.includes(REQUIRED_PERMISSION[lookup])
  );
}

export async function runStudioLookup(
  access: NonNullable<Awaited<ReturnType<typeof getStudioToolAccess>>>,
  lookup: StudioLookup,
  searchTerm = "",
  date = ""
) {
  const requiredPermission = REQUIRED_PERMISSION[lookup];
  if (!access.isOwner && !access.permissions.includes(requiredPermission)) {
    return { error: "The signed-in account does not have permission for that studio data." };
  }

  if (lookup === "search_customers" && searchTerm.trim().length < 2) {
    return { error: "Enter at least two characters to search for a customer." };
  }

  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const { data, error } = await access.supabase.rpc("thoma_studio_lookup", {
    lookup_type: lookup,
    search_term: searchTerm.trim().slice(0, 100) || null,
    target_date: targetDate,
  });

  if (error) return { error: "Studio records could not be retrieved. Check the THOMA database migration and permissions." };
  return { records: data };
}