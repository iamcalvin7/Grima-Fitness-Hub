import React, { useState } from 'react';
import { motion, useMotionValue, animate, useMotionValueEvent } from 'framer-motion';

const ITEM_H  = 52;
const VISIBLE = 5;
const H       = ITEM_H * VISIBLE; // 260 px

// translateY = (2 - idx) * ITEM_H centres that item in slot 2 (middle of 5)
const toY   = (idx: number) => (2 - idx) * ITEM_H;
const toIdx = (y: number, len: number) =>
  Math.max(0, Math.min(len - 1, Math.round(2 - y / ITEM_H)));

interface ScrollPickerProps {
  values:        string[];
  selectedIndex: number;
  onChange:      (index: number) => void;
}

export function ScrollPicker({ values, selectedIndex, onChange }: ScrollPickerProps) {
  const y      = useMotionValue(toY(selectedIndex));
  const [vis, setVis] = useState(selectedIndex);

  useMotionValueEvent(y, 'change', (val) => {
    const idx = toIdx(val, values.length);
    if (idx !== vis) setVis(idx);
  });

  const snap = () => {
    const idx = toIdx(y.get(), values.length);
    animate(y, toY(idx), { type: 'spring', stiffness: 360, damping: 36 });
    setVis(idx);
    onChange(idx);
  };

  return (
    <div className="relative select-none touch-none" style={{ height: H, overflow: 'hidden' }}>

      {/* Centre selection band */}
      <div className="absolute inset-x-0 z-10 pointer-events-none"
        style={{ top: ITEM_H * 2, height: ITEM_H }}>
        <div className="h-px bg-white/20" />
        <div className="absolute inset-0 bg-white/[0.05]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />
      </div>

      {/* Fade masks */}
      <div className="absolute inset-x-0 top-0 z-20 pointer-events-none h-28"
        style={{ background: 'linear-gradient(to bottom, #0A0A0A 15%, transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none h-28"
        style={{ background: 'linear-gradient(to top, #0A0A0A 15%, transparent)' }} />

      {/* Draggable list */}
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{ top: toY(values.length - 1), bottom: toY(0) }}
        dragElastic={0.12}
        onDragEnd={snap}
        className="cursor-grab active:cursor-grabbing"
      >
        {values.map((val, i) => {
          const dist    = Math.abs(i - vis);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.42 : 0.18;
          const scale   = dist === 0 ? 1 : dist === 1 ? 0.88 : 0.76;

          return (
            <div
              key={i}
              onClick={() => {
                animate(y, toY(i), { type: 'spring', stiffness: 360, damping: 36 });
                setVis(i);
                onChange(i);
              }}
              style={{
                height: ITEM_H,
                opacity,
                transform: `scale(${scale})`,
                transition: 'opacity 0.12s, transform 0.12s',
              }}
              className="flex items-center justify-center text-[26px] font-bold text-white"
            >
              {val}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
