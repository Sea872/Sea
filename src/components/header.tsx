import Link from "next/link";

import { GitHubIcon } from "@/components/icons";
import { site } from "@/lib/site";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="#top" className="text-lg font-bold tracking-tight text-slate-100">
          {site.name}
          <span className="text-cyan-400">.</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex" aria-label="Main">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-cyan-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {site.socials.github && (
          <a
            href={site.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="text-slate-400 transition-colors hover:text-cyan-400"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
        )}
      </div>
    </header>
  );
}
