"use client";

import { FormEvent, useState } from "react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";

interface ContactFormProps {
  isLoggedIn: boolean;
}

export default function ContactForm({ isLoggedIn }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || "Nepavyko išsiųsti žinutės. Pabandykite vėliau.");
      } else {
        setSent(true);
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch {
      setError("Tinklo klaida. Pabandykite vėliau.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <p className="text-body font-semibold">Žinutė išsiųsta!</p>
        <p className="mt-1 text-body-sm">
          Ačiū — atsakysime per 24 valandas.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-body-sm font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
        >
          Siųsti dar vieną žinutę
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {!isLoggedIn && (
        <>
          <Input
            id="contact-name"
            label="Vardas"
            placeholder="Jūsų vardas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoComplete="name"
          />
          <Input
            id="contact-email"
            label="El. paštas"
            type="email"
            placeholder="jusu@pastas.lt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={160}
            autoComplete="email"
            inputMode="email"
          />
        </>
      )}
      <Textarea
        id="contact-message"
        label="Žinutė"
        placeholder="Jūsų žinutė..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        minLength={10}
        maxLength={4000}
      />

      {/* Honeypot — visually hidden, hidden from screen readers and keyboard. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="contact-website">Tinklapis</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-body-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <Button type="submit" isLoading={loading} disabled={loading}>
        {loading ? "Siunčiama..." : "Siųsti"}
      </Button>
    </form>
  );
}
