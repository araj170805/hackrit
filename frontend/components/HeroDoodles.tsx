import React from "react";

/**
 * Minimal line-art street scene + scattered civic doodles for the landing
 * hero background. Hand-drawn-style inline SVG (not a photo) so it stays
 * crisp, on-brand, and genuinely "civic issue" themed — a skyline, a
 * cracked road, a pothole, a leaning streetlight — rather than a stock photo.
 */
export function HeroSkyline() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 w-full h-[220px] sm:h-[280px] text-ink/[0.05]"
      viewBox="0 0 1200 280"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
    >
      {/* Skyline */}
      <path
        d="M0 180 h60 v-70 h50 v70 h40 v-110 h55 v110 h45 v-50 h60 v50 h50 v-140 h60 v140 h40 v-80 h55 v80 h50 v-100 h60 v100 h45 v-60 h55 v60 h50 v-130 h60 v130 h40 v-70 h55 v70 h60 V280 H0 Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Road */}
      <path d="M0 220 H1200" stroke="currentColor" strokeWidth="2" />
      {/* Pothole crack in the road */}
      <path
        d="M480 220 l14 -6 10 8 16 -10 12 12 18 -6 14 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="540" cy="224" rx="26" ry="7" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

interface DoodleProps {
  className?: string;
}

function ConeDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M24 8l10 30H14L24 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 30h16M18 24h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 38h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WrenchDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M32 10a8 8 0 00-10.6 9.4L10 30.8l4.2 4.2L25.6 23.6A8 8 0 0035 13l-6 6-4-4 6-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 42s13-13.5 13-23a13 13 0 10-26 0c0 9.5 13 23 13 23z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="19" r="4.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BulbDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 6a12 12 0 00-6 22.4V32h12v-3.6A12 12 0 0024 6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M19 37h10M20 42h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 12v8M18 20l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HeroFloatingDoodles() {
  return (
    <div className="absolute inset-0 -z-10 hidden sm:block" aria-hidden="true">
      <ConeDoodle className="absolute top-[14%] left-[8%] w-10 h-10 text-authority/[0.18] -rotate-6" />
      <WrenchDoodle className="absolute top-[22%] right-[10%] w-9 h-9 text-citizen/[0.2] rotate-12" />
      <PinDoodle className="absolute bottom-[30%] left-[14%] w-8 h-8 text-citizen/[0.18] rotate-3" />
      <BulbDoodle className="absolute top-[10%] right-[20%] w-8 h-8 text-authority/[0.16] -rotate-3" />
    </div>
  );
}
