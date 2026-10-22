"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/app/admin/actions";

export type AdminProfile = {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export type AdminCustomer = {
  id: string;
  profile_id: string;
  customer_code: string;
  phone: string | null;
  event_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type SelectionLite = { customer_id: string; status: string };

type Message = { kind: "error" | "ok"; text: string } | null;

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold";

const statusBadge: Record<string, string> = {
  active: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-green-50 text-green-800 border-green-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function CustomersAdmin({
  profiles,
  customers,
  selections,
}: {
  profiles: AdminProfile[];
  customers: AdminCustomer[];
  selections: SelectionLite[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [newProfileId, setNewProfileId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEventType, setNewEventType] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Edit form state
  const [editPhone, setEditPhone] = useState("");
  const [editEventType, setEditEventType] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editNotes, setEditNotes] = useState("");

  const profileName = (profileId: string) =>
    profiles.find((profile) => profile.id === profileId)?.full_name || "Unnamed";

  const unlinkedProfiles = profiles.filter(
    (profile) =>
      profile.role === "customer" &&
      !customers.some((customer) => customer.profile_id === profile.id)
  );

  function selectionSummary(customerId: string) {
    const rows = selections.filter((row) => row.customer_id === customerId);
    if (rows.length === 0) return { total: 0, label: "no selections" };
    if (rows.every((row) => row.status === "completed"))
      return { total: rows.length, label: "completed" };
    if (rows.some((row) => row.status === "submitted"))
      return { total: rows.length, label: "submitted" };
    return { total: rows.length, label: "draft" };
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = customers.filter((customer) => {
    if (!normalizedQuery) return true;
    return (
      customer.customer_code.toLowerCase().includes(normalizedQuery) ||
      profileName(customer.profile_id).toLowerCase().includes(normalizedQuery) ||
      customer.status.toLowerCase().includes(normalizedQuery)
    );
  });

  function run(action: () => Promise<{ error?: string }>, okText: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: okText });
        router.refresh();
      }
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("profile_id", newProfileId);
    formData.set("phone", newPhone);
    formData.set("event_type", newEventType);
    formData.set("notes", newNotes);
    run(() => createCustomer(formData), "Customer created with a unique ID.");
    setNewProfileId("");
    setNewPhone("");
    setNewEventType("");
    setNewNotes("");
  }

  function startEdit(customer: AdminCustomer) {
    setEditingId(customer.id);
    setEditPhone(customer.phone ?? "");
    setEditEventType(customer.event_type ?? "");
    setEditStatus(customer.status);
    setEditNotes(customer.notes ?? "");
  }

  function handleUpdate(customerId: string) {
    const formData = new FormData();
    formData.set("id", customerId);
    formData.set("phone", editPhone);
    formData.set("event_type", editEventType);
    formData.set("status", editStatus);
    formData.set("notes", editNotes);
    run(() => updateCustomer(formData), "Customer updated.");
    setEditingId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Customers ({customers.length})</h2>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, ID or status…"
          className={`${inputClass} max-w-xs`}
          aria-label="Filter customers"
        />
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-md px-4 py-2.5 text-sm ${
            message.kind === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-4 grid gap-3 rounded-lg border border-[#eee3d3] bg-sand p-4 sm:grid-cols-2"
      >
        <select
          value={newProfileId}
          onChange={(event) => setNewProfileId(event.target.value)}
          required
          className={inputClass}
          aria-label="Customer account"
        >
          <option value="">Link an account…</option>
          {unlinkedProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name || profile.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <input
          value={newPhone}
          onChange={(event) => setNewPhone(event.target.value)}
          placeholder="Phone"
          className={inputClass}
        />
        <input
          value={newEventType}
          onChange={(event) => setNewEventType(event.target.value)}
          placeholder="Event type (e.g. Wedding)"
          className={inputClass}
        />
        <input
          value={newNotes}
          onChange={(event) => setNewNotes(event.target.value)}
          placeholder="Notes (optional)"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={isPending || unlinkedProfiles.length === 0}
          className="rounded-full bg-gold px-5 py-2.5 text-sm text-white transition hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {isPending ? "Saving…" : "Create Customer"}
        </button>
        {unlinkedProfiles.length === 0 && (
          <p className="text-xs text-mocha sm:col-span-2">
            Every signed-up account already has a customer profile. New
            customers appear here after they create an account on the login
            page.
          </p>
        )}
      </form>

      <div className="mt-4 grid gap-3">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-mocha">
            No customers match your filter.
          </p>
        )}
        {filtered.map((customer) => {
          const summary = selectionSummary(customer.id);
          const isEditing = editingId === customer.id;
          return (
            <div
              key={customer.id}
              className="rounded-lg border border-[#eee3d3] bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {profileName(customer.profile_id)}{" "}
                    <span className="ml-1 rounded bg-cream px-2 py-0.5 font-mono text-xs text-gold">
                      {customer.customer_code}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-mocha">
                    {customer.event_type || "No event type"} · Selections:{" "}
                    {summary.total} ({summary.label})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] capitalize ${statusBadge[customer.status] ?? statusBadge.active}`}
                  >
                    {customer.status}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      isEditing ? setEditingId(null) : startEdit(customer)
                    }
                    className="rounded-full border border-[#dfd1bc] px-4 py-1.5 text-xs transition hover:border-gold hover:text-gold"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 grid gap-2 border-t border-[#f4ecdf] pt-3 sm:grid-cols-2">
                  <input
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    placeholder="Phone"
                    className={inputClass}
                  />
                  <input
                    value={editEventType}
                    onChange={(event) => setEditEventType(event.target.value)}
                    placeholder="Event type"
                    className={inputClass}
                  />
                  <select
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                    className={inputClass}
                    aria-label="Customer status"
                  >
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="archived">archived</option>
                  </select>
                  <input
                    value={editNotes}
                    onChange={(event) => setEditNotes(event.target.value)}
                    placeholder="Notes"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(customer.id)}
                    disabled={isPending}
                    className="rounded-full bg-gold px-5 py-2.5 text-sm text-white transition hover:bg-espresso disabled:opacity-60 sm:col-span-2"
                  >
                    {isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
