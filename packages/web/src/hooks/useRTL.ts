import { useEffect } from 'react'

export const useRTL = (isAr: boolean) => {
    useEffect(() => {
        document.documentElement.dir = isAr ? 'rtl' : 'ltr'
        document.documentElement.lang = isAr ? 'ar' : 'en'

        // Add font classes to body
        if (isAr) {
            document.body.classList.add('font-arabic')
            document.body.classList.remove('font-sans')
        } else {
            document.body.classList.add('font-sans')
            document.body.classList.remove('font-arabic')
        }
    }, [isAr])
}
