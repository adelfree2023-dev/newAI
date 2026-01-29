import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AuroraBackground } from "@/components/common/AuroraBackground"
import { ArrowLeft, ArrowRight } from "lucide-react"

export const Hero = ({ isAr, onGetStarted }: { isAr: boolean, onGetStarted: () => void }) => {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <AuroraBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: isAr ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-10"
                    >
                        <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary-500 via-blue-600 to-secondary-500 bg-clip-text text-transparent leading-[1.1] tracking-tight">
                            {isAr ? 'أنشئ متجرك في 60 ثانية' : 'Create your store in 60 seconds'}
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl">
                            {isAr ? 'ابنِ متجراً إلكترونياً احترافياً بمنصتنا المدعومة بالذكاء الاصطناعي. لا حاجة للبرمجة.' : 'Build a professional e-commerce store with our AI-powered platform. No coding required.'}
                        </p>

                        <div className="flex flex-wrap gap-6">
                            <Button size="lg" className="text-xl px-12 py-8 rounded-2xl group" onClick={onGetStarted}>
                                {isAr ? 'ابدأ مجاناً' : 'Get Started Free'}
                                {isAr ? <ArrowLeft className="mr-3 w-6 h-6 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                            </Button>
                            <Button variant="outline" size="lg" className="text-xl px-12 py-8 rounded-2xl">
                                {isAr ? 'مشاهدة الديمو' : 'View Demo'}
                            </Button>
                        </div>
                    </motion.div>

                    {/* Visual Mockup - Floating Animation */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: [0, -20, 0]
                        }}
                        transition={{
                            opacity: { duration: 0.8 },
                            scale: { duration: 0.8 },
                            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="relative"
                    >
                        <div className="bg-gradient-to-br from-primary-500/20 via-white/5 to-secondary-500/20 rounded-[40px] p-6 backdrop-blur-3xl border border-white/20">
                            <div className="bg-white dark:bg-slate-950 rounded-[30px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                                <div className="h-10 bg-gray-100 dark:bg-slate-900 flex items-center px-6 gap-2 border-b border-gray-200 dark:border-white/5">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="aspect-[16/10] bg-slate-900 group relative">
                                    <img
                                        src="/assets/dashboard-mockup.png"
                                        alt="APEX Dashboard"
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                                </div>

                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
