import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Languages } from "lucide-react"

export const Navbar = ({ isAr, onToggleLang }: { isAr: boolean, onToggleLang: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl border-b border-gray-200 dark:border-white/10"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20 md:h-24">
                    {/* Logo */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="text-3xl font-black bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent cursor-pointer"
                    >
                        APEX
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-10">
                        <a href="#features" className="font-bold text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                            {isAr ? 'المميزات' : 'Features'}
                        </a>
                        <a href="#templates" className="font-bold text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                            {isAr ? 'القوالب' : 'Templates'}
                        </a>

                        <div className="flex items-center gap-4 pl-8 border-l border-gray-200 dark:border-white/10 ml-4">
                            <Button variant="ghost" size="icon" onClick={onToggleLang} className="rounded-full text-gray-600 dark:text-gray-300">
                                <Languages className="w-5 h-5" />
                            </Button>
                            <ThemeToggle />
                            <Button className="px-8 rounded-2xl font-bold">
                                {isAr ? 'تسجيل الدخول' : 'Sign In'}
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-gray-900 dark:text-white"
                        >
                            {isMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 overflow-hidden"
                    >
                        <div className="px-6 py-10 space-y-8">
                            <a href="#features" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-black text-gray-900 dark:text-white">
                                {isAr ? 'المميزات' : 'Features'}
                            </a>
                            <a href="#templates" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-black text-gray-900 dark:text-white">
                                {isAr ? 'القوالب' : 'Templates'}
                            </a>

                            <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-gray-600 dark:text-gray-400">{isAr ? 'اللغة' : 'Language'}</span>
                                    <Button variant="outline" size="lg" onClick={onToggleLang} className="rounded-xl px-6">
                                        <Languages className="w-5 h-5 mr-2" />
                                        {isAr ? 'English' : 'العربية'}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-gray-600 dark:text-gray-400">{isAr ? 'الوضع' : 'Theme'}</span>
                                    <ThemeToggle />
                                </div>
                                <Button className="w-full py-8 text-xl rounded-2xl font-black">
                                    {isAr ? 'تسجيل الدخول' : 'Sign In'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    )
}

