"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Brain,
  MapPin,
  Users,
  Building2,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Trash2,
  Waves,
} from "lucide-react";
import { HeroFloatingDoodles } from "@/components/HeroDoodles";

const WHAT_WE_DO = [
  {
    icon: Camera,
    title: "Report in seconds",
    desc: "A photo and a short description &mdash; no long forms. Your location is captured automatically.",
    accent: "citizen" as const,
  },
  {
    icon: Brain,
    title: "AI understands it",
    desc: "Category, severity, and department are worked out automatically, in any language you describe it in.",
    accent: "citizen" as const,
  },
  {
    icon: Users,
    title: "The community weighs in",
    desc: "Nearby citizens can support genuine issues, pushing real problems up the priority queue.",
    accent: "citizen" as const,
  },
  {
    icon: Building2,
    title: "Routed to the right desk",
    desc: "Every report reaches the correct department with a real urgency score &mdash; not just a queue.",
    accent: "authority" as const,
  },
  {
    icon: ShieldCheck,
    title: "Verified before it's closed",
    desc: "GPS, timestamp, and photo evidence are checked before an authority can confirm a fix.",
    accent: "authority" as const,
  },
  {
    icon: MapPin,
    title: "Nothing falls through",
    desc: "Recurring problems are flagged automatically, so the same pothole doesn't reappear unnoticed.",
    accent: "authority" as const,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-canvas text-ink font-sans">

      {/* Hero */}
      <section className="relative z-0 overflow-hidden min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-48 text-center bg-canvas">
        <div className="relative z-20 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          
          {/* Top Indicator Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-[12px] font-medium tracking-wide text-muted opacity-0 animate-fade-up" style={{ animationDelay: "0ms" }}>
            <span className="text-citizen text-[16px] leading-none">&bull;</span>
            CivicFix Platform
            <span className="text-citizen text-[16px] leading-none">&bull;</span>
          </div>

          {/* Huge Serif Title */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-[80px] font-medium tracking-tight leading-[1.05] text-ink mb-6 opacity-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
            Civic problems,<br/>
            <span className="text-citizen italic">solved every day.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted text-base sm:text-[17px] leading-relaxed max-w-lg mb-10 opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
            A lively and optimistic approach to civic reporting, combining AI dispatch with community verification.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 opacity-0 animate-fade-up bg-canvas/40 p-2 rounded-full backdrop-blur-md shadow-2xl shadow-canvas/50 border border-white/50" style={{ animationDelay: "300ms" }}>
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14.5px] font-medium text-white bg-ink hover:bg-ink/90 transition-all shadow-lg shadow-ink/20"
            >
              Get Started <span className="text-[16px] font-light">&rarr;</span>
            </Link>
            <Link
              href="/problems-around-you"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14.5px] font-medium text-ink bg-white hover:bg-slate-50 border border-line transition-all shadow-lg shadow-ink/5"
            >
              <Sparkles className="w-4 h-4 text-citizen" /> View Live City Map
            </Link>
          </div>
        </div>

        {/* Running Images Marquee */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-start overflow-hidden">
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-canvas to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-canvas to-transparent z-10 pointer-events-none"></div>
          
          {/* Infinite Marquee Track */}
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[0, 1, 2, 3].map((set) => (
              <div key={set} className="flex shrink-0 items-end gap-4 sm:gap-8 px-2 sm:px-4">
                <div className="relative w-56 h-40 sm:w-64 sm:h-48 rounded-t-[32px] overflow-hidden shadow-2xl shadow-ink/10 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
                  <Image src="/carousel_park.png" alt="Clean park" fill className="object-cover" />
                </div>
                <div className="relative w-64 h-48 sm:w-72 sm:h-56 rounded-t-[32px] overflow-hidden shadow-2xl shadow-ink/10 opacity-90 hover:opacity-100 transition-opacity cursor-pointer hidden md:block">
                  <Image src="/carousel_road.png" alt="Repaired road" fill className="object-cover" />
                </div>
                <div className="relative w-56 h-36 sm:w-64 sm:h-44 rounded-t-[32px] overflow-hidden shadow-2xl shadow-ink/10 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
                  <Image src="/carousel_lights.png" alt="Smart lighting" fill className="object-cover" />
                </div>
                <div className="relative w-72 h-56 sm:w-80 sm:h-64 rounded-t-[32px] overflow-hidden shadow-2xl shadow-ink/10 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
                  <Image src="/carousel_waste.png" alt="Waste management" fill className="object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight mb-3 text-ink">What we do</h2>
          <p className="text-muted text-[15px] max-w-2xl mx-auto">From a citizen's report to an authority's confirmed fix, we streamline the entire lifecycle of civic issues.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHAT_WE_DO.map((item, i) => (
            <div
              key={item.title}
              className="group bg-surface rounded-2xl p-7 opacity-0 animate-fade-up shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden"
              style={{ animationDelay: `${280 + i * 70}ms` }}
            >
              {/* Subtle hover gradient background */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 bg-gradient-to-br ${
                item.accent === "citizen" ? "from-citizen to-transparent" : "from-authority to-transparent"
              }`} />
              
              <div className="relative z-10">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm ${
                    item.accent === "citizen" ? "bg-citizen-soft text-citizen-ink" : "bg-authority-soft text-authority-ink"
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-ink text-[17px] mb-2">{item.title}</h3>
                <p className="text-[14px] text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why we matter */}
      <section className="bg-surface border-y border-line py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight mb-3 text-ink">Why we matter</h2>
            <p className="text-muted text-[15px] max-w-2xl mx-auto">The devastating ground realities that CivicFix is built to solve.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-canvas rounded-2xl p-7 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-[14.5px] text-muted leading-relaxed">
                <strong className="text-ink font-semibold">9,438 Indians died</strong> in pothole-related road accidents over five years&mdash;with deaths surging 53% from 2020 to 2024&mdash;yet existing civic complaint systems lack AI-powered duplicate detection, prioritization, and verification to prevent recurring deaths.
              </p>
            </div>

            <div className="group bg-canvas rounded-2xl p-7 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <p className="text-[14.5px] text-muted leading-relaxed">
                <strong className="text-ink font-semibold">India generates 1,85,000 tonnes</strong> of waste daily, but 40,000+ tonnes ends up in landfills unprocessed, causing health hazards for millions&mdash;while 93% "resolution rates" on government apps mask unresolved ground realities.
              </p>
            </div>

            <div className="group bg-canvas rounded-2xl p-7 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                <Waves className="w-6 h-6" />
              </div>
              <p className="text-[14.5px] text-muted leading-relaxed">
                <strong className="text-ink font-semibold">Urban flooding costs India $4 billion</strong> annually&mdash;projected to reach $5 billion by 2030&mdash;yet citizens have no way to validate, prioritize, or track drainage complaints, leaving chronic waterlogging unaddressed year after year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-24 pt-10 text-center">
        <div className="bg-ink text-canvas rounded-3xl p-12 sm:p-16 border border-line shadow-2xl">
          <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight mb-4">
            Ready to make your community stronger?
          </h2>
          <p className="text-muted text-[15px] max-w-md mx-auto mb-10">
            Whether you're reporting a problem or resolving one, CivicFix has a place for you.
          </p>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium text-ink bg-canvas hover:bg-white transition-colors shadow-sm"
          >
            Get Started <span className="text-[16px] font-light">&rarr;</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
