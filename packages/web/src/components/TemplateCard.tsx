"use client";

import React from "react";
import Image from "next/image";
import { type Template } from "@/data/templates";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Eye, Check, Star } from "lucide-react";
import { motion } from "framer-motion";

interface TemplateCardProps {
    template: Template;
    onSelect: (template: Template) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
    const { language } = useLanguage();

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5"
        >
            <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                    src={template.image}
                    alt={language === "ar" ? template.name_ar : template.name_en}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {template.isBestSeller && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                        <Star className="h-3 w-3 fill-white" />
                        Best Seller
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <a href={template.demoUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm" className="h-9 gap-2 shadow-lg">
                            <Eye className="h-4 w-4" />
                            {language === "ar" ? "معاينة حية" : "Live Demo"}
                        </Button>
                    </a>
                </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight">
                        {language === "ar" ? template.name_ar : template.name_en}
                    </h3>
                    <span className="text-[10px] font-bold uppercase text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        {template.category}
                    </span>
                </div>

                <Button
                    className="w-full h-11 transition-all shadow-md active:scale-[0.98]"
                    variant="premium"
                    onClick={() => onSelect(template)}
                >
                    <Check className="mr-2 h-4 w-4" />
                    {language === "ar" ? "اختيار القالب" : "Select Template"}
                </Button>
            </div>
        </motion.div>
    );
}
