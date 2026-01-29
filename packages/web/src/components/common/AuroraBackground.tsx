


export const AuroraBackground = () => {
    return (
        <div className="absolute inset-0 -z-10 bg-slate-950 overflow-hidden">
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 animate-aurora opacity-50 blur-[100px] pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 0% 0%, #2563EB 0%, transparent 50%), 
                                     radial-gradient(circle at 100% 100%, #06B6D4 0%, transparent 50%),
                                     radial-gradient(circle at 50% 50%, #1e293b 0%, transparent 100%)`,
                        backgroundSize: '200% 200%'
                    }}
                ></div>
            </div>

            {/* Overlay Gradient for richness */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")` }}
            />
        </div>
    )
}

