"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, CheckCircle2, Globe, Layout, Package, ArrowRight, ArrowLeft } from "lucide-react";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTemplate?: any;
}

export function OnboardingModal({ isOpen, onClose, selectedTemplate }: OnboardingModalProps) {
    const { t, language } = useLanguage();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        domain: "",
        package: "free",
    });

    const nextStep = () => setStep((s) => Math.min(s + 1, 4));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
                {/* Header / Progress */}
                <div className="relative p-6 border-b border-border/50 bg-muted/20">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className={`p-2 rounded-lg ${step >= 1 ? "bg-primary text-white" : "bg-muted"}`}>
                            <Layout className="h-5 w-5" />
                        </div>
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: "25%" }}
                                animate={{ width: `${step * 25}%` }}
                            />
                        </div>
                        <div className={`p-2 rounded-lg ${step >= 4 ? "bg-primary text-white" : "bg-muted"}`}>
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold">
                        {step === 1 && t("onboarding.user_data")}
                        {step === 2 && t("onboarding.domain_setup")}
                        {step === 3 && t("onboarding.package_selection")}
                        {step === 4 && t("onboarding.success")}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-8 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && <StepUserData key="step1" data={formData} setData={setFormData} onNext={nextStep} />}
                        {step === 2 && <StepDomain key="step2" data={formData} setData={setFormData} onNext={nextStep} onPrev={prevStep} />}
                        {step === 3 && <StepPackage key="step3" data={formData} setData={setFormData} onNext={nextStep} onPrev={prevStep} />}
                        {step === 4 && <StepSuccess key="step4" onClose={onClose} />}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

// --- Steps ---

function StepUserData({ data, setData, onNext }: any) {
    const { language } = useLanguage();
    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">{language === "ar" ? "الاسم الكامل" : "Full Name"}</label>
                    <Input
                        placeholder={language === "ar" ? "أدخل اسمك" : "John Doe"}
                        value={data.name}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">{language === "ar" ? "رقم الهاتف" : "Phone Number"}</label>
                    <Input
                        type="tel"
                        placeholder="+966 50 000 0000"
                        value={data.phone}
                        onChange={(e) => setData({ ...data, phone: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">{language === "ar" ? "البريد الإلكتروني" : "Email Address"}</label>
                    <Input
                        type="email"
                        placeholder="name@company.com"
                        value={data.email}
                        onChange={(e) => setData({ ...data, email: e.target.value })}
                    />
                </div>
            </div>
            <Button className="w-full h-12 text-lg" variant="premium" onClick={onNext}>
                <ArrowRight className={`ml-2 h-5 w-5 ${language === "ar" ? "rotate-180" : ""}`} />
                {language === "ar" ? "التالي" : "Continue"}
            </Button>
        </motion.div>
    );
}

function StepDomain({ data, setData, onNext, onPrev }: any) {
    const { language } = useLanguage();
    const [isTaken, setIsTaken] = useState(false);

    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="space-y-4">
                <label className="text-sm font-medium">{language === "ar" ? "عنوان متجرك" : "Store Domain"}</label>
                <div className="relative">
                    <Input
                        className="pl-24 h-14 text-lg font-bold"
                        placeholder="mystore"
                        value={data.domain}
                        onChange={(e) => {
                            setData({ ...data, domain: e.target.value });
                            setIsTaken(e.target.value === "taken"); // Mock availability
                        }}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium border-r pr-4 border-border">
                        apex.com/
                    </div>
                    {data.domain && !isTaken && (
                        <div className="mt-2 text-sm text-green-500 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            {language === "ar" ? "هذا النطاق متاح!" : "Domain is available!"}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12" onClick={onPrev}>
                    {language === "ar" ? "السابق" : "Back"}
                </Button>
                <Button className="flex-[2] h-12 text-lg" variant="premium" onClick={onNext} disabled={!data.domain || isTaken}>
                    {language === "ar" ? "التالي" : "Continue"}
                </Button>
            </div>
        </motion.div>
    );
}

function StepPackage({ data, setData, onNext, onPrev }: any) {
    const { language } = useLanguage();
    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                    onClick={() => setData({ ...data, package: "free" })}
                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${data.package === "free" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                    <div className="text-lg font-bold mb-1">Free</div>
                    <div className="text-sm text-muted-foreground mb-4">Start your journey</div>
                    <div className="text-2xl font-bold font-inter">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                </div>
                <div
                    onClick={() => setData({ ...data, package: "pro" })}
                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${data.package === "pro" ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/50"}`}
                >
                    <div className="text-lg font-bold mb-1 text-secondary">Pro</div>
                    <div className="text-sm text-muted-foreground mb-4">Global expansion</div>
                    <div className="text-2xl font-bold font-inter">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12" onClick={onPrev}>
                    {language === "ar" ? "السابق" : "Back"}
                </Button>
                <Button className="flex-[2] h-12 text-lg" variant="premium" onClick={onNext}>
                    {language === "ar" ? "إنشاء المتجر الآن" : "Create Store Now"}
                </Button>
            </div>
        </motion.div>
    );
}

function StepSuccess({ onClose }: any) {
    const { language, t } = useLanguage();
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-8"
        >
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <CheckCircle2 className="h-24 w-24 text-primary relative" />
            </div>

            <div>
                <h2 className="text-3xl font-extrabold mb-2">{t("onboarding.success")}</h2>
                <p className="text-muted-foreground">متجرك الجديد جاهز للانطلاق. ابدأ في إضافة منتجاتك الأولى!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-2">
                    <Globe className="h-6 w-6 text-primary" />
                    <span className="text-xs font-bold uppercase">{t("onboarding.view_store")}</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 border-primary/20 bg-primary/5">
                    <Layout className="h-6 w-6 text-primary" />
                    <span className="text-xs font-bold uppercase">{t("onboarding.manage_store")}</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 opacity-50 cursor-not-allowed">
                    <Package className="h-6 w-6" />
                    <span className="text-xs font-bold uppercase">{t("onboarding.download_app")}</span>
                    <span className="text-[10px] text-muted-foreground italic">(Coming Soon)</span>
                </Button>
            </div>

            <Button onClick={onClose} className="w-full h-12" variant="ghost">إغلاق</Button>
        </motion.div>
    );
}
