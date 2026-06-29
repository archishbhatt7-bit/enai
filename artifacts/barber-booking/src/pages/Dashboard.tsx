import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetShopDashboard,
  useGetTimeline,
  useListBookings,
  useGetRecentActivity,
  useGetRevenueStats,
  useUpdateShopStatus,
  useVerifyArrivalOtp,
  useMarkNoShow,
  useUndoNoShow,
  useCompleteBooking,
  useGetShop,
  getGetTimelineQueryKey,
  getListBookingsQueryKey,
  getGetShopDashboardQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Scissors,
  LogOut,
  ToggleLeft,
  ToggleRight,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronRight,
  Camera,
  Trash2,
  Calendar,
  LayoutDashboard,
  Store,
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
} from "lucide-react";
import ImageUpload, { photoUrl } from "@/components/ImageUpload";
import WeeklyScheduleModal from "@/components/WeeklyScheduleModal";
import AvatarUpload from "@/components/AvatarCrop";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-slate-100 text-slate-500 border-slate-200",
  no_show: "bg-red-100 text-red-600 border-red-200",
  cancelled: "bg-slate-100 text-slate-400 border-slate-200",
  pending: "bg-blue-100 text-blue-800 border-blue-200",
};

const TIMELINE_COLORS: Record<string, string> = {
  confirmed: "bg-blue-400",
  active: "bg-green-500",
  completed: "bg-slate-300",
  no_show: "bg-red-300",
  pending: "bg-blue-500",
};

const CLOCK_COLORS: Record<string, string> = {
  confirmed: "#60a5fa",
  active: "#22c55e",
  completed: "#94a3b8",
  no_show: "#f87171",
  pending: "#fbbf24",
};

function timeToAngleDeg(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (((h % 12) * 60 + m) / 720) * 360;
}

function ClockDial({
  chair,
  selectedDate,
  today,
}: {
  chair: { chairNumber: number; bookings: any[] };
  selectedDate: string;
  today: string;
}) {
  const cx = 80, cy = 80, r = 62, innerR = 11;

  function polar(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function pieSlice(startDeg: number, endDeg: number): string {
    if (endDeg - startDeg >= 360) endDeg = startDeg + 359.9;
    const s = polar(startDeg, r);
    const e = polar(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
  }

  const HOUR_LABELS: Record<number, string> = { 0: "12", 90: "3", 180: "6", 270: "9" };

  const now = new Date();
  const nowAngle = timeToAngleDeg(
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  );
  const handEnd = polar(nowAngle, r * 0.68);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100%" viewBox="0 0 160 170" className="max-w-[160px]">
        {/* Clock face */}
        <circle cx={cx} cy={cy} r={r} fill="white" stroke="#e2e8f0" strokeWidth="2" />

        {/* Booking pie slices — rendered BEFORE ticks so ticks stay visible on top */}
        {chair.bookings.map((b) => {
          let startA = timeToAngleDeg(b.slotTime);
          let endA = timeToAngleDeg(b.slotEndTime);
          if (endA <= startA) endA += 360;
          const color = CLOCK_COLORS[b.status] ?? "#94a3b8";
          return (
            <path key={b.id} d={pieSlice(startA, endA)} fill={color} opacity="0.82">
              <title>{b.customerName} — {b.service?.name ?? ""} ({b.slotTime}–{b.slotEndTime})</title>
            </path>
          );
        })}

        {/* 24 ticks: half-hour minor (15°) + hour (30°) + major quarter-hour labels */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = i * 15;
          const isMajor = i % 6 === 0;    // 0°,90°,180°,270° → 12,3,6,9
          const isHour  = i % 2 === 0;    // every 30° → full hour mark
          const outer   = polar(angle, r - 3);
          const inner   = polar(angle, isMajor ? r - 14 : isHour ? r - 9 : r - 6);
          const numPos  = isMajor ? polar(angle, r - 23) : null;
          return (
            <g key={i}>
              <line
                x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
                x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
                stroke={isMajor ? "#64748b" : isHour ? "#cbd5e1" : "#e9edf2"}
                strokeWidth={isMajor ? 2.5 : isHour ? 1.5 : 1}
                strokeLinecap="round"
              />
              {numPos && (
                <text
                  x={numPos.x.toFixed(2)} y={numPos.y.toFixed(2)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="12" fontWeight="700" fill="#64748b"
                >
                  {HOUR_LABELS[angle]}
                </text>
              )}
            </g>
          );
        })}

        {/* Centre cap — on top of everything */}
        <circle cx={cx} cy={cy} r={innerR} fill="white" stroke="#e2e8f0" strokeWidth="2" />

        {/* Current-time hand (today only) */}
        {selectedDate === today && (
          <>
            <line
              x1={cx} y1={cy}
              x2={handEnd.x.toFixed(2)} y2={handEnd.y.toFixed(2)}
              stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"
            />
            <circle cx={handEnd.x.toFixed(2)} cy={handEnd.y.toFixed(2)} r="3.5" fill="#ef4444" />
          </>
        )}

        {/* Chair number */}
        <text x={cx} y={158} textAnchor="middle" fontSize="12" fontWeight="700" fill="#475569">
          Chair {chair.chairNumber}
        </text>
      </svg>

      {/* Booking time chips */}
      <div className="flex gap-1 flex-wrap justify-center min-h-[20px]">
        {chair.bookings.length === 0 ? (
          <span className="text-xs text-slate-300 font-medium">Free</span>
        ) : (
          chair.bookings.map((b) => (
            <span
              key={b.id}
              className="text-xs px-1.5 py-0.5 rounded font-semibold text-white"
              style={{ backgroundColor: CLOCK_COLORS[b.status] ?? "#94a3b8" }}
            >
              {b.slotTime}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function playAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function Dashboard() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const { shop, token, isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<number, string>>({});
  const prevBookingCount = useRef<number>(0);
  const [activeSection, setActiveSection] = useState<"dashboard" | "services" | "profile" | "personal" | "settings">("dashboard");
  const [dashboardSubTab, setDashboardSubTab] = useState<"timeline" | "bookings">("timeline");
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [interiorPaths, setInteriorPaths] = useState<string[] | null>(null);
  const [profilePath, setProfilePath] = useState<string | null | undefined>(undefined);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyModalSaving, setWeeklyModalSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    ownerName: "", shopName: "", phone: "", city: "", address: "", pincode: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Redirect if not authenticated or wrong shop
  useEffect(() => {
    if (!isAuthenticated || (shop && shop.slug !== slug)) {
      navigate("/login");
    }
  }, [isAuthenticated, shop, slug, navigate]);

  // Monday → show weekly availability popup
  useEffect(() => {
    if (!slug) return;
    const today = new Date();
    if (today.getDay() !== 1) return; // only Monday
    const d = today;
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const weekKey = `slotcut_weekly_${slug}_${d.getFullYear()}-W${weekNum}`;
    if (!localStorage.getItem(weekKey)) {
      setShowWeeklyModal(true);
      localStorage.setItem(weekKey, "1");
    }
  }, [slug]);

  const { data: dashboard, isLoading: dashLoading } = useGetShopDashboard(slug, {
    query: { queryKey: getGetShopDashboardQueryKey(slug), refetchInterval: 30_000 },
  });

  const { data: timeline, isLoading: timelineLoading } = useGetTimeline(slug, selectedDate, {
    query: { queryKey: getGetTimelineQueryKey(slug, selectedDate), refetchInterval: 15_000 },
  });

  const { data: bookings, isLoading: bookingsLoading } = useListBookings(slug, {
    query: {
      queryKey: getListBookingsQueryKey(slug),
      refetchInterval: 30_000,
      onSuccess: (data: any[]) => {
        if (prevBookingCount.current > 0 && data.length > prevBookingCount.current) {
          playAlert();
        }
        prevBookingCount.current = data.length;
      },
    },
  });

  const { data: activity } = useGetRecentActivity(slug, {
    query: { queryKey: getGetRecentActivityQueryKey(slug), refetchInterval: 30_000 },
  });

  const { data: revenue } = useGetRevenueStats(slug);

  const { data: shopProfile, refetch: refetchShopProfile } = useGetShop(slug);

  useEffect(() => {
    if (shopProfile?.shop) {
      const s = shopProfile.shop as any;
      setEditForm({
        ownerName: s.ownerName || "",
        shopName: s.shopName || "",
        phone: s.phone || "",
        city: s.city || "",
        address: s.address || "",
        pincode: s.pincode || ""
      });
    }
  }, [shopProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/shops/${slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      refetchShopProfile();
      alert("Profile updated successfully!");
    } catch {
      alert("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const updateStatusMutation = useUpdateShopStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetShopDashboardQueryKey(slug) });
      },
    },
  });

  const verifyOtpMutation = useVerifyArrivalOtp({
    mutation: {
      onSuccess: (_, vars: any) => {
        setOtpInputs((prev) => ({ ...prev, [vars.bookingId]: "" }));
        setOtpErrors((prev) => ({ ...prev, [vars.bookingId]: "" }));
        queryClient.invalidateQueries({ queryKey: getGetTimelineQueryKey(slug, selectedDate) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: getGetShopDashboardQueryKey(slug) });
      },
      onError: (_: any, vars: any) => {
        setOtpErrors((prev) => ({ ...prev, [vars.bookingId]: "Invalid OTP" }));
      },
    },
  });

  const noShowMutation = useMarkNoShow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTimelineQueryKey(slug, selectedDate) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: getGetShopDashboardQueryKey(slug) });
      },
    },
  });

  const undoNoShowMutation = useUndoNoShow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTimelineQueryKey(slug, selectedDate) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: getGetShopDashboardQueryKey(slug) });
      },
    },
  });

  const completeMutation = useCompleteBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTimelineQueryKey(slug, selectedDate) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: getGetShopDashboardQueryKey(slug) });
      },
    },
  });

  const handleSaveSchedule = async (days: number[], hoursMap: Record<string, { open: string; close: string }>) => {
    setWeeklyModalSaving(true);
    try {
      await fetch(`/api/shops/${slug}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openDays: days, openHours: hoursMap }),
      });
      refetchShopProfile();
    } catch {}
    setWeeklyModalSaving(false);
    setShowWeeklyModal(false);
  };

  const handleToggleOpen = () => {
    if (!shop) return;
    updateStatusMutation.mutate({ slug, data: { isOpen: !shop.isOpen } });
  };

  const handlePause = (minutes: number) => {
    updateStatusMutation.mutate({ slug, data: { pauseMinutes: minutes } });
  };

  const handleUnpause = () => {
    updateStatusMutation.mutate({ slug, data: { pauseMinutes: null } });
  };

  const handleOtpVerify = (bookingId: number) => {
    const otp = otpInputs[bookingId];
    if (!otp || otp.length !== 4) return;
    verifyOtpMutation.mutate({ slug, bookingId, data: { otp } });
  };

  if (!isAuthenticated || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openTime = timeline?.openTime ?? "09:00";
  const closeTime = timeline?.closeTime ?? "20:00";

  const revenueData = revenue?.map((r) => ({
    date: r.date.slice(5),
    revenue: r.revenue,
    bookings: r.bookings,
  }));

  const today = new Date().toISOString().split("T")[0];
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar + main layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-slate-900 text-white flex-shrink-0 flex flex-col hidden lg:flex">
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <Scissors className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">eNai</span>
            </div>
            <p className="text-slate-400 text-xs truncate">{shop.shopName}</p>
          </div>

          <div className="p-4 flex-1">
            <nav className="space-y-1 mb-8">
              {[
                { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
                { id: "services", label: "Services", icon: <Scissors className="w-4 h-4" /> },
                { id: "profile", label: "Barber Profile", icon: <Users className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </nav>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Shop Status</p>
            <button
              onClick={handleToggleOpen}
              disabled={updateStatusMutation.isPending}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                shop.isOpen ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <span>{shop.isOpen ? "Open" : "Closed"}</span>
              {shop.isOpen ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            </button>

            {shop.isPaused ? (
              <button
                onClick={handleUnpause}
                className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resume Bookings
              </button>
            ) : (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-slate-500 mb-2 mt-3 font-medium">Pause Bookings</p>
                {[30, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => handlePause(m)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <Pause className="w-3 h-3" /> {m} min
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {/* Top bar */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h1 className="font-bold text-slate-900">{shop.shopName}</h1>
              <p className="text-xs text-slate-400">{shop.city} · {shop.numChairs} chairs</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWeeklyModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> Edit Hours
              </button>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                shop.isOpen && !shop.isPaused ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {!shop.isOpen ? "Closed" : shop.isPaused ? "Paused" : "Open"}
              </span>
              {/* Mobile controls */}
              <div className="lg:hidden flex gap-2">
                <button
                  onClick={handleToggleOpen}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    shop.isOpen ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {shop.isOpen ? "Open" : "Closed"}
                </button>
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="p-1.5 text-slate-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="p-6">
            {activeSection === "dashboard" && (
              <>
                {/* Stats Grid */}
                {dashLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : dashboard && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Today's Bookings", value: dashboard.todayBookings, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "Active Slots", value: dashboard.activeSlots, icon: Clock, color: "text-blue-700", bg: "bg-blue-50" },
                      { label: "Available Chairs", value: dashboard.availableChairs, icon: TrendingUp, color: "text-slate-600", bg: "bg-slate-100" },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                      <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Timeline + Bookings */}
                  <div className="xl:col-span-2">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mb-4 w-fit">
                      {(["timeline", "bookings"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setDashboardSubTab(tab)}
                          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors capitalize ${
                            dashboardSubTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Date picker for timeline */}
                    {dashboardSubTab === "timeline" && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                        {dates.map((d) => {
                          const str = d.toISOString().split("T")[0];
                          const active = str === selectedDate;
                          return (
                            <button
                              key={str}
                              onClick={() => setSelectedDate(str)}
                              className={`flex-shrink-0 text-center px-3 py-2 rounded-lg border text-xs transition-all ${
                                active
                                  ? "bg-blue-600 border-blue-600 text-slate-900 font-bold"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                              }`}
                            >
                              <div className="font-semibold">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}</div>
                              <div className="font-bold">{d.getDate()}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Clock Dial Grid */}
                    {dashboardSubTab === "timeline" && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900 text-sm">Chair Clocks</h3>
                          <div className="flex items-center gap-2">
                            {[
                              { label: "Confirmed", color: "#60a5fa" },
                              { label: "Active", color: "#22c55e" },
                              { label: "Done", color: "#94a3b8" },
                              { label: "No-show", color: "#f87171" },
                            ].map(({ label, color }) => (
                              <span key={label} className="flex items-center gap-1 text-xs text-slate-500">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>

                        {timelineLoading ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 p-6">
                            {[1,2,3,4,5,6].map(i => (
                              <div key={i} className="flex flex-col items-center gap-2">
                                <div className="w-full aspect-square max-w-[160px] rounded-full bg-slate-100 animate-pulse" />
                                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 p-6">
                            {timeline?.chairs.map((chair) => (
                              <ClockDial
                                key={chair.chairNumber}
                                chair={chair}
                                selectedDate={selectedDate}
                                today={today}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bookings List */}
                    {dashboardSubTab === "bookings" && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="px-5 py-3 border-b border-slate-100">
                          <h3 className="font-semibold text-slate-900 text-sm">Today's Bookings</h3>
                        </div>
                        {bookingsLoading ? (
                          <div className="p-5 space-y-3">
                            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-lg animate-pulse" />)}
                          </div>
                        ) : !bookings || bookings.length === 0 ? (
                          <div className="p-10 text-center">
                            <Scissors className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No bookings yet today</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {bookings.map((booking) => (
                              <div key={booking.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-slate-900 text-sm">{booking.customerName}</p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? ""}`}>
                                        {booking.status.replace("_", " ")}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                      {booking.service?.name ?? "Service"} · Chair {booking.chairNumber} · {booking.slotTime} – {booking.slotEndTime}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {booking.paymentType === "token" ? "₹1 paid (token)" : `₹${booking.amountPaid} paid (full)`}
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    {booking.status === "confirmed" && (
                                      <>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            placeholder="OTP"
                                            value={otpInputs[booking.id] ?? ""}
                                            onChange={(e) => setOtpInputs((p) => ({ ...p, [booking.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                                            className="w-16 px-2 py-1.5 border border-slate-300 rounded text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                                          />
                                          <button
                                            onClick={() => handleOtpVerify(booking.id)}
                                            disabled={!otpInputs[booking.id] || otpInputs[booking.id]?.length !== 4}
                                            className="px-2.5 py-1.5 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                                          >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        {otpErrors[booking.id] && (
                                          <p className="text-xs text-red-500">{otpErrors[booking.id]}</p>
                                        )}
                                        <button
                                          onClick={() => noShowMutation.mutate({ slug, bookingId: booking.id })}
                                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                          <XCircle className="w-3 h-3" /> No-show
                                        </button>
                                      </>
                                    )}
                                    {booking.status === "active" && (
                                      <button
                                        onClick={() => completeMutation.mutate({ slug, bookingId: booking.id })}
                                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors flex items-center gap-1"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" /> Complete
                                      </button>
                                    )}
                                    {booking.status === "no_show" && (
                                      <button
                                        onClick={() => undoNoShowMutation.mutate({ slug, bookingId: booking.id })}
                                        disabled={undoNoShowMutation.isPending}
                                        className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" /> Undo No-show
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeSection === "services" && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Manage Services</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {shopProfile?.services?.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No services added yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {shopProfile?.services?.map((service) => (
                        <div key={service.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{service.name}</p>
                            <p className="text-sm text-slate-500">{service.durationMinutes} minutes</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">₹{service.price}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${service.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              {service.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "profile" && (
              <div className="max-w-4xl space-y-10 pb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-6">Barber Profile</h2>
                  
                  {/* Personal & Shop Information Form */}
                  <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <User className="w-5 h-5 text-blue-600" /> Personal & Shop Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Barber Name</label>
                        <input type="text" required value={editForm.ownerName} onChange={e => setEditForm({...editForm, ownerName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Shop Name</label>
                        <input type="text" required value={editForm.shopName} onChange={e => setEditForm({...editForm, shopName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input type="tel" required value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Pincode</label>
                        <input type="text" value={editForm.pincode} onChange={e => setEditForm({...editForm, pincode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                      </div>
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
                          <input type="text" required value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Address</label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input type="text" required value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-3 border-t border-slate-100 mt-5">
                      <button type="submit" disabled={savingProfile} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70">
                        {savingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save className="w-4 h-4" />} Save Changes
                      </button>
                    </div>
                  </form>
                </div>

                {/* Photos & Portfolio Section */}
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <Camera className="w-5 h-5 text-blue-600" /> Photos & Portfolio
                  </h3>
                  
                  {portfolioError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
                      {portfolioError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Profile Photo */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <h4 className="font-medium text-slate-900 text-sm mb-3">Profile / Cover Photo</h4>
                      <ImageUpload
                        label="Main shop photo"
                        multiple={false}
                        maxFiles={1}
                        existingPaths={
                          profilePath !== undefined
                            ? (profilePath ? [profilePath] : [])
                            : (shopProfile?.shop as any)?.profilePhoto
                            ? [(shopProfile.shop as any).profilePhoto]
                            : []
                        }
                        onUploaded={async (paths) => {
                          setPortfolioError("");
                          try {
                            await fetch(`/api/shops/${slug}/photos`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ profilePhoto: paths[0] }),
                            });
                            setProfilePath(paths[0]);
                            refetchShopProfile();
                          } catch {
                            setPortfolioError("Failed to save profile photo.");
                          }
                        }}
                        onRemove={async () => {
                          setPortfolioError("");
                          try {
                            await fetch(`/api/shops/${slug}/photos`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ profilePhoto: null }),
                            });
                            setProfilePath(null);
                            refetchShopProfile();
                          } catch {
                            setPortfolioError("Failed to remove profile photo.");
                          }
                        }}
                      />
                    </div>

                    {/* Interior Photos */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <h4 className="font-medium text-slate-900 text-sm mb-3">Interior / Salon Photos</h4>
                      {(() => {
                        const current: string[] = interiorPaths !== null
                          ? interiorPaths
                          : (((shopProfile?.shop as any)?.interiorPhotos as string[]) ?? []);
                        return (
                          <ImageUpload
                            label="Salon interior photos"
                            multiple
                            maxFiles={6}
                            existingPaths={current}
                            onUploaded={async (paths) => {
                              const updated = [...current, ...paths].slice(0, 6);
                              setPortfolioError("");
                              try {
                                await fetch(`/api/shops/${slug}/photos`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ interiorPhotos: updated }),
                                });
                                setInteriorPaths(updated);
                                refetchShopProfile();
                              } catch {
                                setPortfolioError("Failed to save interior photos.");
                              }
                            }}
                            onRemove={async (i) => {
                              const updated = current.filter((_, idx) => idx !== i);
                              setPortfolioError("");
                              try {
                                await fetch(`/api/shops/${slug}/photos`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ interiorPhotos: updated }),
                                });
                                setInteriorPaths(updated);
                                refetchShopProfile();
                              } catch {
                                setPortfolioError("Failed to remove photo.");
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Portfolio Photos */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h4 className="font-medium text-slate-900 text-sm mb-1">Portfolio Showcase</h4>
                    <p className="text-xs text-slate-400 mb-4">Hairstyles and your best work. Customers see this before booking.</p>
                    {(() => {
                      const portfolioPaths: string[] = ((shopProfile?.shop as any)?.portfolioPhotos as string[]) ?? [];
                      return (
                        <>
                          {portfolioPaths.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                              {portfolioPaths.map((p, i) => (
                                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                  <img src={photoUrl(p)} alt={`portfolio-${i}`} className="w-full h-full object-cover" />
                                  <button
                                    onClick={async () => {
                                      setPortfolioError("");
                                      try {
                                        await fetch(`/api/shops/${slug}/portfolio/${i}`, { method: "DELETE" });
                                        refetchShopProfile();
                                      } catch {
                                        setPortfolioError("Failed to delete photo.");
                                      }
                                    }}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="max-w-md">
                            <ImageUpload
                              label="Add portfolio photos"
                              multiple
                              maxFiles={20 - portfolioPaths.length}
                              existingPaths={[]}
                              onUploaded={async (paths) => {
                                setPortfolioError("");
                                setPortfolioUploading(true);
                                try {
                                  for (const p of paths) {
                                    await fetch(`/api/shops/${slug}/portfolio`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ photoPath: p }),
                                    });
                                  }
                                  refetchShopProfile();
                                } catch {
                                  setPortfolioError("Failed to save portfolio photos.");
                                } finally {
                                  setPortfolioUploading(false);
                                }
                              }}
                            />
                            {portfolioUploading && (
                              <p className="text-xs text-blue-700 mt-2 font-medium">Saving portfolio photos...</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Account & Support */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Support */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-blue-600" /> Contact Support
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">Need help with your account, billing, or features? We're here 24/7.</p>
                    <a href="mailto:support@enai.in" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-colors w-fit">
                      <Mail className="w-4 h-4" /> Email support@enai.in
                    </a>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <h3 className="text-red-800 font-bold mb-2 flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                      Deleting your account will permanently remove your shop, bookings, and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to permanently delete your account? This cannot be undone.")) {
                          try {
                            await fetch(`/api/barbers/me`, {
                              method: "DELETE",
                              headers: { "Authorization": `Bearer ${token}` }
                            });
                            logout();
                            navigate("/");
                          } catch (e) {
                            alert("Failed to delete account");
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>

              </div>
            )}
              </div>

              {/* Right panel: activity + revenue */}
              <div className="space-y-5">
                {/* Revenue chart */}
                {revenue && revenue.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 text-sm mb-4">7-Day Revenue</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={revenueData} barSize={16}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
                          formatter={(val: any) => [`₹${val}`, "Revenue"]}
                        />
                        <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900 text-sm">Recent Activity</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {!activity || activity.length === 0 ? (
                      <div className="p-5 text-center text-slate-400 text-sm">No activity yet</div>
                    ) : (
                      activity.map((item) => {
                        const colors: Record<string, string> = {
                          new_booking: "bg-blue-100 text-blue-600",
                          arrival: "bg-green-100 text-green-600",
                          no_show: "bg-red-100 text-red-500",
                          completed: "bg-slate-100 text-slate-500",
                          cancelled: "bg-slate-100 text-slate-400",
                        };
                        const icons: Record<string, React.ReactNode> = {
                          new_booking: <Clock className="w-3 h-3" />,
                          arrival: <CheckCircle className="w-3 h-3" />,
                          no_show: <AlertTriangle className="w-3 h-3" />,
                          completed: <CheckCircle className="w-3 h-3" />,
                          cancelled: <XCircle className="w-3 h-3" />,
                        };
                        return (
                          <div key={item.id} className="px-5 py-3 flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colors[item.type] ?? "bg-slate-100 text-slate-500"}`}>
                              {icons[item.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{item.customerName}</p>
                              <p className="text-xs text-slate-400 truncate">{item.serviceName} · {item.slotTime}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                {dashboard && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 text-sm mb-3">Today's Summary</h3>
                    <div className="space-y-2">
                      {[
                        { label: "Completed", value: dashboard.completedToday, color: "text-green-600" },
                        { label: "No-shows", value: dashboard.noShowsToday, color: "text-red-500" },
                        { label: "Weekly Bookings", value: dashboard.weeklyBookings, color: "text-blue-600" },
                        { label: "Weekly Revenue", value: `₹${dashboard.weeklyRevenue}`, color: "text-blue-700" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between py-1">
                          <span className="text-xs text-slate-500">{label}</span>
                          <span className={`text-sm font-bold ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
        </div>
      </div>
    </div>

    {showWeeklyModal && (
      <WeeklyScheduleModal
        currentOpenDays={(shopProfile?.shop as any)?.openDays ?? [0, 1, 2, 3, 4, 5, 6]}
        currentOpenHours={(shopProfile?.shop as any)?.openHours ?? {}}
        onSave={handleSaveSchedule}
        onClose={() => setShowWeeklyModal(false)}
        isSaving={weeklyModalSaving}
      />
    )}
    </>
  );
}

