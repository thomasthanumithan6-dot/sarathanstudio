"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPackage, deletePackage } from "@/app/admin/actions";

export type AdminPackage = {
  id: string;
  name: string;
  price_lkr: number;
  description: string | null;
};

type Message = { kind: "error" | "ok"; text: string } | null;

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold";

export default function PackagesAdmin({ packages }: { packages: AdminPackage[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("price_lkr", price);
    formData.set("description", description);

    setMessage(null);
    startTransition(async () => {
      const result = await addPackage(formData);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Package added." });
        setName("");
        setPrice("");
        setDescription("");
        router.refresh();
      }
    });
  }

  function handleDelete(pkg: AdminPackage) {
    const confirmed = window.confirm(`Delete package "${pkg.name}"?`);
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("id", pkg.id);

    setMessage(null);
    startTransition(async () => {
      const result = await deletePackage(formData);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: "Package deleted." });
        router.refresh();
      }
    });
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Packages ({packages.length})</h2>

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
        onSubmit={handleAdd}
        className="mt-4 grid gap-3 rounded-lg border border-[#eee3d3] bg-sand p-4 sm:grid-cols-3"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Package name *"
          required
          className={inputClass}
        />
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Price in LKR *"
          type="number"
          min="0"
          step="1"
          required
          className={inputClass}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Short description"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gold px-5 py-2.5 text-sm text-white transition hover:bg-espresso disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add Package"}
        </button>
      </form>

      <ul className="mt-4 grid gap-2">
        {packages.map((pkg) => (
          <li
            key={pkg.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-[#eee3d3] bg-white px-4 py-3 text-sm"
          >
            <span>
              {pkg.name}{" "}
              <span className="text-gold">
                - Rs. {pkg.price_lkr.toLocaleString("en-LK")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleDelete(pkg)}
              className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 transition hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
