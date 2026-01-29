import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TemplateMarketplace } from "@/components/TemplateMarketplace";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <TemplateMarketplace />
    </main>
  );
}
