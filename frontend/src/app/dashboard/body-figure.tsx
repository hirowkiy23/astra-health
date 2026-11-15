'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Shared astronaut body figure: the default soft silhouette, revealing the
 * Figma skeleton image on hover.
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
    <div
      className={`relative ${className ?? ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label={ariaLabel}
        role="img"
      >
        {hovered ? null : <SilhouetteFigure />}
        {highlight && <circle cx="160" cy="240" r="34" fill="none" stroke="#70df92" strokeWidth="3" />}
        {children}
      </svg>

      {hovered && (
        <Image
          src="/skeleton.png"
          alt="Skeletal figure"
          width={447}
          height={915}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          priority
        />
      )}
    </div>
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
