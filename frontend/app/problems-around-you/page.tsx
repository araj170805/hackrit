"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  MapPin, 
  ThumbsUp, 
  Flag, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  Search,
  Filter,
  Navigation,
  ExternalLink,
  X
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import { getNearbyCommunityIssues, supportCommunityIssue, reportCommunityIssue } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface CommunityIssue {
  complaintId: str;
  category: string;
  summary: string;
  description: string;
  address: string;
  imageUrl?: string;
  status: string;
  priority: string;
  priorityScore: number;
  finalPriorityScore: number;
  communitySupportCount: number;
  communitySignal: string;
  moderationStatus: string;
  createdAt: string;
  distanceKm: number;
  location: { latitude: number; longitude: number };
  hasVoted: boolean;
  hasReported: boolean;
  isOwnIssue: boolean;
}

const REPORT_REASONS = [
  { id: "does_not_exist", label: "Issue does not exist" },
  { id: "wrong_location", label: "Wrong location" },
  { id: "duplicate_issue", label: "Duplicate issue" },
  { id: "misleading_information", label: "Misleading information" },
  { id: "already_resolved", label: "Already resolved" },
  { id: "spam", label: "Spam / Irrelevant" },
  { id: "other", label: "Other reason" }
];

export default function ProblemsAroundYouPage() {
  const { user } = useAuth();
  
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<CommunityIssue[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  
  // Voting & Reporting state handling
  const [votingMap, setVotingMap] = useState<Record<string, boolean>>({});
  const [reportModalIssue, setReportModalIssue] = useState<CommunityIssue | null>(null);
  const [reportReason, setReportReason] = useState("does_not_exist");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Detect location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setLoading(true);
    setLocationDenied(false);

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });
          fetchNearby(lat, lon);
        },
        (error) => {
          console.warn("Location permission denied or unavailable:", error);
          setLocationDenied(true);
          // Default fallback (New Delhi coordinates if location denied)
          const fallbackLat = 28.6139;
          const fallbackLon = 77.2090;
          setCoords({ lat: fallbackLat, lon: fallbackLon });
          fetchNearby(fallbackLat, fallbackLon);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationDenied(true);
      setLoading(false);
    }
  };

  const fetchNearby = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const data = await getNearbyCommunityIssues(lat, lon, 50000);
      setIssues(data);
      
      const vMap: Record<string, boolean> = {};
      data.forEach((item: CommunityIssue) => {
        vMap[item.complaintId] = item.hasVoted;
      });
      setVotingMap(vMap);
    } catch (err) {
      console.error("Failed to fetch nearby community issues:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportToggle = async (issue: CommunityIssue) => {
    if (issue.isOwnIssue) return;
    
    const cid = issue.complaintId;
    const currentlyVoted = votingMap[cid];
    
    // Optimistic UI update
    setVotingMap(prev => ({ ...prev, [cid]: !currentlyVoted }));
    setIssues(prev => prev.map(item => {
      if (item.complaintId === cid) {
        const newCount = currentlyVoted ? Math.max(0, item.communitySupportCount - 1) : item.communitySupportCount + 1;
        return {
          ...item,
          communitySupportCount: newCount,
          hasVoted: !currentlyVoted
        };
      }
      return item;
    }));

    try {
      const res = await supportCommunityIssue(cid);
      setIssues(prev => prev.map(item => {
        if (item.complaintId === cid) {
          return {
            ...item,
            communitySupportCount: res.communitySupportCount,
            finalPriorityScore: res.finalPriorityScore,
            priority: res.priority,
            communitySignal: res.communitySignal,
            hasVoted: res.hasVoted
          };
        }
        return item;
      }));
    } catch (err) {
      console.error("Support action failed:", err);
      // Revert optimistic update on failure
      setVotingMap(prev => ({ ...prev, [cid]: currentlyVoted }));
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalIssue) return;

    try {
      setSubmittingReport(true);
      await reportCommunityIssue(reportModalIssue.complaintId, reportReason, reportDetails);
      setReportSuccess(true);
      
      setIssues(prev => prev.map(item => {
        if (item.complaintId === reportModalIssue.complaintId) {
          return { ...item, hasReported: true };
        }
        return item;
      }));

      setTimeout(() => {
        setReportModalIssue(null);
        setReportSuccess(false);
        setReportReason("does_not_exist");
        setReportDetails("");
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (selectedCategory !== "all" && issue.category !== selectedCategory) return false;
    if (selectedPriority !== "all" && issue.priority.toLowerCase() !== selectedPriority.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-4">
              <MapPin className="w-3.5 h-3.5" />
              <span>Real-Time 50 KM Community Network</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
              Problems Around <span className="text-emerald-400">You</span>
            </h1>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              You don&apos;t have to report civic problems alone. Support genuine issues near you to amplify the community signal and move critical resolutions up the Authority Command Center queue.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>Radius: <strong className="text-white">50 KM</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
                <span>Active Signals: <strong className="text-white">{issues.length} Issues</strong></span>
              </div>
              <button
                onClick={detectLocation}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-all shadow-md font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh GPS Location
              </button>
            </div>
          </div>
        </div>

        {/* Location Notice Warning */}
        {locationDenied && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Location Permission Denied or Unavailable</p>
              <p className="mt-0.5 text-amber-800">
                Showing civic issues within 50 KM of default coordinates. Grant browser geolocation access for precise local discovery.
              </p>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter Category:
            </span>
            {["all", "pothole", "garbage", "broken_streetlight", "water_leakage"].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "all" ? "All Categories" : cat.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Issues List Feed */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-semibold text-slate-600">Detecting citizen GPS location & querying MongoDB 50 KM radius...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No reported civic issues near you yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Be the first citizen in your 50 KM area to report a road defect, sanitation issue, or streetlight hazard!
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-full transition-all shadow-md shadow-emerald-600/20"
            >
              Report an Issue Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIssues.map((issue) => (
              <div 
                key={issue.complaintId}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                {/* Distance & Signal Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📍 {issue.distanceKm} km away</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Community Signal:</span>
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                      issue.communitySignal === "VERY_HIGH" ? "bg-rose-100 text-rose-800 border-rose-200" :
                      issue.communitySignal === "HIGH" ? "bg-amber-100 text-amber-800 border-amber-200" :
                      issue.communitySignal === "MEDIUM" ? "bg-blue-100 text-blue-800 border-blue-200" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {issue.communitySignal.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Optional Image */}
                {issue.imageUrl && (
                  <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                    <img 
                      src={issue.imageUrl} 
                      alt={issue.summary} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                        {issue.category.replace("_", " ")}
                      </span>
                      <StatusBadge status={issue.status} />
                    </div>

                    <h4 className="font-bold text-slate-900 text-base mb-2 line-clamp-2">
                      {issue.summary || issue.description}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-4">
                      {issue.description}
                    </p>

                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{issue.address || "Location specified by coordinates"}</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Support Vote Button */}
                    {issue.isOwnIssue ? (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                        You reported this issue
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSupportToggle(issue)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          issue.hasVoted
                            ? "bg-emerald-600 text-white shadow-emerald-600/20"
                            : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${issue.hasVoted ? "fill-white" : ""}`} />
                        <span>{issue.hasVoted ? "Supported" : "Support Issue"}</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">
                          👍 {issue.communitySupportCount}
                        </span>
                      </button>
                    )}

                    {/* Report / Flag button */}
                    <button
                      onClick={() => setReportModalIssue(issue)}
                      disabled={issue.hasReported}
                      className={`p-2 rounded-xl text-xs font-semibold transition-colors ${
                        issue.hasReported 
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      }`}
                      title={issue.hasReported ? "Already reported for review" : "Report / Flag this issue"}
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Moderation Report Modal */}
      {reportModalIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setReportModalIssue(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {reportSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Report Submitted</h3>
                <p className="text-xs text-slate-500 mt-1">Thank you. The authority moderation team will review this issue.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <div className="flex items-center gap-2 text-rose-600 mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-lg text-slate-900">Report / Flag Issue</h3>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Why are you reporting case <strong className="text-slate-800">{reportModalIssue.complaintId}</strong>?
                </p>

                <div className="space-y-2 mb-4">
                  {REPORT_REASONS.map(r => (
                    <label 
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        reportReason === r.id 
                          ? "border-rose-500 bg-rose-50/50 text-rose-950 font-bold" 
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="reportReason" 
                        value={r.id} 
                        checked={reportReason === r.id}
                        onChange={() => setReportReason(r.id)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Optional details or context..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 mb-5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  rows={3}
                ></textarea>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReportModalIssue(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                  >
                    {submittingReport ? "Submitting..." : "Submit Moderation Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
