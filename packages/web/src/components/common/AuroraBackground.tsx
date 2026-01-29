


export const AuroraBackground = () => {
    return (
        <div className="absolute inset-0 -z-10 bg-background-light dark:bg-background-dark overflow-hidden">
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 animate-aurora opacity-30 blur-3xl pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, #2563EB 0%, #06B6D4 50%, #2563EB 100%)`,
                        backgroundSize: '400% 400%'
                    }}
                ></div>
            </div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")` }}
            />
        </div>
    )
}
