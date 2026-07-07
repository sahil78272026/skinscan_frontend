import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface Props {
  consentAnalysis: boolean;
  setConsentAnalysis: (v: boolean) => void;
  consentPhoto: boolean;
  setConsentPhoto: (v: boolean) => void;
  onNext: () => void;
}

export default function LandingScreen({ 
  consentAnalysis, setConsentAnalysis, 
  consentPhoto, setConsentPhoto, 
  onNext 
}: Props) {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem("auth_token"));
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 max-w-md mx-auto w-full relative"
    >
      {hasToken && (
        <div className="absolute top-6 right-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white px-3 py-2 rounded-full shadow-sm border border-gray-100 hover:text-gray-900 transition-colors">
            <Activity size={14} className="text-terracotta-500" />
            My Scans
          </Link>
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-center items-center w-full mt-12">
        <h1 className="font-display text-5xl text-gray-900 mb-2 text-center tracking-tight">Skin<span className="text-terracotta-600 italic">Scan</span></h1>
        <p className="text-gray-600 text-center mb-10 text-lg">Your personalized cosmetic skin analysis, powered by AI.</p>
        
        <div className="w-full space-y-4 mb-10">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-peach-200">
            <Checkbox 
              checked={consentAnalysis}
              onChange={(e) => setConsentAnalysis(e.target.checked)}
              label={<span>I consent to having my selfie analyzed for cosmetic purposes. I understand this is <strong>not medical advice</strong>. My photo will be deleted immediately after scanning unless I opt-in to save it.</span>}
            />
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-peach-200">
            <Checkbox 
              checked={consentPhoto}
              onChange={(e) => setConsentPhoto(e.target.checked)}
              label="Save my photos to my account to track progress over time (Optional)."
            />
          </div>
          <div className="text-center text-xs text-gray-500 mt-4 px-2">
            By proceeding, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </div>
        </div>

        <Button 
          onClick={onNext} 
          disabled={!consentAnalysis}
        >
          Take Selfie
        </Button>
      </div>
    </motion.div>
  );
}
