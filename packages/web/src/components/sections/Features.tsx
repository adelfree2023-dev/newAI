import { BentoGrid, BentoCard } from "@/components/common/BentoGrid"
import { motion } from "framer-motion"
import { TrendingUp, Shield } from "lucide-react"



export const Features = ({ isAr }: { isAr: boolean }) => {
    const springTransition = { type: "spring", stiffness: 260, damping: 20 }

    return (
        <section className="py-24 md:py-32 bg-gray-50 dark:bg-slate-950 transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={springTransition}
                    className="text-center mb-16 md:mb-24"
                >
                    <h2 className="text-4xl md:text-7xl font-black mb-6 md:mb-8 tracking-tight text-gray-900 dark:text-white">
                        {isAr ? 'كل ما تحتاجه للنجاح' : 'Everything you need to succeed'}
                    </h2>
                    <p className="text-lg md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                        {isAr ? 'مميزات قوية مصممة للتجارة للتجارة الإلكترونية الحديثة' : 'Powerful features designed for modern e-commerce'}
                    </p>
                </motion.div>

                <BentoGrid>
                    {/* Speed Card */}
                    <BentoCard className="md:col-span-2" delay={0.1}>
                        <div className="mb-6 md:mb-0">
                            <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">{isAr ? 'سرعة مذهلة' : 'Lightning Fast'}</h3>
                            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">{isAr ? 'وقت استجابة < 50ms' : 'Server Response Time < 50ms'}</p>
                        </div>
                        <div className="flex items-end gap-2 md:gap-3 h-20 md:h-28 mt-4">
                            {[60, 80, 40, 90, 70, 100, 85].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    whileInView={{ height: `${h}%` }}
                                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                                    className="flex-1 bg-gradient-to-t from-primary-500 to-secondary-500 rounded-t-lg md:rounded-t-xl"
                                />
                            ))}
                        </div>
                    </BentoCard>

                    {/* Global Card */}
                    <BentoCard delay={0.2}>
                        <div className="mb-6 md:mb-0">
                            <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">{isAr ? 'عالمي' : 'Global Ready'}</h3>
                            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">{isAr ? 'دعم العملات المتعددة' : 'Multi-currency support'}</p>
                        </div>
                        <div className="flex justify-center items-center h-full pt-4 md:pt-0">
                            <motion.div
                                className="bg-white/40 dark:bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-6 border border-gray-200 dark:border-white/10 backdrop-blur-md"
                                animate={{ rotateY: [0, 360] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            >
                                <span className="text-2xl md:text-4xl font-bold text-primary-600 dark:text-primary-400">$ USD</span>
                                <span className="text-gray-400 text-xl md:text-2xl">↔</span>
                                <span className="text-2xl md:text-4xl font-bold text-secondary-600 dark:text-secondary-400">SAR</span>
                            </motion.div>
                        </div>
                    </BentoCard>

                    {/* Mobile Card */}
                    <BentoCard delay={0.3}>
                        <div className="mb-6 md:mb-0">
                            <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-white">{isAr ? 'متوافق مع الجوال' : 'Mobile Optimized'}</h3>
                            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">{isAr ? 'تصميم متجاوب بالكامل' : 'Responsive design for all screens'}</p>
                        </div>
                        <div className="flex justify-center pt-6 md:pt-8">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="w-28 h-36 md:w-36 md:h-48 bg-slate-900 rounded-t-2xl md:rounded-t-3xl border-4 border-slate-800 p-2 md:p-3 overflow-hidden shadow-2xl transform-gpu"
                            >
                                <div className="w-full h-full bg-white/10 rounded-t-lg md:rounded-t-xl" />
                            </motion.div>
                        </div>
                    </BentoCard>

                    {/* Security Card */}
                    <BentoCard delay={0.4}>
                        <Shield className="w-12 h-12 md:w-16 md:h-16 text-primary-500 mb-4 md:mb-6" />
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">{isAr ? 'آمن وموثوق' : 'Secure & Reliable'}</h3>
                        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">{isAr ? 'حماية من الدرجة المؤسسية' : 'Enterprise-grade security'}</p>
                    </BentoCard>

                    {/* Analytics Card */}
                    <BentoCard delay={0.5}>
                        <TrendingUp className="w-12 h-12 md:w-16 md:h-16 text-secondary-500 mb-4 md:mb-6" />
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">{isAr ? 'لوحة تحكم' : 'Analytics Dashboard'}</h3>
                        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">{isAr ? 'رؤى فورية لمتجرك' : 'Real-time store insights'}</p>
                    </BentoCard>
                </BentoGrid>
            </div>
        </section>
    )
}


