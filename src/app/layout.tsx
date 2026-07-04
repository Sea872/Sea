import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { WaveCanvas } from "@/components/wave-canvas";
import { WaveTuner } from "@/components/wave-tuner";
import { site } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${site.name} | ${site.role}`,
  description: site.tagline,
  openGraph: {
    title: `${site.name} | ${site.role}`,
    description: site.tagline,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-200">
        <WaveCanvas />
        {children}
        <WaveTuner />
      </body>
    </html>
  );
}
