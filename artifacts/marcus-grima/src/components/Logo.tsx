import React from 'react';

export const Logo = ({ className = "w-32", glow = false }: { className?: string, glow?: boolean }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-6">
        {glow && (
          <div className="absolute inset-0 blur-xl opacity-40 bg-gradient-to-tr from-primary to-foreground scale-150 mix-blend-screen animate-pulse" />
        )}
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-24 h-24 relative z-10"
        >
          <defs>
            <linearGradient id="silver-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0E0E0" />
              <stop offset="40%" stopColor="#C0C0C0" />
              <stop offset="60%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#808080" />
            </linearGradient>
          </defs>
          <path 
            d="M 20,80 L 20,20 L 40,50 L 60,20 L 60,50 L 50,65 L 60,80 L 40,80 L 40,65 L 30,80 Z" 
            fill="url(#silver-gradient)" 
          />
          <path 
            d="M 85,35 L 75,20 L 55,50 L 75,80 L 85,65 L 70,65 L 65,50 Z" 
            fill="url(#silver-gradient)" 
          />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-[0.2em] mb-1">MARCUS GRIMA</h1>
        <div className="relative inline-block">
          <h2 className="text-foreground text-sm font-semibold tracking-[0.3em] uppercase">Personal Trainer</h2>
          {glow && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary" />
          )}
        </div>
      </div>
    </div>
  );
};
