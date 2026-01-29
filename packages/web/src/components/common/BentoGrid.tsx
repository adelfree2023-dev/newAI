import { motion } from "framer-motion"
import { BorderBeam } from "./BorderBeam"

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
    const springTransition = { type: "spring", stiffness: 260, damping: 20 }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ ...springTransition, delay: delay * 0.2 }}
            whileHover={{ y: -5 }}
            className={`
        relative overflow-hidden transform-gpu
        bg-white/5 dark:bg-slate-900/60 backdrop-blur-lg
        border border-white/10 rounded-3xl 
        p-8 shadow-2xl transition-all duration-300
        group cursor-default will-change-transform
        ${className}
      `}
        >
            <BorderBeam 
                size={250} 
                duration={12} 
                delay={delay} 
                className="opacity-0 group-hover:opacity-100 transition-opacity" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative z-10 h-full flex flex-col justify-between">
                {children}
            </div>
        </motion.div>
    )
}


