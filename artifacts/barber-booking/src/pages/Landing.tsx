import { useLocation } from "wouter";
import { User, Store, Scissors } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="relative min-h-screen bg-black flex flex-col font-sans select-none overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
      `}</style>
      
      {/* Background Image with Dark Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero.png')" }}
      />
      <div className="absolute inset-0 z-0 bg-black/60 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/70 sm:to-black/30" />

      {/* Top Navbar */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black text-white tracking-wider uppercase">eNai</span>
        </div>
      </header>

      {/* Main Content Area - Split Layout */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between px-8 lg:px-20 max-w-7xl mx-auto w-full gap-12 pb-12">
        
        {/* Left Side: Quote */}
        <div className="flex-1 text-center lg:text-left mt-10 lg:mt-0">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
            Elevate Your <br />
            <span className="text-amber-500 italic font-normal">Grooming Experience</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
            Created purely for those who appreciate premium quality, time, and a flawless look. Book your next appointment seamlessly.
          </p>
        </div>

        {/* Right Side: Login Cards */}
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col gap-5">
          <div className="mb-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome</h2>
            <p className="text-slate-400 text-sm">Select an option to continue</p>
          </div>

          <button
            onClick={() => navigate("/customer-login")}
            className="w-full flex items-center gap-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 rounded-2xl px-6 py-5 transition-all shadow-lg group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg leading-tight">Login as Customer</p>
              <p className="text-xs text-slate-800/80 font-medium leading-tight mt-1">Find a shop &amp; book a slot</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/login")}
            className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-white rounded-2xl px-6 py-5 transition-all group"
          >
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg leading-tight">Login as Barber</p>
              <p className="text-xs text-slate-400 font-medium leading-tight mt-1">Manage your shop &amp; bookings</p>
            </div>
          </button>

          <div className="mt-4 text-center border-t border-white/10 pt-6">
            <p className="text-slate-400 text-sm">
              Are you a new barber?{" "}
              <button onClick={() => navigate("/register")} className="text-amber-500 font-semibold hover:text-amber-400 transition-colors">
                Register your shop →
              </button>
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
