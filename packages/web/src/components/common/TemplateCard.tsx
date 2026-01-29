import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface TemplateCardProps {
    id: string
    name: string
    category: string
    image: string
    onSelect: (id: string | null) => void // Fixed parameter type
    isAr: boolean
}

export const TemplateCard = ({
    id,
    name,
    category,
    onSelect,
    isAr
}: TemplateCardProps) => {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-white/5"
        >
            <div className="relative h-64 overflow-hidden bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-black text-4xl">
                    TEMPLATE PREVIEW
                </div>
                <div className="absolute bottom-6 left-6 z-20">
                    <span className="text-xs font-bold uppercase tracking-widest bg-primary-500 text-white px-4 py-2 rounded-full">
                        {category}
                    </span>
                </div>
            </div>

            <div className="p-8">
                <h3 className="text-2xl font-bold mb-3">{name}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    {isAr ? 'قالب تجارة إلكترونية احترافي وعالي الأداء' : 'Professional high-performance e-commerce template'}
                </p>

                <div className="flex gap-4">
                    <Button
                        onClick={() => onSelect(id)}
                        className="flex-1 rounded-xl h-12"
                    >
                        {isAr ? 'اختيار القالب' : 'Select'}
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-xl h-12"
                    >
                        {isAr ? 'ديمو' : 'Demo'}
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}
