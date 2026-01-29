import { motion } from "framer-motion"

interface BentoGridProps {
    children: React.ReactNode
}

export const BentoGrid = ({ children }: BentoGridProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[250px]">
            {children}
        </div>
    )
}

interface BentoCardProps {
    children: React.ReactNode
    className?: string
    delay?: number
}

export const BentoCard = ({ children, className, delay = 0 }: BentoCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ scale: 1.02 }}
            className={`
        relative overflow-hidden
        bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl 
        border border-white/20 dark:border-white/5 rounded-3xl 
        p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all
        group cursor-default
        ${className}
      `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 h-full flex flex-col justify-between">
                {children}
            </div>
        </motion.div>
    )
}
