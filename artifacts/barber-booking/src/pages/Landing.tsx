import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Star, ArrowRight, Scissors } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useListShops } from "@workspace/api-client-react";
import { photoUrl } from "@/components/ImageUpload";
import Footer from "@/components/Footer";

export default function Landing() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: shops = [] } = useListShops();
  const popularShops = shops.slice(0, 3); // Just pick first 3 for demo

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, any search requires login, then they can search on the customer dashboard
    navigate("/customer-login");
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 sm:px-10 lg:px-12 flex items-center justify-between max-w-7xl mx-auto w-full">
        <BrandMark withWordmark className="text-xl" />
        <button 
          onClick={() => navigate("/login")}
          className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          Barber login
        </button>
      </header>

      {/* Main Hero */}
      <main className="flex-1 flex flex-col px-6 sm:px-10 lg:px-12 max-w-7xl mx-auto w-full pt-12 lg:pt-24 pb-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-slate-900">
            Book your barber.<br />
            <span className="text-[#E8900C]">Skip the wait.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-500 font-medium max-w-xl">
            Find the best local barbershops, choose your service, and reserve your time before you even leave home.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-10 relative max-w-2xl flex items-center">
            <Search className="absolute left-5 w-6 h-6 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search shops near you..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-32 py-5 rounded-2xl bg-white border border-slate-200 text-lg font-medium placeholder-slate-400 focus:outline-none focus:border-[#E8900C] focus:ring-4 focus:ring-[#E8900C]/10 transition-all shadow-sm"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-[#E8900C] hover:bg-[#d4820a] text-white px-6 rounded-xl font-bold text-sm transition-colors shadow-md shadow-[#E8900C]/20"
            >
              Search
            </button>
          </form>

          {/* Quick Cities */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Popular</span>
            {["Ahmedabad", "Mumbai", "Pune", "Bengaluru"].map(city => (
              <button 
                key={city}
                onClick={() => { setSearchQuery(city); }}
                className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:border-[#E8900C] hover:text-[#E8900C] transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Near You Section */}
        {popularShops.length > 0 && (
          <div className="mt-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Popular Near You</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularShops.map(shop => (
                <div key={shop.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 hover:shadow-md hover:border-[#E8900C]/50 transition-all cursor-pointer" onClick={() => navigate(`/shop/${shop.slug}`)}>
                  {shop.profilePhoto ? (
                    <img src={photoUrl(shop.profilePhoto)} className="w-20 h-20 rounded-xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                      <Scissors className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 truncate">{shop.shopName}</h3>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5" /> {shop.city}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-md">
                        <Star className="w-3.5 h-3.5 fill-green-700 text-green-700" />
                        4.8
                      </span>
                      {shop.minPrice !== null && (
                        <span className="text-xs font-semibold text-slate-500">
                          from ₹{shop.minPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-24 text-center pb-8">
           <button onClick={() => navigate("/customer-login")} className="group inline-flex items-center gap-3 bg-[#1a1d23] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-[#2d313a] transition-all shadow-lg shadow-black/10">
             Continue as Customer
             <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
