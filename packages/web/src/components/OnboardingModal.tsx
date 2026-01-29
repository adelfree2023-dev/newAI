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
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const nextStep = () => setStep((s) => Math.min(s + 1, 4));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="glass w-full max-w-2xl rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] overflow-hidden relative"
            >
                {/* Visual Accent Glow */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

                {/* Header / Progress */}
                <div className="relative p-8 border-b border-white/5 bg-white/5 backdrop-blur-xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute right-6 top-6 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="flex items-center gap-6 mb-4">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-primary to-secondary"
                                initial={{ width: "0%" }}
                                animate={{ width: `${step * 25}%` }}
                                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                            />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                            Step {step} of 4
                        </span>
                    </div>

                    <motion.h2
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60"
                    >
                        {step === 1 && t("onboarding.user_data")}
                        {step === 2 && t("onboarding.domain_setup")}
                        {step === 3 && t("onboarding.package_selection")}
                        {step === 4 && t("onboarding.success")}
                    </motion.h2>
                </div>

                {/* Content */}
                <div className="p-10 min-h-[450px] relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 1 && <StepUserData key="step1" data={formData} setData={setFormData} onNext={nextStep} />}
                        {step === 2 && <StepDomain key="step2" data={formData} setData={setFormData} onNext={nextStep} onPrev={prevStep} />}
                        {step === 3 && (
                            <StepPackage
                                key="step3"
                                data={formData}
                                setData={setFormData}
                                onNext={async (data: any) => {
                                    setIsLoading(true);
                                    try {
                                        const response = await fetch("http://34.16.148.154:3001/api/onboarding/quick-start", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                storeName: data.name + "'s Store",
                                                domain: data.domain,
                                                email: data.email,
                                                password: "Password@2026", // Temporary default password
                                                businessType: "RETAIL"
                                            }),
                                        });
                                        const resData = await response.json();

                                        if (response.ok) {
                                            setResult(resData);
                                            nextStep();
                                        } else {
                                            alert(resData.message || (language === "ar" ? "فشل إنشاء المتجر. يرجى المحاولة مرة أخرى." : "Onboarding failed. Please try again."));
                                        }
                                    } catch (err) {
                                        console.error("Onboarding failed", err);
                                        alert(language === "ar" ? "خطأ في الاتصال بالسيرفر" : "Connection error to server");
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                onPrev={prevStep}
                                isLoading={isLoading}
                            />
                        )}
                        {step === 4 && <StepSuccess key="step4" onClose={onClose} result={result} />}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            <div className="space-y-6">
                <div className="space-y-2 group">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                        {language === "ar" ? "الاسم الكامل" : "Full Name"}
                    </label>
                    <Input
                        placeholder={language === "ar" ? "أدخل اسمك" : "John Doe"}
                        value={data.name}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                        className="h-14 rounded-2xl bg-white/5 border-white/10 focus:bg-white/10 transition-all text-lg font-medium"
                    />
                </div>
                <div className="space-y-2 group">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                        {language === "ar" ? "رقم الهاتف" : "Phone Number"}
                    </label>
                    <Input
                        type="tel"
                        placeholder="+966 50 000 0000"
                        value={data.phone}
                        onChange={(e) => setData({ ...data, phone: e.target.value })}
                        className="h-14 rounded-2xl bg-white/5 border-white/10 focus:bg-white/10 transition-all text-lg font-medium"
                    />
                </div>
                <div className="space-y-2 group">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                        {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
                    </label>
                    <Input
                        type="email"
                        placeholder="name@company.com"
                        value={data.email}
                        onChange={(e) => setData({ ...data, email: e.target.value })}
                        className="h-14 rounded-2xl bg-white/5 border-white/10 focus:bg-white/10 transition-all text-lg font-medium"
                    />
                </div>
            </div>
            <Button className="w-full h-14 text-xl font-black rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" variant="premium" onClick={onNext}>
                {language === "ar" ? "استكمال الإبداع" : "Continue"}
                <ArrowRight className={`h-6 w-6 ${language === "ar" ? "mr-2 rotate-180" : "ml-2"}`} />
            </Button>
        </motion.div>
    );
}

function StepDomain({ data, setData, onNext, onPrev }: any) {
    const { language } = useLanguage();
    const [isTaken, setIsTaken] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            <div className="space-y-6">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                    {language === "ar" ? "عنوان متجرك الرقمي" : "Your Digital Realm"}
                </label>
                <div className="relative group">
                    <Input
                        className="pl-32 h-20 text-3xl font-black bg-white/5 border-white/10 rounded-[2rem] transition-all focus:bg-white/10 focus:ring-4 focus:ring-primary/10 tracking-tighter"
                        placeholder="mystore"
                        value={data.domain}
                        onChange={async (e) => {
                            const val = e.target.value;
                            setData({ ...data, domain: val });
                            if (val.length > 3) {
                                try {
                                    const res = await fetch(`http://34.16.148.154:3001/api/onboarding/check-domain/${val}`);
                                    const check = await res.json();
                                    setIsTaken(!check.available);
                                } catch (err) {
                                    console.error("Domain check failed", err);
                                }
                            }
                        }}
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-black text-xl italic pointer-events-none">
                        apex.com/
                    </div>
                    {data.domain && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`mt-4 px-4 py-2 rounded-full text-xs font-black flex items-center justify-center gap-2 w-fit mx-auto ${isTaken ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}
                        >
                            {isTaken ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {isTaken
                                ? (language === "ar" ? "هذا النطاق مستخدم بالفعل" : "Domain is taken")
                                : (language === "ar" ? "هذا النطاق متاح!" : "Domain is available!")
                            }
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-muted-foreground hover:bg-white/5" onClick={onPrev}>
                    <ArrowLeft className={`h-5 w-5 ${language === "ar" ? "rotate-180 ml-2" : "mr-2"}`} />
                    {language === "ar" ? "رجوع" : "Back"}
                </Button>
                <Button className="flex-[2] h-14 text-xl font-black rounded-2xl shadow-2xl shadow-primary/20" variant="premium" onClick={onNext} disabled={!data.domain || isTaken}>
                    {language === "ar" ? "التالي" : "Continue"}
                    <ArrowRight className={`h-6 w-6 ${language === "ar" ? "mr-2 rotate-180" : "ml-2"}`} />
                </Button>
            </div>
        </motion.div>
    );
}

function StepPackage({ data, setData, onNext, onPrev, isLoading }: any) {
    const { language } = useLanguage();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-10"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                    { id: "free", name: "Free", desc: "Start small, dream big", price: "0" },
                    { id: "pro", name: "Pro", desc: "Professional growth", price: "29", color: "text-primary" }
                ].map((pkg) => (
                    <motion.div
                        key={pkg.id}
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setData({ ...data, package: pkg.id })}
                        className={`p-8 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${data.package === pkg.id
                            ? "border-primary bg-primary/10 shadow-2xl shadow-primary/20"
                            : "border-white/5 bg-white/5 hover:border-white/20"}`}
                    >
                        {data.package === pkg.id && (
                            <motion.div layoutId="active-pkg" className="absolute inset-0 bg-primary/5 -z-10" />
                        )}
                        <div className={`text-xl font-black mb-1 ${pkg.color || ""}`}>{pkg.name}</div>
                        <div className="text-sm text-muted-foreground/60 mb-6 font-medium">{pkg.desc}</div>
                        <div className="text-4xl font-black">
                            ${pkg.price}<span className="text-sm font-bold text-muted-foreground/40 italic">/mo</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black text-muted-foreground" onClick={onPrev} disabled={isLoading}>
                    <ArrowLeft className={`h-5 w-5 ${language === "ar" ? "rotate-180 ml-2" : "mr-2"}`} />
                    {language === "ar" ? "رجوع" : "Back"}
                </Button>
                <Button
                    className="flex-[2] h-16 text-xl font-black rounded-2xl shadow-2xl shadow-primary/20 relative overflow-hidden group"
                    variant="premium"
                    onClick={() => onNext(data)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                            <Package className="h-6 w-6" />
                        </motion.div>
                    ) : (
                        <>
                            {language === "ar" ? "أطلق متجري الآن" : "Launch My Store"}
                            <ArrowRight className={`h-6 w-6 transition-transform group-hover:translate-x-2 ${language === "ar" ? "mr-2 rotate-180" : "ml-2"}`} />
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}

function StepSuccess({ onClose, result }: any) {
    const { language, t } = useLanguage();
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-12"
        >
            <div className="relative inline-block">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full"
                />
                <CheckCircle2 className="h-32 w-32 text-primary relative z-10 drop-shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
            </div>

            <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                    {language === "ar" ? "تم بحمد الله!" : "It's Alive!"}
                </h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    {language === "ar"
                        ? "متجرك العالمي أصبح الآن حقيقة. عالم التجارة بانتظارك!"
                        : "Your global store is now alive. The world of infinite commerce awaits you."}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div whileHover={{ y: -5 }} className="group">
                    <Button
                        variant="ghost"
                        className="w-full h-auto py-8 glass border-white/5 hover:border-primary/20 flex flex-col gap-3 rounded-3xl transition-all"
                        onClick={() => window.open(result?.storeUrl || "#", "_blank")}
                    >
                        <Globe className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black uppercase tracking-widest">{t("onboarding.view_store")}</span>
                    </Button>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="group">
                    <Button
                        variant="ghost"
                        className="w-full h-auto py-8 glass border-primary/20 bg-primary/5 hover:bg-primary/10 flex flex-col gap-3 rounded-3xl transition-all"
                        onClick={() => window.open(result?.adminUrl || "#", "_blank")}
                    >
                        <Layout className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black uppercase tracking-widest">{t("onboarding.manage_store")}</span>
                    </Button>
                </motion.div>
            </div>

            <Button onClick={onClose} className="w-full h-14 rounded-2xl font-black text-muted-foreground hover:bg-white/5 transition-all" variant="ghost">
                {language === "ar" ? "أغلق وتابع الإلهام" : "Close & Explore"}
            </Button>
        </motion.div>
    );
}
