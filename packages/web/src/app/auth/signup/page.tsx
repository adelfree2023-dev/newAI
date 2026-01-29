"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, ArrowRight, ShieldCheck, Mail, User, Info } from "lucide-react";

export default function SignupPage() {
    const { language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Integrate with POST /api/auth/register
        try {
            const res = await fetch("http://34.16.148.154:3001/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                window.location.href = "/auth/login?registered=true";
            } else {
                alert(data.message || "Registration failed");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
            {/* Visual background elements */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-secondary/10 blur-[150px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full -z-10" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl grid md:grid-cols-2 gap-8 items-center"
            >
                <div className="hidden md:block space-y-8">
                    <div className="text-6xl font-black tracking-tighter text-white leading-none">
                        APEX <span className="text-primary italic">2026</span>
                    </div>
                    <div className="space-y-6">
                        {[
                            { icon: ShieldCheck, title: "Super Admin Root", desc: "Full access to the core engine" },
                            { icon: UserPlus, title: "Global Persistence", desc: "Data stored in the sovereign vault" },
                            { icon: Info, title: "Instant Access", desc: "Start building immediately" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex gap-4 items-start"
                            >
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <item.icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-white tracking-tight">
                            {language === "ar" ? "حساب جديد" : "Root Signup"}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {language === "ar" ? "أنشئ حسابك للوصول إلى المنصة" : "Initialize your administrative identity"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                                    {language === "ar" ? "الاسم الأول" : "First Name"}
                                </label>
                                <Input
                                    required
                                    className="h-12 bg-white/5 border-white/10 rounded-xl focus:bg-white/10 text-white"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                                    {language === "ar" ? "الكنية" : "Last Name"}
                                </label>
                                <Input
                                    required
                                    className="h-12 bg-white/5 border-white/10 rounded-xl focus:bg-white/10 text-white"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                                {language === "ar" ? "البريد الإلكتروني" : "Email"}
                            </label>
                            <Input
                                type="email"
                                required
                                className="h-12 bg-white/5 border-white/10 rounded-xl focus:bg-white/10 text-white"
                                placeholder="root@apex.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">
                                {language === "ar" ? "كلمة المرور" : "Password"}
                            </label>
                            <Input
                                type="password"
                                required
                                className="h-12 bg-white/5 border-white/10 rounded-xl focus:bg-white/10 text-white"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20"
                                variant="premium"
                            >
                                {loading ? "Initializing..." : (language === "ar" ? "إنشاء الحساب" : "Create Root Identity")}
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-muted-foreground">{language === "ar" ? "لديك حساب بالفعل؟" : "Already a member?"}</span>{" "}
                        <a href="/auth/login" className="text-primary font-black hover:underline">
                            {language === "ar" ? "تسجيل دخول" : "Log In"}
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
