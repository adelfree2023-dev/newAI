"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, Github, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Integrate with POST /api/auth/login
        try {
            const res = await fetch("http://34.16.148.154:3001/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.accessToken);
                window.location.href = "/templates";
            } else {
                alert(data.message || "Login failed");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
            {/* Mesh Gradient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
                        {language === "ar" ? "مرحباً بعودتك" : "Welcome Back"}
                    </h1>
                    <p className="text-muted-foreground">
                        {language === "ar" ? "أدخل بياناتك للوصول إلى لوحة التحكم" : "Enter your credentials to access your realm"}
                    </p>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-2 group">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-primary transition-colors">
                                {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40" />
                                <Input
                                    type="email"
                                    required
                                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:bg-white/10 transition-all text-white"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-primary transition-colors">
                                    {language === "ar" ? "كلمة المرور" : "Password"}
                                </label>
                                <a href="#" className="text-xs font-bold text-primary hover:underline">
                                    {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                                </a>
                            </div>
                            <Input
                                type="password"
                                required
                                className="h-14 bg-white/5 border-white/10 rounded-2xl focus:bg-white/10 transition-all text-white"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            variant="premium"
                        >
                            {loading ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                    <ShieldCheck className="w-6 h-6" />
                                </motion.div>
                            ) : (
                                <>
                                    {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 relative z-10">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#020617] px-4 text-muted-foreground font-black">
                                    {language === "ar" ? "أو المتابعة عبر" : "Or continue with"}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="ghost" className="h-12 rounded-xl bg-white/5 border-white/5 hover:bg-white/10">
                                <Github className="mr-2 w-5 h-5" />
                                GitHub
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-xl bg-white/5 border-white/5 hover:bg-white/10">
                                <Mail className="mr-2 w-5 h-5" />
                                Google
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-muted-foreground">
                    {language === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                    <a href="/auth/signup" className="text-primary font-black hover:underline hover:text-primary/80 transition-all">
                        {language === "ar" ? "ابدأ رحلتك الآن" : "Create Account"}
                    </a>
                </p>
            </motion.div>
        </div>
    );
}
