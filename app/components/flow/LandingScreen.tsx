
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Activity, Info, X, Sparkles, AlertTriangle, User, ImageOff } from "lucide-react";
import { getUserProfile, UserProfile } from "../../../lib/api-client";
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google";

interface Props {
  consentAnalysis: boolean;
  setConsentAnalysis: (v: boolean) => void;
  consentPhoto: boolean;
  setConsentPhoto: (v: boolean) => void;
  onNext: () => void;
  onUpgradeRequired: () => void;
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
        <div className="absolute top-0 right-0">
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
        <div className={`relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-500 ${
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
  onNext, onUpgradeRequired
}: Props) {
  const [hasToken, setHasToken] = useState(false);
  const [isPreConsented, setIsPreConsented] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPhotoWarningModal, setShowPhotoWarningModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shakeConsent, setShakeConsent] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Hero State
  const concerns = ["Breakouts?", "Dark Circles?", "Dryness?", "Fine Lines?", "Dullness?"];
  const [concernIndex, setConcernIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setConcernIndex((prev) => (prev + 1) % concerns.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    setHasToken(!!token);
    
    if (token) {
      getUserProfile(token)
        .then((user) => {
          setUserProfile(user);
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
    
    if (userProfile && userProfile.subscription_tier === "free" && userProfile.scans_used >= 3) {
      onUpgradeRequired();
      return;
    }
    
    if (!consentPhoto) {
      setShowPhotoWarningModal(true);
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
            className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-gray-200 hover:text-gray-900 hover:border-gold-300 transition-all"
            aria-label="Login"
          >
            <User size={14} className="text-gray-400" />
            Sign In / Sign Up
          </button>
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-center items-center w-full mt-8 md:mt-12">
        <div className="mb-8 text-center">
          {hasToken ? (
            <>
              <h1 className="font-display text-4xl md:text-5xl text-gray-900 mb-2 tracking-tight leading-tight">
                Ready for your <br /> next <span className="text-terracotta-600 italic">Scan?</span>
              </h1>
              <p className="text-gray-500 text-base md:text-lg max-w-[320px] mx-auto mt-5 leading-relaxed">
                Track your skin's progress with a personalized AI face scan.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl md:text-5xl text-gray-900 mb-2 tracking-tight leading-tight">
                Don't know how <br /> to fix your
                <div className="h-[1.2em] relative overflow-hidden mt-2 text-terracotta-600 italic font-bold">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={concernIndex}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="absolute inset-0 flex justify-center"
                    >
                      {concerns[concernIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </h1>
              <p className="text-gray-500 text-base md:text-lg max-w-[320px] mx-auto mt-5 leading-relaxed">
                Stop guessing. Get an AI face scan and personalized Ayurvedic routine in 30 seconds.
              </p>
            </>
          )}
        </div>
        
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

        {/* Scan Status Indicator */}
        {userProfile && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm font-medium">
            {userProfile.subscription_tier !== "free" ? (
              <span className="bg-gradient-to-r from-gold-400 to-peach-500 bg-clip-text text-transparent flex items-center gap-1">
                <Sparkles size={14} className="text-gold-400" /> Premium Active: Unlimited Scans
              </span>
            ) : (
              <span className="text-gray-500">
                {Math.max(0, 3 - userProfile.scans_used)} of 3 free scans remaining
              </span>
            )}
          </div>
        )}

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

      {/* Photo Warning Modal */}
      <AnimatePresence>
        {showPhotoWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowPhotoWarningModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-[32px] shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden"
            >
              <div className="bg-gradient-to-b from-orange-50 to-white pt-8 pb-4 px-6 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-60 animate-pulse"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-tr from-orange-400 to-amber-300 rounded-2xl rotate-3 shadow-lg flex items-center justify-center text-white">
                    <ImageOff size={28} className="-rotate-3" />
                  </div>
                </div>
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Wait, are you sure?</h3>
                <p className="text-gray-500 text-sm leading-relaxed px-2">
                  You&apos;ll not be able to see the image of this analysis later if you do not store it.
                </p>
              </div>
              
              <div className="px-6 pb-6 pt-2 space-y-3">
                <button 
                  onClick={() => {
                    setConsentPhoto(true);
                    setShowPhotoWarningModal(false);
                    onNext();
                  }}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl px-4 py-4 text-sm font-bold shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transition-all active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles size={16} className="text-gold-300" />
                    Continue and Save Image
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl"></div>
                </button>
                <button 
                  onClick={() => {
                    setShowPhotoWarningModal(false);
                    onNext();
                  }}
                  className="w-full bg-white border border-gray-200 text-gray-500 rounded-2xl px-4 py-3.5 text-sm font-bold hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-[0.98]"
                >
                  Continue without Saving
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
    </GoogleOAuthProvider>
  );
}
