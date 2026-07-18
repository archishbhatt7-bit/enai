import { useState } from "react";
import { useLocation } from "wouter";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { ArrowLeft, Phone, Scissors } from "lucide-react";

type Step = "phone" | "otp";

export default function CustomerLogin() {
  const [, navigate] = useLocation();
  const { loginCustomer, isLoggedIn } = useCustomerAuth();
  const [step, setStep] = useState<Step>("phone");
  
  // If already logged in, bounce to dashboard immediately
  if (isLoggedIn) {
    navigate("/customer", { replace: true });
    return null; // Don't render the form
  }

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: (data: any) => {
        if (data.otp) setDemoOtp(data.otp);
        setStep("otp");
        setError("");
      },
      onError: () => setError("Failed to send OTP. Try again."),
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data: any) => {
        loginCustomer(phone, data.token);
        navigate("/customer");
      },
      onError: () => setError("Wrong OTP. Please try again."),
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (phone.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    sendOtpMutation.mutate({ data: { phone } });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyOtpMutation.mutate({ data: { phone, otp } });
  };

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col">
      {/* Header strip */}
      <div className="px-5 pt-12 pb-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl mb-5">
          <Scissors className="w-8 h-8 text-slate-900" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">eNai</h1>
        <p className="text-slate-400 text-sm mt-1">Customer Login / Sign up</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl px-6 pt-8 pb-10">
        <button
          onClick={() => step === "otp" ? setStep("phone") : navigate("/")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {step === "phone" && (
          <>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Login / Sign up</h2>
            <p className="text-slate-400 text-sm mb-8">We'll send a 6-digit OTP to verify you</p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-slate-400 font-semibold text-sm">+91</span>
                    <div className="w-px h-5 bg-slate-200" />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full pl-16 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 font-semibold text-lg focus:outline-none focus:border-blue-600 tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phone.length < 10 || sendOtpMutation.isPending}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {sendOtpMutation.isPending ? "Sending…" : "Send OTP →"}
              </button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Enter OTP</h2>
            <p className="text-slate-400 text-sm mb-2">Sent to <strong>+91 {phone}</strong></p>

            {demoOtp && (
              <div className="mb-5 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Demo — Your OTP</p>
                <p className="text-4xl font-black text-blue-800 tracking-[0.3em]">{demoOtp}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="· · · · · ·"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 font-black text-4xl text-center focus:outline-none focus:border-blue-600 tracking-[0.3em]"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={otp.length !== 6 || verifyOtpMutation.isPending}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifyOtpMutation.isPending ? "Verifying…" : "Verify & Continue →"}
              </button>

              <button
                type="button"
                onClick={() => sendOtpMutation.mutate({ data: { phone } })}
                className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 transition-colors"
              >
                Resend OTP
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
