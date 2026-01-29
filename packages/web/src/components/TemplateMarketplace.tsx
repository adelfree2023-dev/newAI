"use client";

import React, { useState, useRef } from "react";
import { templates, type Template } from "@/data/templates";
import { TemplateCard } from "./TemplateCard";
import { OnboardingModal } from "./OnboardingModal";
import { useLanguage } from "@/context/LanguageContext";
import { Search, X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TemplateMarketplace() {
    const { language } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const categories = [
        { id: "all", label_ar: "الكل", label_en: "All" },
        { id: "fashion", label_ar: "أزياء", label_en: "Fashion" },
        { id: "electronics", label_ar: "إلكترونيات", label_en: "Electronics" },
        { id: "food", label_ar: "طعام", label_en: "Food" },
        { id: "beauty", label_ar: "جمال", label_en: "Beauty" },
    ];

    const filteredTemplates = templates.filter((template) => {
        const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
        const matchesSearch =
            template.name_ar.includes(searchQuery) ||
            template.name_en.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleSelect = (template: Template) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === "left" ? scrollLeft - 200 : scrollLeft + 200;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    return (
        <section id="templates" className="py-24 relative overflow-hidden bg-background">
            {/* Minimal Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16 space-y-4">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="text-4xl md:text-6xl font-black tracking-tighter"
                    >
                        {language === "ar" ? "قوالب مصممة للمستقبل" : "Templates for the Future"}
                    </motion.h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {language === "ar"
                            ? "اختر من بين آلاف التصاميم العصرية التي تمنح متجرك لمسة احترافية عالمية."
                            : "Choose from modern designs that give your store a world-class professional touch."}
                    </p>
                </div>

                {/* Horizontal Navigation & Search Bar */}
                <div className="mb-12 space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Scrollable Tabs */}
                        <div className="relative w-full md:w-auto flex-1 overflow-hidden">
                            <div
                                ref={scrollRef}
                                className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-right"
                            >
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-6 py-2.5 rounded-full text-sm font-black transition-all whitespace-nowrap border
                                            ${selectedCategory === cat.id
                                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                                : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10"
                                            }`}
                                    >
                                        {language === "ar" ? cat.label_ar : cat.label_en}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Bar - Minimalist */}
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <input
                                type="text"
                                placeholder={language === "ar" ? "ابحث عن قوالب..." : "Search templates..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-5 rounded-full bg-white/5 border border-white/10 transition-all focus:bg-white/10 focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/50 font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Bento Grid Marketplace - Minimalist */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[400px] gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredTemplates.map((template, index) => (
                            <motion.div
                                key={template.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                className={`${index % 7 === 0 ? "md:col-span-2" : ""} ${index % 10 === 0 ? "md:row-span-2" : ""}`}
                            >
                                <TemplateCard
                                    template={template}
                                    onSelect={handleSelect}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {filteredTemplates.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-32 text-center glass rounded-[2.5rem] border border-white/5"
                    >
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6 border border-primary/20">
                            <X className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 tracking-tight">
                            {language === "ar" ? "عذراً، لم نجد ما تبحث عنه" : "No results found"}
                        </h3>
                        <p className="text-muted-foreground">
                            {language === "ar" ? "جرب استخدام كلمات بحث مختلفة أو فئة أخرى" : "Try searching for something else"}
                        </p>
                    </motion.div>
                )}
            </div>

            <OnboardingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedTemplate={selectedTemplate}
            />
        </section>
    );
}
