'use client';

import { useState } from 'react';

/**
 * Shared astronaut body figure: the default soft silhouette, revealing a
 * skeletal figure on hover. Height is proportioned more like a real person
 * (taller, ~7.5 head-heights) than the original compact model.
 */

const VIEW_W = 320;
const VIEW_H = 700;

interface BodyFigureProps {
  /** Highlight circle used on the physiological page. */
  highlight?: boolean;
  /** Extra content (e.g. scan region markers) rendered inside the SVG. */
  children?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export default function BodyFigure({ highlight, children, ariaLabel = 'Upright astronaut body model', className }: BodyFigureProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`h-auto w-full max-w-[320px] ${className ?? ''}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label={ariaLabel}
      role="img"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? <SkeletonFigure /> : <SilhouetteFigure />}
      {highlight && <circle cx="160" cy="240" r="34" fill="none" stroke="#70df92" strokeWidth="3" />}
      {children}
    </svg>
  );
}

function SilhouetteFigure() {
  // Taller, realistic proportions: head, neck, torso, arms, legs.
  return (
    <g fill="#d9d9d9" fillOpacity=".1">
      {/* Head */}
      <rect x="118" y="8" width="84" height="96" rx="38" />
      {/* Neck */}
      <rect x="140" y="104" width="40" height="26" rx="12" />
      {/* Torso */}
      <rect x="96" y="128" width="128" height="230" rx="24" />
      {/* Left arm */}
      <rect x="42" y="128" width="48" height="240" rx="22" />
      {/* Right arm */}
      <rect x="230" y="128" width="48" height="240" rx="22" />
      {/* Left leg */}
      <rect x="104" y="372" width="52" height="250" rx="22" />
      {/* Right leg */}
      <rect x="164" y="372" width="52" height="250" rx="22" />
      {/* Feet */}
      <rect x="100" y="622" width="60" height="22" rx="10" />
      <rect x="160" y="622" width="60" height="22" rx="10" />
    </g>
  );
}

function SkeletonFigure() {
  const bone = '#c8e6ee';
  const joint = '#e7b85f';
  return (
    <g fill="none" stroke={bone} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      {/* Skull */}
      <ellipse cx="160" cy="54" rx="34" ry="40" />
      {/* Spine + pelvis */}
      <path d="M160 96 L160 360" />
      {/* Ribcage */}
      <path d="M136 130 Q160 180 184 130" />
      <path d="M133 160 Q160 210 187 160" />
      <path d="M134 190 Q160 238 186 190" />
      {/* Shoulders */}
      <line x1="128" y1="128" x2="192" y2="128" />
      {/* Left arm */}
      <path d="M128 128 L96 210 L90 300" />
      {/* Right arm */}
      <path d="M192 128 L224 210 L230 300" />
      {/* Pelvis */}
      <path d="M126 360 Q160 392 194 360" />
      {/* Left leg */}
      <path d="M136 386 L130 500 L126 616" />
      {/* Right leg */}
      <path d="M184 386 L190 500 L194 616" />
      {/* Joints */}
      <g fill={joint}>
        <circle cx="128" cy="128" r="5" />
        <circle cx="192" cy="128" r="5" />
        <circle cx="96" cy="210" r="5" />
        <circle cx="224" cy="210" r="5" />
        <circle cx="90" cy="300" r="5" />
        <circle cx="230" cy="300" r="5" />
        <circle cx="160" cy="386" r="5" />
        <circle cx="136" cy="386" r="5" />
        <circle cx="184" cy="386" r="5" />
        <circle cx="130" cy="500" r="5" />
        <circle cx="190" cy="500" r="5" />
        <circle cx="126" cy="616" r="5" />
        <circle cx="194" cy="616" r="5" />
      </g>
    </g>
  );
}
