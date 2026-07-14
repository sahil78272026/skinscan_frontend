import { AnalysisOut, Envelope } from "./types";

export interface UserProfile {
  email: string;
  display_name?: string;
  consent_analysis: boolean;
  subscription_tier: string;
  scans_used: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export async function loginWithEmail(
  email: string,
  turnstileToken: string,
  consentAnalysis: boolean,
  consentPhoto: boolean
): Promise<{ access_token: string }> {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("turnstile_token", turnstileToken);
  formData.append("consent_analysis", consentAnalysis.toString());
  formData.append("consent_photo", consentPhoto.toString());

  const res = await fetch(`${API_BASE}/auth/email`, {
    method: "POST",
    body: formData,
  });

  const json: Envelope<{ access_token: string }> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Login failed");
  }

  return json.data;
}

export async function loginWithGoogle(
  credential: string,
  consentAnalysis: boolean
): Promise<{ access_token: string }> {
  const formData = new FormData();
  formData.append("credential", credential);
  formData.append("consent_analysis", consentAnalysis.toString());

  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    body: formData,
  });

  const json: Envelope<{ access_token: string }> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Google Login failed");
  }

  return json.data;
}

export async function submitAnalysis(token: string | null, turnstileToken: string, photoBlob: Blob, consentPhoto: boolean): Promise<AnalysisOut> {
  const formData = new FormData();
  formData.append("file", photoBlob, "selfie.jpg");
  formData.append("turnstile_token", turnstileToken);
  formData.append("consent_photo", consentPhoto.toString());

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/analyze/`, {
    method: "POST",
    headers,
    body: formData,
  });

  const json: Envelope<AnalysisOut> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Analysis failed");
  }

  return json.data;
}

export async function claimAnalysis(jobId: string, email: string, consentAnalysis: boolean, consentPhoto: boolean): Promise<string> {
  const formData = new FormData();
  formData.append("job_id", jobId);
  formData.append("email", email);
  formData.append("consent_analysis", consentAnalysis.toString());
  formData.append("consent_photo", consentPhoto.toString());

  const res = await fetch(`${API_BASE}/analyze/claim`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to claim report");
  return json.data.access_token;
}

export async function claimAnalysisGoogle(jobId: string, credential: string, consentAnalysis: boolean, consentPhoto: boolean): Promise<string> {
  const formData = new FormData();
  formData.append("job_id", jobId);
  formData.append("credential", credential);
  formData.append("consent_analysis", consentAnalysis.toString());
  formData.append("consent_photo", consentPhoto.toString());

  const res = await fetch(`${API_BASE}/analyze/claim/google`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to claim report via Google");
  return json.data.access_token;
}

export async function getAnalysisHistory(token: string): Promise<AnalysisOut[]> {
  const res = await fetch(`${API_BASE}/analyze/history`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const json: Envelope<AnalysisOut[]> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Failed to load history");
  }
  return json.data;
}

export async function emailAnalysis(jobId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/analyze/${jobId}/email`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Failed to email report");
}

export async function getUserProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const json: Envelope<UserProfile> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Failed to load user profile");
  }
  return json.data;
}

export async function createPaymentOrder(planId: string): Promise<{ order_id: string; amount: number; currency: string; key_id: string }> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/payment/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ plan_id: planId })
  });
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Failed to create payment order");
  }
  return json.data;
}

export async function verifyPaymentOrder(data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; plan_id: string }): Promise<boolean> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/payment/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to verify payment");
  }
  return json.data;
}
