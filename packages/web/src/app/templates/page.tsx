import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TemplateMarketplace } from "@/components/TemplateMarketplace";

export default function TemplatesPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Navbar />
            <div className="pt-24">
                <TemplateMarketplace />
            </div>
        </main>
    );
}
