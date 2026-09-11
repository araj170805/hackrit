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
  ShieldAlert,
  Filter,
  Navigation,
  X,
  List,
  Map as MapIcon
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { getNearbyCommunityIssues, supportCommunityIssue, reportCommunityIssue } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface CommunityIssue {
  complaintId: string;
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
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
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-citizen-ink mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-citizen" />
              50 km community network
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Problems around you</h1>
            <p className="text-muted text-[13.5px] mt-1.5 max-w-xl leading-relaxed">
              Support genuine issues near you &mdash; it moves them up the priority queue.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Navigation className="w-3.5 h-3.5" />
              {issues.length} issues nearby
            </div>
            <button
              onClick={detectLocation}
              className="flex items-center gap-1.5 border border-line text-ink px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-surface transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh location
            </button>
          </div>
        </div>

        {/* Location Notice Warning */}
        {locationDenied && (
          <div className="mb-6 p-3.5 rounded-xl bg-med-soft border border-line text-[13px] flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-med shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Location permission denied or unavailable</p>
              <p className="mt-0.5 text-muted">Showing civic issues within 50 km of a default location.</p>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-surface rounded-xl border border-line p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted" />
            {["all", "pothole", "garbage", "broken_streetlight", "water_leakage"].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-citizen text-white"
                    : "bg-canvas text-muted hover:text-ink"
                }`}
              >
                {cat === "all" ? "All" : cat.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink focus:outline-none"
            >
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center bg-canvas rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                  viewMode === "list" ? "bg-surface text-citizen-ink shadow-sm" : "text-muted"
                }`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                  viewMode === "map" ? "bg-surface text-citizen-ink shadow-sm" : "text-muted"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
            </div>
          </div>
        </div>

        {/* Issues List / Map Feed */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-9 h-9 border-2 border-citizen border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[13px] font-medium text-muted">Finding issues within 50 km&hellip;</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-line p-12 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 bg-canvas rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">No civic issues found near you yet</h3>
            <p className="text-[13px] text-muted mb-6">
              Be the first to report a problem in your 50 km area.
            </p>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 bg-citizen text-white font-semibold text-[13px] px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Report an issue
            </Link>
          </div>
        ) : viewMode === "map" ? (
          <LeafletMap
            center={coords ? [coords.lat, coords.lon] : [28.6139, 77.209]}
            zoom={11}
            userLocation={coords ? [coords.lat, coords.lon] : null}
            height="560px"
            markers={filteredIssues.map((issue) => ({
              id: issue.complaintId,
              latitude: issue.location.latitude,
              longitude: issue.location.longitude,
              title: issue.summary || issue.description,
              category: issue.category,
              priority: issue.priority,
              status: issue.status,
              isMine: issue.isOwnIssue,
              summary: `${issue.distanceKm} km away · 👍 ${issue.communitySupportCount} supports`,
              imageUrl: issue.imageUrl
            }))}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredIssues.map((issue) => (
              <div
                key={issue.complaintId}
                className="bg-surface rounded-xl border border-line flex flex-col overflow-hidden"
              >
                {/* Distance & Signal Header */}
                <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-muted flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {issue.distanceKm} km away
                  </span>
                  <span className="text-[11px] font-semibold text-muted">
                    {issue.communitySignal.replace("_", " ")} signal
                  </span>
                </div>

                {/* Optional Image */}
                {issue.imageUrl && (
                  <div className="h-40 w-full bg-canvas relative overflow-hidden">
                    <img
                      src={issue.imageUrl}
                      alt={issue.summary}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-citizen-ink">
                        {issue.category.replace("_", " ")}
                      </span>
                      <StatusBadge status={issue.status} />
                    </div>

                    <h4 className="font-semibold text-ink text-[14.5px] mb-1.5 line-clamp-2">
                      {issue.summary || issue.description}
                    </h4>

                    <p className="text-[12.5px] text-muted line-clamp-2 mb-3">
                      {issue.description}
                    </p>

                    <div className="text-[12px] text-muted flex items-center gap-1 mb-3">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{issue.address || "Location specified by coordinates"}</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                    {issue.isOwnIssue ? (
                      <span className="text-[12px] font-semibold text-muted bg-canvas px-3 py-1.5 rounded-lg">
                        You reported this
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSupportToggle(issue)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                          issue.hasVoted
                            ? "bg-citizen text-white"
                            : "bg-canvas text-ink hover:bg-citizen-soft"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{issue.hasVoted ? "Supported" : "Support"}</span>
                        <span className="opacity-75">{issue.communitySupportCount}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setReportModalIssue(issue)}
                      disabled={issue.hasReported}
                      className={`p-2 rounded-lg text-xs transition-colors ${
                        issue.hasReported
                          ? "text-line cursor-not-allowed"
                          : "text-muted hover:text-crit hover:bg-crit-soft"
                      }`}
                      title={issue.hasReported ? "Already reported for review" : "Report / flag this issue"}
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
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 border border-line relative">
            <button
              onClick={() => setReportModalIssue(null)}
              className="absolute top-4 right-4 text-muted hover:text-ink p-1 rounded-full hover:bg-canvas"
            >
              <X className="w-5 h-5" />
            </button>

            {reportSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-citizen mx-auto mb-3" />
                <h3 className="text-base font-bold text-ink">Report submitted</h3>
                <p className="text-[12.5px] text-muted mt-1">The authority moderation team will review this issue.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <div className="flex items-center gap-2 text-crit mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-base text-ink">Report / flag issue</h3>
                </div>

                <p className="text-[12.5px] text-muted mb-4">
                  Why are you reporting case <strong className="text-ink">{reportModalIssue.complaintId}</strong>?
                </p>

                <div className="space-y-2 mb-4">
                  {REPORT_REASONS.map(r => (
                    <label
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-[12.5px] font-medium cursor-pointer transition-colors ${
                        reportReason === r.id
                          ? "border-crit bg-crit-soft text-ink font-semibold"
                          : "border-line text-ink hover:bg-canvas"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r.id}
                        checked={reportReason === r.id}
                        onChange={() => setReportReason(r.id)}
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Optional details or context..."
                  className="w-full bg-canvas border border-line rounded-xl p-3 text-[12.5px] text-ink mb-5 focus:outline-none"
                  rows={3}
                ></textarea>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReportModalIssue(null)}
                    className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-muted hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-5 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-crit hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submittingReport ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
