/**
 * BiteStreak – App Router + All Pages
 */
import { useState } from "react";
import {
  BrowserRouter, Routes, Route, Navigate, Link, useNavigate,
} from "react-router-dom";
import {
  QueryClient, QueryClientProvider,
  useQuery, useMutation, useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import CustomerDashboard from "./pages/CustomerDashboard";
import QRScanner from "./pages/QRScanner";
import AdminDashboard from "./pages/AdminDashboard";
import { shopService, menuService, customerService } from "./services/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage() {
  const { data: shop, isLoading: isShopLoading } = useQuery({
    queryKey: ["shop"],
    queryFn: () => shopService.getShop().then((r) => r?.data || null).catch(() => null),
  });

  const shopName = shop?.shop_name || "Streak Bites";
  const isOpen = shop?.is_currently_open ?? true;

  // Your requested menu items enforced directly on the UI
  const enforcedMenu = [
    { id: 1, name: "Daliche Appe", description: "Traditional nutritious lentil dumplings", price: "30" },
    { id: 2, name: "Corn Appe", description: "Steamed dumplings filled with sweet corn kernels", price: "35" },
    { id: 3, name: "Cheese Appe", description: "Appe stuffed with a melted cheese center", price: "45" },
    { id: 4, name: "Classic Avocado Toast", description: "Freshly crushed seasoned avocado on crisp toast", price: "39" },
    { id: 5, name: "Cheese Avocado Toast", description: "Crisp avocado toast topped with loaded cheese flakes", price: "49" },
    { id: 6, name: "Plain Coconut Milk (Regular)", description: "Fresh extract served in a regular glass", price: "25" },
    { id: 7, name: "Plain Coconut Milk (Big)", description: "Fresh extract served in a large sharing glass", price: "40" },
    { id: 8, name: "Chia Coconut Milk (Regular)", description: "Infused with nutrient-dense soaked chia seeds", price: "30" },
    { id: 9, name: "Chia Coconut Milk (Big)", description: "Infused with nutrient-dense soaked chia seeds", price: "45" },
    { id: 10, name: "Sabja Coconut Milk (Regular)", description: "Cooling beverage infused with natural sweet basil seeds", price: "30" },
    { id: 11, name: "Sabja Coconut Milk (Big)", description: "Cooling beverage infused with natural sweet basil seeds", price: "45" },
  ];

  if (isShopLoading) {
    return (
      <div className="min-h-screen bg-[#0b1326] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-white">
      <header className="sticky top-0 z-50 bg-[#0b1326]/85 backdrop-blur-xl border-b border-white/10 px-5 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-400 rounded-full flex items-center justify-center text-lg">🔥</div>
          <span className="text-xl font-black tracking-tight grad-text">{shopName.toUpperCase()}</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="bg-white/10 border border-white/10 text-sm font-bold px-4 py-2 rounded-xl">Log In</Link>
          <Link to="/register" className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-xl glow-orange">Register</Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 pt-6 flex flex-col gap-5">
        <div className="flex justify-center">
          <div className="flex justify-center">
  <span className={`flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full border ${isOpen ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
    <span className={`w-2 h-2 rounded-full animate-pulse ${isOpen ? "bg-emerald-400" : "bg-red-400"}`} />
    {isOpen ? "OPEN NOW" : "CLOSED NOW"} · 6:00 AM – 10:00 AM
  </span>
</div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-3xl p-7 text-center">
          <h1 className="text-3xl font-black leading-tight mb-3">
            Turn Every Bite into a{" "}
            <span className="grad-text">Winning Streak.</span>
          </h1>
          <p className="text-sm text-white/50 mb-6">Visit 7 times, earn 1 free food. No expiry. No consecutive days needed.</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 text-left mb-5">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🎁</div>
            <div>
              <p className="font-bold text-sm">Visit 7 Times, Get 1 Free Food</p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">Join thousands of Streakers already earning</p>
            </div>
          </div>
          <Link to="/register"
            className="block w-full bg-orange-500 text-white font-bold py-4 rounded-2xl glow-orange text-sm">
            Start Your Streak →
          </Link>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🥑", label: "ORDER", desc: "Get your favorite bite" },
            { emoji: "📲", label: "SCAN",  desc: "Daily QR at counter" },
            { emoji: "🏆", label: "WIN",   desc: "Free food at 7 days" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-2">{s.emoji}</div>
              <p className="text-xs font-bold text-orange-500">{s.label}</p>
              <p className="text-xs text-white/40 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Updated Menu Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-lg font-black mb-4">Today's <span className="grad-text">Top Bites</span></h2>
          <div className="flex flex-col gap-3">
            {enforcedMenu.map((item) => (
              <div key={item.id}
                className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{item.description}</p>
                </div>
                <span className="text-orange-500 font-black text-sm">₹{item.price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-white/40 flex flex-col gap-1">
          {shop?.address && <p>📍 {shop.address}</p>}
          {shop?.phone && <p>📞 {shop.phone}</p>}
          {!shop && <p>📍 123 Flavor Street · 📞 +1 (555) 123-4567</p>}
        </div>
      </main>
    </div>
  );
}
// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ mobile_number: "", password: "" });
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => login(form),
    onSuccess: (data) => navigate(data.user.role === "admin" ? "/admin" : "/dashboard"),
    onError: (err) => setError(err.response?.data?.detail || "Invalid credentials."),
  });

  return (
    <div className="min-h-screen bg-[#0b1326] text-white flex flex-col justify-center px-5 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🔥</div>
        <h1 className="text-3xl font-black grad-text">STREAK BITES</h1>
        <p className="text-sm text-white/40 mt-2">Sign in to track your streak</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-black mb-5">Welcome Back</h2>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-xl mb-4">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2 block">Mobile Number</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-orange-500 text-sm transition-colors"
              placeholder="+1 (555) 000-0000" type="tel"
              value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2 block">Password</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-orange-500 text-sm transition-colors"
              placeholder="Your password" type="password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && mutate()} />
          </div>
          <button onClick={() => mutate()} disabled={isPending}
            className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl mt-2 glow-orange disabled:opacity-50 text-sm">
            {isPending ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-center text-sm text-white/40">
            Don't have an account?{" "}
            <Link to="/register" className="text-orange-500 font-bold">Register</Link>
          </p>
          <div className="border-t border-white/10 pt-3 text-center">
            <Link to="/admin" className="text-xs text-white/30 hover:text-white/50">Admin Dashboard →</Link>
          </div>
        </div>
      </div>
      <Link to="/" className="mt-4 text-center text-sm text-white/30 hover:text-white/60">← Back to Home</Link>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", mobile_number: "", password: "" });
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => register(form),
    onSuccess: () => navigate("/dashboard"),
    onError: (err) => {
      const d = err.response?.data;
      setError(d?.mobile_number?.[0] || d?.password?.[0] || d?.name?.[0] || d?.detail || "Registration failed.");
    },
  });

  const fields = [
    { key: "name",          label: "Full Name",      placeholder: "Alex Chen",           type: "text" },
    { key: "mobile_number", label: "Mobile Number",  placeholder: "+1 (555) 000-0000",   type: "tel" },
    { key: "password",      label: "Password",       placeholder: "Create a strong password", type: "password" },
  ];

  return (
    <div className="min-h-screen bg-[#0b1326] text-white flex flex-col justify-center px-5 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🔥</div>
        <h1 className="text-3xl font-black grad-text">Join the Streak</h1>
        <p className="text-sm text-white/40 mt-2">Start earning free food today</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-black mb-5">Create Account</h2>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-xl mb-4">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-4">
          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2 block">{label}</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-orange-500 text-sm transition-colors"
                placeholder={placeholder} type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && mutate()}
              />
            </div>
          ))}
          <button onClick={() => mutate()} disabled={isPending}
            className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl mt-2 glow-orange disabled:opacity-50 text-sm">
            {isPending ? "Creating account…" : "Create Account & Start Streak 🔥"}
          </button>
          <p className="text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link to="/login" className="text-orange-500 font-bold">Sign In</Link>
          </p>
        </div>
      </div>
      <Link to="/" className="mt-4 text-center text-sm text-white/30 hover:text-white/60">← Back to Home</Link>
    </div>
  );
}

// ─── Reward Page ──────────────────────────────────────────────────────────────
function RewardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => customerService.getDashboard().then((r) => r.data),
  });

  const pendingReward = data?.rewards?.find((r) => r.status === "pending");

  const { mutate: claimReward, isPending } = useMutation({
    mutationFn: () => customerService.claimReward(pendingReward.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Reward claimed! New cycle started 🎉");
      navigate("/dashboard");
    },
    onError: () => toast.error("Failed to claim reward"),
  });

  if (!pendingReward) {
    return (
      <div className="min-h-screen bg-[#0b1326] text-white flex flex-col items-center justify-center px-5 text-center gap-5">
        <div className="text-6xl">🏁</div>
        <p className="text-xl font-black">No Pending Rewards</p>
        <p className="text-sm text-white/40">Keep scanning to earn your free food!</p>
        <Link to="/dashboard" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1326] text-white">
      <header className="bg-[#0b1326]/85 backdrop-blur-xl border-b border-white/10 px-5 h-16 flex items-center justify-between">
        <button onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm font-semibold text-white/60">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
        </button>
        <span className="font-black text-base">Your Reward</span>
        <div className="w-16" />
      </header>

      <div className="max-w-md mx-auto px-5 pt-10 pb-16 flex flex-col items-center text-center gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}>
          <span className="text-6xl">🎉</span>
        </motion.div>

        <div>
          <h1 className="text-3xl font-black">Congratulations!</h1>
          <p className="text-xl font-bold mt-1 grad-text">You Earned Free Food!</p>
          <p className="text-sm text-white/50 mt-3">
            You've completed a 7-day streak. Show this code at the counter to claim your free food item.
          </p>
        </div>

        <div className="w-full bg-white/5 border border-emerald-500/30 glow-green rounded-2xl p-7">
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Your Reward Code</p>
          <div className="text-2xl font-black tracking-[.2em] text-emerald-400 bg-emerald-500/5 border border-dashed border-emerald-500/30 rounded-xl py-4">
            {pendingReward.reward_code}
          </div>
          <div className="flex justify-between mt-4 text-sm text-white/40">
            <span>Earned: {new Date(pendingReward.earned_date).toLocaleDateString()}</span>
            <span className="text-emerald-400 font-bold text-xs">PENDING</span>
          </div>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
          <p className="font-bold text-sm mb-3">How to claim:</p>
          {[
            "Show this code to the cashier",
            "Choose any menu item as your free food",
            "Your streak resets and a new cycle begins!",
          ].map((step, i) => (
            <p key={i} className="text-sm text-white/50 mb-2">{i + 1}. {step}</p>
          ))}
        </div>

        <button onClick={() => claimReward()} disabled={isPending}
          className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl glow-orange disabled:opacity-50 text-sm">
          {isPending ? "Claiming…" : "Mark as Claimed ✓"}
        </button>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#171f33",
                color: "#dae2fd",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 14,
              },
            }}
          />
          <Routes>
            <Route path="/"          element={<LandingPage />} />
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/scan"      element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
            <Route path="/reward"    element={<ProtectedRoute><RewardPage /></ProtectedRoute>} />
            <Route path="/admin"     element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="*"          element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}