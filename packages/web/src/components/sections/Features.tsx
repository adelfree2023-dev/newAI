import { BentoGrid, BentoCard } from "@/components/common/BentoGrid"
import { motion } from "framer-motion"
import { TrendingUp, Shield } from "lucide-react"



export const Features = ({ isAr }: { isAr: boolean }) => {
    const springTransition = { type: "spring", stiffness: 260, damping: 20 }

    return (
        <section className="py-32 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={springTransition}
                    className="text-center mb-20"
                >

                    <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                        {isAr ? 'كل ما تحتاجه للنجاح' : 'Everything you need to succeed'}
                    </h2>
                    <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                        {isAr ? 'مميزات قوية مصممة للتجارة للتجارة الإلكترونية الحديثة' : 'Powerful features designed for modern e-commerce'}
                    </p>
                </motion.div>

                <BentoGrid>
                    {/* Speed Card - Rich UI Abstraction */}
                    <BentoCard className="lg:col-span-2" delay={0.1}>
                        <div>
                            <h3 className="text-2xl font-bold mb-2">{isAr ? 'سرعة مذهلة' : 'Lightning Fast'}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{isAr ? 'وقت استجابة < 50ms' : 'Server Response Time < 50ms'}</p>
                        </div>
                        <div className="flex items-end gap-2 h-24 mb-4">
                            {[60, 80, 40, 90, 70, 100, 85, 95].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    whileInView={{ height: `${h}%` }}
                                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                                    className="flex-1 bg-gradient-to-t from-primary-500 to-secondary-500 rounded-t-lg"
                                />
                            ))}
                        </div>
                    </BentoCard>

                    {/* Global Card - Rich UI Abstraction */}
                    <BentoCard delay={0.2}>
                        <div>
                            <h3 className="text-2xl font-bold mb-2">{isAr ? 'عالمي' : 'Global Ready'}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{isAr ? 'دعم العملات المتعددة' : 'Multi-currency support'}</p>
                        </div>
                        <div className="flex justify-center items-center h-full">
                            <motion.div
                                className="bg-gray-100 dark:bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-gray-200 dark:border-white/10"
                                animate={{ rotateY: [0, 360] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            >
                                <span className="text-3xl font-bold text-primary-500">$ USD</span>
                                <span className="text-gray-400">↔</span>
                                <span className="text-3xl font-bold text-secondary-500">SAR ر.س</span>
                            </motion.div>
                        </div>
                    </BentoCard>

                    {/* Mobile Card - Rich UI Abstraction */}
                    <BentoCard delay={0.3}>
                        <div>
                            <h3 className="text-2xl font-bold mb-2">{isAr ? 'متوافق مع الجوال' : 'Mobile Optimized'}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{isAr ? 'تصميم متجاوب بالكامل' : 'Responsive design for all screens'}</p>
                        </div>
                        <div className="flex justify-center pt-8">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="w-32 h-44 bg-slate-900 rounded-t-3xl border-4 border-slate-800 p-2 overflow-hidden"
                            >
                                <div className="w-full h-full bg-white rounded-t-xl opacity-20" />
                            </motion.div>
                        </div>
                    </BentoCard>

                    {/* Other Feature Cards */}
                    <BentoCard delay={0.4}>
                        <Shield className="w-12 h-12 text-primary-500 mb-4" />
                        <h3 className="text-xl font-bold">{isAr ? 'آمن وموثوق' : 'Secure & Reliable'}</h3>
                        <p className="text-gray-500">{isAr ? 'حماية من الدرجة المؤسسية' : 'Enterprise-grade security'}</p>
                    </BentoCard>

                    <BentoCard delay={0.5}>
                        <TrendingUp className="w-12 h-12 text-secondary-500 mb-4" />
                        <h3 className="text-xl font-bold">{isAr ? 'لوحة تحكم' : 'Analytics Dashboard'}</h3>
                        <p className="text-gray-500">{isAr ? 'رؤى فورية لمتجرك' : 'Real-time store insights'}</p>
                    </BentoCard>
                </BentoGrid>
            </div>
        </section>
    )
}
