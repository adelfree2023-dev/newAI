import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Rocket, Shield, Zap, Layout, Clock, Globe } from "lucide-react";
import Link from "next/link";

export function Hero() {
    const { t, language } = useLanguage();

    return (
        <section className="relative pt-40 pb-32 overflow-hidden bg-[#020617]">
            {/* High-End Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.2),transparent_70%)] -z-10" />
            <div className="absolute top-1/4 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(6,182,212,0.05),transparent_50%)] -z-10" />

            {/* Ambient Animated Glows */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-20 right-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -z-10"
            />

            <div className="container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 text-primary text-xs font-black uppercase tracking-widest mb-8 animate-fade-in">
                        <Zap className="h-4 w-4 fill-primary animate-pulse" />
                        {language === "ar" ? "تقنية العام 2026" : "2026 SaaS Technology"}
                    </span>

                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[1.1] text-glow">
                        {t("hero.title")}
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground/80 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                        {t("hero.subtitle")}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
                        <Button size="lg" variant="premium" className="w-full sm:w-auto text-xl h-16 px-12 rounded-2xl shadow-2xl shadow-primary/30 group" asChild>
                            <Link href="/auth/signup">
                                <Rocket className="mr-3 h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                {t("nav.getStarted")}
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto text-xl h-16 px-12 rounded-2xl border-white/10 glass hover:bg-white/5 transition-all" asChild>
                            <Link href="/templates">
                                <Layout className="mr-3 h-6 w-6" />
                                {t("nav.templates")}
                            </Link>
                        </Button>
                    </div>
                </motion.div>

                {/* Stats Section - Premium Redesign */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
                >
                    {[
                        { label: language === "ar" ? "قالب جاهز" : "Templates", value: "1000+", icon: Layout, color: "text-blue-400" },
                        { label: language === "ar" ? "وقت التشغيل" : "Uptime", value: "99.9%", icon: Shield, color: "text-emerald-400" },
                        { label: language === "ar" ? "سرعة الإعداد" : "Setup Time", value: "60s", icon: Clock, color: "text-amber-400" }
                    ].map((stat, i) => (
                        <div key={i} className="glass-floating p-8 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-white/5 transition-all">
                            <div className={`p-4 rounded-3xl bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-4xl font-black tracking-tighter">{stat.value}</div>
                                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
