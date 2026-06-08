import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { motion } from "framer-motion";
import { AnalysisOut, ZoneObservation } from "../../../lib/types";
import { getFaceLandmarker } from "../../../lib/mediapipe/faceMesh";
import { drawAnnotation } from "../../../lib/mediapipe/annotate";
import { Sparkles, Download, Share2, RefreshCw, ChevronDown, ChevronUp, Sun, Moon, Droplets, Heart } from "lucide-react";

interface Props {
  analysisResult: AnalysisOut;
  photoBlob: Blob;
  onNewScan: () => void;
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

function ZoneCard({ zoneName, observation }: { zoneName: string; observation: ZoneObservation }) {
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLES[observation.severity] || SEVERITY_STYLES.none;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-gray-100 overflow-hidden ${style.bg}`}
    >
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
          <span className="font-semibold text-sm text-gray-900">{ZONE_LABELS[zoneName] || zoneName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {style.label}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>
      {expanded && observation.observations && observation.observations.length > 0 && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-3"
        >
          <ul className="space-y-1.5">
            {observation.observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400 mt-0.5">·</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function ReportScreen({ analysisResult, photoBlob, onNewScan }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [annotatedUrl, setAnnotatedUrl] = useState<string>("");
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(!!navigator.share);
  }, []);

  useEffect(() => {
    const u = URL.createObjectURL(photoBlob);
    setPhotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photoBlob]);

  const handleImageLoad = async () => {
    if (!imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    try {
      const landmarker = await getFaceLandmarker();
      const result = landmarker.detect(img);
      drawAnnotation(canvas, img, result, analysisResult.result_json);
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

  const analysis = analysisResult.result_json;
  const zones = analysis.zones ? Object.entries(analysis.zones) : [];

  return (
    <div className="w-full min-h-screen bg-peach-50 max-w-md mx-auto pb-24">
      {/* Hidden elements for MediaPipe processing */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photoUrl && <img ref={imgRef} src={photoUrl} alt="" className="hidden" onLoad={handleImageLoad} crossOrigin="anonymous" />}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hero Header */}
      <div className="relative w-full h-[50vh] bg-gray-900 rounded-b-3xl overflow-hidden shadow-lg">
        {annotatedUrl ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={annotatedUrl} alt="Annotated selfie" className="w-full h-full object-contain" />
          </motion.div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
            <div className="w-8 h-8 border-2 border-white/30 border-t-gold-400 rounded-full animate-spin" />
            <span className="text-sm text-white/60">Processing annotation...</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-6 text-white"
        >
          <h1 className="font-display text-3xl mb-1">Your Analysis</h1>
          <p className="text-white/80 flex items-center gap-2">
            <Sparkles size={16} className="text-gold-400" />
            <span>{analysis.skin_type} · {analysis.skin_tone}</span>
          </p>
        </motion.div>
        
        <div className="absolute top-4 right-4 flex gap-2">
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
            <div className="space-y-2">
              {zones.map(([zoneName, obs]) => (
                <ZoneCard key={zoneName} zoneName={zoneName} observation={obs as ZoneObservation} />
              ))}
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
        <div className="pt-4 space-y-3">
          <Button onClick={onNewScan} variant="primary" className="w-full">
            <RefreshCw size={18} />
            New Scan
          </Button>
        </div>
        
        <p className="text-center text-xs text-gray-400 pb-6">
          Cosmetic analysis only. Not medical advice.
        </p>
      </div>
    </div>
  );
}
