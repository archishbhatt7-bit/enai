import { useLocation } from "wouter";
import { useCustomerAuth } from "@/lib/customerAuth";
import { getCustomerProfile } from "@/components/CustomerOnboarding";
import { User, LogOut, BookOpen, Home } from "lucide-react";
import { useEffect, useState } from "react";

export default function CustomerNavbar() {
  const [location, navigate] = useLocation();
  const { phone, logoutCustomer } = useCustomerAuth();
  const [profile, setProfile] = useState(() => phone ? getCustomerProfile(phone) : null);

  useEffect(() => {
    if (phone) {
      setProfile(getCustomerProfile(phone));
    }
  }, [phone]);

  if (!phone) return null;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center border-2 border-slate-800 flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              {profile?.name || "Customer"}
            </p>
            <p className="text-xs text-slate-400 leading-tight">
              +91 {phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate("/customer")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-2 rounded-lg transition-colors ${
              location === "/customer" ? "text-blue-400 bg-white/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
          
          <button
            onClick={() => navigate("/customer/bookings")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-2 rounded-lg transition-colors ${
              location === "/customer/bookings" ? "text-blue-400 bg-white/10" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Bookings</span>
          </button>

          <button
            onClick={() => { logoutCustomer(); navigate("/"); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 px-2 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
