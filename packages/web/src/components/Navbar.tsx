"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Globe, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
    const { language, setLanguage, t, dir } = useLanguage();
    const { theme, setTheme } = useTheme();

    const toggleLanguage = () => {
        setLanguage(language === "ar" ? "en" : "ar");
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/50"
        >
            <div className="flex items-center gap-8">
                <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    APEX
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <a href="#templates" className="text-sm font-medium hover:text-primary transition-colors">
                        {t("nav.templates")}
                    </a>
                    <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                        {t("nav.pricing")}
                    </a>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleLanguage}
                    className="rounded-full"
                >
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Toggle Language</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full"
                >
                    <Sun className="h-5 w-5 dark:hidden" />
                    <Moon className="h-5 w-5 hidden dark:block" />
                    <span className="sr-only">Toggle Theme</span>
                </Button>

                <Button variant="ghost" className="hidden sm:flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    {t("nav.login")}
                </Button>

                <Button variant="premium">
                    {t("nav.getStarted")}
                </Button>
            </div>
        </motion.nav>
    );
}
