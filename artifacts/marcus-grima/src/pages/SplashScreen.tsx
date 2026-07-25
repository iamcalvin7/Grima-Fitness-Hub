import React, { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExit(true);
      setTimeout(onComplete, 800);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: exit ? 0 : 1, scale: exit ? 1.05 : 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <Logo className="w-64" />
      </motion.div>
    </div>
  );
};
