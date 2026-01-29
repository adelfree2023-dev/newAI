import { useState } from "react"
import { motion } from "framer-motion"


import { TemplateCard } from "@/components/common/TemplateCard"




const allTemplates = [
    { id: "1", name: "Apex Fashion", category: "Fashion", image: "/assets/templates/fashion.jpg" },
    { id: "2", name: "Quantum Tech", category: "Electronics", image: "/assets/templates/tech.jpg" },
    { id: "3", name: "Organic Food", category: "Food", image: "/assets/templates/fashion.jpg" },
    { id: "4", name: "Vapor Minimal", category: "General", image: "/assets/templates/tech.jpg" },
    { id: "5", name: "Premium Luxe", category: "Fashion", image: "/assets/templates/fashion.jpg" },
    { id: "6", name: "Titan Sports", category: "Sports", image: "/assets/templates/tech.jpg" }
]


export const Templates = ({ isAr }: { isAr: boolean }) => {
    const [, setSelected] = useState<string | null>(null)
    const springTransition = { type: "spring", stiffness: 260, damping: 20 }

    return (
        <section className="py-32 bg-white dark:bg-slate-950 transition-colors duration-500 overflow-hidden relative border-t border-gray-100 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={springTransition}
                    className="text-center mb-24"
                >

                    <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight text-gray-900 dark:text-white">
                        {isAr ? 'اختر قالبك المثالي' : 'Choose Your Perfect Template'}
                    </h2>
                    <p className="text-2xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
                        {isAr ? 'تصفح مجموعتنا من القوالب المصممة احترافياً' : 'Browse our collection of professionally designed templates'}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {allTemplates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            {...template}
                            onSelect={setSelected}
                            isAr={isAr}
                        />

                    ))}
                </div>
            </div>
        </section>
    )
}

