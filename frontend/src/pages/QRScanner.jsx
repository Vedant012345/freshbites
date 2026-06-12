/**
 * BiteStreak – QR Scanner Page
 * Uses html5-qrcode to read the daily QR and POST to /api/scan.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customerService } from "../services/api";

const SCANNER_ID = "qr-reader";

export default function QRScanner() {
  const navigate = useNavigate();
  const qcRef = useRef(null);
  const qc = useRef(null);
  const queryClient = useQueryClient();

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { success, data }

  const { mutate: submitScan, isPending } = useMutation({
    mutationFn: (token) => customerService.scanQR(token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setResult({ success: true, data: res.data });
      stopScanner();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || "Scan failed";
      const alreadyScanned = err.response?.data?.already_scanned;
      setResult({ success: false, msg, alreadyScanned });
      stopScanner();
    },
  });

  const startScanner = async () => {
    setScanning(true);
    setResult(null);
    try {
      qc.current = new Html5Qrcode(SCANNER_ID);
      await qc.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          submitScan(decodedText);
        },
        () => {} // ignore frame errors
      );
    } catch (err) {
      toast.error("Camera access denied or not available.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qc.current) {
      await qc.current.stop().catch(() => {});
      qc.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1326] text-white">
      {/* Header */}
      <header className="bg-[#0b1326]/85 backdrop-blur-xl border-b border-white/10 px-5 h-16 flex items-center justify-between">
        <button
          onClick={() => { stopScanner(); navigate("/dashboard"); }}
          className="flex items-center gap-2 text-sm font-semibold text-white/70"
        >
          <span className="material-symbols-outlined">arrow_back</span> Back
        </button>
        <span className="font-black text-base">Scan QR Code</span>
        <div className="w-16" />
      </header>

      <div className="max-w-md mx-auto px-5 pt-8 pb-16 flex flex-col items-center gap-6">
        <p className="text-sm text-white/50 text-center">
          Scan the QR code at the counter. One scan per day counts as your visit.
        </p>

        {/* Scanner box */}
        <div className="relative w-[260px] h-[260px] rounded-2xl overflow-hidden border border-orange-500/30 bg-[#0b1326]">
          {/* Animated scan line */}
          {scanning && (
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_10px_#ff6b00] z-10"
              animate={{ y: [0, 240, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {/* Corner brackets */}
          {["top-2 left-2 border-t-2 border-l-2","top-2 right-2 border-t-2 border-r-2","bottom-2 left-2 border-b-2 border-l-2","bottom-2 right-2 border-b-2 border-r-2"].map((cls, i) => (
            <div key={i} className={`absolute w-5 h-5 border-orange-500 ${cls}`} />
          ))}
          {/* html5-qrcode target */}
          <div id={SCANNER_ID} className="w-full h-full" />
          {/* Placeholder icon when not scanning */}
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="material-symbols-outlined text-[80px] text-orange-500">qr_code</span>
            </div>
          )}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`w-full rounded-2xl p-5 border text-center ${
                result.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-orange-500/10 border-orange-500/30 text-orange-400"
              }`}
            >
              {result.success ? (
                <>
                  <p className="text-3xl mb-2">{result.data.reward_earned ? "🎉" : "✅"}</p>
                  <p className="font-black text-lg">
                    {result.data.reward_earned ? "Reward Unlocked!" : "Visit Logged!"}
                  </p>
                  <p className="text-sm mt-1 text-white/60">
                    Streak: {result.data.cycle_visits} / 7
                  </p>
                  {result.data.reward_earned && (
                    <button
                      onClick={() => navigate("/reward")}
                      className="mt-3 bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm"
                    >
                      View Reward →
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">{result.alreadyScanned ? "⏰" : "❌"}</p>
                  <p className="font-black text-lg">
                    {result.alreadyScanned ? "Already Scanned Today" : "Invalid QR Code"}
                  </p>
                  <p className="text-sm mt-1 text-white/50">{result.msg}</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {!result && (
          <button
            onClick={scanning ? stopScanner : startScanner}
            disabled={isPending}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-opacity ${
              scanning
                ? "bg-white/10 text-white border border-white/20"
                : "bg-orange-500 text-white shadow-[0_8px_24px_rgba(255,107,0,0.4)]"
            }`}
          >
            {scanning ? "⏹ Stop Scanner" : "▶ Start Camera Scanner"}
          </button>
        )}

        {result && (
          <button
            onClick={() => { setResult(null); startScanner(); }}
            className="w-full py-4 rounded-2xl font-bold text-sm bg-white/5 border border-white/10"
          >
            Scan Again
          </button>
        )}

        {/* Rules */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Scan Rules</p>
          {[
            "One scan per day, per customer",
            "QR code refreshes at midnight",
            "No consecutive days required",
            "Your visits never reset",
          ].map((rule) => (
            <p key={rule} className="text-sm text-white/60 flex items-center gap-2 mb-2">
              <span className="text-emerald-500">✓</span> {rule}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
