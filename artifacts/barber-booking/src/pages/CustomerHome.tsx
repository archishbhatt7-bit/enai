import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListShops, useGetAllCustomerBookings, useCancelCustomerBooking } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { Search, MapPin, Users, Scissors, Star, LogOut, Calendar, Clock, Navigation, User, X, Menu, ArrowLeft } from "lucide-react";
import CustomerOnboarding, { getCustomerProfile, saveCustomerProfile, type CustomerProfile } from "@/components/CustomerOnboarding";


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
      className="w-full text-left bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 flex-1 min-w-0">
          {shop.profilePhoto ? (
            <img
              src={`/api/storage${shop.profilePhoto}`}
              alt={shop.shopName}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-slate-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Scissors className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-black text-slate-900 text-lg leading-tight">{shop.shopName}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                shop.isOpen && !shop.isPaused
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}>
                {shop.isOpen && !shop.isPaused ? "Open" : "Closed"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <MapPin className="w-3.5 h-3.5" /> {shop.city}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <Users className="w-3.5 h-3.5" /> {shop.numChairs} chairs
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              {shop.minPrice != null && (
                <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">from ₹{shop.minPrice}</span>
              )}
              {distKm !== null && (
                <span className="flex items-center gap-1 text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  <Navigation className="w-3.5 h-3.5" /> {distanceLabel(distKm)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggleFav}
            className={`p-2.5 rounded-xl transition-colors ${
              isFav
                ? "text-amber-500 bg-amber-50"
                : "text-slate-300 hover:text-amber-500 hover:bg-amber-50 bg-slate-50"
            }`}
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <Star className={`w-5 h-5 ${isFav ? "fill-amber-500" : ""}`} />
          </button>
        </div>
      </div>
    </button>
  );
}

export default function CustomerHome() {
  const [, navigate] = useLocation();
  const { phone, logoutCustomer, toggleFavourite, isFavourite, favourites } = useCustomerAuth();
  
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "profile">("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      if (filterGender === "all" && (profile.gender.toLowerCase() === "male" || profile.gender.toLowerCase() === "female")) {
        setFilterGender(profile.gender.toLowerCase() as any);
      }
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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  if (!phone) return null;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Sidebar (Desktop) */}
      <aside className="w-72 bg-slate-900 text-white flex-shrink-0 hidden lg:flex flex-col border-r border-slate-800">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-4">
            {profile?.profilePhoto ? (
              <img src={photoUrl(profile.profilePhoto)} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md" alt="Profile" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg border border-blue-500 shadow-blue-900/50">
                {profile?.name ? profile.name[0].toUpperCase() : "C"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-black text-base truncate">{profile?.name || "Customer"}</p>
              <p className="text-xs text-slate-400 font-bold truncate tracking-wider">+91 {phone}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-2">
          <button onClick={() => setActiveTab("home")} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Search className="w-5 h-5" /> Find Barbers
          </button>
          <button onClick={() => setActiveTab("bookings")} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'bookings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Calendar className="w-5 h-5" /> My Bookings
            {upcomingBookings.length > 0 && (
              <span className="ml-auto bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{upcomingBookings.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <User className="w-5 h-5" /> Profile & Settings
          </button>
        </nav>

        <div className="p-5 border-t border-slate-800">
          <button onClick={() => { logoutCustomer(); navigate("/"); }} className="w-full flex items-center gap-3 px-5 py-4 text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all font-bold text-sm rounded-2xl">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
        
        {/* Mobile Header */}
        <header className="lg:hidden bg-white px-5 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          {activeTab !== "home" ? (
            <button onClick={() => setActiveTab("home")} className="flex items-center gap-2 text-slate-700 font-bold bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Scissors className="w-6 h-6 text-blue-600" />
              <span className="font-black text-2xl text-slate-900 tracking-tight">eNai</span>
            </div>
          )}
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeMobileMenu} />
            <aside className="relative w-72 max-w-[80%] bg-slate-900 text-white flex flex-col h-full shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <span className="font-black text-xl text-white">eNai</span>
                <button onClick={closeMobileMenu} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                {profile?.profilePhoto ? (
                  <img src={photoUrl(profile.profilePhoto)} className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg">{profile?.name ? profile.name[0].toUpperCase() : "C"}</div>
                )}
                <div>
                  <p className="font-bold text-sm truncate">{profile?.name || "Customer"}</p>
                  <p className="text-xs text-slate-400 truncate">+91 {phone}</p>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-2 flex flex-col">
                <button onClick={() => { setActiveTab("home"); closeMobileMenu(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'home' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Search className="w-4 h-4"/> Find Barbers</button>
                <button onClick={() => { setActiveTab("bookings"); closeMobileMenu(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Calendar className="w-4 h-4"/> My Bookings</button>
                <button onClick={() => { setActiveTab("profile"); closeMobileMenu(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${activeTab === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><User className="w-4 h-4"/> Profile</button>
                
                <div className="mt-auto pt-8">
                  <button 
                    onClick={() => { logoutCustomer(); navigate("/"); }} 
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4"/> Sign Out
                  </button>
                </div>
              </nav>
            </aside>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto w-full pb-20">
          
          {activeTab === "home" && (
            <>
              {/* Home Header */}
              <div className="bg-slate-900 px-6 sm:px-10 pt-12 pb-14 rounded-b-[40px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent pointer-events-none" />
                <div className="max-w-4xl mx-auto relative z-10">
                  <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-tight tracking-tight">
                    {profile?.name ? `Hey, ${profile.name.split(" ")[0]}!` : "Find a Barbershop"}
                  </h1>
                  <p className="text-slate-400 text-base sm:text-lg mb-8 font-medium">
                    Discover and book premium barbers near you.
                  </p>
                  <form onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()); }} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by shop name or city..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-14 pr-4 py-4 rounded-2xl bg-white/10 border border-white/10 text-white placeholder-slate-400 text-base focus:outline-none focus:bg-white/15 focus:border-blue-500 transition-all shadow-inner font-medium"
                      />
                    </div>
                    {isSearching ? (
                      <button type="button" onClick={() => { setQuery(""); setSubmitted(""); }} className="bg-slate-700 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-600 transition-colors flex-shrink-0">Clear</button>
                    ) : (
                      <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-blue-500 transition-colors flex-shrink-0 shadow-lg shadow-blue-600/30">Search</button>
                    )}
                  </form>
                </div>
              </div>

              {/* Sorting & Shops */}
              <div className="max-w-4xl mx-auto px-6 py-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {isSearching ? `Results for "${submitted}"` : "Top Barbers"}
                  </h2>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Gender Filter UI */}
                    <div className="flex bg-slate-200/60 p-1.5 rounded-xl self-start sm:self-auto overflow-x-auto">
                      <button
                        onClick={() => setFilterGender("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterGender === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilterGender("male")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterGender === "male" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Male
                      </button>
                      <button
                        onClick={() => setFilterGender("female")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterGender === "female" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Female
                      </button>
                      <button
                        onClick={() => setFilterGender("unisex")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterGender === "unisex" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Unisex
                      </button>
                    </div>

                    {/* Sorting Logic UI */}
                    <div className="flex bg-slate-200/60 p-1.5 rounded-xl self-start sm:self-auto">
                      <button
                        onClick={() => setSortBy("distance")}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === "distance" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Nearest
                      </button>
                      <button
                        onClick={() => setSortBy("price")}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === "price" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Cheapest
                      </button>
                    </div>
                  </div>
                </div>

                {(isSearching ? searchLoading : shopsLoading) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-200 rounded-3xl animate-pulse" />)}
                  </div>
                ) : sortedShops.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200 border-dashed">
                    <Scissors className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-black text-lg text-slate-600">No shops found</p>
                    <p className="text-sm font-medium text-slate-400 mt-1">Try searching a different city</p>
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
