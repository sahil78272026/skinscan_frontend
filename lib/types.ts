export interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, unknown>;
}

export interface ZoneObservation {
  observations: string[];
  severity: "mild" | "moderate" | "severe" | "none";
}

export interface ZoneBreakdown {
  forehead?: ZoneObservation;
  t_zone?: ZoneObservation;
  left_cheek?: ZoneObservation;
  right_cheek?: ZoneObservation;
  under_eye?: ZoneObservation;
  chin_jawline?: ZoneObservation;
}

export interface Routine {
  morning: string[];
  evening: string[];
}

export interface AnalysisResult {
  image_quality: string;
  skin_type?: string;
  skin_tone?: string;
  zones?: ZoneBreakdown;
  top_concerns: string[];
  focus_areas: string[];
  routine?: Routine;
  lifestyle_nudges: string[];
  encouragement_note?: string;
}

export interface AnalysisOut {
  id: string;
  created_at: string;
  skin_type?: string;
  skin_tone?: string;
  result_json: AnalysisResult;
  top_concerns: string[];
  photo_object_key?: string;
}
