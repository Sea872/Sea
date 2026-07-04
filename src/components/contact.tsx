import { FileDownIcon, MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Section } from "@/components/section";
import { site } from "@/lib/site";

export function Contact() {
  return (
    <Section
      id="contact"
      title="Get in touch"
      subtitle="Have a project in mind or a role to fill? My inbox is always open."
    >
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <a
            href={`mailto:${site.email}`}
            className="inline-flex items-center gap-3 text-slate-300 transition-colors hover:text-cyan-400"
          >
            <MailIcon className="h-5 w-5 text-cyan-400" />
            {site.email}
          </a>

          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center gap-3 text-slate-300 transition-colors hover:text-cyan-400"
            >
              <PhoneIcon className="h-5 w-5 text-cyan-400" />
              {site.phone}
            </a>
          )}

          <p className="inline-flex items-center gap-3 text-slate-300">
            <MapPinIcon className="h-5 w-5 text-cyan-400" />
            {site.location}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href={`mailto:${site.email}`}
            className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
          >
            Say hello
          </a>
          {site.resumeUrl && (
            <a
              href={site.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-400"
            >
              <FileDownIcon className="h-4 w-4" />
              Resume
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}
