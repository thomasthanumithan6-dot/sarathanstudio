"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBooking, updateBooking } from "@/app/admin/actions";
import type { CustomerOption } from "./GalleriesAdmin";

export type AdminBooking = {
  id: string;
  name: string;
  phone: string;
  event_type: string;
  event_date: string;
  location: string | null;
  payment_status: string;
  booking_status: string;
  created_at: string;
};

type Message = { kind: "error" | "ok"; text: string } | null;

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold";

export default function BookingsAdmin({
  bookings,
  customers,
}: {
  bookings: AdminBooking[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [customerId, setCustomerId] = useState("");

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("phone", phone);
    formData.set("event_type", eventType);
    formData.set("event_date", eventDate);
    formData.set("location", location);
    formData.set("customer_id", customerId);

    setMessage(null);
    startTransition(async () => {
      const result = await createBooking(formData);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Booking created." });
        setName("");
        setPhone("");
        setEventType("");
        setEventDate("");
        setLocation("");
        setCustomerId("");
        router.refresh();
      }
    });
  }

  function handleUpdate(id: string, paymentStatus: string, bookingStatus: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateBooking(id, paymentStatus, bookingStatus);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Booking updated." });
        router.refresh();
      }
    });
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Bookings ({bookings.length})</h2>

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
        className="mt-4 grid gap-3 rounded-lg border border-[#eee3d3] bg-sand p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Customer name *"
          required
          className={inputClass}
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Contact number *"
          required
          className={inputClass}
        />
        <input
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          placeholder="Event type (e.g. Wedding) *"
          required
          className={inputClass}
        />
        <input
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
          type="date"
          required
          aria-label="Event date"
          className={inputClass}
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          className={inputClass}
        />
        <select
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          className={inputClass}
          aria-label="Link customer (optional)"
        >
          <option value="">No linked customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gold px-5 py-2.5 text-sm text-white transition hover:bg-espresso disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create Booking"}
        </button>
      </form>

      {bookings.length === 0 ? (
        <p className="py-6 text-center text-sm text-mocha">No bookings yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#eee3d3] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#eee3d3] text-xs text-mocha">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Event date</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-[#f4ecdf]">
                  <td className="px-4 py-2.5">{booking.name}</td>
                  <td className="px-4 py-2.5">{booking.event_type}</td>
                  <td className="px-4 py-2.5">{booking.event_date}</td>
                  <td className="px-4 py-2.5">{booking.phone}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={booking.payment_status}
                      onChange={(event) =>
                        handleUpdate(
                          booking.id,
                          event.target.value,
                          booking.booking_status
                        )
                      }
                      disabled={isPending}
                      className="rounded border border-[#e6dac8] bg-white px-2 py-1 text-xs"
                      aria-label={`Payment status for ${booking.name}`}
                    >
                      <option value="unpaid">unpaid</option>
                      <option value="advance">advance</option>
                      <option value="paid">paid</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={booking.booking_status}
                      onChange={(event) =>
                        handleUpdate(
                          booking.id,
                          booking.payment_status,
                          event.target.value
                        )
                      }
                      disabled={isPending}
                      className="rounded border border-[#e6dac8] bg-white px-2 py-1 text-xs"
                      aria-label={`Booking status for ${booking.name}`}
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
