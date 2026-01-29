import { motion } from "framer-motion"

export const AbstractMockup = () => {
    return (
        <div className="relative w-full h-full bg-slate-950/40 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-md transform-gpu">
            {/* Abstract Grid */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: `linear-gradient(to right, #ffffff11 1px, transparent 1px), linear-gradient(to bottom, #ffffff11 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
            />

            {/* Floating Elements */}
            <motion.div
                animate={{
                    y: [0, -10, 0],
                    rotate: [0, 2, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-primary-500/20 to-secondary-500/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl will-change-transform"
            >
                <div className="p-6 space-y-4">
                    <div className="h-3 w-3/4 bg-white/10 rounded-full" />
                    <div className="h-3 w-1/2 bg-white/10 rounded-full" />
                    <div className="grid grid-cols-3 gap-2 pt-4">
                        <div className="h-10 bg-primary-500/20 rounded-lg" />
                        <div className="h-10 bg-secondary-500/20 rounded-lg" />
                        <div className="h-10 bg-blue-500/20 rounded-lg" />
                    </div>
                </div>
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 10, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/5 rounded-full border border-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center will-change-transform"
            >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 blur-lg opacity-40" />
            </motion.div>

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>
    )
}

