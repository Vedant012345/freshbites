/**
 * BiteStreak – Admin Dashboard
 * Full admin panel: overview, QR management, customers, rewards, menu, shop.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { adminService, menuService, shopService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color = "text-orange-500" }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">{label}</p>
      <p className={`text-2xl md:text-3xl font-black mt-1 ${color}`}>{value ?? "—"}</p>
    </div>
  );
}

// ─── PANELS ───────────────────────────────────────────────────────────────────
function OverviewPanel() {
  const { data } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => adminService.getStats().then((r) => r.data),
    refetchInterval: 30000,
  });

  return (
    <div className="overflow-hidden">
      <h2 className="text-xl md:text-2xl font-black mb-5">Dashboard Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Customers" value={data?.total_customers} />
        <StatCard label="Today's Visitors" value={data?.today_visitors} color="text-amber-400" />
        <StatCard label="Total Visits" value={data?.total_visits} color="text-emerald-400" />
        <StatCard label="Pending Rewards" value={data?.pending_rewards} color="text-orange-300" />
        <StatCard label="Claimed Rewards" value={data?.claimed_rewards} color="text-white" />
        <StatCard
          label="QR Status"
          value={data?.today_qr_active ? "Active" : "Missing"}
          color={data?.today_qr_active ? "text-emerald-400" : "text-red-400"}
        />
      </div>
    </div>
  );
}

function QRPanel() {
  const queryClient = useQueryClient();
  const [qrImage, setQrImage] = useState(null);

  const { data: qrData } = useQuery({
    queryKey: ["todayQR"],
    queryFn: async () => {
      const res = await adminService.getTodayQR();
      if (res.data?.token) {
        const img = await QRCode.toDataURL(res.data.token, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } });
        setQrImage(img);
      }
      return res.data;
    },
    staleTime: 0,             // Never serve cached data when initializing panel
    refetchOnWindowFocus: true, // Auto check for midnight date mutations when tab changes
    refetchInterval: 30000,    // Poll every 30 seconds to refresh instantly at 12:00 AM local time
  });

  const { mutate: generateQR, isPending } = useMutation({
    mutationFn: adminService.generateQR,
    onSuccess: async (res) => {
      if (res.data?.token) {
        const img = await QRCode.toDataURL(res.data.token, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } });
        setQrImage(img);
        queryClient.setQueryData(["todayQR"], res.data);
      }
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      toast.success("QR Code generated!");
    },
    onError: () => toast.error("Failed to generate QR"),
  });

  const downloadQR = () => {
    if (!qrImage) return;
    const a = document.createElement("a");
    a.href = qrImage;
    a.download = `bitestreak-qr-${qrData?.qr_date || "today"}.png`;
    a.click();
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-black mb-5">QR Code Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white/5 border border-orange-500/30 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="font-black text-base">Today's QR Code</p>
            {qrData?.is_active && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-1 rounded-full">ACTIVE</span>
            )}
          </div>
          {qrImage ? (
            <div className="bg-white rounded-xl p-4 flex justify-center mb-4">
              <img src={qrImage} alt="Daily QR" className="w-40 h-40" />
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl h-48 flex items-center justify-center mb-4">
              <span className="text-white/20 text-sm">No QR for today</span>
            </div>
          )}
          <p className="text-xs text-white/40 text-center mb-1">Date: {qrData?.qr_date || "—"}</p>
          <p className="text-xs text-white/30 text-center break-all mb-4">Token: {qrData?.token ? `${qrData.token.slice(0, 32)}…` : "—"}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadQR} className="bg-white/10 border border-white/10 text-sm font-semibold py-2 rounded-xl">⬇ Download</button>
            <button onClick={() => window.print()} className="bg-white/10 border border-white/10 text-sm font-semibold py-2 rounded-xl">🖨 Print</button>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="font-black text-base mb-3">Generate New QR</p>
          <p className="text-sm text-white/50 mb-5">A new QR is auto-generated at midnight. You can also regenerate manually.</p>
          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Scans Today</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{qrData?.scan_count ?? 0}</p>
          </div>
          <button
            onClick={() => generateQR()}
            disabled={isPending}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {isPending ? "Generating…" : "Generate New QR Code"}
          </button>
          <p className="text-xs text-white/30 text-center mt-2">This invalidates the current QR</p>
        </div>
      </div>
    </div>
  );
}

function CustomersPanel() {
  const [search, setSearch] = useState("");
  const { data: customers } = useQuery({
    queryKey: ["adminCustomers", search],
    queryFn: () => adminService.getCustomers(search).then((r) => r.data),
  });

  const validCustomers = Array.isArray(customers) ? customers : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center mb-5">
        <h2 className="text-xl md:text-2xl font-black">Customers</h2>
        <input
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-orange-500 w-full sm:w-auto"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-x-auto whitespace-nowrap">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-4 py-3 border-b border-white/10 text-xs font-bold tracking-wider text-white/40 uppercase">
            <span>Customer</span><span>Mobile</span><span>Visits</span><span>Rewards</span><span>Last Visit</span>
          </div>
          {validCustomers.length ? (
            validCustomers.map((c) => (
              <div key={c.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-4 py-3 border-b border-white/5 items-center">
                <span className="text-sm font-semibold text-white truncate pr-2">{c.name}</span>
                <span className="text-xs text-white/50">{c.mobile_number}</span>
                <div>
                  <span className="text-sm font-bold text-orange-500">{c.current_cycle_visits}/7</span>
                  <div className="h-1 bg-white/5 rounded-full mt-1 w-16">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(c.current_cycle_visits / 7) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm text-emerald-400 font-bold">{c.rewards_earned}</span>
                <span className="text-xs text-white/40">{c.last_visit || "—"}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/30 text-center py-6">No customers found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RewardsPanel() {
  const queryClient = useQueryClient();
  const { mutate: claimReward } = useMutation({
    mutationFn: (code) => adminService.claimReward(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      toast.success("Reward marked as claimed!");
      const inputEl = document.getElementById("rcode");
      if (inputEl) inputEl.value = "";
    },
    onError: () => toast.error("Failed to claim reward"),
  });

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-black mb-5">Reward Management</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-xs font-bold tracking-wider text-white/40 uppercase">
          Active Pending Rewards
        </div>
        <div className="p-4 text-sm text-white/40 text-center">
          Use Admin → Claim Reward with a reward code from a customer to mark it claimed.
          <div className="mt-4 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input id="rcode" placeholder="BITE-XXXXXXXX" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/30 outline-none focus:border-orange-500 text-sm" />
            <button
              onClick={() => { const v = document.getElementById("rcode")?.value; if (v) claimReward(v); }}
              className="bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-opacity active:opacity-80"
            >
              Claim Reward
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuPanel() {
  const queryClient = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["menuAll"],
    queryFn: () => menuService.getMenu().then((r) => r.data),
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: menuService.deleteItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menuAll"] }); toast.success("Item deleted"); },
  });

  const customFallbackItems = [
    { id: 1, name: "Daliche Appe", description: "Nutritious traditional lentil dumplings", price: "30", available: true },
    { id: 2, name: "Corn Appe", description: "Steamed savory dumplings packed with sweet corn", price: "35", available: true },
    { id: 3, name: "Cheese Appe", description: "Appe stuffed with a molten cheese center", price: "45", available: true },
    { id: 4, name: "Classic Avocado Toast", description: "Seasoned crushed fresh avocado on toast", price: "39", available: true },
    { id: 5, name: "Cheese Avocado Toast", description: "Avocado toast loaded with grated cheese flakes", price: "49", available: true },
    { id: 6, name: "Plain Coconut Milk (Regular)", description: "Fresh extract served in a regular glass", price: "25", available: true },
    { id: 7, name: "Plain Coconut Milk (Big)", description: "Fresh extract served in a large sharing glass", price: "40", available: true },
    { id: 8, name: "Chia Coconut Milk (Regular)", description: "Infused with nutrient-dense soaked chia seeds", price: "30", available: true },
    { id: 9, name: "Chia Coconut Milk (Big)", description: "Infused with nutrient-dense soaked chia seeds", price: "45", available: true },
    { id: 10, name: "Sabja Coconut Milk (Regular)", description: "Refreshing extract mixed with sweet basil seeds", price: "30", available: true },
    { id: 11, name: "Sabja Coconut Milk (Big)", description: "Refreshing extract mixed with sweet basil seeds", price: "45", available: true },
  ];

  const validItems = Array.isArray(items) && items.length > 0 ? items : customFallbackItems;

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl md:text-2xl font-black">Menu Items</h2>
        <button onClick={() => toast("Add item modal – wire to backend!")} className="bg-orange-500 text-white font-bold text-sm px-4 py-2 rounded-xl">+ Add Item</button>
      </div>
      <div className="flex flex-col gap-3">
        {validItems.length ? (
          validItems.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{item.description}</p>
                <p className="text-orange-500 font-black text-sm mt-1">₹{item.price}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${item.available ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-orange-400 border-orange-500/30 bg-orange-500/10"}`}>
                  {item.available ? "Available" : "Unavailable"}
                </span>
                <button
                  onClick={() => { if (confirm("Delete this item?")) deleteItem(item.id); }}
                  className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 px-2 py-1 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/30 text-center py-6">No menu items found.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Shell ─────────────────────────────────────────────────────────
const PANELS = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "qr", label: "QR Code", icon: "qr_code" },
  { id: "customers", label: "Customers", icon: "group" },
  { id: "rewards", label: "Rewards", icon: "military_tech" },
  { id: "menu", label: "Menu", icon: "restaurant_menu" },
];

export default function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const [isMobileOpen, setIsMobileOpen] = useState(false); // Mobile Menu State
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const renderPanel = () => {
    switch (active) {
      case "overview": return <OverviewPanel />;
      case "qr": return <QRPanel />;
      case "customers": return <CustomersPanel />;
      case "rewards": return <RewardsPanel />;
      case "menu": return <MenuPanel />;
      default: return null;
    }
  };

  // Shared inner contents of sidebar navigation
  const SidebarContents = () => (
    <>
      <div className="px-2 py-3 mb-2 flex justify-between items-center">
        <div>
          <p className="text-base font-black bg-gradient-to-br from-[#ffb693] to-[#ff6b00] bg-clip-text text-transparent">STREAK BITES</p>
          <p className="text-xs text-white/30 mt-0.5">Admin Console</p>
        </div>
        {/* Mobile close chevron inside the sidebar overlay */}
        <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-white/40 hover:text-white">
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setActive(p.id);
              setIsMobileOpen(false); // auto close layout container drawer on select
            }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              active === p.id
                ? "bg-orange-500/10 text-orange-500"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white hover:bg-white/5 w-full"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1326] text-white flex-col md:flex-row">
      
      {/* ─── MOBILE TOP HEADER ACTION BAR ─────────────────────────────────────── */}
      <header className="flex md:hidden items-center justify-between px-5 h-16 bg-[#060e20]/90 border-b border-white/10 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl active:bg-white/10 text-orange-500"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <div>
            <p className="text-sm font-black tracking-tight text-white">STREAK BITES</p>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{active}</p>
          </div>
        </div>
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-400 rounded-full flex items-center justify-center text-sm">🔥</div>
      </header>

      {/* ─── DESKTOP PERSISTENT SIDEBAR ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-52 min-w-52 bg-[#060e20]/90 border-r border-white/10 flex-col gap-1 p-3">
        <SidebarContents />
      </aside>

      {/* ─── MOBILE INTERACTIVE DRAWER CONTAINER OVERLAY ─────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Dark Backdrop dim screen filter */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            />
            {/* Sliding navigation drawer menu drawer */}
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#060e20] z-50 p-4 border-r border-white/10 flex flex-col gap-1 md:hidden"
            >
              <SidebarContents />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN APP ROUTER CORE WORKSPACE PANEL ───────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderPanel()}
        </motion.div>
      </main>
    </div>
  );
}