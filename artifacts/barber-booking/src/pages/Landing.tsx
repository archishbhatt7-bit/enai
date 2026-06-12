import { useLocation } from "wouter";
import { Scissors, User, Store } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-between px-6 py-12 select-none">
      {/* Top — logo + tagline */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
          <Scissors className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight">SlotCut</h1>
        <p className="mt-3 text-slate-400 text-lg">Book your barber, skip the wait.</p>
      </div>

      {/* Bottom — two big buttons */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate("/customer-login")}
          className="w-full flex items-center gap-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-2xl px-6 py-5 transition-all shadow-lg"
        >
          <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-black text-lg leading-tight">I'm a Customer</p>
            <p className="text-sm text-white/70 font-medium leading-tight mt-0.5">Find a shop &amp; book a slot</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 active:bg-white/5 border border-white/20 text-white rounded-2xl px-6 py-5 transition-all"
        >
          <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-black text-lg leading-tight">I'm a Barber</p>
            <p className="text-sm text-white/50 font-medium leading-tight mt-0.5">Manage your shop &amp; bookings</p>
          </div>
        </button>

        <p className="text-center text-slate-600 text-xs pt-2">
          New barber?{" "}
          <button onClick={() => navigate("/register")} className="text-blue-600 font-semibold hover:text-blue-500 transition-colors">
            Register your shop →
          </button>
        </p>
      </div>
    </div>
  );
}
