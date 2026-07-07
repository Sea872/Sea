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
      <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-4">
          <a
            href={`mailto:${site.email}`}
            className="inline-flex items-center gap-3 text-slate-700 transition-colors hover:text-cyan-600"
          >
            <MailIcon className="h-5 w-5 text-cyan-600" />
            {site.email}
          </a>

          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center gap-3 text-slate-700 transition-colors hover:text-cyan-600"
            >
              <PhoneIcon className="h-5 w-5 text-cyan-600" />
              {site.phone}
            </a>
          )}

          <p className="inline-flex items-center gap-3 text-slate-700">
            <MapPinIcon className="h-5 w-5 text-cyan-600" />
            {site.location}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href={`mailto:${site.email}`}
            className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            Say hello
          </a>
          {site.resumeUrl && (
            <a
              href={site.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-cyan-500 hover:text-cyan-600"
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
