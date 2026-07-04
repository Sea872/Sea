import { About } from "@/components/about";
import { Contact } from "@/components/contact";
import { Experience } from "@/components/experience";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Projects } from "@/components/projects";
import { Skills } from "@/components/skills";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        <About />
        <Skills />
        <Projects />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
