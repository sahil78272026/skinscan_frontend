import { AnalysisOut } from "../../../lib/types";
import { X, Trophy, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  scan1: AnalysisOut;
  scan2: AnalysisOut;
  onClose: () => void;
}

export default function ComparisonScreen({ scan1, scan2, onClose }: Props) {
  // scan2 is typically the newer scan if sorted by date, but let's sort them to be sure
  const sorted = [scan1, scan2].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const olderScan = sorted[0];
  const newerScan = sorted[1];

  const score1 = olderScan.overall_score || 100;
  const score2 = newerScan.overall_score || 100;
  const scoreDelta = score2 - score1;

  // Simple Delta Engine
  const getSeverityNum = (sev: string) => {
    if (sev === "severe") return 3;
    if (sev === "moderate") return 2;
    if (sev === "mild") return 1;
    return 0;
  };

  const oldZones = olderScan.result_json?.zones || {};
  const newZones = newerScan.result_json?.zones || {};
  
  const improved: string[] = [];
  const worsened: string[] = [];
  const unchanged: string[] = [];

  Object.keys(newZones).forEach(zone => {
    // @ts-expect-error: Object keys are dynamic from DB
    const oldSev = getSeverityNum(oldZones[zone]?.severity || "none");
    // @ts-expect-error: Object keys are dynamic from DB
    const newSev = getSeverityNum(newZones[zone]?.severity || "none");

    const readableZone = zone.replace("_", " ").toUpperCase();

    if (newSev < oldSev) improved.push(readableZone);
    else if (newSev > oldSev) worsened.push(readableZone);
    else if (newSev > 0) unchanged.push(readableZone);
  });

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 text-white overflow-y-auto">
      <div className="sticky top-0 z-20 flex justify-between items-center p-5 bg-gray-900/80 backdrop-blur-md">
        <h2 className="font-display text-xl font-bold">Progress Report</h2>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-8 pb-20">
        
        {/* Score Card */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-gold-500/20 to-peach-500/20 p-6 rounded-3xl border border-gold-500/30 text-center relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 text-gold-400 opacity-50" />
          <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Skin Health Score</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="text-4xl font-display font-bold text-white">{score1}</div>
            <ArrowRightIcon />
            <div className="text-5xl font-display font-bold text-gold-400">{score2}</div>
          </div>
          {scoreDelta > 0 ? (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 px-4 py-2 rounded-full font-bold">
              <TrendingUp size={18} />
              +{scoreDelta} Points! Keep it up!
            </div>
          ) : scoreDelta < 0 ? (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-4 py-2 rounded-full font-bold">
              <TrendingDown size={18} />
              {scoreDelta} Points. Needs attention.
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-gray-500/20 text-gray-300 px-4 py-2 rounded-full font-bold">
              <Minus size={18} />
              Maintained
            </div>
          )}
        </motion.div>

        {/* Delta Analysis */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b border-white/10 pb-2">Analysis Delta</h3>
          
          {improved.length > 0 && (
            <div className="bg-white/5 p-4 rounded-2xl border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
                <Trophy size={18} /> Improved Zones
              </div>
              <div className="flex flex-wrap gap-2">
                {improved.map(z => <span key={z} className="bg-green-500/20 px-3 py-1 text-xs rounded-full">{z}</span>)}
              </div>
            </div>
          )}

          {worsened.length > 0 && (
            <div className="bg-white/5 p-4 rounded-2xl border border-terracotta-500/30">
              <div className="flex items-center gap-2 text-terracotta-400 font-bold mb-2">
                <TrendingDown size={18} /> New Concerns
              </div>
              <div className="flex flex-wrap gap-2">
                {worsened.map(z => <span key={z} className="bg-terracotta-500/20 px-3 py-1 text-xs rounded-full">{z}</span>)}
              </div>
            </div>
          )}
          
          {unchanged.length > 0 && (
            <div className="bg-white/5 p-4 rounded-2xl border border-gray-500/30">
              <div className="flex items-center gap-2 text-gray-400 font-bold mb-2">
                <Minus size={18} /> Unchanged
              </div>
              <div className="flex flex-wrap gap-2">
                {unchanged.map(z => <span key={z} className="bg-gray-500/20 px-3 py-1 text-xs rounded-full">{z}</span>)}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
      <path d="M5 12h14"></path>
      <path d="m12 5 7 7-7 7"></path>
    </svg>
  );
}
