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
  DollarSign,
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

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

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
  const openMins = timeToMinutes(openTime);
  const closeMins = timeToMinutes(closeTime);
  const totalMins = closeMins - openMins;

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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Today's Bookings", value: dashboard.todayBookings, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Today's Revenue", value: `₹${dashboard.todayRevenue}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
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

                {/* Visual Chair Timeline */}
                {activeTab === "timeline" && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 text-sm">Chair Timeline</h3>
                      <p className="text-xs text-slate-400">{openTime} – {closeTime}</p>
                    </div>

                    {timelineLoading ? (
                      <div className="p-5 space-y-4">
                        {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />)}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[560px] p-5">
                          {/* Hour labels */}
                          <div className="flex mb-3 ml-20">
                            {Array.from({ length: Math.ceil(totalMins / 60) + 1 }).map((_, i) => {
                              const h = Math.floor(openMins / 60) + i;
                              return (
                                <div
                                  key={h}
                                  className="text-xs text-slate-300 font-medium"
                                  style={{ width: `${(60 / totalMins) * 100}%` }}
                                >
                                  {String(h).padStart(2, "0")}:00
                                </div>
                              );
                            })}
                          </div>

                          {/* Chair rows */}
                          {timeline?.chairs.map((chair) => (
                            <div key={chair.chairNumber} className="flex items-center gap-3 mb-3">
                              <div className="w-16 flex-shrink-0 text-right">
                                <span className="text-xs font-semibold text-slate-500">Chair {chair.chairNumber}</span>
                              </div>
                              <div className="flex-1 h-12 bg-slate-50 rounded-lg relative border border-slate-100 overflow-hidden">
                                {/* Grid lines */}
                                {Array.from({ length: Math.ceil(totalMins / 60) }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-slate-200"
                                    style={{ left: `${(i * 60 / totalMins) * 100}%` }}
                                  />
                                ))}
                                {/* Booking blocks */}
                                {chair.bookings.map((booking) => {
                                  const start = timeToMinutes(booking.slotTime) - openMins;
                                  const end = timeToMinutes(booking.slotEndTime) - openMins;
                                  const left = (start / totalMins) * 100;
                                  const width = ((end - start) / totalMins) * 100;
                                  return (
                                    <div
                                      key={booking.id}
                                      className={`absolute top-1 bottom-1 rounded ${TIMELINE_COLORS[booking.status] ?? "bg-slate-300"} flex flex-col justify-center px-1.5 overflow-hidden`}
                                      style={{ left: `${left}%`, width: `${width}%` }}
                                      title={`${booking.customerName} - ${booking.service?.name ?? ""} (${booking.slotTime})`}
                                    >
                                      <p className="text-white text-xs font-semibold truncate leading-tight">{booking.customerName}</p>
                                      <p className="text-white/70 text-xs truncate">{booking.slotTime}</p>
                                    </div>
                                  );
                                })}
                                {/* Current time indicator */}
                                {selectedDate === today && (() => {
                                  const now = new Date();
                                  const nowMins = now.getHours() * 60 + now.getMinutes() - openMins;
                                  const pos = (nowMins / totalMins) * 100;
                                  if (pos < 0 || pos > 100) return null;
                                  return (
                                    <div
                                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                      style={{ left: `${pos}%` }}
                                    />
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
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
