import { useState } from "react";
import { Send } from "lucide-react";

export function ApiContactForm({ compact = false }: { compact?: boolean }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    useCase: "",
  });

  return (
    <section
      className={
        "rounded-3xl border border-border/60 bg-card " +
        (compact ? "p-6" : "p-8")
      }
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Get started with the Pika API
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tell us about your product. We'll get you an API key and onboarding
          help within one business day.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm">
          <p className="font-semibold">Thanks — we'll be in touch shortly.</p>
          <p className="mt-1 text-muted-foreground">
            We sent a confirmation to <strong>{form.email}</strong>.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
          />
          <input
            required
            type="email"
            placeholder="Work email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
          />
          <input
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40 sm:col-span-2"
          />
          <textarea
            required
            rows={4}
            placeholder="What are you building? Which models are you most interested in?"
            value={form.useCase}
            onChange={(e) => setForm({ ...form, useCase: e.target.value })}
            className="resize-y rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40 sm:col-span-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 sm:col-span-2"
          >
            <Send className="h-4 w-4" /> Request access
          </button>
        </form>
      )}
    </section>
  );
}
