import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AuroraBackground } from "@/components/common/AuroraBackground"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { TiltContainer } from "@/components/common/TiltContainer"
import { AbstractMockup } from "@/components/common/AbstractMockup"

export const Hero = ({ isAr, onGetStarted }: { isAr: boolean, onGetStarted: () => void }) => {
    const springTransition = { type: "spring", stiffness: 260, damping: 20 }

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <AuroraBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: isAr ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={springTransition}
                        className="space-y-10"
                    >
                        <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary-500 via-blue-600 to-secondary-500 bg-clip-text text-transparent leading-[1.1] tracking-tight">
                            {isAr ? 'أنشئ متجرك في 60 ثانية' : 'Create your store in 60 seconds'}
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl">
                            {isAr ? 'ابنِ متجراً إلكترونياً احترافياً بمنصتنا المدعومة بالذكاء الاصطناعي. لا حاجة للبرمجة.' : 'Build a professional e-commerce store with our AI-powered platform. No coding required.'}
                        </p>

                        <div className="flex flex-wrap gap-6">
                            <Button size="lg" className="text-xl px-12 py-8 rounded-2xl group transition-all active:scale-95" onClick={onGetStarted}>
                                {isAr ? 'ابدأ مجاناً' : 'Get Started Free'}
                                {isAr ? <ArrowLeft className="mr-3 w-6 h-6 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                            </Button>
                            <Button variant="outline" size="lg" className="text-xl px-12 py-8 rounded-2xl border-white/10 bg-white/5 backdrop-blur-md">
                                {isAr ? 'مشاهدة الديمو' : 'View Demo'}
                            </Button>
                        </div>
                    </motion.div>

                    {/* Visual Mockup - 3D Tilt & Abstract CSS */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={springTransition}
                        className="relative"
                    >
                        <TiltContainer>
                            <div className="bg-gradient-to-br from-primary-500/20 via-white/5 to-secondary-500/20 rounded-[40px] p-6 backdrop-blur-3xl border border-white/20 shadow-2xl">
                                <div className="bg-slate-950 rounded-[30px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10">
                                    <div className="h-10 bg-slate-900 flex items-center px-6 gap-2 border-b border-white/5">
                                        <div className="w-3 h-3 rounded-full bg-red-400" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-green-400" />
                                    </div>
                                    <div className="aspect-[16/10] bg-slate-900 relative">
                                        <AbstractMockup />
                                    </div>
                                </div>
                            </div>
                        </TiltContainer>

                        {/* Shimmering decoration */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl -z-10 rounded-full animate-pulse" />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

