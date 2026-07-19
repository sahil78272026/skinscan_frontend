/**
 * Lightweight, DPDP-compliant analytics tracker.
 * Uses sessionStorage to link events in a single continuous funnel 
 * without identifying the user or storing persistent cookies.
 */

const getSessionId = () => {
  if (typeof window === "undefined") return "server_render";
  
  let sessionId = sessionStorage.getItem("skinscan_analytics_session_id");
  if (!sessionId) {
    // Generate a random string for the session
    sessionId = `session_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    sessionStorage.setItem("skinscan_analytics_session_id", sessionId);
  }
  return sessionId;
};

export const trackEvent = (eventName: string, metadataPayload?: Record<string, unknown>) => {
  // Temporarily disabled analytics API calls
  return;
  if (typeof window === "undefined") return;

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
  const token = localStorage.getItem("auth_token");

  const payload = {
    session_id: getSessionId(),
    event_name: eventName,
    page_url: window.location.pathname,
    metadata_payload: metadataPayload || {}
  };

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Use sendBeacon if available for reliable background tracking (especially when tab closes),
  // otherwise fallback to fetch.
  if (navigator.sendBeacon) {
    // sendBeacon requires FormData or Blob/String
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(`${API_BASE}/analytics/track`, blob);
  } else {
    fetch(`${API_BASE}/analytics/track`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      // keepalive: true ensures the request finishes even if the user navigates away
      keepalive: true, 
    }).catch(err => {
      // Silently fail if tracker is blocked
      console.warn("Analytics blocked or failed", err);
    });
  }
};
