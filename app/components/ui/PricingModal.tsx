"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Shield, Sparkles, Loader2, HeartHandshake } from "lucide-react";
import { useRazorpay } from "react-razorpay";
import confetti from "canvas-confetti";
import { createPaymentOrder, verifyPaymentOrder, getUserProfile } from "../../../lib/api-client";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onSuccess?: () => void;
}

export default function PricingModal({ isOpen, onClose, message, onSuccess }: PricingModalProps) {
  const { Razorpay } = useRazorpay();
  const [loading, setLoading] = useState<string | null>(null);
  
  // State for Generous UX Modal
  const [showGenerousModal, setShowGenerousModal] = useState(false);
  // State for Post-Purchase Celebration Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "lifetime" | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setShowGenerousModal(false);
    setShowSuccessModal(false);
    setSelectedPlan(null);
    onClose();
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    if (onSuccess) onSuccess(); // Trigger parent side-effects (reload, state change) only now!
    onClose();
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#a855f7', '#6366f1', '#14b8a6', '#fcd34d']
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#a855f7', '#6366f1', '#14b8a6', '#fcd34d']
      });
    }, 250);
  };

  const handlePayment = async (planId: "yearly" | "lifetime", bypassCheck = false) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Please close this window and click 'Sign In / Sign Up' at the top right to create an account before upgrading.");
        return;
      }

      // UX Check: Intercept if they have unused free scans
      if (!bypassCheck && !showGenerousModal) {
        setLoading(planId);
        try {
          const userProfile = await getUserProfile(token);
          if (userProfile.subscription_tier === "free" && userProfile.scans_used < 3) {
            setLoading(null);
            setSelectedPlan(planId);
            setShowGenerousModal(true);
            return;
          }
        } catch (e) {
          console.error("Failed to check user profile for free scans", e);
          // If check fails, silently proceed to payment
        }
      }

      setLoading(planId);
      
      // 1. Create order on backend
      const orderData = await createPaymentOrder(planId);

      // 2. Initialize Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency as "INR",
        name: "SkinScan AI",
        description: `SkinScan ${planId === "lifetime" ? "Lifetime" : "Yearly"} Premium`,
        order_id: orderData.order_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            await verifyPaymentOrder({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId
            });
            // Show celebration instead of closing or calling onSuccess yet!
            setShowGenerousModal(false);
            setShowSuccessModal(true);
            triggerConfetti();
          } catch (err) {
            console.error("Verification failed", err);
            alert("Payment captured, but verification failed. Please contact support.");
          }
        },
        theme: {
          color: "#0f172a",
        },
      };

      // 3. Open Razorpay Checkout
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      console.error("Payment failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Payment initialization failed. Please try again.";
      alert(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative"
      >
        {!showSuccessModal && (
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {showSuccessModal ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 text-center"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(168,85,247,0.4)] relative">
                <Sparkles size={40} className="text-white" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
                />
              </div>
              
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 mb-2">
                Hooray! 🎉
              </h2>
              <p className="text-slate-300 text-base mb-8">
                Your account is now Premium! You&apos;ve just unlocked:
              </p>

              <div className="space-y-4 mb-8 text-left bg-slate-800/50 p-5 rounded-2xl border border-indigo-500/20">
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-4">
                  <div className="bg-indigo-500/20 p-2 rounded-full">
                    <CheckCircle2 size={20} className="text-indigo-400" />
                  </div>
                  <span className="text-slate-200 font-medium">Unlimited AI Face Scans</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-center gap-4">
                  <div className="bg-purple-500/20 p-2 rounded-full">
                    <CheckCircle2 size={20} className="text-purple-400" />
                  </div>
                  <span className="text-slate-200 font-medium">Detailed PDF Reports</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex items-center gap-4">
                  <div className="bg-fuchsia-500/20 p-2 rounded-full">
                    <CheckCircle2 size={20} className="text-fuchsia-400" />
                  </div>
                  <span className="text-slate-200 font-medium">Personalized Ayurvedic Routines</span>
                </motion.div>
              </div>

              <button
                onClick={handleCloseSuccess}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-4 font-bold text-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98]"
              >
                Start Exploring Now
              </button>
            </motion.div>
          ) : showGenerousModal ? (
            <motion.div
              key="generous"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/30">
                <HeartHandshake size={36} className="text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">Wait a second! ✨</h2>
              <p className="text-slate-300 text-base leading-relaxed mb-8">
                You haven&apos;t used all your free scans available yet! We want you to experience the full value of our AI before you pay. Are you sure you still want to upgrade now?
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl py-3.5 font-semibold transition-all shadow-lg shadow-teal-500/25 active:scale-[0.98]"
                >
                  Use My Free Scans First
                </button>
                
                <button
                  onClick={() => selectedPlan && handlePayment(selectedPlan, true)}
                  disabled={loading !== null}
                  className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl py-3 font-medium transition-colors"
                >
                  {loading !== null ? <Loader2 size={18} className="animate-spin mx-auto" /> : "I'm sure, upgrade anyway"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="relative p-6 pt-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                  <Sparkles size={32} className="text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Premium</h2>
                <p className="text-slate-300 text-sm px-4">
                  {message || "Upgrade to unlock unlimited AI skin analysis, detailed PDF reports, and more."}
                </p>
              </div>

              <div className="px-6 pb-6 space-y-4">
                <div className="space-y-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-400" />
                    <span className="text-slate-200 text-sm">Unlimited AI Face Scans</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-400" />
                    <span className="text-slate-200 text-sm">Detailed PDF Reports</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-400" />
                    <span className="text-slate-200 text-sm">Personalized Ayurvedic Routines</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-6">
                  <button
                    onClick={() => handlePayment("lifetime")}
                    disabled={loading !== null}
                    className="w-full relative overflow-hidden group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-4 font-semibold transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98]"
                  >
                    {loading === "lifetime" ? (
                      <Loader2 size={20} className="animate-spin mx-auto" />
                    ) : (
                      <div className="flex items-center justify-between px-6">
                        <span>Lifetime Access</span>
                        <span className="text-xl">₹1200</span>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handlePayment("yearly")}
                    disabled={loading !== null}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl py-3 font-medium transition-colors"
                  >
                    {loading === "yearly" ? (
                      <Loader2 size={18} className="animate-spin mx-auto" />
                    ) : (
                      <div className="flex items-center justify-between px-6">
                        <span>Yearly Plan</span>
                        <span>₹800/yr</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                  <Shield size={14} />
                  <span>Secured by Razorpay</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
