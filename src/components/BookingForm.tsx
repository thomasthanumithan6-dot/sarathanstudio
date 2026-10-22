"use client";

import { useEffect, useMemo, useState } from "react";
import { whatsappLink } from "@/lib/site";
import type { Package } from "@/lib/packages";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const EVENT_TYPES = [
  "Wedding Photography",
  "Birthday Photography",
  "Portrait Photography",
  "Family Photography",
  "Event Videography",
];

type Status = "idle" | "submitting" | "done";

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-gold";

export default function BookingForm({ packages }: { packages: Package[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [packageName, setPackageName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [saved, setSaved] = useState<boolean | null>(null);

  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Preselect a package when arriving from a "Choose Package" link.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("package");
    if (requested) setPackageName(requested);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);

    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[0-9+\-\s]{7,15}$/.test(phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!eventType) {
      setError("Please choose an event type.");
      return;
    }
    if (!eventDate) {
      setError("Please choose an event date.");
      return;
    }
    if (location.trim().length < 2) {
      setError("Please enter the event location.");
      return;
    }

    setStatus("submitting");

    const lines = [
      "Hello Sarathan Studio! I would like to make a booking.",
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Event: ${eventType}`,
      `Date: ${eventDate}`,
      `Location: ${location.trim()}`,
    ];
    if (packageName) lines.push(`Package: ${packageName}`);

    // Best-effort: also store the booking in Supabase. Never blocks WhatsApp.
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error: insertError } = await supabase.from("bookings").insert({
          customer_id: user?.id ?? null,
          name: name.trim(),
          phone: phone.trim(),
          event_type: eventType,
          event_date: eventDate,
          location: location.trim(),
        });
        setSaved(!insertError);
      } catch {
        setSaved(false);
      }
    }

    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener");
    setStatus("done");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 grid max-w-xl gap-4 text-left"
      noValidate
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-xs font-medium">
          Your Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-xs font-medium">
          Your Phone Number *
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 077 629 2002"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="eventType" className="mb-1 block text-xs font-medium">
          Event Type *
        </label>
        <select
          id="eventType"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Choose photography type</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="eventDate" className="mb-1 block text-xs font-medium">
          Event Date *
        </label>
        <input
          id="eventDate"
          type="date"
          min={minDate}
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="location" className="mb-1 block text-xs font-medium">
          Event Location *
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where is your event?"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="package" className="mb-1 block text-xs font-medium">
          Package
        </label>
        <select
          id="package"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          className={inputClass}
        >
          <option value="">No package selected</option>
          {packages.map((pkg) => (
            <option key={pkg.id ?? pkg.name} value={pkg.name}>
              {pkg.name} - Rs. {pkg.price_lkr.toLocaleString("en-LK")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-full bg-gold px-6 py-3.5 text-sm text-white transition hover:-translate-y-0.5 hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Opening WhatsApp…" : "Send Booking via WhatsApp"}
      </button>

      {status === "done" && (
        <p className="rounded-md bg-green-50 px-4 py-3 text-center text-sm text-green-700">
          WhatsApp should have opened with your message. If it did not, please
          check your popup blocker and try again.
          {saved === true && " Your booking was also saved to the studio system."}
          {saved === false &&
            " (Booking could not be saved to the studio system - your WhatsApp message still reaches us.)"}
        </p>
      )}
    </form>
  );
}
