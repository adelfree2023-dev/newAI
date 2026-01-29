import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Trophy, Store, Settings, Download } from "lucide-react"
import ReactConfetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import { useEffect, useState } from "react"

export const SuccessState = ({ isAr }: { isAr: boolean }) => {
    const { width, height } = useWindowSize()
    const [showConfetti, setShowConfetti] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 8000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <section className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
            {showConfetti && <ReactConfetti width={width} height={height} numberOfPieces={200} recycle={false} gravity={0.15} colors={['#2563EB', '#06B6D4', '#ffffff']} />}

            <div className="max-w-4xl mx-auto px-4 py-20 text-center relative z-10">
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="mb-12"
                >
                    <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(37,99,235,0.5)]">
                        <Trophy className="w-16 h-16 text-white" />
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-6xl md:text-8xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent"
                >
                    {isAr ? 'مبروك!' : 'Congratulations!'}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl text-gray-400 mb-12"
                >
                    {isAr ? 'لقد تم إنشاء متجرك بنجاح. أنت جاهز للبدء!' : 'Your store has been successfully created. You\'re ready to start selling!'}
                </motion.p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Button size="lg" className="w-full text-xl py-8 rounded-2xl" variant="outline">
                            <Store className="w-6 h-6 mr-3" />
                            {isAr ? 'زيارة المتجر' : 'View Store'}
                        </Button>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <Button size="lg" className="w-full text-xl py-8 rounded-2xl bg-primary-500">
                            <Settings className="w-6 h-6 mr-3" />
                            {isAr ? 'لوحة التحكم' : 'Dashboard'}
                        </Button>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                        <Button size="lg" className="w-full text-xl py-8 rounded-2xl" variant="outline" disabled>
                            <Download className="w-6 h-6 mr-3" />
                            {isAr ? 'تحميل التطبيق' : 'Download App'}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
