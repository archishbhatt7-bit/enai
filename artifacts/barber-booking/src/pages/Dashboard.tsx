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
  useCompleteBooking,
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
} from "lucide-react";
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
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

const TIMELINE_COLORS: Record<string, string> = {
  confirmed: "bg-blue-400",
  active: "bg-green-500",
  completed: "bg-slate-300",
  no_show: "bg-red-300",
  pending: "bg-amber-400",
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

        {/* Hour ticks + numbers */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * 30;
          const major = i % 3 === 0;
          const outer = polar(angle, r - 3);
          const inner = polar(angle, major ? r - 14 : r - 8);
          const numPos = major ? polar(angle, r - 23) : null;
          return (
            <g key={i}>
              <line
                x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
                x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
                stroke={major ? "#94a3b8" : "#cbd5e1"}
                strokeWidth={major ? 2.5 : 1}
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

        {/* Booking pie slices */}
        {chair.bookings.map((b) => {
          let startA = timeToAngleDeg(b.slotTime);
          let endA = timeToAngleDeg(b.slotEndTime);
          if (endA <= startA) endA += 360;
          const color = CLOCK_COLORS[b.status] ?? "#94a3b8";
          return (
            <path key={b.id} d={pieSlice(startA, endA)} fill={color} opacity="0.85">
              <title>{b.customerName} — {b.service?.name ?? ""} ({b.slotTime}–{b.slotEndTime})</title>
            </path>
          );
        })}

        {/* Centre cap */}
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

        {/* Chair number below clock */}
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
  const { shop, isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<number, string>>({});
  const prevBookingCount = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<"timeline" | "bookings">("timeline");

  // Redirect if not authenticated or wrong shop
  useEffect(() => {
    if (!isAuthenticated || (shop && shop.slug !== slug)) {
      navigate("/login");
    }
  }, [isAuthenticated, shop, slug, navigate]);

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

  const completeMutation = useCompleteBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTimelineQueryKey(slug, selectedDate) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: getGetShopDashboardQueryKey(slug) });
      },
    },
  });

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
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar + main layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-slate-900 text-white flex-shrink-0 flex flex-col hidden lg:flex">
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center">
                <Scissors className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <span className="font-bold text-sm">SlotCut</span>
            </div>
            <p className="text-slate-400 text-xs truncate">{shop.shopName}</p>
          </div>

          <div className="p-4 flex-1">
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
                className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
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

            <div className="mt-6 space-y-1">
              <button
                onClick={() => navigate(`/shop/${slug}`)}
                className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <ChevronRight className="w-3.5 h-3.5" /> View Shop Page
              </button>
            </div>
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
            {/* Stats Grid */}
            {dashLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : dashboard && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Today's Bookings", value: dashboard.todayBookings, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Active Slots", value: dashboard.activeSlots, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
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
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors capitalize ${
                        activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Date picker for timeline */}
                {activeTab === "timeline" && (
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
                              ? "bg-amber-500 border-amber-500 text-slate-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
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
                {activeTab === "timeline" && (
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
                {activeTab === "bookings" && (
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
                                        className="w-16 px-2 py-1.5 border border-slate-300 rounded text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                        <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
                        { label: "Weekly Revenue", value: `₹${dashboard.weeklyRevenue}`, color: "text-amber-600" },
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
      </div>
    </div>
  );
}
