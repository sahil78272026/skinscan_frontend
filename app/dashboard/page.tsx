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
import ComparisonScreen from "../components/flow/ComparisonScreen";

export default function Dashboard() {
  const [history, setHistory] = useState<AnalysisOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<AnalysisOut | null>(null);
  
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<AnalysisOut[]>([]);
  const [showComparison, setShowComparison] = useState(false);

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

  if (showComparison && selectedForCompare.length === 2) {
    return (
      <ComparisonScreen
        scan1={selectedForCompare[0]}
        scan2={selectedForCompare[1]}
        onClose={() => {
          setShowComparison(false);
          setIsCompareMode(false);
          setSelectedForCompare([]);
        }}
      />
    );
  }

  const toggleCompareSelect = (scan: AnalysisOut) => {
    if (selectedForCompare.find(s => s.id === scan.id)) {
      setSelectedForCompare(prev => prev.filter(s => s.id !== scan.id));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare(prev => [...prev, scan]);
      }
    }
  };

  return (
    <main className="min-h-screen bg-peach-50 pb-20">
      <div className="bg-white px-5 pt-12 pb-6 shadow-sm border-b border-gray-100 rounded-b-[32px] sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Link href="/" className="text-gray-900 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="font-display text-xl font-bold text-gray-900">My Scans</h1>
            {history.length > 1 && (
              <button 
                onClick={() => {
                  setIsCompareMode(!isCompareMode);
                  setSelectedForCompare([]);
                }} 
                className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 mt-1 rounded-full transition-colors ${isCompareMode ? 'bg-gold-500 text-white' : 'bg-gold-50 text-gold-600'}`}
              >
                {isCompareMode ? 'Cancel Compare' : 'Compare Mode'}
              </button>
            )}
          </div>
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
              You haven&apos;t saved any skin analyses yet. Take your first scan to unlock your personalized dashboard and track your skin&apos;s progress over time!
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
            const dateObj = new Date(scan.created_at);
            const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const displayDate = `${dateStr} at ${timeStr}`;
            const concernsCount = scan.result_json?.top_concerns?.length || 0;
            const skinType = scan.result_json?.skin_type || scan.skin_type || "Analysis";
            
            const isSelected = !!selectedForCompare.find(s => s.id === scan.id);

            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => {
                  if (isCompareMode) {
                    toggleCompareSelect(scan);
                  } else {
                    setSelectedScan(scan);
                  }
                }}
              >
                <Card className={`p-5 transition-all cursor-pointer group bg-white shadow-sm hover:shadow-md border ${isSelected ? 'border-gold-400 ring-2 ring-gold-400/20' : 'border-gray-100 hover:border-gold-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium bg-gray-50 px-3 py-1.5 rounded-full">
                      <Clock size={12} />
                      {displayDate}
                    </div>
                    <div className="flex gap-2">
                      {scan.overall_score !== undefined && (
                        <span className="text-[10px] font-bold bg-gold-50 text-gold-600 px-2 py-1 rounded-full flex items-center gap-1">
                           Score: {scan.overall_score}
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-terracotta-600 bg-terracotta-50 px-2.5 py-1 rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1 capitalize">{skinType}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Droplets size={14} className="text-blue-400" />
                        {concernsCount} primary concerns identified
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-gold-500 text-white' : 'bg-peach-50 text-peach-600 group-hover:bg-peach-100 group-hover:translate-x-1'}`}>
                      {isCompareMode ? (
                        isSelected ? <div className="w-3 h-3 bg-white rounded-full" /> : <div className="w-3 h-3 border-2 border-current rounded-full" />
                      ) : (
                        <ArrowRight size={18} />
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Floating Compare Button */}
      {isCompareMode && selectedForCompare.length === 2 && (
        <motion.div 
          initial={{ y: 100 }} animate={{ y: 0 }}
          className="fixed bottom-6 left-0 right-0 px-5 z-20 max-w-md mx-auto"
        >
          <Button onClick={() => setShowComparison(true)} variant="primary" className="w-full bg-gray-900 text-white rounded-full py-4 shadow-xl shadow-gray-900/30 text-lg font-bold">
            Run Comparison
          </Button>
        </motion.div>
      )}
    </main>
  );
}
