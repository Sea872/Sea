import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { site } from "@/lib/site";

export function Skills() {
  return (
    <Section
      id="skills"
      title="Skills"
      subtitle="The tools I reach for when building and shipping software."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.skills.map((group, index) => (
          <Reveal key={group.category} delay={index * 70}>
            <div className="h-full rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_8px_30px_rgba(8,145,178,0.12)]">
              <h3 className="text-sm font-semibold tracking-wide text-cyan-400 uppercase">
                {group.category}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-slate-800/80 px-2.5 py-1 text-sm text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-cyan-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
