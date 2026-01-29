export const Footer = ({ isAr }: { isAr: boolean }) => {
    return (
        <footer className="bg-slate-50 dark:bg-slate-950/50 border-t border-gray-200 dark:border-white/5 py-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <div className="text-2xl font-black bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent mb-8">
                    APEX
                </div>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    {isAr ? 'الجيل القادم من منصات التجارة الإلكترونية المدعومة بالذكاء الاصطناعي' : 'The next generation of AI-powered e-commerce platforms'}
                </p>
                <div className="flex justify-center gap-8 mb-12 text-sm font-bold text-gray-400">
                    <a href="#" className="hover:text-primary-500 transition-colors">Privacy</a>
                    <a href="#" className="hover:text-primary-500 transition-colors">Terms</a>
                    <a href="#" className="hover:text-primary-500 transition-colors">Contact</a>
                </div>
                <div className="text-xs text-gray-500">
                    © {new Date().getFullYear()} APEX SaaS. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
