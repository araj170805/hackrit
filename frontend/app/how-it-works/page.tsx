"use client";

import React from "react";
import Link from "next/link";
import { Camera, Brain, Users, CheckCircle2, ArrowRight } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="bg-canvas text-ink min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-20 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-[12px] font-medium tracking-wide text-muted">
            <span className="text-citizen text-[16px] leading-none">&bull;</span>
            Process Overview
            <span className="text-citizen text-[16px] leading-none">&bull;</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-ink mb-6">
            From report to <span className="text-citizen italic">resolution.</span>
          </h1>
          <p className="text-muted text-[16px] sm:text-[18px] max-w-2xl mx-auto leading-relaxed">
            CivicFix streamlines the entire lifecycle of civic issues using a combination of citizen engagement and autonomous AI.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-surface p-8 sm:p-10 rounded-3xl shadow-sm border border-line animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-medium mb-3">1. AI-Powered Reporting</h3>
              <p className="text-muted leading-relaxed mb-4">
                A citizen spots a problem—like a pothole or a broken streetlight—and snaps a photo. CivicFix automatically captures the GPS coordinates. 
                Our autonomous AI agent immediately analyzes the image, determines the severity, categorizes the issue, and routes it to the correct civic department.
              </p>
              <div className="flex gap-4 text-[13px] font-medium text-ink bg-canvas px-4 py-3 rounded-xl border border-line w-fit">
                <span className="flex items-center gap-1.5"><Brain className="w-4 h-4 text-citizen" /> Auto-categorization</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-citizen" /> SLA attached</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-surface p-8 sm:p-10 rounded-3xl shadow-sm border border-line animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-medium mb-3">2. Community Impact Network</h3>
              <p className="text-muted leading-relaxed mb-4">
                Other citizens in a 50km radius can see the open issue on their Live City Map. They can verify the problem by upvoting it.
                As an issue gathers community support, its "Impact Score" rises, dynamically pushing it to the top of the authority's queue.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-surface p-8 sm:p-10 rounded-3xl shadow-sm border border-line animate-fade-up" style={{ animationDelay: "300ms" }}>
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-medium mb-3">3. Verification & Closure</h3>
              <p className="text-muted leading-relaxed mb-4">
                When the civic department fixes the problem, they must upload photographic proof of the resolution. 
                Our AI compares the "before" and "after" photos to verify the fix. Once verified, the issue is closed and the original reporter is notified.
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "400ms" }}>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[15px] font-medium text-white bg-ink hover:bg-ink/90 transition-all shadow-lg"
          >
            Join the Platform <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
