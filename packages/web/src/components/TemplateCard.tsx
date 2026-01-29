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
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative h-full flex flex-col overflow-hidden rounded-[2rem] glass-floating border-white/5 hover:border-primary/20 transition-all duration-500"
        >
            <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                    src={template.image}
                    alt={language === "ar" ? template.name_ar : template.name_en}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/90 via-transparent to-transparent opacity-60 transition-opacity duration-500" />

                {/* Premium Glow on Hover */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {template.isBestSeller && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl z-10 animate-fade-in">
                        <Star className="h-3 w-3 fill-white" />
                        {language === "ar" ? "الأكثر مبيعاً" : "Best Seller"}
                    </div>
                )}

                {/* Hover States: Absolute Actions */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-95 group-hover:scale-100">
                    <Button
                        variant="premium"
                        className="h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.4)]"
                        onClick={() => onSelect(template)}
                    >
                        <Rocket className="mr-2 h-4 w-4" />
                        {language === "ar" ? "ابدأ الآن" : "Start Now"}
                    </Button>
                    <a href={template.demoUrl} target="_blank" rel="noopener noreferrer">
                        <Button
                            variant="ghost"
                            className="h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10"
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            {language === "ar" ? "معاينة حية" : "Live Demo"}
                        </Button>
                    </a>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">
                            {language === "ar" ? template.name_ar : template.name_en}
                        </h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                            {template.category}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
                        {language === "ar"
                            ? "تصميم فاخر يجمع بين الأناقة والوظيفة، مثالي للعلامات التجارية الطموحة."
                            : "Luxury design blending elegance with functionality, perfect for ambitious brands."}
                    </p>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-5 h-5 rounded-full border-2 border-[#020617] bg-white/10" />
                            ))}
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">+1k {language === "ar" ? "مستخدم" : "users"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 group/launch">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover/launch:text-primary transition-colors">
                            {language === "ar" ? "جاهز للإطلاق" : "Ready"}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
    );
}
