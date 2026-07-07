# Sea - Personal Portfolio

Personal portfolio showcasing selected software engineering projects, technical expertise, and professional experience.

Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Experience

- **Transparent crystal water:** a real-time GPU wave-equation simulation (WebGL2) fills the background. Pointer movement pushes the water and radiates ripples; it is rendered as a clean, see-through glassy surface - the dark background shows through it, and the ripples read through crisp specular highlights and bright edge lines rather than a colour fill.
- **Motion with restraint:** staggered entrance animation, scroll-reveal sections, glass header that materializes on scroll, and hover micro-interactions throughout.
- **Graceful degradation:** the effect runs only when WebGL2 is available; visitors who prefer reduced motion (or lack WebGL2) get a static gradient.

## Tech Stack

- **Framework:** Next.js 16 (App Router, static prerender, standalone output)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Quality:** ESLint + Prettier (with Tailwind class sorting)
- **Container:** Docker (multi-stage build, non-root runner)

## Customization - edit one file

All personal content lives in a single JSON file:

```
src/data/site.json
```

Change the values there to update the whole site - no component edits needed:

| Key          | What it controls                                     |
| ------------ | ---------------------------------------------------- |
| `name`       | Display name (header, hero, footer, page title)      |
| `role`       | Job title shown in the hero and page title           |
| `tagline`    | Hero paragraph and meta description                  |
| `quote`      | Short quote under the hero (empty string to hide)    |
| `location`   | Location shown in hero and contact                   |
| `email`      | Contact email (mailto links)                         |
| `phone`      | Phone number (hidden when empty)                     |
| `resumeUrl`  | Resume link in contact (hidden when empty)           |
| `socials`    | GitHub / LinkedIn / Twitter URLs (hidden when empty) |
| `about`      | Paragraphs in the About section                      |
| `skills`     | Skill categories and their items                     |
| `projects`   | Project cards (links hidden when empty)              |
| `experience` | Experience timeline entries                          |

Types for the config are defined in `src/lib/site.ts`.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3001.

## Scripts

| Script                 | Purpose                          |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack) |
| `npm run build`        | Production build                 |
| `npm run start`        | Serve the production build       |
| `npm run lint`         | Run ESLint                       |
| `npm run lint:fix`     | Run ESLint with autofix          |
| `npm run format`       | Format with Prettier             |
| `npm run format:check` | Check formatting                 |

## Docker

```bash
# Build and run with compose
docker compose up --build

# Or plain Docker
docker build -t sea-portfolio .
docker run -p 3001:3001 sea-portfolio
```

The image uses Next.js standalone output and runs as a non-root user on port 3001.
