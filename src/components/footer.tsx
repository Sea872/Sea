import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
        <p>
          {new Date().getFullYear()} {site.name}. Built with Next.js and Tailwind CSS.
        </p>
        <a href="#top" className="transition-colors hover:text-cyan-600">
          Back to top
        </a>
      </div>
    </footer>
  );
}
