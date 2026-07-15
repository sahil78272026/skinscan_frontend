import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisOut, ZoneObservation } from "../../../lib/types";
import { getFaceLandmarker } from "../../../lib/mediapipe/faceMesh";
import { drawAnnotation } from "../../../lib/mediapipe/annotate";
import { Sparkles, Download, Share2, Sun, Moon, Droplets, Heart, X, ZoomIn, ExternalLink } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

interface Props {
  analysisResult: AnalysisOut;
  photoBlob?: Blob;
  onClose?: () => void;
  isReadOnly?: boolean;
  consentPhoto?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  forehead: "Forehead",
  t_zone: "T-Zone",
  left_cheek: "Left Cheek",
  right_cheek: "Right Cheek",
  under_eye: "Under Eye",
  chin_jawline: "Chin & Jawline",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  none:     { bg: "bg-green-50",       text: "text-green-700",      dot: "bg-green-400",      label: "Clear" },
  mild:     { bg: "bg-gold-50",        text: "text-gold-700",       dot: "bg-gold-400",        label: "Mild" },
  moderate: { bg: "bg-orange-50",      text: "text-orange-700",     dot: "bg-orange-400",      label: "Moderate" },
  severe:   { bg: "bg-terracotta-50",  text: "text-terracotta-700", dot: "bg-terracotta-500",  label: "Needs Attention" },
};


// ZoneCard component removed, replaced by inline Carousel

export default function ReportScreen({ analysisResult, photoBlob, onClose, isReadOnly, consentPhoto = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [annotatedUrl, setAnnotatedUrl] = useState<string>("");
  const [heatmapUrl, setHeatmapUrl] = useState<string>("");
  const [shareSupported, setShareSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoneCoords, setZoneCoords] = useState<Record<string, {x: number, y: number, w: number, h: number}>>({});
  
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setShareSupported(!!navigator.share);
  }, []);

  useEffect(() => {
    if (photoBlob) {
      const u = URL.createObjectURL(photoBlob);
      setPhotoUrl(u);
      return () => URL.revokeObjectURL(u);
    } else if (analysisResult.photo_url) {
      setPhotoUrl(analysisResult.photo_url);
    }
  }, [photoBlob, analysisResult.photo_url]);

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent | Event) => {
    if (!isDragging || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const pointerEvent = e as PointerEvent;
    if (pointerEvent.clientX === undefined) return;
    
    let position = ((pointerEvent.clientX - rect.left) / rect.width) * 100;
    position = Math.max(0, Math.min(100, position));
    setSliderPosition(position);
  }, [isDragging]);
  
  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove]);

  const handleImageLoad = async () => {
    if (!imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    try {
      const landmarker = await getFaceLandmarker();
      const result = landmarker.detect(img);
      
      // Pass 1: Heatmaps only (for zoomed breakdowns)
      const coords = drawAnnotation(canvas, img, result, analysisResult.result_json, false);
      setZoneCoords(coords);
      setHeatmapUrl(canvas.toDataURL("image/jpeg", 0.9));
      
      // Pass 2: Full annotations with text (for main hero view)
      drawAnnotation(canvas, img, result, analysisResult.result_json, true);
      setAnnotatedUrl(canvas.toDataURL("image/jpeg", 0.9));
    } catch (e) {
      console.error("Failed to annotate:", e);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      setAnnotatedUrl(canvas.toDataURL("image/jpeg", 0.9));
    } finally {
    }
  };

  const handleDownload = () => {
    if (!annotatedUrl) return;
    const a = document.createElement("a");
    a.href = annotatedUrl;
    a.download = "skinscan_report.jpg";
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share && annotatedUrl) {
      try {
        const blob = await (await fetch(annotatedUrl)).blob();
        const file = new File([blob], "skinscan.jpg", { type: "image/jpeg" });
        await navigator.share({
          title: "My SkinScan Report",
          text: "Check out my cosmetic skin analysis!",
          files: [file]
        });
      } catch (e) {
        console.log("Sharing cancelled or failed", e);
      }
    }
  };

  const handleClaim = async () => {
    if (!email) return;
    setIsSubmitting(true);
    try {
      const { loginWithEmail, claimAnalysis } = await import("../../../lib/api-client");
      // FAST AUTH: Get token instantly
      const { access_token } = await loginWithEmail(email, "", true, consentPhoto);
      localStorage.setItem("auth_token", access_token);
      
      // BACKGROUND: Fire and forget the report saving (it takes time due to DB + Email background tasks)
      claimAnalysis(analysisResult.id, email, true, consentPhoto).catch(err => console.error("Background claim failed", err));
      
      // IMMEDIATE: Unblock UI
      setShowEmailDrawer(false);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSubmitting(true);
    try {
      const { emailAnalysis } = await import("../../../lib/api-client");
      const token = localStorage.getItem("auth_token") || "";
      await emailAnalysis(analysisResult.id, token);
      alert("Email sent successfully!");
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const analysis = analysisResult.result_json;
  const zones = analysis.zones ? Object.entries(analysis.zones) : [];

  // Use real products from backend, fallback to empty array if none provided
  const recommendedProducts = analysis.recommended_products || [];

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID!}>
    <div className="w-full min-h-screen bg-peach-50 max-w-md mx-auto pb-24">
      {/* Hidden elements for MediaPipe processing */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photoUrl && <img ref={imgRef} src={photoUrl} alt="" className="hidden" onLoad={handleImageLoad} crossOrigin="anonymous" />}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hero Header */}
      <div className="relative w-full h-[50vh] bg-gray-900 rounded-b-3xl overflow-hidden shadow-lg touch-none select-none">
        {annotatedUrl ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative group" ref={heroRef}>
            {/* Raw Image (Background) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={photoUrl} 
              alt="Raw selfie" 
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover object-center cursor-zoom-in pointer-events-none"
              onClick={() => setIsFullscreen(true)}
            />
            
            {/* Annotated Image (Foreground, clipped by slider) */}
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none" 
              style={{ width: `${sliderPosition}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={annotatedUrl} 
                alt="Annotated selfie" 
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover object-center max-w-none"
                style={{ width: '100vw', maxWidth: '448px' }} // 448px is max-w-md
              />
            </div>

            {/* Fullscreen Click Target */}
            <div 
              className="absolute inset-0 z-0 cursor-zoom-in"
              onClick={() => setIsFullscreen(true)}
            />

            {/* Slider Handle */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-lg z-20 touch-none"
              style={{ left: `calc(${sliderPosition}% - 2px)` }}
              onPointerDown={(e) => {
                setIsDragging(true);
                // Prevent capturing clicks to the fullscreen overlay
                e.stopPropagation();
              }}
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md -ml-3.5">
                <div className="flex gap-1">
                  <div className="w-0.5 h-3 bg-gray-300 rounded-full"></div>
                  <div className="w-0.5 h-3 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="absolute top-4 left-0 right-0 flex justify-between px-6 pointer-events-none z-10">
               <span className="bg-black/50 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-sm opacity-80">AI Analysis</span>
               <span className="bg-black/50 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-sm opacity-80">Original</span>
            </div>

            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="bg-black/50 text-white px-4 py-2 mt-32 rounded-full flex items-center gap-2 backdrop-blur-sm">
                <ZoomIn size={18} />
                <span className="text-sm font-medium">Tap to zoom</span>
              </div>
            </div>
          </motion.div>
        ) : !photoBlob ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
            {/* Glowing background orbs */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-64 h-64 bg-gold-500/20 rounded-full blur-[80px]"
            />
            <motion.div 
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute w-48 h-48 bg-peach-500/20 rounded-full blur-[60px] top-10"
            />
            
            {/* Floating Mannequin Vector */}
            <motion.div
              animate={{ y: [-10, 10, -10], rotate: [-1, 1, -1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <svg viewBox="0 0 200 240" className="w-40 h-48 opacity-40 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                <path 
                  d="M100 15 C140 15 170 50 170 110 C170 170 130 210 100 225 C70 210 30 170 30 110 C30 50 60 15 100 15 Z" 
                  fill="none" 
                  stroke="#F4D06F" 
                  strokeWidth="2.5" 
                  className="drop-shadow-lg"
                />
                {/* Minimalist features */}
                <path d="M70 105 Q 80 100 90 105" fill="none" stroke="#F4D06F" strokeWidth="2" strokeLinecap="round" />
                <path d="M110 105 Q 120 100 130 105" fill="none" stroke="#F4D06F" strokeWidth="2" strokeLinecap="round" />
                <path d="M100 125 L 100 150" fill="none" stroke="#F4D06F" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M85 180 Q 100 185 115 180" fill="none" stroke="#F4D06F" strokeWidth="2" strokeLinecap="round" />
              </svg>
              
              <div className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                <Sparkles size={14} className="text-gold-300" />
                <span className="text-[11px] uppercase tracking-widest font-bold text-white/80">Private Scan</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
            <div className="w-8 h-8 border-2 border-white/30 border-t-gold-400 rounded-full animate-spin" />
            <span className="text-sm text-white/60">Processing annotation...</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none flex justify-between items-end"
        >
          <div className="text-white">
            <h1 className="font-display text-3xl mb-1">Your Analysis</h1>
            <p className="text-white/80 flex items-center gap-2">
              <Sparkles size={16} className="text-gold-400" />
              <span>{analysis.skin_type} · {analysis.skin_tone}</span>
            </p>
          </div>
          
          {analysisResult.overall_score !== undefined && (
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <circle 
                  cx="32" cy="32" r="28" 
                  fill="none" 
                  stroke={analysisResult.overall_score >= 80 ? "#4ade80" : analysisResult.overall_score >= 50 ? "#F4D06F" : "#E07A5F"}
                  strokeWidth="4" 
                  strokeDasharray="176" 
                  strokeDashoffset={176 - (176 * analysisResult.overall_score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-white font-bold text-lg font-display">{analysisResult.overall_score}</div>
            </div>
          )}
        </motion.div>
        
        {isReadOnly && onClose && (
          <div className="absolute top-16 left-4 z-30">
            <button onClick={onClose} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all border border-white/10">
              <X size={18} />
            </button>
          </div>
        )}
        
        <div className="absolute top-16 right-4 flex gap-2 z-30">
          <button onClick={handleDownload} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all">
            <Download size={18} />
          </button>
          {shareSupported && (
            <button onClick={handleShare} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all">
              <Share2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-6 space-y-6">
        
        {/* Top Concerns */}
        {analysis.top_concerns && analysis.top_concerns.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Heart size={18} className="text-terracotta-500" />
              Top Concerns
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.top_concerns.map((c, i) => (
                <motion.span 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="px-4 py-1.5 bg-terracotta-100 text-terracotta-700 rounded-full text-sm font-medium"
                >
                  {c}
                </motion.span>
              ))}
            </div>
          </motion.section>
        )}

        {/* Zone Breakdown */}
        {zones.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Droplets size={18} className="text-blue-500" />
              Zone Breakdown
            </h3>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {zones.map(([zoneName, obs]) => {
                const observation = obs as ZoneObservation;
                const style = SEVERITY_STYLES[observation.severity] || SEVERITY_STYLES.none;
                const coords = zoneCoords[zoneName];
                
                return (
                  <div 
                    key={zoneName} 
                    className={`flex-none w-64 snap-center rounded-2xl border border-gray-100 overflow-hidden ${style.bg} shadow-sm`}
                  >
                    <div className="w-full h-48 relative overflow-hidden bg-gray-900">
                      {photoUrl && coords ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={heatmapUrl || photoUrl} 
                          alt={zoneName}
                          className="absolute w-full h-full object-cover transition-all duration-700 ease-out"
                          style={{
                            objectPosition: `${coords.x * 100}% ${coords.y * 100}%`,
                            transformOrigin: `${coords.x * 100}% ${coords.y * 100}%`,
                            transform: `scale(${Math.max(1.8, Math.min(4, 0.8 / (coords.w || 0.3)))})`
                          }}
                        />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-white/50 text-xs bg-gray-800">
                           {!(photoBlob || analysisResult.photo_url) ? "No image" : "Processing..."}
                         </div>
                      )}
                      
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                           {style.label}
                         </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        <span className="font-bold text-gray-900">{ZONE_LABELS[zoneName] || zoneName}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {observation.observations?.map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="text-gray-400 mt-0.5">·</span>
                            <span className="leading-relaxed">{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Routine */}
        {analysis.routine && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Suggested Routine</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-white/70">
                <h4 className="font-bold text-xs text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                  <Sun size={14} className="text-gold-500" />
                  Morning
                </h4>
                <ul className="space-y-2.5 text-sm text-gray-800">
                  {analysis.routine.morning?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gold-500 mt-0.5 text-xs">●</span>
                      <span className="leading-tight">{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4 bg-white/70">
                <h4 className="font-bold text-xs text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                  <Moon size={14} className="text-terracotta-500" />
                  Evening
                </h4>
                <ul className="space-y-2.5 text-sm text-gray-800">
                  {analysis.routine.evening?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-terracotta-500 mt-0.5 text-xs">●</span>
                      <span className="leading-tight">{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </motion.section>
        )}

        {/* Product Recommendations */}
        {recommendedProducts.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-display font-medium text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                Curated For You
              </h3>
            </div>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-6 -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {recommendedProducts.map((product, idx) => (
                <a 
                  key={idx} 
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-none w-56 snap-center rounded-[24px] bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="h-40 bg-gray-100 flex items-center justify-center border-b border-gray-50 relative overflow-hidden group-hover:opacity-90 transition-opacity duration-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={product.image_url} 
                      alt={product.category}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white bg-black/30 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                      {product.category}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col bg-white">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1">{product.brand}</span>
                    <h4 className="font-display font-medium text-base text-gray-900 leading-snug mb-1">{product.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed flex-1 mt-1 mb-4">{product.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-purple-500 transition-colors">Shop Now</span>
                      <button className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </motion.section>
        )}

        {/* Lifestyle Nudges */}
        {analysis.lifestyle_nudges && analysis.lifestyle_nudges.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Lifestyle Tips</h3>
            <Card className="p-4">
              <ul className="space-y-3">
                {analysis.lifestyle_nudges.map((nudge, i) => (
                  <li key={i} className="flex gap-3 text-gray-700 text-sm">
                    <div className="w-5 h-5 rounded-full bg-peach-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-peach-500 text-xs font-bold">{i + 1}</span>
                    </div>
                    <p className="leading-relaxed">{nudge}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.section>
        )}

        {/* Encouragement Note */}
        {analysis.encouragement_note && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.65 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-gold-50 to-peach-50 border border-gold-100 text-center"
          >
            <Sparkles size={20} className="text-gold-400 mx-auto mb-2" />
            <p className="text-gold-800 text-sm italic leading-relaxed">
              &ldquo;{analysis.encouragement_note}&rdquo;
            </p>
          </motion.div>
        )}

        {/* Actions */}
        {!isReadOnly && (
          <div className="pt-4 space-y-3">
            {analysisResult.user_id ? (
              <Button onClick={handleSendEmail} disabled={isSubmitting} variant="primary" className="w-full bg-gray-900 text-white border-0 hover:bg-gray-800">
                <Share2 size={18} className="mr-2" />
                {isSubmitting ? "Sending..." : "Email Me This Report"}
              </Button>
            ) : (
              <Button onClick={() => setShowEmailDrawer(true)} variant="primary" className="w-full bg-gray-900 text-white border-0 hover:bg-gray-800">
                <Share2 size={18} className="mr-2" />
                Save & Email Report
              </Button>
            )}
            
            {/* Go to Dashboard Button (if logged in and on main flow) */}
            {analysisResult.user_id && (
              <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="w-full bg-white text-gray-900 border-gray-200 hover:bg-gray-50">
                Go to Dashboard
              </Button>
            )}

            {/* Removed New Scan button per user request */}
          </div>
        )}
        
        <p className="text-center text-xs text-gray-400 pb-6 mt-4">
          Cosmetic analysis only. Not medical advice.
        </p>
      </div>

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          >
            <div className="flex-none p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
              <span className="text-white/80 text-sm font-medium">Tap image to toggle zoom</span>
              <button 
                onClick={() => {
                  setIsFullscreen(false);
                  setZoomLevel(1);
                }}
                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={annotatedUrl} 
                alt="Zoomable annotated selfie" 
                onClick={() => setZoomLevel(z => z === 1 ? 2.5 : 1)}
                style={{ 
                  transform: `scale(${zoomLevel})`, 
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                className={`max-w-full max-h-full object-contain ${zoomLevel === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Drawer */}
      <AnimatePresence>
        {showEmailDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100]" 
              onClick={() => setShowEmailDrawer(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-6 z-[101] shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              <h2 className="text-2xl font-display font-medium text-gray-900 mb-2">Get Your Full Report</h2>
              <p className="text-gray-600 text-sm mb-6">
                Save this analysis to track your progress and get a beautiful copy sent to your inbox.
              </p>
              
              <div className="w-full flex justify-center mb-4">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      setIsSubmitting(true);
                      try {
                        const { loginWithGoogle, claimAnalysisGoogle } = await import("../../../lib/api-client");
                        // FAST AUTH: Get token instantly
                        const { access_token } = await loginWithGoogle(credentialResponse.credential, true);
                        localStorage.setItem("auth_token", access_token);
                        
                        // BACKGROUND: Fire and forget report saving
                        claimAnalysisGoogle(analysisResult.id, credentialResponse.credential, true, consentPhoto).catch(console.error);
                        
                        // IMMEDIATE: Unblock UI
                        setShowEmailDrawer(false);
                        window.location.href = "/dashboard";
                      } catch (err: unknown) {
                        const e = err as Error;
                        alert(e.message || "Something went wrong.");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                  onError={() => alert("Google Login Failed")}
                  theme="outline"
                  shape="rectangular"
                  width="360"
                  text="continue_with"
                />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 uppercase font-medium">Or use email</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              
              <input  
                type="email" 
                placeholder="Your email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              
              <Button onClick={handleClaim} disabled={!email || isSubmitting} variant="primary" className="w-full bg-gray-900 text-white">
                {isSubmitting ? "Saving..." : "Send it to me"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </GoogleOAuthProvider>
  );
}
