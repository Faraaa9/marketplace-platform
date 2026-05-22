"use client";

import { motion } from "framer-motion";

interface HeroInfoCardProps {
  children: React.ReactNode;
}

export default function HeroInfoCard({ children }: HeroInfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-w-0 flex-1 rounded-4xl bg-white px-7 py-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:bg-surface-900"
    >
      {children}
    </motion.div>
  );
}
