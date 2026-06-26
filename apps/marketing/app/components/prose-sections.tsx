import type { PageSection } from "../lib/marketing-content";

export function ProseSections({ sections }: { sections: PageSection[] }) {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-6 pb-20">
      {sections.map((section) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </div>
      ))}
    </article>
  );
}
