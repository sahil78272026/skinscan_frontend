import { AnalysisOut, Envelope } from "./types";

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

export async function submitAnalysis(token: string | null, turnstileToken: string, photoBlob: Blob): Promise<AnalysisOut> {
  const formData = new FormData();
  formData.append("file", photoBlob, "selfie.jpg");
  formData.append("turnstile_token", turnstileToken);

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
