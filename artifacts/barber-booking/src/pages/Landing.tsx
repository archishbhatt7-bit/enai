import { useState } from "react";
import { useLocation } from "wouter";
import { useListShops } from "@workspace/api-client-react";
import { Search, Scissors, ChevronRight, MapPin, Clock, Users, Star } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { data: shops, isLoading } = useListShops(
    submittedQuery ? { q: submittedQuery } : undefined,
    { query: { enabled: true } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
              <Scissors className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">SlotCut</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Barber Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="text-sm bg-slate-900 text-white px-4 py-2 rounded-md font-semibold hover:bg-slate-800 transition-colors"
            >
              Register Shop
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BIG BOX — Customer Search */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                  Book your haircut,<br />
                  <span className="text-amber-500">skip the wait.</span>
                </h1>
                <p className="mt-3 text-slate-500 text-base">
                  Find nearby barbershops and book a slot in under 30 seconds. No app needed.
                </p>
              </div>

              <form onSubmit={handleSearch} className="mb-8">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by shop name or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-semibold text-sm hover:bg-amber-400 transition-colors whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Shop Results */}
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && shops && shops.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    {shops.length} shop{shops.length !== 1 ? "s" : ""} found
                  </p>
                  {shops.map((shop) => (
                    <button
                      key={shop.id}
                      onClick={() => navigate(`/shop/${shop.slug}`)}
                      className="w-full text-left bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-lg p-4 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{shop.shopName}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              shop.isOpen && !shop.isPaused
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}>
                              {shop.isOpen && !shop.isPaused ? "Open" : "Closed"}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {shop.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {shop.numChairs} chair{shop.numChairs !== 1 ? "s" : ""}
                            </span>
                            {shop.servicesCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Scissors className="w-3 h-3" /> {shop.servicesCount} service{shop.servicesCount !== 1 ? "s" : ""}
                              </span>
                            )}
                            {shop.minPrice !== null && shop.minPrice !== undefined && (
                              <span className="text-amber-600 font-medium">from ₹{shop.minPrice}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 mt-1 flex-shrink-0 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isLoading && shops && shops.length === 0 && submittedQuery && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">No shops found for "{submittedQuery}"</p>
                  <p className="text-slate-400 text-xs mt-1">Try searching for a different city or shop name</p>
                </div>
              )}

              {!submittedQuery && !isLoading && (
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {[
                    { icon: Clock, label: "Book 2h ahead", sub: "Get a guaranteed slot" },
                    { icon: Star, label: "No app needed", sub: "Book from any browser" },
                    { icon: Scissors, label: "Pay ₹1 to confirm", sub: "Pay rest at shop" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="text-center p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Icon className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SMALL BOX — Barber Access */}
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-amber-500 rounded-md flex items-center justify-center">
                  <Scissors className="w-3.5 h-3.5 text-slate-900" />
                </div>
                <span className="font-semibold text-sm">For Barbers</span>
              </div>
              <h2 className="text-xl font-bold leading-snug mb-2">
                Take your shop digital in 5 minutes
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Generate your unique booking link. Place a QR code at your shop. Watch bookings roll in — zero app downloads for customers.
              </p>
              <button
                onClick={() => navigate("/register")}
                className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-bold text-sm hover:bg-amber-400 transition-colors"
              >
                Register Your Shop
              </button>
              <button
                onClick={() => navigate("/login")}
                className="w-full mt-3 border border-slate-700 text-slate-300 py-3 rounded-lg font-medium text-sm hover:border-slate-600 hover:text-white transition-colors"
              >
                Login to Dashboard
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Register your shop (free)" },
                  { step: "2", text: "Share your unique QR code" },
                  { step: "3", text: "Customers scan & book" },
                  { step: "4", text: "Verify arrival with OTP" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {step}
                    </div>
                    <span className="text-sm text-slate-600">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
