'use client';

import { motion } from 'framer-motion';

type Mood = 'happy' | 'neutral' | 'nervous' | 'sad' | 'cool' | 'sleeping' | 'surprised';
type Size = 'sm' | 'md' | 'lg';

interface BotCharacterProps {
  color: string;
  mood: Mood;
  size?: Size;
  animated?: boolean;
  className?: string;
}

const sizeMap: Record<Size, number> = {
  sm: 80,
  md: 140,
  lg: 220,
};

function Eyes({ mood, cx, cy, scale = 1 }: { mood: Mood; cx: number; cy: number; scale?: number }) {
  const s = scale;
  const leftX = cx - 14 * s;
  const rightX = cx + 14 * s;
  const eyeY = cy - 4 * s;

  switch (mood) {
    case 'sleeping':
      return (
        <>
          {/* Closed eyes - horizontal lines */}
          <line x1={leftX - 8 * s} y1={eyeY} x2={leftX + 8 * s} y2={eyeY} stroke="#0A0A0A" strokeWidth={2.5 * s} strokeLinecap="round" />
          <line x1={rightX - 8 * s} y1={eyeY} x2={rightX + 8 * s} y2={eyeY} stroke="#0A0A0A" strokeWidth={2.5 * s} strokeLinecap="round" />
          {/* ZZZ */}
          <text x={cx + 28 * s} y={eyeY - 16 * s} fill="#C8FF00" fontSize={10 * s} fontWeight="bold" fontFamily="var(--font-syne), sans-serif">Z</text>
          <text x={cx + 34 * s} y={eyeY - 26 * s} fill="#C8FF00" fontSize={8 * s} fontWeight="bold" fontFamily="var(--font-syne), sans-serif" opacity={0.7}>Z</text>
          <text x={cx + 39 * s} y={eyeY - 34 * s} fill="#C8FF00" fontSize={6 * s} fontWeight="bold" fontFamily="var(--font-syne), sans-serif" opacity={0.4}>Z</text>
        </>
      );
    case 'cool':
      return (
        <>
          {/* Sunglasses - horizontal lines with slight curve */}
          <rect x={leftX - 10 * s} y={eyeY - 5 * s} width={20 * s} height={10 * s} rx={3 * s} fill="#0A0A0A" />
          <rect x={rightX - 10 * s} y={eyeY - 5 * s} width={20 * s} height={10 * s} rx={3 * s} fill="#0A0A0A" />
          <line x1={leftX + 10 * s} y1={eyeY} x2={rightX - 10 * s} y2={eyeY} stroke="#0A0A0A" strokeWidth={2 * s} />
          {/* Glare */}
          <rect x={leftX - 6 * s} y={eyeY - 3 * s} width={4 * s} height={2 * s} rx={1 * s} fill="rgba(255,255,255,0.3)" />
          <rect x={rightX - 6 * s} y={eyeY - 3 * s} width={4 * s} height={2 * s} rx={1 * s} fill="rgba(255,255,255,0.3)" />
        </>
      );
    case 'surprised':
      return (
        <>
          {/* Wide eyes */}
          <circle cx={leftX} cy={eyeY} r={10 * s} fill="white" />
          <circle cx={rightX} cy={eyeY} r={10 * s} fill="white" />
          <circle cx={leftX} cy={eyeY} r={6 * s} fill="#0A0A0A" />
          <circle cx={rightX} cy={eyeY} r={6 * s} fill="#0A0A0A" />
          {/* Highlight */}
          <circle cx={leftX + 3 * s} cy={eyeY - 3 * s} r={2 * s} fill="white" />
          <circle cx={rightX + 3 * s} cy={eyeY - 3 * s} r={2 * s} fill="white" />
        </>
      );
    default: {
      // Normal eyes with pupils
      const pupilOffsetX = mood === 'nervous' ? 2 * s : 0;
      const pupilOffsetY = mood === 'nervous' ? 1 * s : 0;
      return (
        <>
          <circle cx={leftX} cy={eyeY} r={8 * s} fill="white" />
          <circle cx={rightX} cy={eyeY} r={8 * s} fill="white" />
          <circle cx={leftX + pupilOffsetX} cy={eyeY + pupilOffsetY} r={4.5 * s} fill="#0A0A0A" />
          <circle cx={rightX + pupilOffsetX} cy={eyeY + pupilOffsetY} r={4.5 * s} fill="#0A0A0A" />
          {/* Highlight */}
          <circle cx={leftX + 2 * s} cy={eyeY - 2 * s} r={1.8 * s} fill="white" />
          <circle cx={rightX + 2 * s} cy={eyeY - 2 * s} r={1.8 * s} fill="white" />
        </>
      );
    }
  }
}

function Mouth({ mood, cx, cy, scale = 1 }: { mood: Mood; cx: number; cy: number; scale?: number }) {
  const s = scale;
  const mouthY = cy + 14 * s;

  switch (mood) {
    case 'happy':
      return (
        <path
          d={`M ${cx - 12 * s} ${mouthY} Q ${cx} ${mouthY + 14 * s} ${cx + 12 * s} ${mouthY}`}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={2.5 * s}
          strokeLinecap="round"
        />
      );
    case 'sad':
      return (
        <path
          d={`M ${cx - 10 * s} ${mouthY + 6 * s} Q ${cx} ${mouthY - 8 * s} ${cx + 10 * s} ${mouthY + 6 * s}`}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={2.5 * s}
          strokeLinecap="round"
        />
      );
    case 'surprised':
      return (
        <ellipse cx={cx} cy={mouthY + 2 * s} rx={6 * s} ry={8 * s} fill="#0A0A0A" />
      );
    case 'nervous':
      return (
        <>
          <path
            d={`M ${cx - 10 * s} ${mouthY + 2 * s} L ${cx - 4 * s} ${mouthY - 2 * s} L ${cx + 2 * s} ${mouthY + 2 * s} L ${cx + 8 * s} ${mouthY - 2 * s}`}
            fill="none"
            stroke="#0A0A0A"
            strokeWidth={2 * s}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sweat drop */}
          <ellipse cx={cx + 26 * s} cy={cy - 8 * s} rx={3 * s} ry={4.5 * s} fill="rgba(100,200,255,0.7)" />
        </>
      );
    case 'cool':
      return (
        <path
          d={`M ${cx - 8 * s} ${mouthY} Q ${cx} ${mouthY + 8 * s} ${cx + 8 * s} ${mouthY}`}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={2.5 * s}
          strokeLinecap="round"
        />
      );
    case 'sleeping':
      return (
        <path
          d={`M ${cx - 6 * s} ${mouthY + 2 * s} Q ${cx} ${mouthY - 2 * s} ${cx + 6 * s} ${mouthY + 2 * s}`}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={2 * s}
          strokeLinecap="round"
        />
      );
    default:
      // neutral — straight line
      return (
        <line
          x1={cx - 8 * s}
          y1={mouthY + 2 * s}
          x2={cx + 8 * s}
          y2={mouthY + 2 * s}
          stroke="#0A0A0A"
          strokeWidth={2.5 * s}
          strokeLinecap="round"
        />
      );
  }
}

export function BotCharacter({ color, mood, size = 'md', animated = true, className = '' }: BotCharacterProps) {
  const dim = sizeMap[size];
  const cx = dim / 2;
  const cy = dim / 2;
  const scale = dim / 140; // normalize to md size

  // Organic blob path — amoeba-like shape
  const r = dim * 0.38;
  const blobPath = `
    M ${cx} ${cy - r}
    C ${cx + r * 0.8} ${cy - r * 0.9}, ${cx + r * 1.05} ${cy - r * 0.3}, ${cx + r * 0.95} ${cy + r * 0.1}
    C ${cx + r * 0.85} ${cy + r * 0.5}, ${cx + r * 1.0} ${cy + r * 0.85}, ${cx + r * 0.5} ${cy + r * 0.95}
    C ${cx + r * 0.1} ${cy + r * 1.05}, ${cx - r * 0.3} ${cy + r * 0.9}, ${cx - r * 0.6} ${cy + r * 0.7}
    C ${cx - r * 0.9} ${cy + r * 0.5}, ${cx - r * 1.05} ${cy + r * 0.15}, ${cx - r * 0.95} ${cy - r * 0.2}
    C ${cx - r * 0.85} ${cy - r * 0.55}, ${cx - r * 0.6} ${cy - r * 0.95}, ${cx} ${cy - r}
    Z
  `;

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      animate={animated ? { y: [0, -6, 0] } : {}}
      transition={animated ? { duration: 3, ease: 'easeInOut', repeat: Infinity } : {}}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse
          cx={cx}
          cy={dim - 8 * scale}
          rx={r * 0.7}
          ry={4 * scale}
          fill="rgba(0,0,0,0.3)"
        />
        {/* Body blob */}
        <path d={blobPath} fill={color} />
        {/* Subtle gradient overlay for depth */}
        <path
          d={blobPath}
          fill="url(#blobGradient)"
        />
        <defs>
          <radialGradient id="blobGradient" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </radialGradient>
        </defs>
        {/* Face */}
        <Eyes mood={mood} cx={cx} cy={cy} scale={scale} />
        <Mouth mood={mood} cx={cx} cy={cy} scale={scale} />
      </svg>
    </motion.div>
  );
}
