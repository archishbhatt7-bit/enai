import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetShop,
  useGetAvailableSlots,
  useSendOtp,
  useVerifyOtp,
  useCreateBooking,
} from "@workspace/api-client-react";
import {
  Scissors,
  ArrowLeft,
  Clock,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Check,
  Phone,
  User,
  Image as ImageIcon,
} from "lucide-react";
import { photoUrl } from "@/components/ImageUpload";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}

type BookingStep = "service" | "slot" | "payment" | "contact" | "otp" | "confirm";

export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();

  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<"morning" | "afternoon" | "evening">("morning");
  const [paymentType, setPaymentType] = useState<"token" | "full">("token");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [bookingOtp, setBookingOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playSuccessSound() {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  }

  useEffect(() => {
    if (step === "confirm") {
      setShowSuccessOverlay(true);
      playSuccessSound();
      const timer = setTimeout(() => setShowSuccessOverlay(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const { data: profileData, isLoading: shopLoading } = useGetShop(slug);
  const shop = profileData?.shop;
  const services = profileData?.services ?? [];

  const selectedServiceObj = services.find((s) => s.id === selectedService);

  const { data: slotsData, isLoading: slotsLoading } = useGetAvailableSlots(
    slug,
    selectedDate,
    selectedService ?? 0,
    { query: { enabled: !!selectedService && step === "slot" } }
  );

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        // In demo mode, show OTP to user
        if (data.otp) setBookingOtp(data.otp);
        setStep("otp");
      },
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: () => {
        createBookingMutation.mutate({
          slug,
          data: {
            customerName,
            customerPhone,
            serviceId: selectedService!,
            slotDate: selectedDate,
            slotTime: selectedTime!,
            paymentType,
          },
        });
      },
      onError: () => {
        setOtpError("Invalid OTP. Please try again.");
      },
    },
  });

  const createBookingMutation = useCreateBooking({
    mutation: {
      onSuccess: () => {
        setStep("confirm");
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Booking failed. Please try again.");
        setStep("contact");
      },
    },
  });

  const handleSendOtp = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please fill in your name and phone number.");
      return;
    }
    if (customerPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError("");
    sendOtpMutation.mutate({ data: { phone: customerPhone } });
  };

  const handleVerifyOtp = () => {
    setOtpError("");
    verifyOtpMutation.mutate({ data: { phone: customerPhone, otp } });
  };

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">Shop not found</h1>
          <button onClick={() => navigate("/customer")} className="mt-4 text-amber-600 font-medium text-sm">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const shopClosed = !shop.isOpen || shop.isPaused;

  return (
    <div className="min-h-screen bg-slate-50">
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center success-overlay-bg">
          <div className="success-tick-circle">
            <svg className="success-tick-svg" viewBox="0 0 52 52" fill="none">
              <circle className="success-tick-ring" cx="26" cy="26" r="24" stroke="white" strokeWidth="3" fill="none" />
              <path className="success-tick-check" d="M14 26 L22 34 L38 18" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>
      )}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/customer")} className="text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center flex-shrink-0">
              <Scissors className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm truncate">{shop.shopName}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />{shop.city}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            shopClosed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
          }`}>
            {shopClosed ? (shop.isPaused ? "Paused" : "Closed") : "Open"}
          </span>
        </div>
      </header>

      {/* Profile photo banner */}
      {(shop as any).profilePhoto && (
        <div className="w-full max-w-lg mx-auto overflow-hidden" style={{ height: 180 }}>
          <img
            src={photoUrl((shop as any).profilePhoto)}
            alt={shop.shopName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Booking steps indicator */}
        {step !== "confirm" && (
          <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
            {(["service", "slot", "payment", "contact"] as BookingStep[]).map((s, i) => {
              const labels = ["Service", "Time Slot", "Payment", "Contact"];
              const stepOrder = ["service", "slot", "payment", "contact", "otp", "confirm"];
              const currentIdx = stepOrder.indexOf(step);
              const thisIdx = stepOrder.indexOf(s);
              const done = currentIdx > thisIdx;
              const active = step === s;
              return (
                <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 ${active ? "opacity-100" : done ? "opacity-80" : "opacity-40"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? "bg-green-500 text-white" : active ? "bg-amber-500 text-slate-900" : "bg-slate-200 text-slate-500"
                    }`}>
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>
                      {labels[i]}
                    </span>
                  </div>
                  {i < 3 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        {shopClosed && step === "service" && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 font-semibold text-sm">Shop is currently {shop.isPaused ? "paused" : "closed"}</p>
              <p className="text-red-500 text-xs mt-0.5">Online bookings are not available right now.</p>
            </div>
          </div>
        )}

        {/* STEP 1: Select Service */}
        {step === "service" && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Choose a service</h2>
            {services.filter((s) => s.isActive).length === 0 ? (
              <p className="text-slate-400 text-sm">No services available.</p>
            ) : (
              <div className="space-y-3">
                {services.filter((s) => s.isActive).map((service) => (
                  <button
                    key={service.id}
                    disabled={shopClosed}
                    onClick={() => {
                      setSelectedService(service.id);
                      setStep("slot");
                    }}
                    className="w-full text-left border border-slate-200 rounded-xl p-4 bg-white hover:border-amber-400 hover:bg-amber-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{service.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-amber-600 font-bold">₹{service.price}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> ~{service.durationMinutes} min
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Shop hours</p>
              <p className="text-sm text-slate-700 font-medium">{shop.openTime} – {shop.closeTime}</p>
              <p className="text-xs text-slate-400 mt-1">{shop.numChairs} chair{shop.numChairs !== 1 ? "s" : ""} • {shop.numBarbers} barber{shop.numBarbers !== 1 ? "s" : ""}</p>
            </div>

            {/* Interior photos gallery */}
            {((shop as any).interiorPhotos as string[] | null)?.length ? (
              <div className="mt-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Inside the Salon</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {((shop as any).interiorPhotos as string[]).map((p, i) => (
                    <img
                      key={i}
                      src={photoUrl(p)}
                      alt={`interior-${i}`}
                      className="w-32 h-24 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Portfolio / work showcase */}
            {((shop as any).portfolioPhotos as string[] | null)?.length ? (
              <div className="mt-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  <ImageIcon className="w-3.5 h-3.5 inline mr-1" />Our Work
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {((shop as any).portfolioPhotos as string[]).map((p, i) => (
                    <img
                      key={i}
                      src={photoUrl(p)}
                      alt={`portfolio-${i}`}
                      className="aspect-square object-cover rounded-lg border border-slate-200 w-full"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 2: Select Slot */}
        {step === "slot" && selectedServiceObj && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep("service")} className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pick a time</h2>
                <p className="text-xs text-slate-400">{selectedServiceObj.name} — ₹{selectedServiceObj.price}</p>
              </div>
            </div>

            {/* Date Picker */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
              {dates.map((d) => {
                const str = formatDate(d);
                const active = str === selectedDate;
                return (
                  <button
                    key={str}
                    onClick={() => { setSelectedDate(str); setSelectedTime(null); setTimePeriod("morning"); }}
                    className={`flex-shrink-0 text-center px-3 py-2.5 rounded-lg border transition-all ${
                      active
                        ? "bg-amber-500 border-amber-500 text-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:border-amber-300"
                    }`}
                  >
                    <p className="text-xs font-semibold">{DAYS[d.getDay()]}</p>
                    <p className="text-sm font-bold mt-0.5">{d.getDate()}</p>
                  </button>
                );
              })}
            </div>

            {slotsLoading && (
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {!slotsLoading && slotsData && (() => {
              const allSlots = slotsData.slots;

              const inPeriod = (time: string, period: typeof timePeriod) => {
                const h = parseInt(time.split(":")[0], 10);
                if (period === "morning")   return h >= 0  && h < 12;
                if (period === "afternoon") return h >= 12 && h < 17;
                return h >= 17;
              };

              const countAvail = (period: typeof timePeriod) =>
                allSlots.filter((s) => s.available && inPeriod(s.time, period)).length;

              const morningCount   = countAvail("morning");
              const afternoonCount = countAvail("afternoon");
              const eveningCount   = countAvail("evening");

              const periods = [
                { key: "morning"   as const, label: "Morning",   emoji: "🌅", range: "before 12 PM", count: morningCount   },
                { key: "afternoon" as const, label: "Afternoon",  emoji: "☀️", range: "12 – 5 PM",   count: afternoonCount },
                { key: "evening"   as const, label: "Evening",    emoji: "🌆", range: "after 5 PM",   count: eveningCount   },
              ];

              const visibleSlots = allSlots.filter((s) => inPeriod(s.time, timePeriod));

              return (
                <>
                  {/* Period tabs */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {periods.map(({ key, label, emoji, range, count }) => {
                      const active = timePeriod === key;
                      return (
                        <button
                          key={key}
                          onClick={() => { setTimePeriod(key); setSelectedTime(null); }}
                          className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                            active
                              ? "border-amber-500 bg-amber-50"
                              : "border-slate-200 bg-white hover:border-amber-300"
                          }`}
                        >
                          <span className="text-xl mb-1 leading-none">{emoji}</span>
                          <span className={`text-xs font-bold ${active ? "text-amber-700" : "text-slate-700"}`}>{label}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{range}</span>
                          <span className={`mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            count > 0
                              ? active ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-600"
                              : "bg-slate-50 text-slate-300"
                          }`}>
                            {count} slot{count !== 1 ? "s" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Slot grid */}
                  {visibleSlots.filter((s) => s.available).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 text-sm font-medium">No {timePeriod} slots available</p>
                      <p className="text-slate-400 text-xs mt-1">Try a different time of day or date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {visibleSlots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => { setSelectedTime(slot.time); setStep("payment"); }}
                          className={`py-3 px-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                            !slot.available
                              ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                              : selectedTime === slot.time
                              ? "bg-amber-500 border-amber-500 text-slate-900"
                              : "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50"
                          }`}
                        >
                          {slot.time}
                          {slot.available && (
                            <div className="text-xs font-normal opacity-60 mt-0.5">
                              {slot.availableChairs} left
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === "payment" && selectedServiceObj && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep("slot")} className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Choose payment</h2>
            </div>

            <div className="bg-slate-100 rounded-lg p-4 mb-5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{selectedServiceObj.name}</span>
                <span>₹{selectedServiceObj.price}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-xs mt-1">
                <span>Date & time</span>
                <span>{formatDisplayDate(new Date(selectedDate + "T12:00:00"))} at {selectedTime}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentType("token")}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  paymentType === "token" ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Token Booking</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">₹1</p>
                    <p className="text-xs text-slate-500 mt-1">Pay ₹{selectedServiceObj.price} directly to barber after service</p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">₹1 platform fee charged now</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                    paymentType === "token" ? "border-amber-500 bg-amber-500" : "border-slate-300"
                  }`}>
                    {paymentType === "token" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPaymentType("full")}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  paymentType === "full" ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Full Payment</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">₹{selectedServiceObj.price}</p>
                    <p className="text-xs text-slate-500 mt-1">Pay full amount now</p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">₹0 platform fee</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                    paymentType === "full" ? "border-amber-500 bg-amber-500" : "border-slate-300"
                  }`}>
                    {paymentType === "full" && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            </div>

            {/* Buffer warning */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Arrive 5–10 minutes early.</strong> Your slot at {selectedTime} includes a 10-minute cleanup buffer. If you're more than 10 minutes late, your slot may be cancelled.
              </p>
            </div>

            <button
              onClick={() => setStep("contact")}
              className="w-full bg-amber-500 text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors"
            >
              Continue — Pay ₹{paymentType === "token" ? 1 : selectedServiceObj.price}
            </button>
          </div>
        )}

        {/* STEP 4: Contact */}
        {step === "contact" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep("payment")} className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Your details</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">WhatsApp Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Your arrival OTP will be sent to this number</p>
              </div>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={sendOtpMutation.isPending}
              className="w-full bg-amber-500 text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-60"
            >
              {sendOtpMutation.isPending ? "Sending OTP..." : "Send OTP & Confirm Booking"}
            </button>
          </div>
        )}

        {/* STEP 5: OTP Verification */}
        {step === "otp" && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Verify your number</h2>
            <p className="text-slate-500 text-sm mb-6">
              Enter the 4-digit OTP sent to <strong>{customerPhone}</strong>
            </p>

            {bookingOtp && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <p className="text-amber-700 font-semibold">Demo Mode — Your OTP: <span className="text-2xl font-black">{bookingOtp}</span></p>
              </div>
            )}

            {otpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {otpError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">4-Digit OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full px-4 py-4 text-3xl font-black text-center border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 tracking-widest"
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={otp.length !== 4 || verifyOtpMutation.isPending || createBookingMutation.isPending}
              className="w-full bg-amber-500 text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-60"
            >
              {verifyOtpMutation.isPending || createBookingMutation.isPending ? "Verifying..." : "Verify & Book"}
            </button>

            <button
              onClick={() => { sendOtpMutation.mutate({ data: { phone: customerPhone } }); }}
              className="w-full mt-3 text-slate-500 text-sm hover:text-slate-700"
            >
              Resend OTP
            </button>
          </div>
        )}

        {/* STEP 6: Booking Confirmed */}
        {step === "confirm" && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your slot at <strong>{selectedTime}</strong> on <strong>{formatDisplayDate(new Date(selectedDate + "T12:00:00"))}</strong> is booked.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-left">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Booking Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service</span>
                  <span className="font-semibold text-slate-900">{selectedServiceObj?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time</span>
                  <span className="font-semibold text-slate-900">{selectedTime} on {formatDisplayDate(new Date(selectedDate + "T12:00:00"))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-semibold text-slate-900">₹{paymentType === "token" ? 1 : selectedServiceObj?.price} paid</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left mb-6">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Important</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                You'll receive an <strong>arrival OTP on WhatsApp</strong>. Show it to the barber when you sit on the chair to start your service.
                <br /><br />
                <strong>Arrive 5–10 minutes early</strong> to your slot time. If you're more than 10 minutes late, your slot may be cancelled.
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="w-full bg-amber-500 text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
