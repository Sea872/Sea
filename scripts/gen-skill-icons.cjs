const fs = require("fs");
const si = require("simple-icons");

// Build lookups by title and slug (handles simple-icons export shape).
const byTitle = {};
const bySlug = {};
for (const key of Object.keys(si)) {
  const icon = si[key];
  if (icon && icon.title && icon.path) {
    byTitle[icon.title.toLowerCase()] = icon;
    if (icon.slug) bySlug[icon.slug.toLowerCase()] = icon;
  }
}

// skill label -> simple-icons title (or slug) to look up.
const map = {
  React: "react",
  "Next.js": "next.js",
  "Vue.js": "vue.js",
  Nuxt: "nuxt",
  TypeScript: "typescript",
  "Tailwind CSS": "tailwind css",
  Redux: "redux",
  "Node.js": "node.js",
  Express: "express",
  NestJS: "nestjs",
  Python: "python",
  Django: "django",
  PHP: "php",
  GraphQL: "graphql",
  Shopify: "shopify",
  WordPress: "wordpress",
  WooCommerce: "woocommerce",
  Stripe: "stripe",
  PayPal: "paypal",
  PostgreSQL: "postgresql",
  MySQL: "mysql",
  MongoDB: "mongodb",
  Supabase: "supabase",
  Redis: "redis",
  Prisma: "prisma",
  Docker: "docker",
  Kubernetes: "kubernetes",
  ArgoCD: "argo",
  Terraform: "terraform",
  "GitHub Actions": "github actions",
  AWS: "amazon web services",
  Vercel: "vercel",
  Jest: "jest",
  Cypress: "cypress",
  Playwright: "playwright",
  Pytest: "pytest",
  Git: "git",
  Jira: "jira",
};

function luminance(hex) {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const out = {};
const missing = [];
for (const [skill, key] of Object.entries(map)) {
  const icon = byTitle[key] || bySlug[key];
  if (!icon) {
    missing.push(`${skill} (${key})`);
    continue;
  }
  // Logos too light for the light cards fall back to slate-700.
  const color = luminance(icon.hex) > 0.7 ? "334155" : icon.hex;
  out[skill] = { path: icon.path, color: `#${color}` };
}

const header =
  "// AUTO-GENERATED brand icons from simple-icons. Do not edit by hand.\n" +
  "// Regenerate with scripts/gen-skill-icons if the skill list changes.\n\n";
const body =
  "export interface SkillIcon {\n  path: string;\n  color: string;\n}\n\n" +
  "export const skillIcons: Record<string, SkillIcon> = " +
  JSON.stringify(out, null, 2) +
  ";\n";
fs.writeFileSync("src/lib/skill-icons.ts", header + body);

console.log("wrote", Object.keys(out).length, "icons");
if (missing.length) console.log("MISSING:", missing.join(", "));
