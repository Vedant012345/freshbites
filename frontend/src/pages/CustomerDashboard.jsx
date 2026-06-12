/**
 * BiteStreak – Customer Dashboard
 * Shows streak progress, stats, rewards, and visit history.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { customerService } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ─── Streak dots ─────────────────────────────────────────────────────────────

function StreakDots({ filled, total = 7 }) {
  return (
    <div className="flex gap-2 justify-center py-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.07 }}
          className={`w-3 h-3 rounded-full ${
            i < filled
              ? "bg-orange-500 shadow-[0_0_8px_#ff6b00]"
              : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color = "text-orange-500", sub }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">{label}</p>
      <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => customerService.getDashboard().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cycleVisits = data?.current_cycle_visits ?? 0;
  const visitsNeeded = data?.visits_needed ?? 7;
  const totalVisits = data?.total_visits ?? 0;
  const pendingReward = data?.rewards?.find((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-[#0b1326] text-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b1326]/85 backdrop-blur-xl border-b border-white/10 px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center font-black text-sm text-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-white/40">Welcome back,</p>
            <p className="text-base font-black text-orange-500 leading-tight">{user?.name?.split(" ")[0]}!</p>
          </div>
        </div>
        <Link to="/scan" className="bg-orange-500 rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span> Scan QR
        </Link>
      </header>

      <main className="max-w-md mx-auto px-5 pt-5 flex flex-col gap-4">
        {/* Pending Reward Banner */}
        {pendingReward && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4"
          >
            <span className="text-3xl">🎁</span>
            <div className="flex-1">
              <p className="font-bold text-emerald-400">You have a free reward!</p>
              <p className="text-xs text-white/50 mt-0.5">Code: {pendingReward.reward_code}</p>
            </div>
            <Link
              to="/reward"
              className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
            >
              Claim
            </Link>
          </motion.div>
        )}

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-orange-500/30 backdrop-blur-sm rounded-2xl p-5"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Current Streak</span>
            <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-bold px-3 py-1 rounded-full">
              {cycleVisits} / 7 Days
            </span>
          </div>

          <div className="text-center py-3">
            <p className="text-6xl font-black leading-none">
              🔥 <span className="bg-gradient-to-br from-[#ffb693] to-[#ff6b00] bg-clip-text text-transparent">{cycleVisits}</span>
            </p>
            <p className="text-sm text-white/40 mt-2">
              {visitsNeeded > 0 ? `${visitsNeeded} more visit${visitsNeeded > 1 ? "s" : ""} to free food!` : "Claim your reward! 🎉"}
            </p>
          </div>

          <StreakDots filled={cycleVisits} />

          <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(cycleVisits / 7) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-full"
            />
          </div>
          <p className="text-right text-xs text-white/30 mt-1">{Math.round((cycleVisits / 7) * 100)}% complete</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Visits" value={totalVisits} sub="All-time" />
          <StatCard label="Remaining" value={visitsNeeded} color="text-amber-400" sub="Until free food" />
          <StatCard
            label="Rewards Earned"
            value={data?.rewards?.length ?? 0}
            color="text-emerald-400"
            sub="Total lifetime"
          />
          <StatCard
            label="Last Visit"
            value={data?.recent_visits?.[0]?.visit_date ? new Date(data.recent_visits[0].visit_date).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}
            color="text-white"
            sub="Most recent"
          />
        </div>

        {/* Visit History */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-black mb-4">Visit History</h3>
          <div className="flex flex-col">
            {data?.recent_visits?.length ? (
              data.recent_visits.map((v, i) => (
                <div
                  key={v.id}
                  className="flex justify-between items-center py-3 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-sm">Visit #{totalVisits - i}</span>
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(v.visit_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/30 text-center py-4">No visits yet. Scan your first QR!</p>
            )}
          </div>
        </div>
      </main>

      {/* Floating Scan Button */}
      <Link
        to="/scan"
        className="fixed bottom-20 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-[0_8px_24px_rgba(255,107,0,0.4)]"
      >
        <span className="material-symbols-outlined text-white">qr_code_scanner</span>
      </Link>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#171f33]/92 backdrop-blur-xl border-t border-white/10 flex justify-around py-2 pb-4">
        {[
          { to: "/dashboard", icon: "home", label: "HOME", fill: true },
          { to: "/reward", icon: "military_tech", label: "REWARDS" },
          { to: "/scan", icon: "qr_code_scanner", label: "SCAN" },
          { to: "/profile", icon: "person", label: "PROFILE" },
        ].map(({ to, icon, label, fill }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-2 text-white/40 aria-[current=page]:text-orange-500">
            <span className="material-symbols-outlined text-[24px]" style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
            <span className="text-[10px] font-bold tracking-widest">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
