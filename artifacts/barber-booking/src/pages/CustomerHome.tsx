import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListShops, useGetAllCustomerBookings, useCancelCustomerBooking } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { Search, MapPin, Users, Scissors, Star, LogOut, Calendar, Clock, Navigation, User, X } from "lucide-react";
import CustomerOnboarding, { getCustomerProfile, saveCustomerProfile, type CustomerProfile } from "@/components/CustomerOnboarding";
import BrandMark from "@/components/BrandMark";
import { photoUrl } from "@/components/ImageUpload";

import { type ShopSummary } from "@workspace/api-client-react";
type Shop = ShopSummary;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Confirmed", cls: "bg-green-100 text-green-700" },
    active: { label: "In Service", cls: "bg-blue-100 text-blue-700" },
    pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
    completed: { label: "Done", cls: "bg-slate-100 text-slate-600" },
    cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
    no_show: { label: "No Show", cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function ShopCard({
  shop,
  isFav,
  distKm,
  onToggleFav,
  onClick,
}: {
  shop: Shop;
  isFav: boolean;
  distKm: number | null;
  onToggleFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-[#ded2c6] bg-[#fffaf5] p-4 shadow-[0_3px_10px_rgba(71,50,37,.05)] transition-all hover:-translate-y-0.5 hover:border-[#b85434] hover:shadow-[0_10px_24px_rgba(71,50,37,.10)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 flex-1 min-w-0">
          {(shop.profilePhoto || (shop as any).interiorPhotos?.[0]) ? (
            <img
              src={photoUrl(shop.profilePhoto || (shop as any).interiorPhotos?.[0])}
              alt={shop.shopName}
              className="h-16 w-16 flex-shrink-0 rounded-xl border border-[#e9ded4] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-[#ead8ce] bg-[#f7e6dd]">
              <Scissors className="h-5 w-5 text-[#a94c30]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-semibold leading-tight tracking-[-.02em] text-[#24201d]">{shop.shopName}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                shop.isOpen && !shop.isPaused
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}>
                {shop.isOpen && !shop.isPaused ? "Open" : "Closed"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-[#756b62]">
                <MapPin className="w-3.5 h-3.5" /> {shop.city}
              </span>
              <span className="flex items-center gap-1 text-sm text-[#756b62]">
                <Users className="w-3.5 h-3.5" /> {shop.numChairs} chairs
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              {shop.minPrice != null && (
                <span className="rounded-lg bg-[#f2ece5] px-2.5 py-1 text-sm font-semibold text-[#403a35]">from ₹{shop.minPrice}</span>
              )}
              {distKm !== null && (
                <span className="flex items-center gap-1 rounded-lg bg-[#f7e6dd] px-2.5 py-1 text-sm font-semibold text-[#8a4a32]">
                  <Navigation className="w-3.5 h-3.5" /> {distanceLabel(distKm)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggleFav}
            className={`rounded-lg p-2.5 transition-colors ${
              isFav
                ? "bg-[#f7e6dd] text-[#b85434]"
                : "bg-[#f5efe8] text-[#a1968d] hover:bg-[#f7e6dd] hover:text-[#b85434]"
            }`}
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <Star className={`h-5 w-5 ${isFav ? "fill-[#b85434]" : ""}`} />
          </button>
        </div>
      </div>
    </button>
  );
}

export default function CustomerHome() {
  const [, navigate] = useLocation();
  const { phone, logoutCustomer, toggleFavourite, isFavourite } = useCustomerAuth();
  
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "profile">("home");

  // --- Home State ---
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"distance" | "price">("distance");
  const [filterGender, setFilterGender] = useState<"all" | "male" | "female" | "unisex">("all");

  // --- Profile State ---
  const [profile, setProfile] = useState<CustomerProfile | null>(() => phone ? getCustomerProfile(phone) : null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editProfile, setEditProfile] = useState<CustomerProfile>({ name: "", gender: "", age: "" });

  useEffect(() => {
    if (profile && profile.gender) {
      setEditProfile(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (!phone) navigate("/");
  }, [phone, navigate]);

  useEffect(() => {
    if (!phone) return undefined;
    const p = getCustomerProfile(phone);
    if (!p) {
      const timer = setTimeout(() => setShowOnboarding(true), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phone]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {}
      );
    }
  }, []);

  // --- Queries ---
  const { data: allShops = [], isLoading: shopsLoading } = useListShops({}, { query: { enabled: true } as any });
  const { data: searchResults, isLoading: searchLoading } = useListShops({ q: submitted }, { query: { enabled: !!submitted } as any });
  
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useGetAllCustomerBookings(phone ?? "", {
    query: { enabled: !!phone } as any,
  });

  useEffect(() => {
    if (bookings.length > 0 && !profile && phone) {
      // Recover profile from latest booking (new device login)
      const recent = bookings.reduce((latest: any, b: any) => 
        new Date(b.createdAt) > new Date(latest.createdAt) ? b : latest
      , bookings[0]);
      
      const newProfile: CustomerProfile = { name: recent.customerName, gender: "", age: "" };
      saveCustomerProfile(phone, newProfile);
      setProfile(newProfile);
      setEditProfile(newProfile);
      setShowOnboarding(false);
    }
  }, [bookings, profile, phone]);

  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const cancelMutation = useCancelCustomerBooking({
    mutation: {
      onSuccess: () => {
        setConfirmCancel(null);
        refetchBookings();
      },
    },
  });

  // --- Logic Computations ---
  function getDistKm(shop: Shop): number | null {
    if (userLat == null || userLng == null) return null;
    if (!shop.latitude || !shop.longitude) return null;
    const lat = parseFloat(shop.latitude);
    const lng = parseFloat(shop.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    return haversineKm(userLat, userLng, lat, lng);
  }

  const isSearching = !!submitted;
  const rawShops = isSearching ? (searchResults ?? []) : allShops;

  const displayShops = rawShops.filter((shop) => {
    if (filterGender === "all") return true;
    const shopGender = (shop as any).targetGender?.toLowerCase() || "unisex";
    return shopGender === filterGender;
  });

  const sortedShops = (() => {
    const favs = displayShops.filter((s) => isFavourite(s.slug));
    const rest = displayShops.filter((s) => !isFavourite(s.slug));

    rest.sort((a, b) => {
      if (sortBy === "distance" && userLat != null && userLng != null) {
        const da = getDistKm(a);
        const db = getDistKm(b);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      } else {
        const pa = a.minPrice ?? 999999;
        const pb = b.minPrice ?? 999999;
        return pa - pb;
      }
    });

    return [...favs, ...rest];
  })();

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const upcomingBookings = bookings.filter((b) => {
    if (!["confirmed", "active", "pending"].includes(b.status)) return false;
    if (b.slotDate > today) return true;
    if (b.slotDate === today) return b.slotTime >= nowTime;
    return false;
  });
  const pastBookings = bookings.filter((b) => !upcomingBookings.includes(b));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    saveCustomerProfile(phone, editProfile);
    setProfile(editProfile);
    alert("Profile saved successfully!");
  };

  if (!phone) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f2eb] font-sans">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-[#39312c] bg-[#24201d] text-white lg:flex">
        <div className="border-b border-[#39312c] p-7">
          <BrandMark tone="paper" withWordmark className="text-xl [&_span:last-child]:text-[#fffaf5]" />
          <div className="flex items-center gap-4">
            {profile?.profilePhoto ? (
              <img src={photoUrl(profile.profilePhoto)} className="h-12 w-12 rounded-xl border border-[#5a4f48] object-cover" alt="Profile" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#b85434] text-lg font-semibold">
                {profile?.name ? profile.name[0].toUpperCase() : "C"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile?.name || "Customer"}</p>
              <p className="truncate text-xs text-[#bfb4aa]">+91 {phone}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4 pt-6">
          <button onClick={() => setActiveTab("home")} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition-colors ${activeTab === 'home' ? 'bg-[#b85434] text-white' : 'text-[#cfc4ba] hover:bg-[#39312c] hover:text-white'}`}>
            <Search className="h-4 w-4" /> Discover
          </button>
          <button onClick={() => setActiveTab("bookings")} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition-colors ${activeTab === 'bookings' ? 'bg-[#b85434] text-white' : 'text-[#cfc4ba] hover:bg-[#39312c] hover:text-white'}`}>
            <Calendar className="h-4 w-4" /> My bookings
            {upcomingBookings.length > 0 && (
              <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px]">{upcomingBookings.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("profile")} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition-colors ${activeTab === 'profile' ? 'bg-[#b85434] text-white' : 'text-[#cfc4ba] hover:bg-[#39312c] hover:text-white'}`}>
            <User className="h-4 w-4" /> Profile
          </button>
        </nav>

        <div className="border-t border-[#39312c] p-4">
          <button onClick={() => { logoutCustomer(); navigate("/"); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-[#cfc4ba] transition-colors hover:bg-[#4a2823] hover:text-[#f7c9ba]">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative flex h-screen flex-1 flex-col overflow-hidden bg-[#f7f2eb]">
        
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#ded2c6] bg-[#fffaf5]/95 px-5 py-3 backdrop-blur lg:hidden">
          <BrandMark withWordmark className="text-xl" />
          <button onClick={() => setActiveTab("profile")} aria-label="Open profile" className="grid h-11 w-11 place-items-center rounded-xl bg-[#f1e7dd] text-[#8a4a32]">
            {profile?.profilePhoto ? <img src={photoUrl(profile.profilePhoto)} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="text-sm font-semibold">{profile?.name?.[0]?.toUpperCase() || "C"}</span>}
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="w-full flex-1 overflow-y-auto pb-24 lg:pb-10">
          
          {activeTab === "home" && (
            <>
              {/* Home Header */}
              <div className="relative overflow-hidden border-b border-[#ded2c6] bg-[#eee5db] px-5 pb-9 pt-9 sm:px-10 sm:pb-11 sm:pt-12">
                <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[#e6b099]/45 blur-3xl" />
                <div className="relative z-10 mx-auto max-w-4xl">
                  <p className="mb-3 text-sm font-medium text-[#8a4a32]">Discover</p>
                  <h1 className="mb-3 text-3xl font-semibold leading-tight tracking-[-.05em] text-[#24201d] sm:text-5xl">
                    {profile?.name ? `${profile.name.split(" ")[0]}, find a time that works.` : "Find a time that works."}
                  </h1>
                  <p className="mb-7 max-w-lg text-base leading-6 text-[#625951] sm:text-lg">
                    Search local shops, check services, and reserve your slot before you leave.
                  </p>
                  <form onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()); }} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#756b62]" />
                      <input
                        type="text"
                        placeholder="Search a shop or area"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="min-h-14 w-full rounded-xl border border-[#cfc2b6] bg-[#fffaf5] pl-12 pr-4 text-base font-medium text-[#24201d] placeholder:text-[#8f847b]"
                      />
                    </div>
                    {isSearching ? (
                      <button type="button" onClick={() => { setQuery(""); setSubmitted(""); }} className="min-h-14 rounded-xl border border-[#cfc2b6] bg-[#fffaf5] px-7 text-sm font-semibold text-[#403a35] transition-colors hover:bg-white">Clear</button>
                    ) : (
                      <button type="submit" className="min-h-14 rounded-xl bg-[#b85434] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#9f4529]">Search</button>
                    )}
                  </form>
                </div>
              </div>

              {/* Sorting & Shops */}
              <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-.035em] text-[#24201d]">
                      {isSearching ? `Results for “${submitted}”` : "Shops near you"}
                    </h2>
                    {!isSearching && <p className="mt-1 text-sm text-[#756b62]">Choose a shop and see its available times.</p>}
                  </div>
                   <div className="flex flex-col sm:flex-row gap-3">
                    {/* Gender Filter UI */}
                    <div className="flex self-start overflow-x-auto rounded-xl border border-[#ded2c6] bg-[#f2ece5] p-1 sm:self-auto">
                      <button
                        onClick={() => setFilterGender("all")}
                        className={`min-h-10 rounded-lg px-3.5 text-sm font-medium transition-all ${filterGender === "all" ? "bg-[#fffaf5] text-[#24201d] shadow-sm" : "text-[#756b62] hover:text-[#403a35]"}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilterGender("male")}
                        className={`min-h-10 rounded-lg px-3.5 text-sm font-medium transition-all ${filterGender === "male" ? "bg-[#fffaf5] text-[#24201d] shadow-sm" : "text-[#756b62] hover:text-[#403a35]"}`}
                      >
                        Male
                      </button>
                      <button
                        onClick={() => setFilterGender("female")}
                        className={`min-h-10 rounded-lg px-3.5 text-sm font-medium transition-all ${filterGender === "female" ? "bg-[#fffaf5] text-[#24201d] shadow-sm" : "text-[#756b62] hover:text-[#403a35]"}`}
                      >
                        Female
                      </button>
                      <button
                        onClick={() => setFilterGender("unisex")}
                        className={`min-h-10 rounded-lg px-3.5 text-sm font-medium transition-all ${filterGender === "unisex" ? "bg-[#fffaf5] text-[#24201d] shadow-sm" : "text-[#756b62] hover:text-[#403a35]"}`}
                      >
                        Unisex
                      </button>
                    </div>

                    {/* Sorting Logic UI */}
                    <div className="flex self-start rounded-xl border border-[#ded2c6] bg-[#f2ece5] p-1 sm:self-auto">
                      <button
                        onClick={() => setSortBy("distance")}
                        className={`min-h-10 rounded-lg px-4 text-sm font-medium transition-all ${sortBy === "distance" ? "bg-[#fffaf5] text-[#24201d] shadow-sm" : "text-[#756b62] hover:text-[#403a35]"}`}
                      >
                        Nearest
                      </button>
                      <button
                        onClick={() => setSortBy("price")}
                        className={`min-h-10 rounded-lg px-4 text-sm font-medium transition-all ${sortBy === "price" ? "bg-[#fffaf5] text-[#24201d] shadow-sm" : "text-[#756b62] hover:text-[#403a35]"}`}
                      >
                        Cheapest
                      </button>
                    </div>
                  </div>
                </div>

                {(isSearching ? searchLoading : shopsLoading) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#e7ddd3]" />)}
                  </div>
                ) : sortedShops.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cfc2b6] bg-[#fffaf5] py-20 text-center">
                    <Scissors className="mx-auto mb-4 h-10 w-10 text-[#b4a79d]" />
                    <p className="text-lg font-semibold text-[#403a35]">No shops found</p>
                    <p className="mt-1 text-sm text-[#756b62]">Try a different shop name or nearby area.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedShops.map(shop => (
                      <ShopCard
                        key={shop.id}
                        shop={shop}
                        isFav={isFavourite(shop.slug)}
                        distKm={getDistKm(shop)}
                        onToggleFav={(e) => { e.stopPropagation(); toggleFavourite(shop.slug); }}
                        onClick={() => navigate(`/shop/${shop.slug}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "bookings" && (
            <div className="max-w-4xl mx-auto px-6 py-12">
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">My Bookings</h1>
              <p className="text-slate-500 mb-10 font-medium">View and manage your upcoming appointments.</p>

              {bookingsLoading && <div className="space-y-4"><div className="h-40 bg-slate-200 rounded-3xl animate-pulse" /></div>}

              {!bookingsLoading && bookings.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200 border-dashed">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="font-black text-lg text-slate-600">No bookings yet</p>
                  <p className="text-sm font-medium text-slate-400 mt-1 mb-6">You haven't scheduled any appointments.</p>
                  <button onClick={() => setActiveTab("home")} className="bg-blue-600 text-white font-black px-8 py-3 rounded-2xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30">
                    Find a Barber
                  </button>
                </div>
              )}

              {!bookingsLoading && upcomingBookings.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Upcoming Appointments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {upcomingBookings.map(b => (
                      <div key={b.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 relative overflow-hidden flex flex-col hover:border-blue-300 transition-colors">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                        <div className="flex justify-between items-start mb-5 pl-2">
                          <div>
                            <h4 className="font-black text-xl text-slate-900 leading-tight mb-1">{b.shopName}</h4>
                            <p className="text-sm font-bold text-slate-500">{b.serviceName}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4 mb-5 ml-2 border border-slate-100">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Date</p>
                            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-600"/> {formatDate(b.slotDate)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Time</p>
                            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-600"/> {b.slotTime} – {b.slotEndTime}</p>
                          </div>
                        </div>
                        <div className="mt-auto pt-4 flex items-center justify-between pl-2 border-t border-slate-100">
                          {b.arrivalOtp ? (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Arrival OTP</p>
                              <p className="text-2xl font-black text-blue-600 tracking-widest leading-none">{b.arrivalOtp}</p>
                            </div>
                          ) : <div/>}
                          {b.status === "confirmed" && (
                            <button onClick={() => setConfirmCancel(b.id)} className="text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors">
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!bookingsLoading && pastBookings.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Past Appointments</h3>
                  <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                    {pastBookings.map(b => (
                      <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900 text-base">{b.shopName}</p>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">{b.serviceName} · {formatDate(b.slotDate)}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-3xl mx-auto px-6 py-12">
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Profile & Settings</h1>
              <p className="text-slate-500 mb-8 font-medium">Manage your personal information and preferences.</p>

              <form onSubmit={handleSaveProfile} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-10">
                
                {/* Personal Info */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Your Name</label>
                      <input
                        type="text" required
                        value={editProfile.name}
                        onChange={(e) => setEditProfile({...editProfile, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Age</label>
                      <input
                        type="number" required min="1" max="120"
                        value={editProfile.age}
                        onChange={(e) => setEditProfile({...editProfile, age: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                      <div className="flex gap-3">
                        {["Male", "Female", "Other"].map(g => (
                          <button
                            key={g} type="button"
                            onClick={() => setEditProfile({...editProfile, gender: g})}
                            className={`flex-1 py-3.5 rounded-2xl border-2 text-sm font-black transition-all ${
                              editProfile.gender === g ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end border-t border-slate-100">
                  <button type="submit" className="bg-blue-600 text-white font-black px-10 py-4 rounded-2xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>

      <nav aria-label="Customer navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-[#ded2c6] bg-[#fffaf5]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        {([
          ["home", "Discover", Search],
          ["bookings", "Bookings", Calendar],
          ["profile", "Profile", User],
        ] as const).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors ${activeTab === tab ? "bg-[#f1e2d8] text-[#8a4a32]" : "text-[#756b62]"}`}>
            <Icon className="h-4 w-4" />
            {label}
            {tab === "bookings" && upcomingBookings.length > 0 && <span className="sr-only">, {upcomingBookings.length} upcoming</span>}
          </button>
        ))}
      </nav>

      {/* Cancel Modal */}
      {confirmCancel !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl transform transition-all">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tight">Cancel Appointment?</h3>
            <p className="text-sm font-medium text-slate-500 text-center mb-8 leading-relaxed">This action cannot be undone. Your ₹1 platform fee is non-refundable.</p>
            <div className="flex flex-col gap-3">
              <button
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ bookingId: confirmCancel })}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-500 transition-colors disabled:opacity-60 shadow-lg shadow-red-600/20"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel Booking"}
              </button>
              <button onClick={() => setConfirmCancel(null)} className="w-full py-4 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-100 hover:text-slate-700 transition-colors">
                Nevermind, keep it
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <CustomerOnboarding phone={phone} onDone={(p) => { setProfile(p); setShowOnboarding(false); }} />
      )}
    </div>
  );
}
