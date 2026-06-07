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

export async function submitAnalysis(
  token: string,
  file: Blob,
  turnstileToken: string,
  ageRange?: string,
  primaryConcern?: string
): Promise<AnalysisOut> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("turnstile_token", turnstileToken);
  if (ageRange) formData.append("age_range", ageRange);
  if (primaryConcern) formData.append("primary_concern", primaryConcern);

  const res = await fetch(`${API_BASE}/analyze/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json: Envelope<AnalysisOut> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "Analysis failed");
  }

  return json.data;
}
