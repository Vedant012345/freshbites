/**
 * BiteStreak – Admin Dashboard
 * Full admin panel: overview, QR management, customers, rewards, menu, shop.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
      <p className={`text-3xl font-black mt-1 ${color}`}>{value ?? "—"}</p>
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
    <div>
      <h2 className="text-2xl font-black mb-5">Dashboard Overview</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
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
      const img = await QRCode.toDataURL(res.data.token, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } });
      setQrImage(img);
      return res.data;
    },
  });

  const { mutate: generateQR, isPending } = useMutation({
    mutationFn: adminService.generateQR,
    onSuccess: async (res) => {
      const img = await QRCode.toDataURL(res.data.token, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } });
      setQrImage(img);
      queryClient.invalidateQueries({ queryKey: ["todayQR", "adminStats"] });
      toast.success("QR Code generated!");
    },
    onError: () => toast.error("Failed to generate QR"),
  });

  const downloadQR = () => {
    if (!qrImage) return;
    const a = document.createElement("a");
    a.href = qrImage;
    a.download = `bitestreak-qr-${qrData?.qr_date}.png`;
    a.click();
  };

  return (
    <div>
      <h2 className="text-2xl font-black mb-5">QR Code Management</h2>
      <div className="grid grid-cols-2 gap-5">
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
          <p className="text-xs text-white/30 text-center break-all mb-4">Token: {qrData?.token?.slice(0, 32)}…</p>
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

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-black">Customers</h2>
        <input
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-orange-500"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-4 py-3 border-b border-white/10 text-xs font-bold tracking-wider text-white/40 uppercase">
          <span>Customer</span><span>Mobile</span><span>Visits</span><span>Rewards</span><span>Last Visit</span>
        </div>
        {customers?.map((c) => (
          <div key={c.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-4 py-3 border-b border-white/5 items-center">
            <span className="text-sm font-semibold">{c.name}</span>
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
        ))}
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
    },
    onError: () => toast.error("Failed to claim reward"),
  });

  // Reuse customers data to extract rewards
  const { data: customers } = useQuery({
    queryKey: ["adminCustomers", ""],
    queryFn: () => adminService.getCustomers("").then((r) => r.data),
  });

  return (
    <div>
      <h2 className="text-2xl font-black mb-5">Reward Management</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-xs font-bold tracking-wider text-white/40 uppercase">
          Active Pending Rewards
        </div>
        <div className="p-4 text-sm text-white/40 text-center">
          Use Admin → Claim Reward with a reward code from a customer to mark it claimed.
          <div className="mt-4 flex gap-3">
            <input id="rcode" placeholder="BITE-XXXXXXXX" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/30 outline-none focus:border-orange-500 text-sm" />
            <button
              onClick={() => { const v = document.getElementById("rcode").value; if (v) claimReward(v); }}
              className="bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-sm"
            >
              Claim
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

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-black">Menu Items</h2>
        <button onClick={() => toast("Add item modal – wire to backend!")} className="bg-orange-500 text-white font-bold text-sm px-4 py-2 rounded-xl">+ Add Item</button>
      </div>
      <div className="flex flex-col gap-3">
        {items?.map((item) => (
          <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="font-bold">{item.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{item.description}</p>
              <p className="text-orange-500 font-black text-sm mt-1">${item.price}</p>
            </div>
            <div className="flex items-center gap-2">
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
        ))}
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

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1326] text-white">
      {/* Sidebar */}
      <aside className="w-52 min-w-52 bg-[#060e20]/90 border-r border-white/10 flex flex-col gap-1 p-3">
        <div className="px-2 py-3 mb-2">
          <p className="text-base font-black bg-gradient-to-br from-[#ffb693] to-[#ff6b00] bg-clip-text text-transparent">STREAK BITES</p>
          <p className="text-xs text-white/30 mt-0.5">Admin Console</p>
        </div>
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
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
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white hover:bg-white/5 w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
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
