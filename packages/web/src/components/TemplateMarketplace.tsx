"use client";

import React, { useState } from "react";
import { templates, type Template } from "@/data/templates";
import { TemplateCard } from "./TemplateCard";
import { OnboardingModal } from "./OnboardingModal";
import { useLanguage } from "@/context/LanguageContext";
import { Filter, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TemplateMarketplace() {
    const { language } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

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

    return (
        <section id="templates" className="py-24 bg-muted/30">
            <div className="container mx-auto px-6">
                <div className="mb-12 text-center md:text-right">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {language === "ar" ? "اختر القالب المثالي لمتجرك" : "Choose the perfect template"}
                    </h2>
                    <p className="text-muted-foreground">
                        {language === "ar"
                            ? "ابدأ بقالب مصمم باحترافية وانطلق في ثوانٍ"
                            : "Start with a professionally designed template and launch in seconds"}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="w-full md:w-64 space-y-8">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={language === "ar" ? "بحث عن قالب..." : "Search templates..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pr-10 pl-4 rounded-lg border border-border bg-background transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>

                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                {language === "ar" ? "الأقسام" : "Categories"}
                            </h4>
                            <div className="flex flex-wrap md:flex-col gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-right
                      ${selectedCategory === cat.id
                                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                                : "bg-background hover:bg-muted text-muted-foreground border border-border/50"
                                            }`}
                                    >
                                        {language === "ar" ? cat.label_ar : cat.label_en}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredTemplates.map((template) => (
                                    <motion.div
                                        key={template.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
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
                            <div className="py-20 text-center">
                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                                    <X className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold">
                                    {language === "ar" ? "لا توجد نتائج" : "No results found"}
                                </h3>
                                <p className="text-muted-foreground">
                                    {language === "ar" ? "جرب البحث عن شيء آخر" : "Try searching for something else"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <OnboardingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedTemplate={selectedTemplate}
            />
        </section>
    );
}
