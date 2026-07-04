import { GitHubIcon, LinkedInIcon, MailIcon, MapPinIcon, XIcon } from "@/components/icons";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section id="top" className="pt-36 pb-24 sm:pt-44 sm:pb-32">
      <p className="mb-3 text-sm font-medium tracking-widest text-cyan-400 uppercase">
        Hello, I am
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-6xl">{site.name}</h1>
      <h2 className="mt-3 text-2xl font-semibold text-slate-300 sm:text-3xl">{site.role}</h2>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">{site.tagline}</p>

      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <MapPinIcon className="h-4 w-4" />
        {site.location}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href={`mailto:${site.email}`}
          className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Get in touch
        </a>
        <a
          href="#projects"
          className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-400"
        >
          View my work
        </a>

        <div className="ml-1 flex items-center gap-4 text-slate-400">
          {site.socials.github && (
            <a
              href={site.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="transition-colors hover:text-cyan-400"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
          )}
          {site.socials.linkedin && (
            <a
              href={site.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="transition-colors hover:text-cyan-400"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
          )}
          {site.socials.twitter && (
            <a
              href={site.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="transition-colors hover:text-cyan-400"
            >
              <XIcon className="h-5 w-5" />
            </a>
          )}
          <a
            href={`mailto:${site.email}`}
            aria-label="Email"
            className="transition-colors hover:text-cyan-400"
          >
            <MailIcon className="h-5 w-5" />
          </a>
        </div>
      </div>

      {site.quote && (
        <p className="mt-10 border-l-2 border-cyan-500/60 pl-4 text-sm text-slate-500 italic">
          &quot;{site.quote}&quot;
        </p>
      )}
    </section>
  );
}
