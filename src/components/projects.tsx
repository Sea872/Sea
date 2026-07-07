import Image from "next/image";

import { ExternalLinkIcon, GitHubIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/section";
import { site } from "@/lib/site";

export function Projects() {
  return (
    <Section
      id="projects"
      title="Projects"
      subtitle="A selection of Shopify stores and pages I have designed and built."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {site.projects.map((project, index) => (
          <Reveal key={project.title} delay={index * 80} className="h-full">
            <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_8px_30px_rgba(8,145,178,0.14)]">
              {project.image && (
                <a
                  href={project.liveUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[16/10] overflow-hidden"
                >
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                </a>
              )}

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-semibold text-slate-100">{project.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  {project.description}
                </p>

                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <li
                      key={tech}
                      className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>

                {(project.liveUrl || project.repoUrl) && (
                  <div className="mt-4 flex items-center gap-4 border-t border-slate-800 pt-4">
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-cyan-400"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        Live
                      </a>
                    )}
                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-cyan-400"
                      >
                        <GitHubIcon className="h-4 w-4" />
                        Code
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
