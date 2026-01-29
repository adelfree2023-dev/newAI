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
        const matchesCategory = selectedCategory === "all" || template.category.toLowerCase() === selectedCategory;
        const matchesSearch =
            template.name_ar.includes(searchQuery) ||
            template.name_en.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleSelect = (template: Template) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    return (
        <section id="templates" className="py-32 relative overflow-hidden bg-[#020617]">
            {/* Visual Accent Glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full -z-10 translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-secondary/5 blur-[120px] rounded-full -z-10 -translate-x-1/2 translate-y-1/2" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-24 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4"
                    >
                        {language === "ar" ? "معرض القوالب الفاخرة" : "Premium Template Gallery"}
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black tracking-tighter"
                    >
                        {language === "ar" ? "صمم متجرك بأناقة" : "Design Your Store with Style"}
                    </motion.h2>
                    <p className="text-lg text-muted-foreground/60 max-w-2xl mx-auto font-medium">
                        {language === "ar"
                            ? "مجموعة منسقة من القوالب التي توحد بين الجمال والوظيفة."
                            : "A curated collection of templates that unify beauty and function."}
                    </p>
                </div>

                {/* Sticky Header Filters */}
                <div className="sticky top-24 z-40 mb-16">
                    <div className="glass-floating px-4 sm:px-8 py-4 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 border-white/10">
                        {/* Scrollable Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border
                                        ${selectedCategory === cat.id
                                            ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                            : "bg-white/5 border-white/5 text-muted-foreground/60 hover:text-white hover:bg-white/10 hover:border-white/10"
                                        }`}
                                >
                                    {language === "ar" ? cat.label_ar : cat.label_en}
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                            <input
                                type="text"
                                placeholder={language === "ar" ? "ابحث عن قوالب..." : "Search templates..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-12 pr-5 rounded-xl bg-white/5 border border-white/5 transition-all focus:bg-white/10 focus:border-white/20 outline-none placeholder:text-muted-foreground/30 font-black text-xs uppercase tracking-widest"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid Marketplace */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredTemplates.map((template, index) => (
                            <motion.div
                                key={template.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
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
                        className="py-32 text-center rounded-[3rem] border border-dashed border-white/10 bg-white/[0.02]"
                    >
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary/5 mb-6 border border-secondary/10">
                            <Search className="h-8 w-8 text-secondary/40" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 tracking-tight">
                            {language === "ar" ? "لم نجد نتائج" : "No results found"}
                        </h3>
                        <p className="text-muted-foreground/60 max-w-xs mx-auto text-sm font-medium">
                            {language === "ar"
                                ? "جرب تقليل كلمات البحث أو استكشاف فئات أخرى."
                                : "Try clearing your search or exploring different categories."}
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
