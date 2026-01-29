import { motion } from "framer-motion"

export const AbstractMockup = () => {
    return (
        <div className="relative w-full h-full bg-slate-950/40 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-xl">
            {/* Abstract Grid */}
            <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: `linear-gradient(to right, #ffffff11 1px, transparent 1px), linear-gradient(to bottom, #ffffff11 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
            />

            {/* Floating Elements */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-2xl border border-white/20 backdrop-blur-2xl shadow-2xl"
            >
                <div className="p-6 space-y-4">
                    <div className="h-4 w-3/4 bg-white/10 rounded-full animate-pulse" />
                    <div className="h-4 w-1/2 bg-white/10 rounded-full animate-pulse delay-75" />
                    <div className="grid grid-cols-3 gap-3 pt-4">
                        <div className="h-12 bg-primary-500/30 rounded-lg" />
                        <div className="h-12 bg-secondary-500/30 rounded-lg" />
                        <div className="h-12 bg-blue-500/30 rounded-lg" />
                    </div>
                </div>
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 20, 0],
                    x: [0, 10, 0]
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full border border-white/10 backdrop-blur-3xl shadow-2xl flex items-center justify-center"
            >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 blur-xl opacity-50" />
            </motion.div>

            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>
    )
}
