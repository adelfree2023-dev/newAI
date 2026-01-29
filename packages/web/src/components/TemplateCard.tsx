"use client";

import React from "react";
import Image from "next/image";
import { type Template } from "@/data/templates";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Eye, Rocket, Star } from "lucide-react";
import { motion } from "framer-motion";

interface TemplateCardProps {
    template: Template;
    onSelect: (template: Template) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
    const { language } = useLanguage();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="group relative h-full flex flex-col overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-primary/30 transition-all duration-300"
        >
            <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                    src={template.image}
                    alt={language === "ar" ? template.name_ar : template.name_en}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Luminous Glow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />

                {template.isBestSeller && (
                    <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-xl border border-white/20 z-10">
                        <Star className="h-3 w-3 fill-white" />
                        Best Seller
                    </div>
                )}

                {/* Hover States: Quick Actions */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm bg-black/40">
                    <div className="flex flex-col gap-3 p-6 w-full max-w-[200px]">
                        <Button
                            variant="premium"
                            className="h-12 rounded-2xl font-black text-sm shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500"
                            onClick={() => onSelect(template)}
                        >
                            <Rocket className="mr-2 h-4 w-4" />
                            {language === "ar" ? "اختر القالب" : "Use Template"}
                        </Button>
                        <a href={template.demoUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                            <Button
                                variant="ghost"
                                className="w-full h-12 rounded-2xl font-black text-sm bg-white/10 border border-white/10 hover:bg-white/20 transition-all scale-90 group-hover:scale-100 duration-500 delay-75"
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                {language === "ar" ? "معاينة" : "Live Demo"}
                            </Button>
                        </a>
                    </div>
                </div>
            </div>

            <div className="p-8 flex flex-col flex-1 justify-between bg-gradient-to-b from-transparent to-white/[0.02]">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">
                            {language === "ar" ? template.name_ar : template.name_en}
                        </h3>
                        <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {template.category}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {language === "ar"
                            ? "تصميم عصري متجاوب يدعم اللغة العربية بالكامل مع لوحة تحكم ذكية."
                            : "Modern responsive design with full RTL support and an intelligent management dashboard."}
                    </p>
                </div>

                {/* Subtle Indicator */}
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-[#020617] bg-muted/20" />
                        ))}
                        <div className="w-6 h-6 rounded-full border-2 border-[#020617] bg-primary/20 flex items-center justify-center text-[8px] font-bold">+12</div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest group-hover:text-primary transition-colors">
                        Ready to launch
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
