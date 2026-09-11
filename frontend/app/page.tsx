"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  MapPin,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Mic,
  PenTool,
  Brain,
  Building2,
  Bell,
  ArrowRight,
  TrendingUp,
  Sliders,
  Layers,
  Map as MapIcon,
  BarChart3,
  Settings,
  ChevronRight,
  Sparkles
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [selectedMobileOption, setSelectedMobileOption] = useState<number | null>(0);

  return (
    <div className="relative overflow-hidden bg-white text-slate-900 font-sans">
      
      {/* 1. HERO SECTION (FULL SCREEN) */}
      <section className="relative min-h-[95vh] flex items-center pt-20 pb-20">
        
        {/* Full-screen Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_city_park.png"
            alt="CivicFix Eco-Friendly Smart City Park"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold tracking-wider uppercase shadow-2xs backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                AI-POWERED • GEO-AWARE • CITIZEN-DRIVEN
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-serif-title font-extrabold text-white tracking-tight leading-[1.05]">
                From civic complaint<br />
                to <span className="text-emerald-400">civic action.</span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                CivicFix uses AI to understand issues, prioritize what matters, and ensure faster resolution for stronger communities.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/report"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Camera className="w-4 h-4" />
                  Report a Problem
                </Link>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md shadow-2xs transition-all hover:border-white/30"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  View Live Map
                </Link>
              </div>



            </div>

            {/* Right Hero Badge (Floating) */}
            <div className="lg:col-span-5 hidden lg:flex justify-end pt-10 relative">
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-2xl flex flex-col gap-3 max-w-sm w-full transform hover:scale-105 transition-transform duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">AI Priority Dispatch</div>
                    <div className="text-xs text-slate-400 mt-0.5">Autonomous case classification & routing</div>
                  </div>
                </div>
                <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex items-center justify-between">
                   <div className="text-xs text-slate-300">System Status</div>
                   <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                     Active 24/7
                   </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* 4. PRODUCT SHOWCASE SECTION (Dashboard + Phone Overlay) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24" id="features">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-slate-900 leading-tight">
              Your city has it all, so we're making it <span className="text-emerald-600">easy to share it.</span>
            </h2>
            
            <p className="text-slate-600 text-base leading-relaxed">
              With CivicFix, you have all the tools to report issues, track progress, and stay informed. Simple interactions that make it easy for people to access essential civic services.
            </p>

            <div className="pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm"
              >
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Product Mockup Stack (Web Dashboard + Overlaid Mobile Phone) */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-3xl bg-slate-50 border border-slate-200 p-2 sm:p-4 shadow-2xl shadow-slate-200">
              
              {/* CivicFix Dashboard Mockup Container */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row h-[420px] sm:h-[460px]">
                
                {/* Dark Sidebar */}
                <div className="w-full md:w-48 bg-slate-900 text-slate-300 p-4 flex flex-col justify-between shrink-0">
                  <div>
                    <div className="font-extrabold text-white text-sm mb-6 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-white text-xs">
                        <MapPin className="w-3.5 h-3.5 fill-white text-emerald-500" />
                      </div>
                      <div>
                        <div>CivicFix</div>
                        <div className="text-[9px] font-normal text-slate-400">Dashboard</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {[
                        { label: "Overview", icon: Sliders },
                        { label: "Issues", icon: Layers },
                        { label: "Map", icon: MapIcon },
                        { label: "Reports", icon: FileText },
                        { label: "Analytics", icon: BarChart3 },
                        { label: "Settings", icon: Settings },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setActiveTab(item.label)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            activeTab === item.label
                              ? "bg-slate-800 text-white font-semibold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                          }`}
                        >
                          <item.icon className="w-3.5 h-3.5" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-4 border-t border-slate-800">
                    Authority Admin v2.4
                  </div>
                </div>

                {/* Main Dashboard Content View */}
                <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col bg-slate-50/50">
                  
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Issues</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-600">1,248</div>
                    </div>
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">In Progress</div>
                      <div className="text-base sm:text-lg font-bold text-blue-600">642</div>
                    </div>
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Resolved</div>
                      <div className="text-base sm:text-lg font-bold text-teal-600">532</div>
                    </div>
                    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">SLA Breached</div>
                      <div className="text-base sm:text-lg font-bold text-rose-600">74</div>
                    </div>
                  </div>

                  {/* Dashboard Map Graphic & Issue Categories */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1">
                    
                    {/* Simulated Map Graphic with Pin Markers */}
                    <div className="sm:col-span-8 bg-emerald-50/40 rounded-xl border border-emerald-100 relative overflow-hidden p-3 min-h-[160px] flex flex-col justify-between">
                      <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Live City Map</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>
                      
                      {/* Map Pins */}
                      <div className="absolute top-12 left-10 w-7 h-7 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg ring-4 ring-rose-500/20">
                        23
                      </div>
                      <div className="absolute top-8 right-12 w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-4 ring-emerald-600/20">
                        5
                      </div>
                      <div className="absolute bottom-10 left-24 w-6 h-6 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-4 ring-amber-500/20">
                        12
                      </div>
                      <div className="absolute bottom-14 right-20 w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-4 ring-emerald-600/20">
                        7
                      </div>
                      <div className="absolute bottom-4 right-8 w-6 h-6 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-4 ring-amber-500/20">
                        8
                      </div>
                    </div>

                    {/* Right Categories Breakdown */}
                    <div className="sm:col-span-4 bg-white p-3 rounded-xl border border-slate-200/80 text-[11px] space-y-2">
                      <div className="font-bold text-slate-800 text-xs">Top Categories</div>
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Potholes</span> <span className="font-bold">42%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-[42%] h-full bg-amber-500 rounded-full"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Garbage</span> <span className="font-bold">28%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-[28%] h-full bg-emerald-500 rounded-full"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Streetlight</span> <span className="font-bold">15%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-[15%] h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600 mb-0.5">
                            <span>Water Leak</span> <span className="font-bold">8%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-[8%] h-full bg-teal-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* OVERLAID MOBILE PHONE MOCKUP (Right side overlay) */}
              <div className="hidden sm:block absolute -right-6 -bottom-8 w-64 bg-slate-900 rounded-[38px] p-3 shadow-2xl shadow-emerald-950/40 border-4 border-slate-800 z-30 transform hover:-translate-y-2 transition-transform duration-300">
                
                {/* iPhone Screen Container */}
                <div className="bg-white rounded-[30px] p-4 text-slate-900 flex flex-col justify-between h-[390px] border border-slate-200 overflow-hidden relative">
                  
                  {/* Top Phone Header */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-3 px-1">
                      <span>13:30</span>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-1.5 bg-slate-800 rounded-xs"></span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">Report an issue</h3>
                    <p className="text-[11px] text-slate-500 mb-3">What's the problem?</p>

                    {/* Mobile Option Cards */}
                    <div className="space-y-2">
                      {[
                        { icon: Camera, title: "Take a Photo", desc: "Capture the issue", color: "text-emerald-600 bg-emerald-50" },
                        { icon: Mic, title: "Speak", desc: "Tell us what you see", color: "text-blue-600 bg-blue-50" },
                        { icon: PenTool, title: "Type", desc: "Describe the issue", color: "text-purple-600 bg-purple-50" },
                        { icon: MapPin, title: "Use My Location", desc: "Auto-detect location", color: "text-amber-600 bg-amber-50" },
                      ].map((opt, i) => (
                        <div
                          key={opt.title}
                          onClick={() => setSelectedMobileOption(i)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            selectedMobileOption === i
                              ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                              : "border-slate-100 hover:border-slate-200 bg-white"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${opt.color} flex items-center justify-center shrink-0`}>
                            <opt.icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-900 leading-none">{opt.title}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{opt.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Report Now Button */}
                  <Link
                    href="/report"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition-colors shadow-md shadow-emerald-600/20 block"
                  >
                    Report Now
                  </Link>

                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 5. "HOW IT WORKS" 6-STEP WORKFLOW SECTION */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20" id="how-it-works">
        <div className="bg-gradient-to-b from-emerald-50/40 to-emerald-50/80 rounded-[36px] py-16 px-6 sm:px-10 border border-emerald-100/80">
          
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-title font-bold text-slate-900 mt-4 mb-3">
              From Report to Resolution in 6 Smart Steps
            </h2>
            <p className="text-sm text-slate-600">
              AI-powered. People-driven. Impact-focused.
            </p>
          </div>

          {/* 6 Step Horizontal Process Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-xs border border-emerald-200">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">1. Report</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                Capture or describe the issue in seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-xs border border-emerald-200">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">2. AI Understands</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                AI analyzes the issue, category & severity.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-xs border border-emerald-200">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">3. Locate</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                We geo-tag and find the exact location.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-xs border border-emerald-200">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">4. Find & Merge</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                AI checks similar reports and merges duplicates.
              </p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-xs border border-emerald-200">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">5. Route & Prioritize</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                Sent to the right department with priority score.
              </p>
            </div>

            {/* Step 6 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-xs border border-emerald-200">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1.5">6. Monitor & Escalate</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                We track progress and escalate if needed.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* CTA FOOTER BANNER */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20 text-center">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-serif-title font-bold mb-4">
            Ready to make your community stronger?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto mb-8">
            Report local infrastructure issues in seconds and track real-time resolution powered by AI.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/report"
              className="px-8 py-3.5 rounded-full text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg hover:scale-105"
            >
              Report a Problem Now
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
