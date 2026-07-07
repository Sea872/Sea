import { Section } from "@/components/section";
import { site } from "@/lib/site";

export function About() {
  return (
    <Section id="about" title="About me">
      <div className="max-w-3xl space-y-4 text-slate-600">
        {site.about.map((paragraph) => (
          <p key={paragraph} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </Section>
  );
}
