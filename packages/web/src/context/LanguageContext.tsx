"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    dir: "rtl" | "ltr";
    t: (key: string) => string;
}

const translations = {
    ar: {
        "hero.title": "أنشئ متجرك في 60 ثانية",
        "hero.subtitle": "منصة التجارة الإلكترونية الأكثر تطوراً في العالم العربي",
        "nav.login": "تسجيل الدخول",
        "nav.getStarted": "ابدأ الآن",
        "nav.templates": "القوالب",
        "nav.pricing": "الأسعار",
        "onboarding.user_data": "بيانات المستخدم",
        "onboarding.domain_setup": "إعداد النطاق",
        "onboarding.package_selection": "اختيار الباقة",
        "onboarding.success": "🎉 تم إنشاء متجرك بنجاح!",
        "onboarding.view_store": "معاينة المتجر",
        "onboarding.manage_store": "إدارة المتجر",
        "onboarding.download_app": "تحميل التطبيق",
    },
    en: {
        "hero.title": "Create your store in 60 seconds",
        "hero.subtitle": "The most advanced e-commerce platform in the world",
        "nav.login": "Login",
        "nav.getStarted": "Get Started",
        "nav.templates": "Templates",
        "nav.pricing": "Pricing",
        "onboarding.user_data": "User Data",
        "onboarding.domain_setup": "Domain Setup",
        "onboarding.package_selection": "Package Selection",
        "onboarding.success": "🎉 Your store is ready!",
        "onboarding.view_store": "View Store",
        "onboarding.manage_store": "Manage Store",
        "onboarding.download_app": "Download App",
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("ar");

    const dir = language === "ar" ? "rtl" : "ltr";

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = dir;
    }, [language, dir]);

    const t = (key: string) => {
        return translations[language][key as keyof (typeof translations)["ar"]] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, dir, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
