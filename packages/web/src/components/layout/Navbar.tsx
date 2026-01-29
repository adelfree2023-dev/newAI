import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { motion } from "framer-motion"
import { Menu, X, Languages } from "lucide-react"

export const Navbar = ({ isAr, onToggleLang }: { isAr: boolean, onToggleLang: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-2xl border-b border-white/20 dark:border-white/5"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="text-3xl font-black bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent cursor-pointer"
                    >
                        APEX
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-10">
                        <a href="#" className="font-semibold text-gray-500 hover:text-primary-500 transition-colors">
                            {isAr ? 'المميزات' : 'Features'}
                        </a>
                        <a href="#" className="font-semibold text-gray-500 hover:text-primary-500 transition-colors">
                            {isAr ? 'القوالب' : 'Templates'}
                        </a>

                        <div className="flex items-center gap-4 pl-6 border-l border-gray-200 dark:border-white/10 ml-6">
                            <Button variant="ghost" size="icon" onClick={onToggleLang} className="rounded-full">
                                <Languages className="w-5 h-5" />
                            </Button>
                            <ThemeToggle />
                            <Button className="px-6 rounded-xl">
                                {isAr ? 'تسجيل الدخول' : 'Sign In'}
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <ThemeToggle />
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </motion.nav>
    )
}
