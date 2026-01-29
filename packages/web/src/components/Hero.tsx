"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Rocket, Shield, Zap } from "lucide-react";

export function Hero() {
    const { t } = useLanguage();

    return (
        <section className="relative pt-32 pb-20 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 to-transparent blur-3xl -z-10" />

            <div className="container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                        <Zap className="h-4 w-4 fill-primary" />
                        2026 SaaS Technology
                    </span>

                    <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
                        {t("hero.title")}
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        {t("hero.subtitle")}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" variant="premium" className="w-full sm:w-auto text-lg h-14 px-10">
                            <Rocket className="mr-2 h-5 w-5" />
                            {t("nav.getStarted")}
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-10">
                            {t("nav.templates")}
                        </Button>
                    </div>
                </motion.div>

                {/* Stats / Proof */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-8 border-t border-border/50 pt-10"
                >
                    <div className="space-y-2">
                        <div className="text-3xl font-bold font-inter">+1000</div>
                        <div className="text-sm text-muted-foreground">{t("nav.templates")}</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-3xl font-bold font-inter">99.9%</div>
                        <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="hidden md:block space-y-2">
                        <div className="text-3xl font-bold font-inter">60s</div>
                        <div className="text-sm text-muted-foreground font-inter">Setup Time</div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
