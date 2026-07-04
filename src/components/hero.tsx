import {
  ChevronDownIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
  MapPinIcon,
  XIcon,
} from "@/components/icons";
import { WaterCanvas } from "@/components/water-canvas";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] w-full touch-pan-y flex-col justify-center overflow-hidden"
    >
      <WaterCanvas />

      <div className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-6">
        <p className="rise rise-1 mb-3 text-sm font-medium tracking-widest text-cyan-400 uppercase">
          Hello, I am
        </p>
        <h1 className="rise rise-2 text-5xl font-bold tracking-tight text-slate-50 drop-shadow-[0_2px_18px_rgba(8,47,73,0.9)] sm:text-7xl">
          {site.name}
        </h1>
        <h2 className="rise rise-2 mt-3 text-2xl font-semibold text-slate-300 sm:text-3xl">
          {site.role}
        </h2>

        <p className="rise rise-3 mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
          {site.tagline}
        </p>

        <p className="rise rise-3 mt-4 flex items-center gap-2 text-sm text-slate-500">
          <MapPinIcon className="h-4 w-4" />
          {site.location}
        </p>

        <div className="rise rise-4 mt-8 flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${site.email}`}
            className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] active:scale-95"
          >
            Get in touch
          </a>
          <a
            href="#projects"
            className="rounded-lg border border-slate-600/80 bg-slate-950/30 px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-cyan-400 hover:text-cyan-400 active:scale-95"
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
                className="transition-all hover:scale-110 hover:text-cyan-400"
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
                className="transition-all hover:scale-110 hover:text-cyan-400"
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
                className="transition-all hover:scale-110 hover:text-cyan-400"
              >
                <XIcon className="h-5 w-5" />
              </a>
            )}
            <a
              href={`mailto:${site.email}`}
              aria-label="Email"
              className="transition-all hover:scale-110 hover:text-cyan-400"
            >
              <MailIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {site.quote && (
          <p className="rise rise-5 mt-10 border-l-2 border-cyan-500/60 pl-4 text-sm text-slate-500 italic">
            &quot;{site.quote}&quot;
          </p>
        )}
      </div>

      <a
        href="#about"
        aria-label="Scroll to content"
        className="rise rise-5 absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 transition-colors hover:text-cyan-400"
      >
        <span className="cue-bob block">
          <ChevronDownIcon className="h-7 w-7" />
        </span>
      </a>
    </section>
  );
}
