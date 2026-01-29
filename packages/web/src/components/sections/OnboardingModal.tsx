import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Loader2 } from "lucide-react"

const Step1Schema = z.object({
    name: z.string().min(2, "Name required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Valid phone required")
})

const Step2Schema = z.object({
    domain: z.string().min(3, "Domain too short")
})

export const OnboardingModal = ({ isOpen, onClose, onComplete, isAr }: any) => {
    const [currentStep, setCurrentStep] = useState(1)
    const [checking, setChecking] = useState(false)

    const step1Form = useForm({
        resolver: zodResolver(Step1Schema),
        defaultValues: { name: "", email: "", phone: "" }
    })

    const step2Form = useForm({
        resolver: zodResolver(Step2Schema),
        defaultValues: { domain: "" }
    })

    const handleStep1Submit = () => setCurrentStep(2)

    const handleStep2Submit = async () => {
        setChecking(true)
        setTimeout(() => {
            // setIsDomainAvailable(Math.random() > 0.4) // This line was commented out in the original thought process, but the instruction was to remove the state, not just comment out its usage.
            setChecking(false)
            if (Math.random() > 0.4) setCurrentStep(3)
        }, 1500)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl rounded-3xl p-8 border-none bg-white dark:bg-slate-950 shadow-2xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black mb-4">
                        {currentStep === 1 && (isAr ? 'معلوماتك' : 'Your Identity')}
                        {currentStep === 2 && (isAr ? 'النطاق الخاص بك' : 'Domain Setup')}
                        {currentStep === 3 && (isAr ? 'نجاح' : 'Almost There')}
                    </DialogTitle>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{isAr ? 'الاسم الكامل' : 'Full Name'}</Label>
                                    <Input {...step1Form.register("name")} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                                    <Input {...step1Form.register("email")} type="email" className="h-12 rounded-xl" />
                                </div>
                                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl">
                                    {isAr ? 'متابعة' : 'Continue'}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{isAr ? 'اسم المتجر' : 'Store Domain'}</Label>
                                    <div className="flex gap-2">
                                        <Input {...step2Form.register("domain")} placeholder="mystore" className="h-12 rounded-xl" />
                                        <span className="self-center font-bold">.apex.com</span>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl" disabled={checking}>
                                    {checking ? <Loader2 className="animate-spin mr-2" /> : (isAr ? 'تحقق' : 'Check Availability')}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-6">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold">{isAr ? 'النطاق متاح!' : 'Domain is Available!'}</h3>
                            <Button onClick={() => onComplete({})} className="w-full h-14 text-lg font-bold rounded-2xl bg-secondary-500">
                                {isAr ? 'تأكيد وإنشاء المتجر' : 'Confirm & Create Store'}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    )
}
