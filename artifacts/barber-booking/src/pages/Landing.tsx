import { useLocation } from "wouter";
import { User, Store, Scissors, ArrowRight } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-200/40 via-blue-100/10 to-transparent pointer-events-none blur-3xl opacity-60" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-100/20 to-transparent pointer-events-none blur-3xl opacity-60" />

      {/* Top Navbar */}
      <header className="relative z-10 px-6 py-6 sm:px-10 lg:px-16 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">eNai</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full gap-12 lg:gap-20 pb-12">
        
        {/* Left Side: Hero */}
        <div className="flex-1 text-center lg:text-left mt-10 lg:mt-0 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
            Elevate Your <br />
            <span className="text-blue-600 inline-block mt-2">Grooming Experience</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
            Created for those who appreciate premium quality, time, and a flawless look. Book your next appointment seamlessly with the best barbers near you.
          </p>
        </div>

        {/* Right Side: Login Cards */}
        <div className="w-full max-w-[420px] bg-white border border-slate-100 p-8 sm:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex flex-col relative z-20">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome</h2>
            <p className="text-slate-500 font-medium text-sm">Select an option to continue</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate("/customer-login")}
              className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-3xl px-6 py-5 transition-all shadow-lg shadow-blue-600/20 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg leading-tight">Customer</p>
                  <p className="text-[11px] text-blue-100 font-medium leading-tight mt-1 uppercase tracking-wider">Book an Appointment</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-900 rounded-3xl px-6 py-5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg leading-tight">Barber Shop</p>
                  <p className="text-[11px] text-slate-500 font-bold leading-tight mt-1 uppercase tracking-wider">Manage your business</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Are you a new barber?{" "}
              <button onClick={() => navigate("/register")} className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
                Register your shop →
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
