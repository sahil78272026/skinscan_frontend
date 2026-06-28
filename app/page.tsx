"use client";

import { useState, useCallback, useEffect } from "react";
import LandingScreen from "./components/flow/LandingScreen";
import GuidedCaptureScreen from "./components/flow/GuidedCaptureScreen";
import PreviewScreen from "./components/flow/PreviewScreen";
import EmailGateScreen from "./components/flow/EmailGateScreen";
import ProcessingScreen from "./components/flow/ProcessingScreen";
import ReportScreen from "./components/flow/ReportScreen";
import { AnalysisOut } from "../lib/types";
import { getFaceLandmarkerVideo } from "../lib/mediapipe/faceMesh";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

export type FlowState = 
  | "landing" 
  | "capture" 
  | "preview" 
  | "email" 
  | "processing" 
  | "report";

export default function Home() {
  const [state, setState] = useState<FlowState>("landing");
  
  const [consentAnalysis, setConsentAnalysis] = useState(false);
  const [consentPhoto, setConsentPhoto] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisOut | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const resetFlow = () => {
    setState("landing");
    setConsentAnalysis(false);
    setConsentPhoto(false);
    setPhotoBlob(null);
    setAnalysisResult(null);
  };

  // Preload MediaPipe camera model silently in the background
  useEffect(() => {
    getFaceLandmarkerVideo().catch(err => console.error("MediaPipe video preload failed:", err));
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  }, []);

  const handleAnalysisError = useCallback((msg: string) => {
    showError(msg);
    setState("preview");
  }, [showError]);

  const handleAnalysisSuccess = useCallback((result: AnalysisOut) => {
    setAnalysisResult(result);
    setState("report");
  }, []);

  return (
    <main className="min-h-screen w-full overflow-x-hidden flex flex-col items-center relative">
      {state === "landing" && (
        <LandingScreen 
          consentAnalysis={consentAnalysis}
          setConsentAnalysis={setConsentAnalysis}
          consentPhoto={consentPhoto}
          setConsentPhoto={setConsentPhoto}
          onNext={() => setState("capture")}
        />
      )}
      
      {state === "capture" && (
        <GuidedCaptureScreen 
          onCapture={(blob) => {
            setPhotoBlob(blob);
            setState("preview");
          }}
          onBack={() => setState("landing")}
        />
      )}
      
      {state === "preview" && (
        <PreviewScreen 
          photoBlob={photoBlob}
          onRetake={() => {
            setPhotoBlob(null);
            setState("capture");
          }}
          onNext={() => {
            if (token) setState("processing");
            else setState("email");
          }}
        />
      )}
      
      {state === "email" && (
        <EmailGateScreen
          consentAnalysis={consentAnalysis}
          consentPhoto={consentPhoto}
          onSuccess={(newToken) => {
            setToken(newToken);
            setState("processing");
          }}
          onBack={() => setState("preview")}
        />
      )}
      
      {state === "processing" && (
        <ProcessingScreen
          token={token!}
          photoBlob={photoBlob!}
          onSuccess={handleAnalysisSuccess}
          onError={handleAnalysisError}
        />
      )}
      
      {state === "report" && (
        <ReportScreen
          analysisResult={analysisResult!}
          photoBlob={photoBlob!}
          onNewScan={resetFlow}
        />
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-50"
          >
            <div className="bg-red-900/90 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-xl flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Analysis Failed</p>
                <p className="text-red-200 text-xs mt-0.5">{errorToast}</p>
              </div>
              <button onClick={() => setErrorToast(null)} className="text-red-300 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
