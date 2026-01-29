import React, { useRef, useState } from "react"
import { motion } from "framer-motion"

export const TiltContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [rotate, setRotate] = useState({ x: 0, y: 0 })

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const xPct = mouseX / width - 0.5
        const yPct = mouseY / height - 0.5
        setRotate({ x: yPct * -20, y: xPct * 20 })
    }

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 })
    }

    return (
        <motion.div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ rotateX: rotate.x, rotateY: rotate.y }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ transformStyle: "preserve-3d" }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
