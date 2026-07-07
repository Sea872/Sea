import type { ReactNode } from "react";

import { Reveal } from "@/components/reveal";

interface SectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Section({ id, title, subtitle, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 py-16 sm:py-20">
      <Reveal>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
          <span className="text-cyan-600">.</span>
        </h2>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  );
}
