import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitAnalysis } from "../../../lib/api-client";
import { useVisibility } from "../../hooks/useVisibility";
import { AnalysisOut } from "../../../lib/types";

interface Props {
  token: string;
  photoBlob: Blob;
  onSuccess: (result: AnalysisOut) => void;
  onError: (msg: string) => void;
}

const STEPS = [
  "Analyzing skin texture...",
  "Mapping facial zones...",
  "Detecting concern areas...",
  "Crafting your routine...",
  "Generating personalized report..."
];

export default function ProcessingScreen({ token, photoBlob, onSuccess, onError }: Props) {
  const [stepIdx, setStepIdx] = useState(0);

  // Create a preview URL for the scanning animation
  const previewUrl = useMemo(() => URL.createObjectURL(photoBlob), [photoBlob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isVisible = useVisibility();

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    
    submitAnalysis(token, photoBlob)
      .then(res => {
        onSuccess(res);
      })
      .catch(err => {
        onError(err.message);
        hasFired.current = false; // allow retry on error if needed
      });
  }, [token, photoBlob, onSuccess, onError]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-900 justify-center items-center overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[350px] h-[350px] rounded-full bg-terracotta-500/15 blur-[100px] animate-pulse"></div>
      </div>
      
      {/* Scanning animation with selfie preview */}
      <div className="relative w-52 h-72 border border-white/20 rounded-3xl overflow-hidden mb-8 shadow-[0_0_60px_rgba(233,184,59,0.08)]">
        {/* Disclaimer Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-6 px-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gold-400 font-bold mb-1">Heavy Image</p>
          <p className="text-[10px] text-white/80 leading-tight">Processing may take 10-15 seconds.</p>
        </div>

        {/* Blurred selfie preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={previewUrl} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px] transform scale-x-[-1]" 
        />

        {/* Scanning line */}
        <motion.div 
          animate={{ y: ["0%", "100%", "0%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent shadow-[0_0_20px_rgba(233,184,59,0.9)] z-10"
        />

        {/* Corner markers */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-gold-400/60 rounded-tl" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-gold-400/60 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-gold-400/60 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-gold-400/60 rounded-br" />
      </div>
      
      {/* Step text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={stepIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-white font-medium text-lg tracking-wide z-10 text-center px-8"
        >
          {STEPS[stepIdx]}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-2 mt-6 z-10">
        {STEPS.map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              i <= stepIdx ? 'bg-gold-400 w-3' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
