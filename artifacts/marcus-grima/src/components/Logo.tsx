import React from 'react';

export const Logo = ({ className = "w-32", glow = false }: { className?: string, glow?: boolean }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-6">
        {glow && (
          <div className="absolute inset-0 blur-xl opacity-40 bg-gradient-to-tr from-primary to-foreground scale-150 mix-blend-screen animate-pulse" />
        )}
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Marcus Grima logo"
          className="w-24 relative z-10 object-contain"
        />
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
