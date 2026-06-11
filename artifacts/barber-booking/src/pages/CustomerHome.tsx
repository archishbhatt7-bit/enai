import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListShops, useGetCustomerBookings } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ArrowLeft, Search, MapPin, Users, Scissors, ChevronRight, Star, LogOut, Calendar, Clock, BookOpen, Navigation } from "lucide-react";

type Shop = NonNullable<ReturnType<typeof useListShops>["data"]>[number];

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
      className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Scissors className="w-5 h-5 text-blue-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900">{shop.shopName}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                shop.isOpen && !shop.isPaused
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}>
                {shop.isOpen && !shop.isPaused ? "Open" : "Closed"}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" /> {shop.city}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="w-3 h-3" /> {shop.numChairs} chairs
              </span>
              {shop.minPrice != null && (
                <span className="text-xs font-bold text-blue-700">from ₹{shop.minPrice}</span>
              )}
              {distKm !== null && (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                  <Navigation className="w-3 h-3" /> {distanceLabel(distKm)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <button
            onClick={onToggleFav}
            className={`p-1.5 rounded-lg transition-colors ${
              isFav
                ? "text-blue-600 bg-blue-50"
                : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"
            }`}
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <Star className={`w-4 h-4 ${isFav ? "fill-yellow-400" : ""}`} />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>
    </button>
  );
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function CustomerHome() {
  const [, navigate] = useLocation();
  const { phone, logoutCustomer, toggleFavourite, isFavourite, favourites } = useCustomerAuth();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const { data: upcomingBookings = [] } = useGetCustomerBookings(phone ?? "", {
    query: { enabled: !!phone, refetchInterval: 60_000 },
  });

  const { data: allShops = [], isLoading } = useListShops({}, { query: { enabled: true } });
  const { data: searchResults, isLoading: searchLoading } = useListShops(
    { q: submitted },
    { query: { enabled: !!submitted } }
  );

  const isSearching = !!submitted;
  const displayShops = isSearching ? (searchResults ?? []) : allShops;
  const loading = isSearching ? searchLoading : isLoading;

  useEffect(() => {
    if (!phone) navigate("/customer-login");
  }, [phone, navigate]);

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

  function getDistKm(shop: Shop): number | null {
    if (userLat == null || userLng == null) return null;
    if (!shop.latitude || !shop.longitude) return null;
    const lat = parseFloat(shop.latitude);
    const lng = parseFloat(shop.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    return haversineKm(userLat, userLng, lat, lng);
  }

  const sorted = (() => {
    if (isSearching) return displayShops;
    const favs = displayShops.filter((s) => isFavourite(s.slug));
    const rest = displayShops.filter((s) => !isFavourite(s.slug));
    if (userLat != null && userLng != null) {
      rest.sort((a, b) => {
        const da = getDistKm(a);
        const db = getDistKm(b);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }
    return [...favs, ...rest];
  })();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const handleClearSearch = () => {
    setQuery("");
    setSubmitted("");
  };

  const handleFavToggle = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    toggleFavourite(slug);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-slate-900 px-5 pt-10 pb-8">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/customer/bookings")}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
              title="My Bookings"
            >
              <BookOpen className="w-3.5 h-3.5" /> My Bookings
            </button>
            <span className="text-slate-400 text-xs">+91 {phone}</span>
            <button
              onClick={() => { logoutCustomer(); navigate("/"); }}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-0.5">Find a Barbershop</h1>
        <p className="text-slate-400 text-sm">
          {userLat ? "Sorted by distance from you" : favourites.length > 0
            ? `${favourites.length} favourite${favourites.length !== 1 ? "s" : ""} saved`
            : "Search by shop name or city"}
        </p>

        <form onSubmit={handleSearch} className="mt-5 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Mumbai, Raja Barbershop…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:bg-white/15 focus:border-blue-600/50"
            />
          </div>
          {isSearching ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="bg-slate-700 text-slate-300 px-4 rounded-xl font-semibold text-sm hover:bg-slate-600 transition-colors flex-shrink-0"
            >
              Clear
            </button>
          ) : (
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors flex-shrink-0"
            >
              Search
            </button>
          )}
        </form>
      </div>

      {upcomingBookings.length > 0 && (
        <div className="px-4 pt-4 pb-1 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Your Upcoming Appointments
          </p>
          {upcomingBookings.map((b) => (
            <button
              key={b.id}
              onClick={() => navigate(`/shop/${b.shopSlug}`)}
              className="w-full text-left bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-blue-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{b.shopName}</p>
                <p className="text-xs text-slate-500 truncate">{b.serviceName} · {b.shopCity}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs font-semibold text-blue-800">
                    <Calendar className="w-3 h-3" /> {formatDisplayDate(b.slotDate)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-blue-800">
                    <Clock className="w-3 h-3" /> {b.slotTime} – {b.slotEndTime}
                  </span>
                </div>
              </div>
              {b.arrivalOtp && (
                <div className="flex-shrink-0 text-center">
                  <p className="text-xs text-slate-400 leading-none mb-1">OTP</p>
                  <p className="text-lg font-black text-slate-900 tracking-widest leading-none">{b.arrivalOtp}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 px-4 py-5">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && isSearching && sorted.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">No shops found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different city or name</p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="space-y-3">
            {!isSearching && favourites.length > 0 && (
              <div className="flex items-center gap-2 px-1 mb-1">
                <Star className="w-3.5 h-3.5 text-blue-600 fill-yellow-400" />
                <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">Favourites</p>
              </div>
            )}

            {sorted.map((shop, idx) => {
              const showDivider =
                !isSearching &&
                favourites.length > 0 &&
                idx === favourites.length;

              return (
                <div key={shop.slug}>
                  {showDivider && (
                    <div className="flex items-center gap-2 px-1 mt-4 mb-1">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {userLat ? "Nearby Shops" : "Other Shops"}
                      </p>
                    </div>
                  )}
                  {!isSearching && favourites.length === 0 && idx === 0 && userLat && (
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <Navigation className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Nearest First</p>
                    </div>
                  )}
                  <ShopCard
                    shop={shop}
                    isFav={isFavourite(shop.slug)}
                    distKm={getDistKm(shop)}
                    onToggleFav={(e) => handleFavToggle(e, shop.slug)}
                    onClick={() => navigate(`/shop/${shop.slug}`)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
