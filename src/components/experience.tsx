import { Section } from "@/components/section";
import { site } from "@/lib/site";

export function Experience() {
  return (
    <Section id="experience" title="Experience">
      <ol className="space-y-10 border-l border-slate-800 pl-6">
        {site.experience.map((item) => (
          <li key={`${item.company}-${item.period}`} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[1.85rem] h-3 w-3 rounded-full border-2 border-cyan-400 bg-slate-950"
            />
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {item.period}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-100">
              {item.role} <span className="font-normal text-slate-400">at {item.company}</span>
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-slate-400 marker:text-cyan-500">
              {item.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}
