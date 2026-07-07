import siteData from "@/data/site.json";

export interface Socials {
  github: string;
  linkedin: string;
  twitter: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Project {
  title: string;
  description: string;
  tech: string[];
  liveUrl: string;
  repoUrl: string;
  /** Path under /public, e.g. "/projects/foo.webp". Empty string = no image. */
  image: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  highlights: string[];
}

export interface SiteConfig {
  name: string;
  role: string;
  tagline: string;
  quote: string;
  location: string;
  email: string;
  phone: string;
  resumeUrl: string;
  socials: Socials;
  about: string[];
  skills: SkillGroup[];
  projects: Project[];
  experience: ExperienceItem[];
}

// All personal data lives in src/data/site.json - edit that file to change
// the name, contact details, skills, projects, and experience shown on the site.
export const site: SiteConfig = siteData;
