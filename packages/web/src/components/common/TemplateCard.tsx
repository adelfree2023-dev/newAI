import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface TemplateCardProps {
    id: string
    name: string
    category: string
    onSelect: (id: string | null) => void
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
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ y: -10 }}
            className="group relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        >
            <div className="relative h-64 overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />

                {/* Abstract Template Art */}
                <div className="absolute inset-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden">
                    <div className="absolute w-24 h-24 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute w-16 h-16 bg-secondary-500/10 rounded-full blur-2xl animate-pulse delay-75" />
                    <div className="font-black text-white/5 text-2xl uppercase tracking-[0.2em] transform -rotate-12">
                        {category}
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 z-20">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10">
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
