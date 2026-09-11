import { auth } from "@/lib/firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://hackrit.onrender.com";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  let token: string | null = null;
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch {
      console.warn("Could not get Firebase ID token");
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    throw error;
  }
}

export async function submitComplaint(payload: any) {
  return apiFetch("/api/complaints", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function uploadPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  
  let token: string | null = null;
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch {
      console.warn("Could not get Firebase token for upload");
    }
  }

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE_URL}/api/complaints/upload-photo`, {
    method: "POST",
    headers,
    body: formData
  });

  if (!response.ok) {
    throw new Error("Failed to upload photo");
  }

  return await response.json();
}

export async function getComplaints(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiFetch(`/api/complaints${params ? `?${params}` : ""}`);
}

export async function getComplaintDetails(id: string) {
  return apiFetch(`/api/complaints/${id}`);
}

export async function updateComplaintStatus(id: string, status: string, department?: string) {
  return apiFetch(`/api/complaints/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, department })
  });
}

export async function requestVerification(id: string) {
  return apiFetch(`/api/complaints/${id}/request-verification`, { method: "POST" });
}

export async function submitResolutionEvidence(id: string, payload: {
  token: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
}) {
  return apiFetch(`/api/complaints/${id}/resolution-evidence`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getVerification(id: string) {
  return apiFetch(`/api/complaints/${id}/verification`);
}

export async function confirmResolution(id: string, action: "confirm" | "reject" | "request_new", note?: string) {
  return apiFetch(`/api/complaints/${id}/confirm-resolution`, {
    method: "POST",
    body: JSON.stringify({ action, note })
  });
}

export async function submitCitizenFeedback(id: string, fixed: boolean) {
  return apiFetch(`/api/complaints/${id}/citizen-feedback`, {
    method: "POST",
    body: JSON.stringify({ fixed })
  });
}

export async function getResourceRecommendation(id: string) {
  return apiFetch(`/api/complaints/${id}/resource-recommendation`);
}

export async function getAreaResourceRecommendation(area: string) {
  return apiFetch(`/api/authority/resource-recommendation?area=${encodeURIComponent(area)}`);
}

export async function getRecurringIssues() {
  return apiFetch("/api/authority/recurring-issues");
}

export async function getAreaAnalytics() {
  return apiFetch("/api/authority/area-analytics");
}

export async function askAssistant(message: string, latitude?: number, longitude?: number) {
  return apiFetch("/api/assistant/ask", {
    method: "POST",
    body: JSON.stringify({ message, latitude, longitude })
  });
}

export async function simulateSlaBreach(id: string) {
  return apiFetch(`/api/monitor/simulate-breach/${id}`, {
    method: "POST"
  });
}

export async function getDashboardStats() {
  return apiFetch("/api/dashboard/stats");
}

export async function triggerSlaMonitor() {
  return apiFetch("/api/monitor/sla", {
    method: "POST"
  });
}

export async function getNearbyCommunityIssues(lat: number, lon: number, radius = 50000) {
  return apiFetch(`/api/community/issues/nearby?latitude=${lat}&longitude=${lon}&radius=${radius}`);
}

export async function supportCommunityIssue(issueId: string) {
  return apiFetch(`/api/community/issues/${issueId}/support`, {
    method: "POST"
  });
}

export async function reportCommunityIssue(issueId: string, reason: string, description?: string) {
  return apiFetch(`/api/community/issues/${issueId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, description })
  });
}

export async function getCommunityReports() {
  return apiFetch("/api/community/reports");
}

export async function updateModerationStatus(issueId: string, action: string) {
  return apiFetch(`/api/community/issues/${issueId}/moderation`, {
    method: "PATCH",
    body: JSON.stringify({ action })
  });
}

export async function upvoteComplaint(issueId: string) {
  const res = await supportCommunityIssue(issueId);
  return {
    success: true,
    upvotes: res.communitySupportCount,
    communityImpactScore: res.finalPriorityScore,
    priority: res.priority
  };
}


