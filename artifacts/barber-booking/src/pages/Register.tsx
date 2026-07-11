import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Scissors, ArrowLeft } from "lucide-react";
import { useRegisterBarber, useSendOtp } from "@workspace/api-client-react";

export default function Register() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const [form, setForm] = useState({
    ownerName: "",
    phone: "",
    password: "",
    otp: "",
  });

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: (res: any) => {
        setOtpSent(true);
        if (res?.otp) setDemoOtp(res.otp);
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Failed to send OTP.");
      }
    }
  });

  const registerMutation = useRegisterBarber({
    mutation: {
      onSuccess: (data: any) => {
        login(data.token, data.owner, data.shop || null);
        navigate("/create-shop");
      },
      onError: (err: any) => {
        setError(err?.data?.error || "Registration failed. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.ownerName || !form.phone || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!otpSent) {
      sendOtpMutation.mutate({ data: { phone: form.phone, checkOwner: true } });
      return;
    }

    if (!form.otp) {
      setError("Please enter the OTP.");
      return;
    }

    registerMutation.mutate({
      data: form as any,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <span className="font-bold text-slate-900">eNai — Register</span>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h2>
          <p className="text-slate-500 mb-6 text-sm">Join eNai and start managing your barber shop.</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {demoOtp && (
            <div className="mb-5 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Demo — Your OTP</p>
              <p className="text-4xl font-black text-blue-800 tracking-[0.3em]">{demoOtp}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Owner Name *</label>
              <input
                type="text"
                placeholder="Your full name"
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                disabled={otpSent}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Phone Number *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                disabled={otpSent}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Password *</label>
              <input
                type="password"
                placeholder="Choose a password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                disabled={otpSent}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {otpSent && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">OTP *</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={form.otp}
                  onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            )}
            
            <button
              type="submit"
              disabled={registerMutation.isPending || sendOtpMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-60 mt-4"
            >
              {!otpSent ? (sendOtpMutation.isPending ? "Sending OTP..." : "Send OTP") : (registerMutation.isPending ? "Creating account..." : "Verify & Register")}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-blue-600 hover:underline font-semibold">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
