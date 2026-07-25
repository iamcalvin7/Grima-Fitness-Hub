import React from 'react';

export const Logo = ({ className = "w-32" }: { className?: string }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-6">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Marcus Grima logo"
          className="w-24 relative z-10 object-contain"
        />
      </div>
      <div className="text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-[0.2em] mb-1">MARCUS GRIMA</h1>
      </div>
    </div>
  );
};
