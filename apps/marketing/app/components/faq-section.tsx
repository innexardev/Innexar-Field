import { Section } from "@fieldforge/ui";

export type FaqItem = {
  question: string;
  answer: string;
};

export function FaqSection({
  title = "Frequently asked questions",
  subtitle,
  items,
}: {
  title?: string;
  subtitle?: string;
  items: FaqItem[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Section title={title} subtitle={subtitle} className="border-t border-[var(--brand-border)] bg-white">
        <div className="mx-auto max-w-3xl divide-y divide-[var(--brand-border)]">
          {items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer list-none text-lg font-medium text-[var(--brand-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--brand-text-secondary)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
