"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, Shield, Sparkles, Loader2 } from "lucide-react";
import { useRazorpay } from "react-razorpay";
import { createPaymentOrder, verifyPaymentOrder } from "../../../lib/api-client";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onSuccess?: () => void;
}

export default function PricingModal({ isOpen, onClose, message, onSuccess }: PricingModalProps) {
  const { Razorpay } = useRazorpay();
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayment = async (planId: "yearly" | "lifetime") => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Please close this window and click 'Sign In / Sign Up' at the top right to create an account before upgrading.");
        return;
      }

      setLoading(planId);
      
      // 1. Create order on backend
      const orderData = await createPaymentOrder(planId);

      // 2. Initialize Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SkinScan AI",
        description: `SkinScan ${planId === "lifetime" ? "Lifetime" : "Yearly"} Premium`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            await verifyPaymentOrder({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId
            });
            if (onSuccess) onSuccess();
            onClose();
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
    } catch (err: any) {
      console.error("Payment failed:", err);
      alert(err.message || "Payment initialization failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden border border-slate-800 shadow-2xl"
      >
        <div className="relative p-6 pt-8 text-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          
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
    </div>
  );
}
