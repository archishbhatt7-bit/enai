import { useState } from "react";
import { useLocation } from "wouter";
import { useListShops } from "@workspace/api-client-react";
import { ArrowLeft, Search, MapPin, Users, Scissors, ChevronRight } from "lucide-react";

type Shop = NonNullable<ReturnType<typeof useListShops>["data"]>[number];

function ShopCard({ shop, onClick }: { shop: Shop; onClick: () => void }) {
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
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 mt-1 flex-shrink-0 transition-colors" />
      </div>
    </button>
  );
}

export default function CustomerHome() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: shops, isLoading } = useListShops(
    submitted ? { q: submitted } : {},
    { query: { enabled: true } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
  };

  const label = submitted
    ? `${shops?.length ?? 0} shop${shops?.length !== 1 ? "s" : ""} found`
    : "All Shops";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dark header */}
      <div className="bg-slate-900 px-5 pt-10 pb-8">
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white mb-5 flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black text-white mb-1">Find a Barbershop</h1>
        <p className="text-slate-400 text-sm">Search by shop name or city</p>

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
          <button
            type="submit"
            className="bg-amber-500 text-slate-900 px-5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors flex-shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 py-5">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {submitted && !isLoading && shops && shops.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">No shops found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different city or name</p>
          </div>
        )}

        {!isLoading && shops && shops.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-1 mb-3">
              {label}
            </p>
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onClick={() => navigate(`/shop/${shop.slug}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
