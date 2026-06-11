import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListShops, useGetCustomerBookings } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ArrowLeft, Search, MapPin, Users, Scissors, ChevronRight, Star, LogOut, Calendar, Clock } from "lucide-react";

type Shop = NonNullable<ReturnType<typeof useListShops>["data"]>[number];

function ShopCard({
  shop,
  isFav,
  onToggleFav,
  onClick,
}: {
  shop: Shop;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Scissors className="w-5 h-5 text-amber-600" />
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
                <span className="text-xs font-bold text-amber-600">from ₹{shop.minPrice}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <button
            onClick={onToggleFav}
            className={`p-1.5 rounded-lg transition-colors ${
              isFav
                ? "text-amber-500 bg-amber-50"
                : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
            }`}
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <Star className={`w-4 h-4 ${isFav ? "fill-amber-500" : ""}`} />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
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

  // Sort: favourites first (only when not searching)
  const sorted = isSearching
    ? displayShops
    : [
        ...displayShops.filter((s) => isFavourite(s.slug)),
        ...displayShops.filter((s) => !isFavourite(s.slug)),
      ];

  useEffect(() => {
    if (!phone) navigate("/customer-login");
  }, [phone, navigate]);

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
      {/* Dark header */}
      <div className="bg-slate-900 px-5 pt-10 pb-8">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
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
          {favourites.length > 0
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
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:bg-white/15 focus:border-amber-500/50"
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
              className="bg-amber-500 text-slate-900 px-5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors flex-shrink-0"
            >
              Search
            </button>
          )}
        </form>
      </div>

      {/* Upcoming Bookings Banner */}
      {upcomingBookings.length > 0 && (
        <div className="px-4 pt-4 pb-1 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Your Upcoming Appointments
          </p>
          {upcomingBookings.map((b) => (
            <button
              key={b.id}
              onClick={() => navigate(`/shop/${b.shopSlug}`)}
              className="w-full text-left bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{b.shopName}</p>
                <p className="text-xs text-slate-500 truncate">{b.serviceName} · {b.shopCity}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <Calendar className="w-3 h-3" /> {formatDisplayDate(b.slotDate)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
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

      {/* Results */}
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
            {/* Favourites section header */}
            {!isSearching && favourites.length > 0 && (
              <div className="flex items-center gap-2 px-1 mb-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
                  Favourites
                </p>
              </div>
            )}

            {sorted.map((shop, idx) => {
              // Insert "Other Shops" divider when switching from favs to rest
              const showDivider =
                !isSearching &&
                favourites.length > 0 &&
                idx === favourites.length;

              return (
                <div key={shop.slug}>
                  {showDivider && (
                    <div className="flex items-center gap-2 px-1 mt-4 mb-1">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Other Shops
                      </p>
                    </div>
                  )}
                  <ShopCard
                    shop={shop}
                    isFav={isFavourite(shop.slug)}
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
