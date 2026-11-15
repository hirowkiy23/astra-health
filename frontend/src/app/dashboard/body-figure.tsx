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
    <g fill="none" stroke={bone} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Skull */}
      <ellipse cx="160" cy="52" rx="30" ry="36" />
      {/* Jaw */}
      <path d="M140 66 Q160 84 180 66" />
      {/* Eye sockets */}
      <circle cx="149" cy="48" r="5" />
      <circle cx="171" cy="48" r="5" />
      {/* Spine */}
      <path d="M160 90 L160 350" />
      {/* Ribcage */}
      <path d="M136 128 Q160 176 184 128" />
      <path d="M134 156 Q160 204 186 156" />
      <path d="M136 184 Q160 228 184 184" />
      {/* Collarbones */}
      <path d="M160 118 L124 126" />
      <path d="M160 118 L196 126" />
      {/* Shoulder blades hint */}
      <path d="M160 118 L128 150" />
      <path d="M160 118 L192 150" />
      {/* Left arm */}
      <path d="M124 126 L94 208 L88 298" />
      {/* Right arm */}
      <path d="M196 126 L226 208 L232 298" />
      {/* Hands */}
      <path d="M88 298 L84 314 M88 298 L94 314 M88 298 L88 316" />
      <path d="M232 298 L228 314 M232 298 L238 314 M232 298 L232 316" />
      {/* Pelvis */}
      <path d="M124 350 Q160 384 196 350" />
      <path d="M136 356 Q160 396 184 356" />
      {/* Left leg */}
      <path d="M136 356 L130 500 L122 612" />
      {/* Right leg */}
      <path d="M184 356 L190 500 L198 612" />
      {/* Feet */}
      <path d="M122 612 L112 620 L118 620 Z" />
      <path d="M198 612 L202 620 L208 620 Z" />
      {/* Joints */}
      <g fill={joint}>
        <circle cx="124" cy="126" r="5" />
        <circle cx="196" cy="126" r="5" />
        <circle cx="94" cy="208" r="5" />
        <circle cx="226" cy="208" r="5" />
        <circle cx="88" cy="298" r="5" />
        <circle cx="232" cy="298" r="5" />
        <circle cx="136" cy="356" r="5" />
        <circle cx="184" cy="356" r="5" />
        <circle cx="130" cy="500" r="5" />
        <circle cx="190" cy="500" r="5" />
        <circle cx="122" cy="612" r="5" />
        <circle cx="198" cy="612" r="5" />
      </g>
    </g>
  );
}
