
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Activity, Info, X, Sparkles, AlertTriangle, User } from "lucide-react";
import { getUserProfile } from "../../../lib/api-client";
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google";

interface Props {
  consentAnalysis: boolean;
  setConsentAnalysis: (v: boolean) => void;
  consentPhoto: boolean;
  setConsentPhoto: (v: boolean) => void;
  onNext: () => void;
}

const ConsentCard = ({
  checked,
  onChange,
  title,
  onInfoClick,
  isMandatory = false
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: React.ReactNode;
  onInfoClick?: (e: React.MouseEvent) => void;
  isMandatory?: boolean;
}) => {
  return (
    <motion.div
      onClick={() => onChange(!checked)}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        checked 
          ? "border-gold-300 bg-gradient-to-br from-gold-50/80 to-peach-50/80 shadow-[0_0_20px_rgba(212,175,55,0.15)]" 
          : isMandatory 
            ? "border-terracotta-300 bg-gradient-to-br from-white/90 to-terracotta-50/80 shadow-[0_4px_20px_rgba(224,122,95,0.15)] hover:shadow-[0_4px_25px_rgba(224,122,95,0.25)]"
            : "border-gray-200 bg-white/60 hover:bg-white/90 backdrop-blur-sm"
      }`}
    >
      {/* Required Badge */}
      {isMandatory && !checked && (
        <div className="absolute -top-px -right-px">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-bl-xl rounded-tr-2xl bg-terracotta-400 opacity-20" />
            <div className="relative rounded-bl-xl rounded-tr-2xl bg-terracotta-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
              Required
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Animated Check Circle */}
        <div className={`relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
          checked 
            ? "border-gold-400 bg-gold-400" 
            : isMandatory 
              ? "border-terracotta-400 shadow-[0_0_10px_rgba(224,122,95,0.3)] bg-white" 
              : "border-gray-300"
        }`}>
          <AnimatePresence>
            {checked && (
              <motion.svg
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  d="M20 6L9 17l-5-5"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 text-sm font-medium text-gray-800">
          {title}
        </div>

        {onInfoClick && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onInfoClick(e);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <Info size={16} />
          </button>
        )}
      </div>

      {/* Ripple/Glow Effect */}
      {checked && (
        <motion.div
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.5 }}
          className="absolute left-6 top-1/2 -mt-4 -ml-4 h-8 w-8 rounded-full bg-gold-300 mix-blend-multiply"
        />
      )}
    </motion.div>
  );
};

export default function LandingScreen({ 
  consentAnalysis, setConsentAnalysis, 
  consentPhoto, setConsentPhoto, 
  onNext 
}: Props) {
  const [hasToken, setHasToken] = useState(false);
  const [isPreConsented, setIsPreConsented] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shakeConsent, setShakeConsent] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setHasToken(!!token);
    
    if (token) {
      getUserProfile(token)
        .then((user) => {
          if (user.consent_analysis) {
            setConsentAnalysis(true);
            setIsPreConsented(true);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch user profile", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [setConsentAnalysis]);

  const handleStartAnalysis = () => {
    if (!consentAnalysis) {
      // Trigger shake animation
      setShakeConsent(true);
      setTimeout(() => setShakeConsent(false), 500); // Reset after animation
      
      // Show beautiful toast error
      setShowErrorToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setShowErrorToast(false);
      }, 4000);
      
      return;
    }
    
    // Proceed if consented
    onNext();
  };

  const handleLogin = async () => {
    if (!loginEmail) return;
    setIsLoggingIn(true);
    try {
      const { loginWithEmail } = await import("../../../lib/api-client");
      const { access_token } = await loginWithEmail(loginEmail, "", true, false);
      localStorage.setItem("auth_token", access_token);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setIsLoggingIn(true);
    try {
      const { loginWithGoogle } = await import("../../../lib/api-client");
      const { access_token } = await loginWithGoogle(credentialResponse.credential, true);
      localStorage.setItem("auth_token", access_token);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || "Google Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || ""}>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 max-w-md mx-auto w-full relative"
    >
      {hasToken ? (
        <div className="absolute top-6 right-6 z-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-gray-200 hover:text-gray-900 hover:border-gold-300 transition-all">
            <Activity size={14} className="text-terracotta-500" />
            My Scans
          </Link>
        </div>
      ) : (
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={() => setShowLoginModal(true)} 
            className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gold-300 border border-gray-200 shadow-sm transition-all"
            aria-label="Login"
          >
            <User size={18} />
          </button>
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-center items-center w-full mt-12">
        <h1 className="font-display text-5xl text-gray-900 mb-2 text-center tracking-tight">Skin<span className="text-terracotta-600 italic">Scan</span></h1>
        <p className="text-gray-500 text-center mb-10 text-lg max-w-[280px]">Your personalized cosmetic skin analysis, powered by AI.</p>
        
        <div className="w-full space-y-3 mb-12 relative z-10">
          {!isPreConsented && (
            <motion.div
              animate={shakeConsent ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <ConsentCard 
                checked={consentAnalysis}
                isMandatory={true}
                onChange={(val) => {
                  setConsentAnalysis(val);
                  if (val) setShowErrorToast(false); // Clear error if they check it
                }}
                title={
                  <span>
                    I agree to the <button onClick={(e) => { e.stopPropagation(); setShowTermsModal(true); }} className="text-terracotta-600 underline font-semibold decoration-terracotta-300 underline-offset-2">Terms & Privacy Policy</button>.
                  </span>
                }
              />
            </motion.div>
          )}
          
          <ConsentCard 
            checked={consentPhoto}
            onChange={setConsentPhoto}
            title="Save this photo to track my progress."
            onInfoClick={() => setShowPhotoModal(true)}
          />
        </div>

        {/* Glittering Round Button */}
        <motion.button 
          onClick={handleStartAnalysis}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative group overflow-hidden w-full max-w-[240px] rounded-full bg-gray-900 px-8 py-4 font-bold text-white shadow-lg shadow-gray-900/20 transition-all"
        >
          {/* Animated Shine/Glitter overlay */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
          
          <div className="relative flex items-center justify-center gap-2">
            <Sparkles size={18} className="text-gold-300 group-hover:animate-pulse" />
            <span>Take Selfie</span>
            <Sparkles size={18} className="text-gold-300 opacity-50 group-hover:animate-pulse" />
          </div>
        </motion.button>
      </div>

      {/* Elegant Error Toast */}
      <AnimatePresence>
        {showErrorToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-4 right-4 max-w-sm mx-auto z-50 pointer-events-none"
          >
            <div className="bg-red-900/90 backdrop-blur-md text-white px-5 py-4 rounded-full shadow-xl flex items-center justify-center gap-3 border border-red-500/30">
              <AlertTriangle size={18} className="text-red-300 flex-shrink-0" />
              <p className="font-medium text-sm">Please agree to the Terms to continue.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Blur Modals */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsModal(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white/90 backdrop-blur-md border border-white/50 p-6 rounded-3xl shadow-2xl w-full max-w-sm"
            >
              <button onClick={() => setShowTermsModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full transition-colors">
                <X size={16} />
              </button>
              <h3 className="font-display text-xl font-bold text-gray-900 mb-3 pr-8">Terms & Privacy Policy</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                By proceeding, you consent to having your selfie analyzed for cosmetic purposes. This tool is <strong>not medical advice</strong>. 
                <br/><br/>
                Your raw photo is processed securely and is instantly deleted from our servers immediately after the scan, unless you explicitly opt-in to save it to your private dashboard.
              </p>
            </motion.div>
          </div>
        )}

        {showPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowPhotoModal(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white/90 backdrop-blur-md border border-white/50 p-6 rounded-3xl shadow-2xl w-full max-w-sm"
            >
              <button onClick={() => setShowPhotoModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full transition-colors">
                <X size={16} />
              </button>
              <h3 className="font-display text-xl font-bold text-gray-900 mb-3 pr-8">Secure Photo Storage</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you select this option, your raw selfie will be stored securely in the cloud via Cloudflare R2.
                <br/><br/>
                We generate short-lived, encrypted URLs to safely stream this photo directly to your private dashboard, enabling powerful before-and-after comparisons. You retain full control and can delete your data at any time.
              </p>
            </motion.div>
          </div>
        )}

        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white/90 backdrop-blur-md border border-white/50 p-6 rounded-3xl shadow-2xl w-full max-w-sm"
            >
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full transition-colors">
                <X size={16} />
              </button>
              <h3 className="font-display text-xl font-bold text-gray-900 mb-2">Welcome Back</h3>
              <p className="text-sm text-gray-500 mb-6">Enter your email to access your past scans.</p>
              
              <input 
                type="email" 
                placeholder="Email Address" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all mb-4"
              />
              <button 
                onClick={handleLogin}
                disabled={!loginEmail || isLoggingIn}
                className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all mb-4"
              >
                {isLoggingIn ? "Logging in..." : "Continue with Email"}
              </button>
              
              <div className="relative flex items-center justify-center w-full mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative bg-white/90 px-3 text-xs text-gray-400 uppercase tracking-wider font-semibold">Or</div>
              </div>
              
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={() => alert("Google Login Failed")}
                  useOneTap={false}
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  text="continue_with"
                  width="100%"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
    </GoogleOAuthProvider>
  );
}
