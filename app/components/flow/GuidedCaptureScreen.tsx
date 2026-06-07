import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "../ui/Button";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { getFaceLandmarkerVideo } from "../../../lib/mediapipe/faceMesh";

interface Props {
  onCapture: (blob: Blob) => void;
  onBack: () => void;
}

export default function GuidedCaptureScreen({ onCapture, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hint, setHint] = useState("Loading camera...");
  const [canCapture, setCanCapture] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    let landmarker: ReturnType<typeof getFaceLandmarkerVideo> extends Promise<infer T> ? T : never;
    let animationId: number;

    async function setupCamera() {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } } 
        });
        if (!active) { ms.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = ms;
        if (videoRef.current) {
          videoRef.current.srcObject = ms;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            startDetection();
          };
        }
      } catch {
        if (!active) return;
        setCameraFailed(true);
        setHint("Camera unavailable. Upload a selfie instead.");
      }
    }

    async function startDetection() {
      try {
        landmarker = await getFaceLandmarkerVideo();
        if (!active) return;
        setHint("Center your face in the oval");
        detect();
      } catch {
        // MediaPipe failed to load — still allow capture without guidance
        if (!active) return;
        setHint("Tap the button to capture");
        setCanCapture(true);
      }
    }

    function detect() {
      if (!active || !videoRef.current || !landmarker) return;
      
      const nowInMs = Date.now();
      try {
        const results = landmarker.detectForVideo(videoRef.current, nowInMs);
        
        if (results.faceLandmarks) {
          if (results.faceLandmarks.length === 0) {
            setHint("No face detected");
            setCanCapture(false);
          } else if (results.faceLandmarks.length > 1) {
            setHint("Multiple faces detected — only one face please");
            setCanCapture(false);
          } else {
            setHint("Perfect! Hold still.");
            setCanCapture(true);
          }
        }
      } catch {
        // Detection error — allow capture anyway
        setCanCapture(true);
      }

      animationId = requestAnimationFrame(detect);
    }

    setupCamera();

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      stopStream();
    };
  }, [stopStream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          stopStream();
          onCapture(blob);
        }
      }, "image/jpeg", 0.9);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith("image/")) {
      setHint("Please select an image file");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setHint("Image too large. Max 10MB.");
      return;
    }

    stopStream();
    onCapture(file);
  };

  const handleBack = () => {
    stopStream();
    onBack();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black flex flex-col"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center text-white bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={handleBack} className="p-2 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="font-medium bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm">{hint}</div>
        <div className="w-10"></div>
      </div>

      {/* Camera view or upload fallback */}
      {!cameraFailed ? (
        <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
          <video 
            ref={videoRef} 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
          />
          
          {/* Oval overlay frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div 
              className="w-[70%] h-[55%] border-2 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors duration-500" 
              style={{ borderColor: canCapture ? '#e9b83b' : 'rgba(255,255,255,0.5)' }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
            <Camera size={40} className="text-white/40" />
          </div>
          <div className="text-center">
            <p className="text-white/80 text-lg font-medium mb-2">Camera not available</p>
            <p className="text-white/50 text-sm">You can upload a selfie from your gallery instead</p>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          {/* Upload button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 active:scale-90 transition-all"
          >
            <Upload size={22} />
          </button>

          {/* Capture button — only show when camera is active */}
          {!cameraFailed && (
            <button 
              onClick={handleCapture}
              disabled={!canCapture}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-90 ${
                canCapture 
                  ? 'border-gold-500 bg-gold-500/20' 
                  : 'border-white/40 bg-white/10'
              }`}
            >
              <div className={`w-16 h-16 rounded-full transition-colors ${
                canCapture ? 'bg-gold-500' : 'bg-white/40'
              }`} />
            </button>
          )}

          {/* Upload large button — only show when camera failed */}
          {cameraFailed && (
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="primary"
              className="!w-auto px-8"
            >
              <Upload size={18} />
              Upload Selfie
            </Button>
          )}

          {/* Spacer to balance layout when camera is active */}
          {!cameraFailed && <div className="w-14" />}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        capture="user"
        onChange={handleFileUpload}
        className="hidden" 
      />
    </motion.div>
  );
}
