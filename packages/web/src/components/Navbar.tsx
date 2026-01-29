import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, LogIn, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function Navbar() {
    const { language, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        setIsLoggedIn(!!token);

        // Listen for storage changes (optional but good)
        const handleStorageChange = () => {
            setIsLoggedIn(!!localStorage.getItem("accessToken"));
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        window.location.href = "/";
    };

    const toggleLanguage = () => {
        setLanguage(language === "ar" ? "en" : "ar");
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-background/60 border-b border-white/5"
        >
            <div className="flex items-center gap-10">
                <Link href="/" className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:scale-105 transition-transform">
                    APEX
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="/templates" className="text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                        {t("nav.templates")}
                    </Link>
                    <Link href="/pricing" className="text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                        {t("nav.pricing")}
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleLanguage}
                    className="rounded-full hover:bg-white/5"
                >
                    <Globe className="h-5 w-5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full hover:bg-white/5"
                >
                    <Sun className="h-5 w-5 dark:hidden" />
                    <Moon className="h-5 w-5 hidden dark:block" />
                </Button>

                <div className="h-6 w-[1px] bg-white/10 mx-2 hidden sm:block" />

                <AnimatePresence mode="wait">
                    {isLoggedIn ? (
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" className="hidden sm:flex items-center gap-2 rounded-xl font-black text-xs uppercase tracking-widest" asChild>
                                <Link href="/dashboard">
                                    <User className="h-4 w-4" />
                                    {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="rounded-full text-destructive hover:bg-destructive/10"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" className="hidden sm:flex items-center gap-2 rounded-xl font-black text-xs uppercase tracking-widest" asChild>
                                <Link href="/auth/login">
                                    <LogIn className="h-4 w-4" />
                                    {t("nav.login")}
                                </Link>
                            </Button>

                            <Button variant="premium" className="rounded-xl shadow-xl shadow-primary/20 font-black text-xs uppercase tracking-widest" asChild>
                                <Link href="/auth/signup">
                                    {t("nav.getStarted")}
                                </Link>
                            </Button>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
