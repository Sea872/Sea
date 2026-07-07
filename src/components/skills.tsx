import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { site } from "@/lib/site";
import { skillIcons } from "@/lib/skill-icons";

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
            <div className="h-full rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_8px_30px_rgba(8,145,178,0.14)]">
              <h3 className="text-sm font-semibold tracking-wide text-cyan-600 uppercase">
                {group.category}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const icon = skillIcons[item];
                  return (
                    <li
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
                    >
                      {icon && (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 shrink-0"
                          fill={icon.color}
                          aria-hidden="true"
                        >
                          <path d={icon.path} />
                        </svg>
                      )}
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
