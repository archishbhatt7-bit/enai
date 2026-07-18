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
  Users,
  Image as ImageIcon,
  Navigation,
  Calendar,
  X
} from "lucide-react";
import { photoUrl } from "@/components/ImageUpload";
import { useCustomerAuth } from "@/lib/customerAuth";

declare global { interface Window { L: any; } }

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayHours = { open: string; close: string; breakStart?: string; breakEnd?: string };

function ShopHours({
  openDays,
  openHours,
  fallbackOpen,
  fallbackClose,
}: {
  openDays?: number[];
  openHours?: Record<string, DayHours>;
  fallbackOpen: string;
  fallbackClose: string;
}) {
  const today = new Date().getDay();
  if (!openDays?.length && !openHours) {
    return <p className="text-sm text-slate-700 font-bold">{fallbackOpen} – {fallbackClose}</p>;
  }
  const days = openDays ?? [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="space-y-1.5">
      {DAY_ABBR.map((abbr, i) => {
        const isOpen = days.includes(i);
        const h: DayHours | undefined = openHours?.[String(i)];
        const isToday = i === today;
        return (
          <div
            key={abbr}
            className={`flex items-center gap-3 text-sm rounded-xl px-3 py-1.5 ${isToday ? "bg-blue-50 border border-blue-100" : ""}`}
          >
            <span className={`w-10 font-bold text-xs uppercase tracking-wider ${isToday ? "text-blue-700" : "text-slate-500"}`}>
              {abbr}
            </span>
            {isOpen ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold ${isToday ? "text-blue-900" : "text-slate-800"}`}>
                  {h ? `${h.open} – ${h.close}` : `${fallbackOpen} – ${fallbackClose}`}
                </span>
                {h?.breakStart && (
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                    break {h.breakStart}–{h.breakEnd}
                  </span>
                )}
                {isToday && (
                  <span className="text-[10px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-lg uppercase tracking-wide">Today</span>
                )}
              </div>
            ) : (
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function ShopMap({ shopLat, shopLng, shopName }: { shopLat?: string | null; shopLng?: string | null; shopName: string }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [distKm, setDistKm] = useState<number | null>(null);

  useEffect(() => {
    if (!shopLat || !shopLng) return;

    const initMap = () => {
      if (!mapDivRef.current || mapInstanceRef.current) return;
      const L = window.L;
      const sLat = parseFloat(shopLat);
      const sLng = parseFloat(shopLng);

      const map = L.map(mapDivRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      }).setView([sLat, sLng], 14);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
      mapInstanceRef.current = map;

      const shopIcon = L.divIcon({
        html: '<div style="width:24px;height:24px;background:#2563eb;border:4px solid white;border-radius:50%;box-shadow:0 4px 12px rgba(37,99,235,0.4)"></div>',
        iconSize: [24, 24], iconAnchor: [12, 12], className: "",
      });
      L.marker([sLat, sLng], { icon: shopIcon })
        .bindTooltip(shopName, { permanent: false, offset: [0, -16] })
        .addTo(map);

      navigator.geolocation.getCurrentPosition((pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        const km = haversineKm(uLat, uLng, sLat, sLng);
        setDistKm(km);

        const gpsIcon = L.divIcon({
          html: `<div style="position:relative;width:24px;height:24px">
            <div style="position:absolute;inset:0;background:rgba(37,99,235,0.2);border-radius:50%;animation:gpsPulse 1.8s ease-out infinite"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
          </div>`,
          iconSize: [24, 24], iconAnchor: [12, 12], className: "",
        });
        L.marker([uLat, uLng], { icon: gpsIcon })
          .bindTooltip("You", { permanent: false, offset: [0, -12] })
          .addTo(map);

        const bounds = L.latLngBounds([[sLat, sLng], [uLat, uLng]]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }, () => {});
    };

    if (!document.getElementById("leaflet-css-shop")) {
      const link = document.createElement("link");
      link.id = "leaflet-css-shop";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (window.L) {
      initMap();
    } else {
      const existing = document.getElementById("leaflet-js-shop");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "leaflet-js-shop";
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = initMap;
        document.head.appendChild(s);
      } else {
        const poll = setInterval(() => { if (window.L) { clearInterval(poll); initMap(); } }, 80);
      }
    }

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, [shopLat, shopLng, shopName]);

  if (!shopLat || !shopLng) return null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] shadow-sm border border-slate-200" style={{ height: 220 }}>
      <div ref={mapDivRef} style={{ height: "100%", width: "100%" }} className="bg-slate-100" />
      {distKm !== null && (
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl text-xs font-black text-slate-900 shadow-lg border border-slate-200/50 flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
             <Navigation className="w-3 h-3 text-blue-600" />
          </div>
          {distKm < 1
            ? `${Math.round(distKm * 1000)} m away`
            : distKm < 10
            ? `${distKm.toFixed(1)} km away`
            : `${Math.round(distKm)} km away`}
        </div>
      )}
    </div>
  );
}

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(d: Date) {
  return `${DAY_ABBR[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}

type BookingStep = "service" | "slot" | "payment" | "contact" | "otp" | "confirm";

export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const { logoutCustomer } = useCustomerAuth();

  // Auto-fill from profile
  const storedPhone = typeof window !== 'undefined' ? localStorage.getItem("customer_phone") || "" : "";
  let initialName = "";
  if (storedPhone && typeof window !== 'undefined') {
    const profileRaw = localStorage.getItem(`slotcut_profile_${storedPhone}`);
    if (profileRaw) {
      try {
        const p = JSON.parse(profileRaw);
        initialName = p.name || "";
      } catch (e) {}
    }
  }

  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<"morning" | "afternoon" | "evening">("morning");
  const [paymentType, setPaymentType] = useState<"token" | "full">("token");
  const [customerName, setCustomerName] = useState(initialName);
  const [customerPhone, setCustomerPhone] = useState(storedPhone);
  const [error, setError] = useState("");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [finalBooking, setFinalBooking] = useState<any>(null);
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
    return undefined;
  }, [step]);

  const { data: profileData, isLoading: shopLoading } = useGetShop(slug);
  const shop = profileData?.shop as any; // Type override for extended frontend fields
  const services = profileData?.services ?? [];

  const selectedServiceObj = services.find((s) => s.id === selectedService);

  const { data: slotsData, isLoading: slotsLoading } = useGetAvailableSlots(
    slug,
    selectedDate,
    selectedService ?? 0,
    { query: { enabled: !!selectedService && step === "slot" } as any }
  );

  const createBookingMutation = useCreateBooking({
    mutation: {
      onSuccess: (data) => {
        setFinalBooking(data);
        setStep("confirm");
      },
      onError: (err: any) => {
        if (err?.status === 401) {
          logoutCustomer();
          setError("Your session has expired. Please log in again.");
          setTimeout(() => navigate(`/customer-login?redirect=/shop/${slug}`), 1500);
          return;
        }
        setError(err?.data?.error || "Booking failed. Please try again.");
        setStep("contact");
      },
    },
  });

  const handleCreateBooking = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please fill in your name and phone number.");
      return;
    }
    if (customerPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError("");
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
  };

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white p-10 rounded-[2rem] shadow-xl border border-slate-200">
          <Scissors className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shop not found</h1>
          <button onClick={() => navigate("/customer")} className="mt-6 bg-blue-600 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-blue-600/30">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const shopClosed = !shop.isOpen || shop.isPaused;
  const allPhotos = [
    shop.profilePhoto,
    ...(shop.interiorPhotos || []),
    ...(shop.portfolioPhotos || [])
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
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

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/customer")} className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-700 font-bold text-sm">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight">{shop.shopName}</h1>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${
            shopClosed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
          }`}>
            {shopClosed ? (shop.isPaused ? "Paused" : "Closed") : "Open"}
          </span>
        </div>
      </header>

      {/* Photo Gallery Carousel */}
      {allPhotos.length > 0 ? (
        <div className="w-full bg-slate-900 overflow-hidden relative shadow-inner">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none z-10" />
          <div className="flex overflow-x-auto gap-1 snap-x snap-mandatory hide-scrollbar relative z-0">
            {allPhotos.map((photo, idx) => (
              <div key={idx} className="snap-center shrink-0 w-[85vw] sm:w-[400px] lg:w-[500px] h-[30vh] sm:h-[400px] relative">
                <img src={photoUrl(photo)} alt="Shop" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="absolute bottom-4 right-4 z-20 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
             <p className="text-white text-xs font-bold tracking-widest uppercase flex items-center gap-1.5">
               <ImageIcon className="w-3.5 h-3.5" /> {allPhotos.length} Photos
             </p>
          </div>
        </div>
      ) : (
        <div className="w-full bg-slate-900 h-48 flex items-center justify-center">
           <Scissors className="w-12 h-12 text-slate-700 opacity-50" />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Details & Services */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Shop Header Details */}
          <div>
            <h1 className="text-4xl font-black text-slate-900 leading-tight mb-3 tracking-tight">{shop.shopName}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm"><MapPin className="w-4 h-4 text-blue-600" /> {shop.fullAddress || shop.city}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm"><Phone className="w-4 h-4 text-blue-600" /> +91 {shop.phone || "Not provided"}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-sm"><Users className="w-4 h-4 text-blue-600" /> {shop.numBarbers} Barbers</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Map & Location */}
            <div>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Location</h3>
               <ShopMap shopLat={shop.latitude} shopLng={shop.longitude} shopName={shop.shopName} />
               {/* Address + directions — always shown */}
               <div className="mt-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                 <div className="flex items-start gap-3">
                   <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                     <MapPin className="w-4 h-4 text-blue-600" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-slate-900 leading-snug">
                       {shop.address || shop.city || "Address not provided"}
                     </p>
                     {shop.address && shop.city && (
                       <p className="text-xs text-slate-500 mt-0.5">{shop.city}{shop.pincode ? ` — ${shop.pincode}` : ""}</p>
                     )}
                   </div>
                 </div>
                 <a
                   href={
                     shop.latitude && shop.longitude
                       ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
                       : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((shop.address || "") + " " + (shop.city || ""))}`
                   }
                   target="_blank"
                   rel="noopener noreferrer"
                   className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                 >
                   <Navigation className="w-4 h-4" />
                   Get Directions
                 </a>
               </div>
            </div>

            {/* Hours */}
            <div>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Opening Hours</h3>
               <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                 <ShopHours openDays={shop.openDays} openHours={shop.openHours} fallbackOpen={shop.openTime} fallbackClose={shop.closeTime} />
               </div>
            </div>
          </div>

          {/* Services List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Services</h2>
              <span className="text-sm font-bold text-slate-400 bg-slate-200/50 px-3 py-1 rounded-xl">{services.filter(s => s.isActive).length} Available</span>
            </div>
            
            {shopClosed && (
              <div className="mb-6 p-5 bg-red-50 border-2 border-red-100 rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-red-700 font-black text-lg">Shop is currently {shop.isPaused ? "paused" : "closed"}</p>
                  <p className="text-red-600 font-medium text-sm mt-1">Online bookings are not available right now. Check the opening hours above.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.filter((s) => s.isActive).map((service) => (
                <button
                  key={service.id}
                  disabled={shopClosed}
                  onClick={() => {
                    setSelectedService(service.id);
                    setStep("slot");
                    if (window.innerWidth < 1024) {
                      window.scrollTo({ top: 400, behavior: "smooth" }); // Scroll to view side panel on mobile
                    }
                  }}
                  className={`text-left border-2 rounded-3xl p-5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedService === service.id 
                      ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-900/10" 
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <p className={`font-black text-lg leading-tight ${selectedService === service.id ? "text-blue-900" : "text-slate-900"}`}>
                      {service.name}
                    </p>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedService === service.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"}`}>
                      {selectedService === service.id ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-auto">
                    <span className="text-xl font-black text-slate-900 tracking-tight">₹{service.price}</span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5" /> {service.durationMinutes} min
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Panel */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-24">
            
            {step === "service" ? (
              <div className="bg-white border-2 border-slate-200 border-dashed rounded-[2.5rem] p-10 text-center shadow-sm">
                 <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Calendar className="w-8 h-8 text-blue-500" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Book an Appointment</h3>
                 <p className="text-slate-500 font-medium text-base">Select a service from the list to see available time slots and complete your booking.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
                
                {/* Booking Steps Header */}
                {step !== "confirm" && (
                  <div className="bg-slate-900 p-6 pb-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-2">
                       <h2 className="text-xl font-black tracking-tight relative z-10">
                         {step === "slot" ? "Pick a Time" : step === "payment" ? "Payment Option" : step === "contact" ? "Your Details" : "Verification"}
                       </h2>
                       <button onClick={() => setStep("service")} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full relative z-10">
                         <X className="w-4 h-4" />
                       </button>
                    </div>

                    {/* Progress Bar Indicators */}
                    <div className="flex items-center gap-1.5 mt-6 relative z-10">
                      {(["slot", "payment", "contact", "confirm"] as BookingStep[]).map((s, i) => {
                        const stepOrder = ["slot", "payment", "contact", "confirm"];
                        const currentIdx = stepOrder.indexOf(step);
                        const thisIdx = stepOrder.indexOf(s);
                        const done = currentIdx > thisIdx;
                        const active = step === s;
                        return (
                          <div key={s} className="flex-1">
                            <div className={`h-1.5 rounded-full transition-colors ${done || active ? "bg-blue-500" : "bg-slate-700"}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Booking Content Container */}
                <div className="p-6 sm:p-8 bg-white flex-1">
                  
                  {/* Selected Service Summary Header */}
                  {step !== "confirm" && selectedServiceObj && (
                    <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-8">
                       <div>
                         <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Selected Service</p>
                         <p className="font-bold text-slate-900 text-sm truncate">{selectedServiceObj.name}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Price</p>
                         <p className="font-black text-slate-900 text-sm">₹{selectedServiceObj.price}</p>
                       </div>
                    </div>
                  )}

                  {/* STEP: SLOT */}
                  {step === "slot" && selectedServiceObj && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      
                      {/* Dates Scroll */}
                      <div className="flex gap-2.5 overflow-x-auto pb-4 mb-6 hide-scrollbar">
                        {dates.map((d) => {
                          const str = formatDate(d);
                          const active = str === selectedDate;
                          return (
                            <button
                              key={str}
                              onClick={() => { setSelectedDate(str); setSelectedTime(null); setTimePeriod("morning"); }}
                              className={`flex-shrink-0 flex flex-col items-center justify-center w-[72px] h-[80px] rounded-2xl border-2 transition-all ${
                                active
                                  ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest">{DAY_ABBR[d.getDay()]}</span>
                              <span className={`text-2xl font-black mt-1 ${active ? "text-white" : "text-slate-900"}`}>{d.getDate()}</span>
                            </button>
                          );
                        })}
                      </div>

                      {slotsLoading && (
                        <div className="space-y-4">
                          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                          <div className="grid grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
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
                        const countAvail = (period: typeof timePeriod) => allSlots.filter((s) => s.available && inPeriod(s.time, period)).length;
                        
                        const periods = [
                          { key: "morning" as const, label: "Morning", emoji: "🌅", count: countAvail("morning") },
                          { key: "afternoon" as const, label: "Afternoon", emoji: "☀️", count: countAvail("afternoon") },
                          { key: "evening" as const, label: "Evening", emoji: "🌆", count: countAvail("evening") },
                        ];
                        const visibleSlots = allSlots.filter((s) => inPeriod(s.time, timePeriod));

                        return (
                          <>
                            {/* Time Periods */}
                            <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl">
                              {periods.map(({ key, label, count }) => {
                                const active = timePeriod === key;
                                return (
                                  <button
                                    key={key}
                                    onClick={() => { setTimePeriod(key); setSelectedTime(null); }}
                                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                  >
                                    {label}
                                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${active ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-400"}`}>{count}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Time Slots Grid */}
                            {visibleSlots.filter((s) => s.available).length === 0 ? (
                              <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 font-bold">No slots available</p>
                                <p className="text-slate-400 text-xs mt-1">Try a different time or date.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-3">
                                {visibleSlots.map((slot) => (
                                  <button
                                    key={slot.time} disabled={!slot.available}
                                    onClick={() => setSelectedTime(slot.time)}
                                    className={`py-3 px-2 rounded-xl text-sm font-black border-2 transition-all ${
                                      !slot.available ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" : selectedTime === slot.time ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-900/20" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                                    }`}
                                  >
                                    {slot.time}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="mt-8">
                              <button
                                disabled={!selectedTime}
                                onClick={() => setStep("payment")}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/20"
                              >
                                Continue to Payment
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* STEP: PAYMENT */}
                  {step === "payment" && selectedServiceObj && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      
                      <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-200">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
                            <p className="font-bold text-slate-900 text-sm mt-0.5">{formatDisplayDate(new Date(selectedDate + "T12:00:00"))} at {selectedTime}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <button
                          onClick={() => setPaymentType("token")}
                          className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${paymentType === "token" ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-900/10" : "border-slate-200 bg-white"}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-black text-slate-900 text-base">Token Booking</p>
                              <p className="text-3xl font-black text-blue-600 mt-2 tracking-tight">₹5</p>
                              <p className="text-xs text-slate-500 font-medium mt-3">Pay ₹{selectedServiceObj.price} directly to barber after service.</p>
                              <p className="text-[10px] uppercase tracking-widest text-blue-700 font-bold mt-2">₹5 platform fee charged now</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-colors ${paymentType === "token" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                              {paymentType === "token" && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => setPaymentType("full")}
                          className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${paymentType === "full" ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-900/10" : "border-slate-200 bg-white"}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-black text-slate-900 text-base">Full Payment</p>
                              <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">₹{selectedServiceObj.price}</p>
                              <p className="text-xs text-slate-500 font-medium mt-3">Pay full amount securely online right now.</p>
                              <p className="text-[10px] uppercase tracking-widest text-green-600 font-bold mt-2">₹0 platform fee</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-colors ${paymentType === "full" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}>
                              {paymentType === "full" && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button onClick={() => setStep("slot")} className="w-1/3 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors">Back</button>
                        <button onClick={() => setStep("contact")} className="w-2/3 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-colors shadow-xl shadow-slate-900/20">Next Step</button>
                      </div>
                    </div>
                  )}

                  {/* STEP: CONTACT */}
                  {step === "contact" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold">{error}</div>}

                      <div className="space-y-6 mb-8">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              type="text" placeholder="e.g. Arjun Kumar"
                              value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">WhatsApp Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number"
                              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all tracking-wide"
                            />
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 mt-2 flex items-start gap-1">
                             <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> 
                             We'll secure this booking under these details.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setStep("payment")} className="w-1/3 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors">Back</button>
                        <button onClick={handleCreateBooking} disabled={createBookingMutation.isPending} className="w-2/3 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-colors shadow-xl shadow-slate-900/20 disabled:opacity-60">
                          {createBookingMutation.isPending ? "Booking..." : "Confirm Booking"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP: CONFIRM */}
                  {step === "confirm" && finalBooking && (
                    <div className="text-center py-6 animate-in zoom-in duration-500">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Check className="w-12 h-12 text-green-600" />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Confirmed!</h2>
                      <p className="text-slate-500 text-sm font-medium mb-6">
                        Your slot at <strong className="text-slate-900">{selectedTime}</strong> on <strong className="text-slate-900">{formatDisplayDate(new Date(selectedDate + "T12:00:00"))}</strong> is booked.
                      </p>

                      <div className="bg-slate-900 text-white rounded-3xl p-6 mb-8 text-center shadow-lg relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 to-transparent pointer-events-none" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 relative z-10">Arrival OTP</p>
                         <p className="text-5xl font-black tracking-[0.2em] relative z-10">{finalBooking.arrivalOtp}</p>
                         <p className="text-xs font-bold text-slate-400 mt-4 relative z-10">Show this code to the barber when you arrive.</p>
                      </div>

                      <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-8 text-left shadow-sm">
                        <div className="space-y-4 text-sm font-medium">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                            <span className="text-slate-500">Service</span>
                            <span className="font-black text-slate-900">{selectedServiceObj?.name}</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                            <span className="text-slate-500">Payment</span>
                            <span className="font-black text-green-600">₹{paymentType === "token" ? 1 : selectedServiceObj?.price} paid</span>
                          </div>
                        </div>
                        <div className="mt-5 p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3">
                           <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                           <p className="text-xs font-bold text-red-800 leading-relaxed">
                             <strong className="text-red-900 uppercase tracking-wider text-[10px] block mb-1">Warning</strong>
                             Arrive 5-10 minutes early! If you are more than 10 minutes late, your slot will be automatically cancelled.
                           </p>
                        </div>
                      </div>

                      <button onClick={() => navigate("/customer")} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-500 transition-colors shadow-xl shadow-blue-600/20">
                        Back to Dashboard
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
