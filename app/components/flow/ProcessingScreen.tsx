import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFaceLandmarker } from "../../../lib/mediapipe/faceMesh";
import { submitAnalysis } from "../../../lib/api-client";
import { useVisibility } from "../../hooks/useVisibility";
import { AnalysisOut } from "../../../lib/types";
import { Sparkles, Wand2, Star, Heart } from "lucide-react";

interface Props {
  token: string;
  photoBlob: Blob;
  onSuccess: (result: AnalysisOut) => void;
  onError: (msg: string) => void;
}

const STEPS = [
  "Consulting the skincare fairies...",
  "Sprinkling some magic dust...",
  "Brewing your perfect routine...",
  "Casting a glowing spell...",
  "Revealing your inner beauty..."
];

const TIPS = [
  "Did you know? Drinking water supports your skin's plump appearance.",
  "Fun fact: Your skin completely renews itself roughly every 28 days.",
  "Tip: Always apply SPF daily, even when you're just sitting by a window!",
  "Did you know? Stress can trigger breakouts by increasing sebum production.",
  "Tip: Silk pillowcases can help reduce friction on your skin and hair.",
  "Fun fact: Vitamin C boosts collagen production for a firmer, brighter look.",
  "Tip: Don't forget to extend your skincare down to your neck and chest!"
];

export default function ProcessingScreen({ token, photoBlob, onSuccess, onError }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  // Create a preview URL for the scanning animation
  const previewUrl = useMemo(() => URL.createObjectURL(photoBlob), [photoBlob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isVisible = useVisibility();

  // Pre-load MediaPipe in the background so ReportScreen is instant
  useEffect(() => {
    getFaceLandmarker().catch(err => console.error("MediaPipe preload failed:", err));
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 3000);
    
    const tipInterval = setInterval(() => {
      setTipIdx(i => (i + 1) % TIPS.length);
    }, 4500);
    
    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
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
      {/* Background magical glow */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-[400px] h-[400px] rounded-full bg-pink-500/20 blur-[100px]" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[300px] h-[300px] rounded-full bg-gold-400/20 blur-[80px]" 
        />
      </div>
      
      {/* Rotating Tips */}
      <div className="mb-10 h-12 flex items-center justify-center px-6 max-w-sm z-20">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.5 }}
            className="text-white/80 text-sm font-medium text-center leading-relaxed drop-shadow-md"
          >
            {TIPS[tipIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Animated container */}
      <div className="relative w-52 h-72 mb-10 z-20">
        
        {/* The Magic Wand orbiting the image */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 z-30 pointer-events-none"
        >
          {/* Wand is offset so it orbits outside the border */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ rotate: [-15, 15, -15] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-gold-400 drop-shadow-[0_0_15px_rgba(233,184,59,0.9)]"
            >
              <Wand2 size={40} />
            </motion.div>
            
            {/* Trailing sparkles */}
            <motion.div 
              animate={{ opacity: [1, 0], scale: [1, 0.3], y: [0, 30] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
              className="absolute top-8 left-4 text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
            >
              <Star size={16} fill="currentColor" />
            </motion.div>
            <motion.div 
              animate={{ opacity: [1, 0], scale: [1.2, 0.5], x: [0, -20], y: [0, 25] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
              className="absolute top-6 -left-2 text-gold-200 drop-shadow-[0_0_8px_rgba(253,230,138,0.8)]"
            >
              <Sparkles size={18} />
            </motion.div>
            <motion.div 
              animate={{ opacity: [1, 0], scale: [1, 0.2], x: [0, 15], y: [0, 20] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.7 }}
              className="absolute top-4 right-0 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            >
              <Heart size={12} fill="currentColor" />
            </motion.div>
          </div>
        </motion.div>

        {/* The photo itself with a magical border */}
        <div className="absolute inset-0 border-2 border-pink-300/40 rounded-[40px] overflow-hidden shadow-[0_0_40px_rgba(244,114,182,0.2)] bg-black">
          {/* Blurred selfie preview */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={previewUrl} 
            alt="Your selfie" 
            className="absolute inset-0 w-full h-full object-cover opacity-90 blur-[1px] transform scale-x-[-1]" 
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-pink-900/60 via-transparent to-gold-900/30 mix-blend-overlay" />
        </div>
      </div>
      
      {/* Step text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={stepIdx}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="text-pink-50 font-serif italic text-xl tracking-wide z-10 text-center px-8 drop-shadow-md"
        >
          {STEPS[stepIdx]}
        </motion.p>
      </AnimatePresence>

      {/* Magical Progress Bar */}
      <div className="w-56 h-1.5 bg-white/10 rounded-full mt-8 z-10 overflow-hidden relative shadow-[0_0_10px_rgba(244,114,182,0.2)]">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: ["0%", "85%", "96%"] }}
          transition={{ duration: 40, times: [0, 0.35, 1], ease: "easeOut" }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-400 to-gold-400"
        />
        {/* Leading edge sparkle */}
        <motion.div
          initial={{ left: "0%" }}
          animate={{ left: ["0%", "85%", "96%"] }}
          transition={{ duration: 40, times: [0, 0.35, 1], ease: "easeOut" }}
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full blur-[4px] mix-blend-overlay"
        />
      </div>
    </div>
  );
}
