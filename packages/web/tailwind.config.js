/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563EB',
                    500: '#2563EB',
                },
                secondary: {
                    DEFAULT: '#06B6D4',
                    500: '#06B6D4',
                },
                background: {
                    light: '#F9FAFB',
                    dark: '#0F172A',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                arabic: ['Cairo', 'sans-serif'],
            },
            animation: {
                'aurora': 'aurora 60s linear infinite',
                'border-beam': 'border-beam var(--duration) infinite linear',
            },
            keyframes: {
                aurora: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                'border-beam': {
                    '100%': {
                        'offset-distance': '100%',
                    },
                },
            },
        },
    },
    plugins: [],
}

