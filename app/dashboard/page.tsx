"use client";

import { useEffect, useState } from "react";
import { getAnalysisHistory } from "../../lib/api-client";
import { AnalysisOut } from "../../lib/types";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Droplets, LogOut, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import ReportScreen from "../components/flow/ReportScreen";
import { AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [history, setHistory] = useState<AnalysisOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<AnalysisOut | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "/";
      return;
    }

    getAnalysisHistory(token)
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load history.");
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-peach-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedScan) {
    return (
      <div className="fixed inset-0 z-50 bg-peach-50 overflow-y-auto">
        <ReportScreen 
          analysisResult={selectedScan} 
          isReadOnly={true}
          onClose={() => setSelectedScan(null)}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-peach-50 pb-20">
      <div className="bg-white px-5 pt-12 pb-6 shadow-sm border-b border-gray-100 rounded-b-[32px] sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Link href="/" className="text-gray-900 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-xl font-bold text-gray-900">My Scans</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors flex items-center gap-1">
            <span className="text-xs font-medium uppercase tracking-wider hidden sm:block">Logout</span>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
            {error}
          </div>
        )}

        {!error && history.length === 0 && (
          <div className="text-center pt-20 pb-10">
            <div className="w-20 h-20 bg-gold-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={32} className="text-gold-400" />
            </div>
            <h2 className="text-xl font-display font-medium text-gray-900 mb-2">No Scans Yet</h2>
            <p className="text-gray-500 text-sm mb-8 px-4 leading-relaxed">
              You haven't saved any skin analyses yet. Take your first scan to unlock your personalized dashboard and track your skin's progress over time!
            </p>
            <Link href="/">
              <Button variant="primary" className="bg-gray-900 text-white rounded-full px-8 py-3.5 shadow-lg shadow-gray-900/20">
                Start a Scan
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {history.map((scan, idx) => {
            const date = new Date(scan.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric"
            });
            const concernsCount = scan.result_json?.top_concerns?.length || 0;
            const skinType = scan.result_json?.skin_type || scan.skin_type || "Analysis";
            
            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelectedScan(scan)}
              >
                <Card className="p-5 hover:border-gold-200 transition-colors cursor-pointer group bg-white shadow-sm hover:shadow-md border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium bg-gray-50 px-3 py-1.5 rounded-full">
                      <Clock size={12} />
                      {date}
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-terracotta-600 bg-terracotta-50 px-2.5 py-1 rounded-full">
                        Latest
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1 capitalize">{skinType}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Droplets size={14} className="text-blue-400" />
                        {concernsCount} primary concerns identified
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-peach-50 flex items-center justify-center text-peach-600 group-hover:bg-peach-100 group-hover:translate-x-1 transition-all">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
