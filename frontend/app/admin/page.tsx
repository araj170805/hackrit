"use client";

import React, { useEffect, useState } from "react";
import {
  Shield, Activity, AlertTriangle, CheckCircle2, Users, MapPin,
  RefreshCw, Filter, Clock, Building, ChevronRight, Zap,
  TrendingUp, X, BarChart3, HelpCircle, Maximize2, Minimize2,
  ListChecks, Map as MapIcon2, RotateCcw
} from "lucide-react";
import { getDashboardStats, getComplaints, updateComplaintStatus, simulateSlaBreach, getAreaAnalytics, getRecurringIssues } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { getCurrentLocation } from "@/lib/geolocation";

const DEFAULT_LOCATION: [number, number] = [22.2505, 84.9011];

// ── Helpers ──────────────────────────────────────────────────────────────────
const IMPACT_BAR = (score: number) =>
  score >= 70 ? "bg-rose-500" : score >= 50 ? "bg-orange-500" : score >= 30 ? "bg-amber-500" : "bg-emerald-500";

const DEPT_COLOR: Record<string, string> = {
  "Road Maintenance Department": "from-orange-500 to-amber-500",
  "Municipal Sanitation Department": "from-emerald-500 to-teal-500",
  "Electrical Infrastructure Division": "from-yellow-500 to-amber-400",
  "Water & Sewerage Board": "from-blue-500 to-cyan-500"
};

function DEPT_ICON(dept: string) {
  if (/road|maintenance/i.test(dept)) return "🛣️";
  if (/sanitation|garbage/i.test(dept)) return "🗑️";
  if (/electrical|light/i.test(dept)) return "💡";
  if (/water|sewerage/i.test(dept)) return "💧";
  return "🏛️";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals & state
  const [editingComplaint, setEditingComplaint] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newDept, setNewDept] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionType, setActionType] = useState<"info" | "success" | "error">("info");
  const [priorityPopup, setPriorityPopup] = useState<string | null>(null); // complaintId

  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Screens: each authority "problem" lives on its own screen, fetched only
  // when opened.
  const [screen, setScreen] = useState<"queue" | "analytics" | "recurring">("queue");
  const [areaStats, setAreaStats] = useState<any[] | null>(null);
  const [areaLoading, setAreaLoading] = useState(false);
  const [recurringIssues, setRecurringIssues] = useState<any[] | null>(null);
  const [recurringLoading, setRecurringLoading] = useState(false);

  useEffect(() => {
    if (screen === "analytics" && areaStats === null) {
      setAreaLoading(true);
      getAreaAnalytics()
        .then((res) => setAreaStats(res.areas || []))
        .catch(() => setAreaStats([]))
        .finally(() => setAreaLoading(false));
    }
    if (screen === "recurring" && recurringIssues === null) {
      setRecurringLoading(true);
      getRecurringIssues()
        .then((res) => setRecurringIssues(res || []))
        .catch(() => setRecurringIssues([]))
        .finally(() => setRecurringLoading(false));
    }
  }, [screen, areaStats, recurringIssues]);

  useEffect(() => {
    getCurrentLocation()
      .then((loc) => setUserLocation([loc.latitude, loc.longitude]))
      .catch(() => setUserLocation(DEFAULT_LOCATION));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login/authority");
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sData, cData] = await Promise.all([
        getDashboardStats(),
        getComplaints({
          category: selectedCategory,
          priority: selectedPriority,
          status: selectedStatus
        })
      ]);
      setStats(sData);
      setComplaints(cData);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (user) {
      loadDashboardData(); 
    }
  }, [selectedCategory, selectedPriority, selectedStatus, user]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
      </div>
    );
  }

  const handleSimulateBreach = async (complaintId: string) => {
    setActionType("info");
    setActionMessage(`⏳ Simulating SLA breach for ${complaintId}…`);
    try {
      await simulateSlaBreach(complaintId);
      setActionType("success");
      setActionMessage(`🚨 SLA breach triggered! Case ${complaintId} escalated to CRITICAL priority and notification dispatched.`);
      await loadDashboardData();
    } catch (err: any) {
      setActionType("error");
      setActionMessage(`Failed: ${err.message}`);
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComplaint) return;
    try {
      await updateComplaintStatus(editingComplaint.complaintId, newStatus, newDept);
      setEditingComplaint(null);
      setActionType("success");
      setActionMessage(`✅ Case ${editingComplaint.complaintId} updated to ${newStatus.toUpperCase()}.`);
      await loadDashboardData();
    } catch (err: any) {
      setActionType("error");
      setActionMessage(`Update failed: ${err.message}`);
    }
  };

  const mapMarkers = complaints.map(c => ({
    id: c.complaintId,
    latitude: c.location?.latitude ?? DEFAULT_LOCATION[0],
    longitude: c.location?.longitude ?? DEFAULT_LOCATION[1],
    title: `${c.complaintId}: ${c.category?.replace("_", " ")}`,
    category: c.category,
    priority: c.priority,
    status: c.status,
    impactRadius: c.impactRadius || (c.duplicateCount > 0 ? 3000 + (c.duplicateCount * 500) : 1500),
    summary: c.summary,
    imageUrl: c.imageUrl
  }));

  const deptBreakdown = stats?.departmentBreakdown
    ? Object.entries(stats.departmentBreakdown as Record<string, any>)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Shield className="w-4 h-4" />
            Civic Authority Command Center
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Municipal Operations Dashboard
          </h1>
        </div>
        <button
          onClick={loadDashboardData}
          id="admin-refresh-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? "animate-spin" : ""}`} />
          Refresh Live Stream
        </button>
      </div>

      {/* Screen tabs — each authority "problem" is its own screen */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
        {[
          { key: "queue" as const, label: "Priority Queue", icon: ListChecks },
          { key: "analytics" as const, label: "Area Analytics", icon: BarChart3 },
          { key: "recurring" as const, label: "Recurring Issues", icon: RotateCcw }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setScreen(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              screen === tab.key
                ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action Banner */}
      {actionMessage && (
        <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between border ${
          actionType === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            : actionType === "error"
            ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
            : "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300"
        }`}>
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage("")}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {screen === "queue" && (
      <>
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Active Cases", value: stats?.activeCases ?? 0, icon: <Activity className="w-4 h-4 text-blue-500" />, color: "text-slate-900 dark:text-white" },
          { label: "High Priority", value: stats?.highPriority ?? 0, icon: <AlertTriangle className="w-4 h-4 text-orange-500" />, color: "text-orange-600 dark:text-orange-400" },
          { label: "SLA Breached", value: stats?.slaBreached ?? 0, icon: <Clock className="w-4 h-4 text-red-500" />, color: "text-red-600 dark:text-red-400 animate-pulse" },
          { label: "Resolved", value: stats?.resolved ?? 0, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Citizens Affected", value: stats?.citizensAffected ?? 0, icon: <Users className="w-4 h-4 text-indigo-500" />, color: "text-indigo-600 dark:text-indigo-400" }
        ].map((kpi, i) => (
          <div key={i} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              {kpi.label}
              {kpi.icon}
            </div>
            <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Department Breakdown Cards */}
      {deptBreakdown.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-500" />
            Department Workload Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {deptBreakdown.map(([dept, ds]: [string, any]) => {
              const resolvedPct = ds.total > 0 ? Math.round((ds.resolved / ds.total) * 100) : 0;
              return (
                <div key={dept} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className={`h-1.5 bg-gradient-to-r ${DEPT_COLOR[dept] || "from-slate-400 to-slate-500"}`} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{DEPT_ICON(dept)}</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{dept}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white">{ds.total}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-amber-600">{ds.active}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Active</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-rose-600">{ds.slaBreached}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Breached</p>
                      </div>
                    </div>
                    {/* Resolution progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Resolution Rate</span>
                        <span className="font-bold text-emerald-600">{resolvedPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${resolvedPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GIS Map */}
      {isMapExpanded ? (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
          <div className="p-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 text-white shadow-xl">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Live Civic Issues Map
              </h2>
              <p className="text-xs text-slate-400 mt-1">{mapMarkers.length} complaints plotted globally</p>
            </div>
            <button 
              onClick={() => setIsMapExpanded(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 w-full relative">
            <LeafletMap center={userLocation || DEFAULT_LOCATION} zoom={13} markers={mapMarkers} height="100%" userLocation={userLocation} />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Live Civic Issues GIS Map
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{mapMarkers.length} plotted</span>
              <button 
                onClick={() => setIsMapExpanded(true)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-[400px]">
            <LeafletMap center={userLocation || DEFAULT_LOCATION} zoom={13} markers={mapMarkers} height="100%" userLocation={userLocation} />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Filter className="w-4 h-4" />
          Filters:
        </div>
        {[
          { value: selectedCategory, setter: setSelectedCategory, options: [["all","All Categories"],["pothole","Potholes"],["garbage","Garbage"],["broken_streetlight","Broken Streetlights"],["water_leakage","Water Leakage"]] },
          { value: selectedPriority, setter: setSelectedPriority, options: [["all","All Priorities"],["CRITICAL","CRITICAL"],["HIGH","HIGH"],["MEDIUM","MEDIUM"],["LOW","LOW"]] },
          { value: selectedStatus, setter: setSelectedStatus, options: [["all","All Statuses"],["submitted","Submitted"],["in_progress","In Progress"],["escalated","Escalated"],["resolved","Resolved"]] }
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.setter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
            {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        ))}
      </div>

      {/* Priority Reason Popup */}
      {priorityPopup && (() => {
        const c = complaints.find(x => x.complaintId === priorityPopup);
        if (!c) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPriorityPopup(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  Why {c.priority} Priority?
                </h3>
                <button onClick={() => setPriorityPopup(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <p className="text-xs text-slate-500">Case: <span className="font-mono font-bold text-blue-600">{c.complaintId}</span> — Score: <strong>{c.priorityScore}</strong></p>
              <div className="space-y-2">
                {(c.priorityReason || []).map((r: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{r}</span>
                  </div>
                ))}
                {(!c.priorityReason || c.priorityReason.length === 0) && (
                  <p className="text-xs text-slate-400">No detailed priority reasoning stored for this case.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Complaints Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Complaint Queue</h3>
          <span className="text-xs text-slate-500">{complaints.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="p-4">Case ID</th>
                <th className="p-4">Category</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Community Signal</th>
                <th className="p-4">Impact</th>
                <th className="p-4">Address</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No complaints matching current filters.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.complaintId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{c.complaintId}</span>
                      {c.duplicateCount > 0 && (
                        <span className="ml-1.5 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">
                          +{c.duplicateCount} dupes
                        </span>
                      )}
                    </td>
                    <td className="p-4 capitalize font-medium text-slate-700 dark:text-slate-300">
                      {c.category?.replace(/_/g, " ")}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={c.priority} />
                        <button
                          onClick={() => setPriorityPopup(c.complaintId)}
                          title="Why this priority?"
                          className="text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          c.communitySignal === "VERY_HIGH" ? "bg-rose-100 text-rose-800 border-rose-200" :
                          c.communitySignal === "HIGH" ? "bg-amber-100 text-amber-800 border-amber-200" :
                          c.communitySignal === "MEDIUM" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {c.communitySignal ? c.communitySignal.replace("_", " ") : "LOW"}
                        </span>
                        <span className="text-xs font-bold text-slate-700">👍 {c.communitySupportCount || 0}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {c.communityImpactScore !== undefined ? (
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${IMPACT_BAR(c.communityImpactScore)}`} style={{ width: `${c.communityImpactScore}%` }} />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 w-7 text-right">{c.communityImpactScore}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 max-w-[160px] truncate text-slate-600 dark:text-slate-400">{c.address || "Captured GPS"}</td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300 max-w-[140px] truncate">{c.department}</td>
                    <td className="p-4"><StatusBadge status={c.status} /></td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingComplaint(c); setNewStatus(c.status); setNewDept(c.department); }}
                          id={`update-${c.complaintId}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleSimulateBreach(c.complaintId)}
                          id={`breach-${c.complaintId}`}
                          title="Simulate instant SLA Breach & escalate to CRITICAL"
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800/60 transition-colors whitespace-nowrap"
                        >
                          ⚡ SLA Breach
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Status Modal */}
      {editingComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Update Case {editingComplaint.complaintId}</h3>
              <button onClick={() => setEditingComplaint(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p><span className="text-slate-500">Category:</span> <strong className="capitalize">{editingComplaint.category?.replace(/_/g," ")}</strong></p>
              <p><span className="text-slate-500">Current Priority:</span> <strong>{editingComplaint.priority}</strong></p>
              <p><span className="text-slate-500">Community Impact:</span> <strong>{editingComplaint.communityImpactScore ?? "—"}/100</strong></p>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm">
                  <option value="submitted">Submitted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department Override</label>
                <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm"
                  placeholder="Leave blank to keep current" />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingComplaint(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

      {screen === "analytics" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Area analytics</h3>
            <p className="text-xs text-slate-500 mt-1">Real issue counts by area, computed from open reports.</p>
          </div>
          {areaLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Loading area analytics&hellip;</div>
          ) : !areaStats || areaStats.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No area data available yet.</div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {areaStats.map((a: any) => {
                const max = Math.max(...areaStats.map((x: any) => x.total), 1);
                return (
                  <div key={a.area} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{a.area}</span>
                      <span className="text-xs text-slate-500 font-semibold">{a.total} open{a.criticalCount > 0 ? ` · ${a.criticalCount} critical` : ""}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(a.total / max) * 100}%` }} />
                    </div>
                    {a.byCategory && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {Object.entries(a.byCategory as Record<string, number>).map(([cat, count]) => (
                          <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                            {cat.replace(/_/g, " ")}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {screen === "recurring" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Recurring issues</h3>
            <p className="text-xs text-slate-500 mt-1">Problems that came back after being marked resolved.</p>
          </div>
          {recurringLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Loading recurring issues&hellip;</div>
          ) : !recurringIssues || recurringIssues.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No recurring issues detected yet.</div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {recurringIssues.map((c: any) => (
                <div key={c.complaintId} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">{c.category?.replace(/_/g, " ")} &mdash; {c.area || c.address}</div>
                    <div className="text-xs text-slate-500 mt-1">{c.complaintId} &middot; recurred {c.recurrenceCount}&times;{c.lastRecurrenceAt ? ` · last ${new Date(c.lastRecurrenceAt).toLocaleDateString()}` : ""}</div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                    {c.recurrenceCount >= 2 ? "High confidence" : "Recurring"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
