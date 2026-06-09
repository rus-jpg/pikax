import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type FaqItem = { q: string; a: string };

export const PIKA_API_FAQS: FaqItem[] = [
  {
    q: "How do I get started?",
    a: "Fill out the contact form below to request an API key. Once approved, you'll receive credentials, a quickstart guide, and access to every Pika model listed above. Most teams are running their first generation within an hour of onboarding.",
  },
  {
    q: "If I have additional API questions, who can help?",
    a: "Every API customer gets a shared Slack channel with our developer-relations team. For non-urgent questions, email api@pika.art and we typically respond within one business day.",
  },
  {
    q: "How does pricing work?",
    a: "Pricing is per-second of generated video and varies by model and resolution. Most models are $0.04/sec at 720p and $0.06/sec at 1080p. Volume discounts kick in automatically above 10,000 seconds per month — contact us for an enterprise quote.",
  },
  {
    q: "What's the rate limit?",
    a: "Default accounts get 60 requests per minute and 10 concurrent jobs. Limits scale automatically with usage; enterprise plans get dedicated capacity.",
  },
  {
    q: "Can I use the outputs commercially?",
    a: "Yes. All API outputs are licensed for commercial use under your Pika API agreement. You retain ownership of your prompts and inputs.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes — every new API account starts with $10 of free credit so you can prototype across the full model catalogue before committing.",
  },
];

export function ApiFaq({
  title = "All about the Pika API",
  items = PIKA_API_FAQS,
}: {
  title?: string;
  items?: FaqItem[];
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Everything teams ask before integrating.
      </p>
      <div className="mt-5 rounded-3xl border border-border/60 bg-card px-5">
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`item-${i}`}
              className={i === items.length - 1 ? "border-b-0" : ""}
            >
              <AccordionTrigger className="text-left text-sm font-semibold">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
