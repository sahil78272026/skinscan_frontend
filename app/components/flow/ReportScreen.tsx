import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { AnalysisOut, ZoneObservation } from "../../../lib/types";
import { getFaceLandmarker } from "../../../lib/mediapipe/faceMesh";
import { drawAnnotation } from "../../../lib/mediapipe/annotate";
import { Sparkles, Download, Share2, RefreshCw, Sun, Moon, Droplets, Heart, X, ZoomIn, ShoppingBag, ExternalLink } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

interface Props {
  analysisResult: AnalysisOut;
  photoBlob?: Blob;
  onNewScan?: () => void;
  onClose?: () => void;
  isReadOnly?: boolean;
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

const DUMMY_PRODUCTS = [
  { id: 1, name: "CeraVe Hydrating Facial Cleanser", type: "Cleanser", tags: ["dry", "dehydrated", "sensitive"], price: "$14.99" },
  { id: 2, name: "CeraVe Renewing SA Cleanser", type: "Cleanser", tags: ["oily", "acne", "blemishes", "texture"], price: "$15.99" },
  { id: 3, name: "The Ordinary Niacinamide 10%", type: "Serum", tags: ["pores", "oily", "texture"], price: "$6.00" },
  { id: 4, name: "Paula's Choice 2% BHA", type: "Exfoliant", tags: ["blemishes", "pores", "texture", "acne"], price: "$34.00" },
  { id: 5, name: "TruSkin Vitamin C Serum", type: "Serum", tags: ["dark spots", "dull", "uneven tone"], price: "$21.99" },
  { id: 6, name: "La Roche-Posay Hyaluronic Acid", type: "Serum", tags: ["dehydrated", "dry", "fine lines"], price: "$39.99" },
  { id: 7, name: "Neutrogena Hydro Boost Water Gel", type: "Moisturizer", tags: ["oily", "combination"], price: "$19.99" },
  { id: 8, name: "CeraVe Moisturizing Cream", type: "Moisturizer", tags: ["dry", "sensitive"], price: "$17.99" },
  { id: 9, name: "Supergoop! Unseen Sunscreen", type: "SPF", tags: ["all"], price: "$38.00" },
  { id: 10, name: "CeraVe Eye Repair Cream", type: "Eye Cream", tags: ["dark circles", "under_eye"], price: "$14.50" },
];

// ZoneCard component removed, replaced by inline Carousel

export default function ReportScreen({ analysisResult, photoBlob, onNewScan, onClose, isReadOnly }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [annotatedUrl, setAnnotatedUrl] = useState<string>("");
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

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    let x = (e as React.PointerEvent).clientX ?? (e as any).touches?.[0]?.clientX;
    if (x === undefined) x = (e as PointerEvent).clientX;
    
    let position = ((x - rect.left) / rect.width) * 100;
    position = Math.max(0, Math.min(100, position));
    setSliderPosition(position);
  };
  
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
  }, [isDragging]);

  const handleImageLoad = async () => {
    if (!imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    try {
      const landmarker = await getFaceLandmarker();
      const result = landmarker.detect(img);
      const coords = drawAnnotation(canvas, img, result, analysisResult.result_json);
      setZoneCoords(coords);
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
      const { claimAnalysis } = await import("../../../lib/api-client");
      const token = await claimAnalysis(analysisResult.id, email, true, false); // Default consents for now
      localStorage.setItem("auth_token", token);
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

  // Match products based on analysis
  const recommendedProducts = (() => {
    const concerns = (analysis.top_concerns || []).map(c => c.toLowerCase());
    const skinType = (analysis.skin_type || "").toLowerCase();
    
    // Create a combined string of all concerns to check against
    const searchString = [...concerns, skinType].join(" ");

    const matches = DUMMY_PRODUCTS.filter(p => {
      if (p.tags.includes("all")) return true;
      return p.tags.some(tag => searchString.includes(tag));
    });
    
    // Sort so specific matches come first, generic ("all") comes last
    matches.sort((a, b) => (a.tags.includes("all") ? 1 : 0) - (b.tags.includes("all") ? 1 : 0));
    
    // Fallback if no specific matches
    if (matches.length === 0) return DUMMY_PRODUCTS.slice(0, 3);
    
    return matches.slice(0, 4); // Show top 4
  })();

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
          <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3 bg-gradient-to-br from-peach-900 to-gray-900">
            <Sparkles size={32} className="text-gold-400 opacity-50" />
            <span className="text-sm text-white/60">Photo not saved</span>
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
          className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none"
        >
          <h1 className="font-display text-3xl mb-1">Your Analysis</h1>
          <p className="text-white/80 flex items-center gap-2">
            <Sparkles size={16} className="text-gold-400" />
            <span>{analysis.skin_type} · {analysis.skin_tone}</span>
          </p>
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
                          src={photoUrl} 
                          alt={zoneName}
                          className="absolute w-full h-full object-cover transition-transform duration-700 ease-out"
                          style={{
                            transformOrigin: `${coords.x * 100}% ${coords.y * 100}%`,
                            transform: `scale(${Math.max(2.5, Math.min(6, 0.8 / (coords.w || 0.3)))})`
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
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <ShoppingBag size={18} className="text-gold-500" />
            Recommended Products
          </h3>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {recommendedProducts.map((product) => (
              <div 
                key={product.id} 
                className="flex-none w-40 snap-center rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100 relative">
                  <div className="w-16 h-16 rounded-full bg-peach-100 flex items-center justify-center">
                    <ShoppingBag className="text-peach-400" size={24} />
                  </div>
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white px-2 py-0.5 rounded-full shadow-sm">
                    {product.type}
                  </span>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h4 className="font-bold text-sm text-gray-900 leading-tight mb-1 line-clamp-2 flex-1">{product.name}</h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <span className="text-terracotta-600 font-bold text-sm">{product.price}</span>
                    <button className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center hover:scale-105 transition-transform">
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

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

            {onNewScan && (
              <Button onClick={onNewScan} variant="outline" className="w-full border-gray-300 text-gray-700">
                <RefreshCw size={18} className="mr-2" />
                New Scan
              </Button>
            )}
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
                        const { claimAnalysisGoogle } = await import("../../../lib/api-client");
                        const token = await claimAnalysisGoogle(analysisResult.id, credentialResponse.credential, true, false);
                        localStorage.setItem("auth_token", token);
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
