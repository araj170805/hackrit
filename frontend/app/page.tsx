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
      <section className="relative z-0 overflow-hidden min-h-[75vh] flex items-center">
        <div className="absolute inset-0 -z-10 bg-ink">
          <Image
            src="/civic_hero_bg.png"
            alt="A city street and park, the kind of everyday civic space CivicFix helps keep in good repair"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/92 via-ink/55 to-ink/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        </div>
        <HeroFloatingDoodles />

        <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-xl mt-8">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[11px] font-bold uppercase tracking-wider text-citizen mb-6 opacity-0 animate-fade-up"
              style={{ animationDelay: "0ms" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-citizen animate-pulse" />
              Report it. Track it. Get it fixed.
            </div>

            <h1
              className="text-4xl sm:text-[50px] font-bold tracking-tight leading-[1.1] text-white mb-5 opacity-0 animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              Civic problems, <span className="text-citizen">solved</span> &mdash; not just reported.
            </h1>

            <p
              className="text-slate-200 text-[15.5px] leading-relaxed max-w-md mb-9 opacity-0 animate-fade-up"
              style={{ animationDelay: "150ms" }}
            >
              CivicFix routes every report to the right department, verifies it's actually resolved,
              and keeps the community in the loop &mdash; automatically.
            </p>

            <div className="opacity-0 animate-fade-up" style={{ animationDelay: "220ms" }}>
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-ink bg-citizen hover:opacity-90 transition-opacity shadow-lg shadow-citizen/20"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* Floating status card */}
          <div
            className="hidden lg:flex absolute right-4 sm:right-6 lg:right-8 bottom-10 items-center gap-4 bg-ink/70 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-xs opacity-0 animate-fade-up shadow-xl"
            style={{ animationDelay: "300ms" }}
          >
            <div className="w-10 h-10 rounded-xl bg-citizen/20 border border-citizen/30 flex items-center justify-center text-citizen shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">AI Priority Dispatch</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Autonomous case classification &amp; routing</div>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-ink">What we do</h2>
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

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <div className="bg-ink text-white rounded-3xl p-10 sm:p-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Ready to make your community stronger?
          </h2>
          <p className="text-slate-300 text-[14px] max-w-md mx-auto mb-8">
            Whether you're reporting a problem or resolving one, CivicFix has a place for you.
          </p>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-ink bg-white hover:bg-slate-100 transition-colors"
          >
            Get started
          </Link>
        </div>
      </section>

    </div>
  );
}
